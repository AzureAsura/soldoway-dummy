"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/use-campaigns";
import { ClientOnly } from "@/app/components/client-only";

export default function TaskDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: campaign, isLoading } = useCampaign(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  const [form, setForm] = useState({
    prospect_name: "",
    prospect_contact: "",
    scheduled_at: "",
    notes: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Not authenticated");
    if (!form.prospect_name || !form.prospect_contact || !form.scheduled_at) {
      return toast.error("Please fill all required fields");
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Submitting meeting…");
    try {
      // Convert the local datetime-local value (no TZ) to a proper UTC ISO string
      // using the browser's own locale so the user's timezone (e.g. WIB +08:00) is
      // applied exactly once — the API must NOT re-convert it.
      const scheduledAtUTC = new Date(form.scheduled_at).toISOString();

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: id,
          salesId: user.id,
          prospect_name: form.prospect_name,
          prospect_contact: form.prospect_contact,
          scheduled_at: scheduledAtUTC, // already ISO 8601 UTC — no further conversion needed
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to submit meeting");
      }

      if (data.cal_error) {
        // Meeting IS saved to DB — dismiss the loading toast with success
        toast.success("Meeting submitted!", {
          id: toastId,
          description: "Your meeting has been saved and is waiting for Business approval.",
        });
        // Separately warn that Cal.com booking failed (non-blocking)
        toast.error("Cal.com booking unavailable", {
          description: "This time slot is not available. Please choose a different date or time for the meeting.",
        });
      } else {
        toast.success("Meeting submitted!", {
          id: toastId,
          description: "Cal.com booking confirmed. Waiting for Business approval.",
        });
      }
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["meetings", user.id] });
      setTimeout(() => router.push("/dashboard/sales"), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg === "This time slot is not available on Cal.com. Please choose a different time.") {
        toast.error(msg, { id: toastId });
      } else {
        toast.error("Submission failed", { id: toastId, description: msg });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!campaign) return <div className="p-8 text-center">Campaign not found.</div>;

  const remaining = campaign.meeting_capacity - campaign.meetings_used;
  const isFull = remaining <= 0;

  return (
    <ClientOnly>
      <div className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Campaign Info — left panel */}
          <div className="md:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-6 shadow-sm sticky top-24">
              <div className="mb-4">
                <span className="text-xs bg-secondary px-2 py-0.5 rounded font-medium">
                  {campaign.category}
                </span>
              </div>
              <h1 className="text-xl font-bold mb-1">{campaign.title}</h1>
              <p className="text-sm text-muted-foreground mb-4">{campaign.company}</p>

              {campaign.description && (
                <p className="text-sm text-muted-foreground leading-relaxed mb-6 border-t border-border pt-4">
                  {campaign.description}
                </p>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reward</span>
                  <span className="text-lg font-bold text-brand">
                    {campaign.reward_per_meeting} SOL
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Slots Left</span>
                  <span className={`text-sm font-bold ${isFull ? "text-destructive" : "text-success"}`}>
                    {isFull ? "Full" : `${remaining} remaining`}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Budget Left</span>
                  <span className="text-sm font-semibold">
                    {(campaign.budget_total - campaign.budget_used).toFixed(2)} SOL
                  </span>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mt-5">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Capacity</span>
                  <span>{campaign.meetings_used}/{campaign.meeting_capacity}</span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{
                      width: `${Math.min((campaign.meetings_used / campaign.meeting_capacity) * 100, 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Meeting Form — right panel */}
          <div className="md:col-span-3">
            <h2 className="text-2xl font-bold mb-6">Submit Meeting</h2>

            {submitted ? (
              <div className="bg-success/5 border border-success/30 rounded-2xl p-8 text-center animate-fade-in">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-xl font-bold mb-2">Meeting Submitted!</h3>
                <p className="text-muted-foreground">
                  Your meeting is pending approval. Once approved, your reward will be paid automatically.
                </p>
                <p className="text-sm text-muted-foreground mt-3">Redirecting to dashboard…</p>
              </div>
            ) : isFull ? (
              <div className="bg-card border border-border rounded-2xl p-8 text-center">
                <div className="text-4xl mb-4">🔒</div>
                <h3 className="text-xl font-bold mb-2">Campaign Full</h3>
                <p className="text-muted-foreground">
                  This campaign has reached its meeting capacity. Check other campaigns.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Prospect Name <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="e.g., John Doe – Acme Corp"
                    value={form.prospect_name}
                    onChange={(e) => setForm((p) => ({ ...p, prospect_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Prospect Contact <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                    placeholder="Phone number or email address"
                    value={form.prospect_contact}
                    onChange={(e) => setForm((p) => ({ ...p, prospect_contact: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Date & Time of Meeting <span className="text-destructive">*</span>
                  </label>
                  <input
                    required
                    type="datetime-local"
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Meeting Notes
                  </label>
                  <textarea
                    className="w-full bg-secondary border border-border rounded-xl px-4 py-3 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-brand resize-none"
                    placeholder="Briefly describe what happened during the meeting, the prospect's interest level, any follow-up agreed, etc."
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="submit-meeting-btn"
                  className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting…" : `Submit Meeting → Earn ${campaign.reward_per_meeting} SOL`}
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  After the Business approves your meeting, your reward will be paid to your wallet automatically.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
