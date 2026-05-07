"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/use-campaigns";
import { ClientOnly } from "@/app/components/client-only";
import { SidebarLayout } from "@/app/components/sidebar-layout";

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
    <SidebarLayout role="SALES">
      <div className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
        <div className="grid md:grid-cols-5 gap-10">
          {/* Campaign Info — left panel */}
          <div className="md:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm sticky top-24">
              <div className="mb-4">
                <span className="text-xs bg-gray-50 border border-gray-200 text-gray-600 px-2.5 py-1 rounded-md font-medium">
                  {campaign.category}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-black mb-1">{campaign.title}</h1>
              <p className="text-sm text-gray-500 mb-6">{campaign.company}</p>

              {campaign.description && (
                <div className="text-sm text-gray-600 leading-relaxed mb-6 bg-gray-50 border border-gray-100 p-4 rounded-lg">
                  {campaign.description}
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Reward</span>
                  <span className="text-lg font-bold text-black">
                    {campaign.reward_per_meeting} SOL
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Slots Left</span>
                  <span className={`text-sm font-bold ${isFull ? "text-red-600" : "text-green-600"}`}>
                    {isFull ? "Full" : `${remaining} remaining`}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">Budget Left</span>
                  <span className="text-sm font-bold text-black">
                    {(campaign.budget_total - campaign.budget_used).toFixed(2)} SOL
                  </span>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mt-6">
                <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
                  <span className="uppercase tracking-widest">Capacity</span>
                  <span>{campaign.meetings_used}/{campaign.meeting_capacity}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-black rounded-full transition-all duration-500"
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
            <h2 className="text-3xl font-extrabold text-black tracking-tight mb-8">Submit Meeting</h2>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-10 text-center animate-fade-in flex flex-col items-center justify-center">
                <div className="text-5xl mb-6">🎉</div>
                <h3 className="text-2xl font-bold text-black mb-3">Meeting Submitted!</h3>
                <p className="text-green-800 font-medium">
                  Your meeting is pending approval. Once approved, your reward will be paid automatically.
                </p>
                <p className="text-sm text-green-600 mt-6 font-semibold">Redirecting to dashboard…</p>
              </div>
            ) : isFull ? (
              <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm flex flex-col items-center justify-center">
                <div className="text-5xl mb-6 text-gray-300">🔒</div>
                <h3 className="text-2xl font-bold text-black mb-3">Campaign Full</h3>
                <p className="text-gray-500">
                  This campaign has reached its meeting capacity. Check other campaigns.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm space-y-6"
              >
                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Prospect Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                    placeholder="e.g., John Doe – Acme Corp"
                    value={form.prospect_name}
                    onChange={(e) => setForm((p) => ({ ...p, prospect_name: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Prospect Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                    placeholder="Phone number or email address"
                    value={form.prospect_contact}
                    onChange={(e) => setForm((p) => ({ ...p, prospect_contact: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Date & Time of Meeting <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="datetime-local"
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-black mb-2">
                    Meeting Notes
                  </label>
                  <textarea
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-black min-h-[140px] focus:outline-none focus:ring-2 focus:ring-black focus:bg-white transition-all resize-none"
                    placeholder="Briefly describe what happened during the meeting, the prospect's interest level, any follow-up agreed, etc."
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="submit-meeting-btn"
                  className="w-full bg-black hover:bg-gray-800 text-white font-bold py-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed text-base mt-2"
                >
                  {isSubmitting ? "Submitting…" : `Submit Meeting → Earn ${campaign.reward_per_meeting} SOL`}
                </button>

                <p className="text-sm text-gray-500 text-center font-medium pt-2 border-t border-gray-100">
                  After the Business approves your meeting, your reward will be paid to your wallet automatically.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
