"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/use-campaigns";
import { ClientOnly } from "@/components/layout/client-only";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import Link from "next/link";
import { ShieldCheck, Paperclip, Info, ChevronRight } from "lucide-react";

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
      const scheduledAtUTC = new Date(form.scheduled_at).toISOString();

      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: id,
          salesId: user.id,
          prospect_name: form.prospect_name,
          prospect_contact: form.prospect_contact,
          scheduled_at: scheduledAtUTC,
          notes: form.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to submit meeting");
      }

      if (data.cal_error) {
        toast.success("Meeting submitted!", {
          id: toastId,
          description: "Your meeting has been saved and is waiting for Business approval.",
        });
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
      <SidebarLayout role="SALES">
        <div className="bg-[#f9f9f9] min-h-full">
          <div className="max-w-5xl mx-auto px-6 py-16 animate-pulse">
            <div className="mb-10 flex items-center gap-2">
              <div className="h-4 w-24 bg-[#e0e0e0] rounded-[5px]" />
              <div className="h-4 w-4 bg-[#e0e0e0] rounded-full" />
              <div className="h-4 w-32 bg-[#e0e0e0] rounded-[5px]" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-6 space-y-4">
                  <div className="h-6 w-24 bg-[#e0e0e0] rounded-full" />
                  <div className="h-6 w-3/4 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-4 w-1/2 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-20 w-full bg-[#e0e0e0] rounded-[5px]" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-between py-3 border-b-2 border-black/10">
                      <div className="h-3 w-16 bg-[#e0e0e0] rounded-[5px]" />
                      <div className="h-4 w-20 bg-[#e0e0e0] rounded-[5px]" />
                    </div>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-3 space-y-6">
                <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-8 space-y-5">
                  <div className="h-6 w-40 bg-[#e0e0e0] rounded-[5px]" />
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-3 w-24 bg-[#e0e0e0] rounded-[5px]" />
                      <div className="h-12 w-full bg-[#e0e0e0] rounded-[5px]" />
                    </div>
                  ))}
                  <div className="h-12 w-full bg-[#e0e0e0] rounded-[5px]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (!campaign) {
    return (
      <SidebarLayout role="SALES">
        <div className="p-8 text-center font-bold text-black">Campaign not found.</div>
      </SidebarLayout>
    );
  }

  const remaining = campaign.meeting_capacity - campaign.meetings_used;
  const isFull = remaining <= 0;
  const progress = campaign.meeting_capacity > 0
    ? Math.min((campaign.meetings_used / campaign.meeting_capacity) * 100, 100)
    : 0;

  return (
    <SidebarLayout role="SALES">
      <div className="bg-[#f9f9f9] min-h-screen">
        <div className="max-w-5xl mx-auto px-6 py-16 animate-fade-in">

          {/* Breadcrumb */}
          <div className="mb-10 flex items-center gap-2">
            <Link href="/tasks" className="text-sm text-[#3d4948] font-medium hover:underline">
              Campaigns
            </Link>
            <ChevronRight size={16} className="text-[#3d4948]" />
            <span className="text-sm font-bold text-black">{campaign.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-start">

            {/* ── LEFT PANEL ── */}
            <aside className="lg:col-span-2 lg:sticky lg:top-24 space-y-6">

              {/* Main Info Card */}
              <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[15px] p-6">
                <div className="mb-4">
                  <span className="bg-[#006a65] px-3 py-1 border-2 border-black text-white text-[10px] font-bold uppercase tracking-wider rounded-full">
                    {campaign.category}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-black mb-1">{campaign.title}</h1>
                <p className="text-sm text-[#5d5f5f] font-medium mb-6">{campaign.company}</p>

                {campaign.description && (
                  <div className="bg-[#6be1d9]/20 border-2 border-black rounded-[15px] p-4 mb-10">
                    <p className="text-sm text-[#3d4948] leading-relaxed">{campaign.description}</p>
                  </div>
                )}

                {/* Stats Rows */}
                <div className="space-y-0">
                  <div className="flex justify-between items-center py-4 border-b-2 border-black">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#3d4948]">Reward</span>
                    <span className="text-xl font-bold text-[#006a65]">
                      {campaign.reward_per_meeting} SOL
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b-2 border-black">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#3d4948]">Slots Left</span>
                    <div className={`px-2 py-0.5 border-2 border-black rounded-[15px] ${isFull ? "bg-[#FF4D50]/20" : "bg-[#00D6BD]/20"}`}>
                      <span className="text-xl font-bold text-black">
                        {isFull ? "Full" : remaining}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b-2 border-black">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-[#3d4948]">Budget Left</span>
                    <span className="text-xl font-bold text-black">
                      {(campaign.budget_total - campaign.budget_used).toFixed(2)} SOL
                    </span>
                  </div>
                </div>

                {/* Capacity Progress */}
                <div className="mt-6">
                  <div className="flex justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-black">Campaign Capacity</span>
                    <span className="text-[11px] font-bold text-black">
                      {campaign.meetings_used} / {campaign.meeting_capacity}
                    </span>
                  </div>
                  <div className="h-4 w-full bg-[#e0e0e0] border-2 border-black overflow-hidden">
                    <div
                      className="h-full bg-black transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Verified Campaign Card */}
              <div className="bg-[#e2e2e2] border-2 border-dashed border-[#6d7a78] rounded-[15px] p-6">
                <div className="flex gap-4 items-start">
                  <ShieldCheck size={24} className="text-[#006a65] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-widest mb-1">Verified Campaign</h4>
                    <p className="text-xs text-[#3d4948] leading-relaxed">
                      This campaign has an escrowed budget. Rewards are guaranteed upon successful verification.
                    </p>
                  </div>
                </div>
              </div>
            </aside>

            {/* ── RIGHT PANEL ── */}
            <section className="lg:col-span-3 space-y-6">
              <header className="mb-6">
                <h2 className="text-[32px] font-extrabold text-black tracking-tight leading-tight">
                  Submit Meeting
                </h2>
                <p className="text-[#3d4948] font-medium mt-2">
                  Record your successful demo or discovery call to claim your reward.
                </p>
              </header>

              {/* SUCCESS STATE */}
              {submitted ? (
                <div className="bg-[#6be1d9]/20 border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[15px] p-10 text-center animate-fade-in flex flex-col items-center justify-center">
                  <div className="text-5xl mb-6">🎉</div>
                  <h3 className="text-2xl font-bold text-black mb-3">Meeting Submitted!</h3>
                  <p className="text-[#006a65] font-medium">
                    Your meeting is pending approval. Once approved, your reward will be paid automatically.
                  </p>
                  <p className="text-sm text-[#3d4948] mt-6 font-bold">Redirecting to dashboard…</p>
                </div>

              ) : isFull ? (
                /* FULL STATE */
                <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[15px] p-10 text-center flex flex-col items-center justify-center">
                  <div className="text-5xl mb-6 opacity-30">🔒</div>
                  <h3 className="text-2xl font-bold text-black mb-3">Campaign Full</h3>
                  <p className="text-[#5d5f5f] font-medium">
                    This campaign has reached its meeting capacity. Check other campaigns.
                  </p>
                </div>

              ) : (
                /* FORM STATE */
                <>
                  <div className="bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[15px] p-6 lg:p-10">
                    <form onSubmit={handleSubmit} className="space-y-6">

                      {/* Name + Contact grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-black uppercase tracking-widest">
                            Prospect Name <span className="text-[#ba1a1a]">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="e.g. Alex Johnson – Acme Corp"
                            className="w-full px-4 py-4 border-2 border-black rounded-[15px] font-medium bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-all text-black"
                            value={form.prospect_name}
                            onChange={(e) => setForm((p) => ({ ...p, prospect_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="block text-sm font-bold text-black uppercase tracking-widest">
                            Prospect Contact <span className="text-[#ba1a1a]">*</span>
                          </label>
                          <input
                            required
                            type="text"
                            placeholder="Phone number or email"
                            className="w-full px-4 py-4 border-2 border-black rounded-[15px] font-medium bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-all text-black"
                            value={form.prospect_contact}
                            onChange={(e) => setForm((p) => ({ ...p, prospect_contact: e.target.value }))}
                          />
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-black uppercase tracking-widest">
                          Meeting Date &amp; Time <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <input
                          required
                          type="datetime-local"
                          className="w-full px-4 py-4 border-2 border-black rounded-[15px] font-medium bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-all text-black"
                          value={form.scheduled_at}
                          onChange={(e) => setForm((p) => ({ ...p, scheduled_at: e.target.value }))}
                        />
                      </div>

                      {/* Notes */}
                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-black uppercase tracking-widest">
                          Meeting Notes
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Summarize the key pain points and interest level..."
                          className="w-full px-4 py-4 border-2 border-black rounded-[15px] font-medium bg-white focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-all text-black resize-none"
                          value={form.notes}
                          onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                        />
                      </div>

                      {/* Submit */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          id="submit-meeting-btn"
                          className="w-full bg-[#1b1b1b] text-white font-bold py-5 px-10 border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base flex items-center justify-center gap-3"
                        >
                          {isSubmitting
                            ? "Submitting…"
                            : `Submit Meeting → Earn ${campaign.reward_per_meeting} SOL`}
                        </button>
                      </div>

                      {/* Footer note */}
                      <div className="pt-6 border-t-2 border-black">
                        <div className="flex items-center gap-2 text-[#3d4948]">
                          <Info size={18} className="shrink-0" />
                          <p className="text-xs font-medium">
                            Rewards are distributed after meeting verification. Once approved, your reward is paid to your wallet automatically.
                          </p>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Proof of Work Card */}
                  <div className="bg-[#81f5ed] border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[15px] p-6">
                    <div className="flex gap-6 items-center">
                      <div className="bg-white border-2 border-black rounded-full p-2 shrink-0">
                        <Paperclip size={20} className="text-[#006a65]" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-black">Attach Proof of Meeting</h4>
                        <p className="text-sm font-medium text-[#00504c] mt-1">
                          Optional: Share a screenshot of the calendar invite or a recording link for faster approval.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
