"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import type { Meeting } from "@/types";

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [outcome, setOutcome] = useState<"PRODUCTIVE" | "NOT_PRODUCTIVE" | "">("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: meeting, isLoading, refetch } = useQuery<Meeting>({
    queryKey: ["meetings", id],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch meeting");
      return res.json();
    },
    enabled: Boolean(id),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!outcome) return toast.error("Please select an outcome");

    setIsSubmitting(true);
    try {
      // 1. Submit Outcome
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, notes }),
      });

      if (!res.ok) throw new Error("Failed to submit outcome");

      // 2. If Productive, Trigger Payout
      if (outcome === "PRODUCTIVE") {
        toast("Submitting outcome and triggering payout...");
        const payoutRes = await fetch(`/api/payout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meeting_id: id }),
        });

        if (!payoutRes.ok) {
          const err = await payoutRes.json();
          throw new Error(err.error || "Outcome saved, but payout failed.");
        }
        toast.success(`Success! Reward of ${meeting?.task?.reward_amount} SOL paid to your wallet.`);
      } else {
        toast.info("Meeting logged as Not Productive. No reward issued.");
      }

      refetch();
      router.push("/dashboard/sales");
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading meeting...</div>;
  if (!meeting) return <div className="p-8 text-center">Meeting not found.</div>;

  const isDone = meeting.status === "DONE";

  return (
    <div className="max-w-2xl mx-auto p-8 animate-fade-in">
      <h1 className="text-2xl font-bold mb-2">Meeting Details</h1>
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Prospect</div>
            <div className="font-medium text-lg">{meeting.prospect_name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground uppercase font-semibold">Date</div>
            <div className="font-medium">{new Date(meeting.scheduled_at).toLocaleString()}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-muted-foreground uppercase font-semibold">Campaign</div>
            <div className="font-medium text-brand">{meeting.task?.title}</div>
            <div className="text-sm">Reward: {meeting.task?.reward_amount} SOL</div>
          </div>
        </div>
      </div>

      {!isDone ? (
        <form onSubmit={handleSubmit} className="bg-card p-6 rounded-2xl border border-border shadow-sm">
          <h2 className="text-lg font-bold mb-4">Submit Outcome</h2>
          
          <div className="space-y-4 mb-6">
            <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-accent/50 transition-colors">
              <input 
                type="radio" 
                name="outcome" 
                value="PRODUCTIVE" 
                checked={outcome === "PRODUCTIVE"}
                onChange={() => setOutcome("PRODUCTIVE")}
                className="w-5 h-5 accent-brand"
              />
              <div>
                <div className="font-semibold text-success">Productive Meeting</div>
                <div className="text-xs text-muted-foreground">Prospect is interested. Claim your {meeting.task?.reward_amount} SOL reward.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border rounded-xl cursor-pointer hover:bg-accent/50 transition-colors">
              <input 
                type="radio" 
                name="outcome" 
                value="NOT_PRODUCTIVE" 
                checked={outcome === "NOT_PRODUCTIVE"}
                onChange={() => setOutcome("NOT_PRODUCTIVE")}
                className="w-5 h-5 accent-muted"
              />
              <div>
                <div className="font-semibold">Not Productive</div>
                <div className="text-xs text-muted-foreground">No fit or no-show. No reward issued.</div>
              </div>
            </label>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Meeting Notes (Optional)</label>
            <textarea
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="What happened during the call?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !outcome}
            className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-4 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Processing..." : "Submit & Claim"}
          </button>
        </form>
      ) : (
        <div className="bg-card p-6 rounded-2xl border border-border text-center">
          <div className="text-4xl mb-4">
            {meeting.outcome === "PRODUCTIVE" ? "🎉" : "📝"}
          </div>
          <h2 className="text-xl font-bold mb-2">Outcome Submitted</h2>
          <p className="text-muted-foreground mb-4">
            You marked this meeting as <span className="font-bold">{meeting.outcome?.replace("_", " ")}</span>.
          </p>
          
          {meeting.payout && (
            <div className="mt-4 p-4 bg-brand/5 border border-brand/20 rounded-xl inline-block text-left">
              <div className="text-sm font-semibold text-brand mb-1">Reward Paid: {meeting.payout.amount} SOL</div>
              <div className="text-xs text-muted-foreground font-mono">TX: {meeting.payout.tx_signature}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
