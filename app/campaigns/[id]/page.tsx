"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/use-campaigns";
import { ClientOnly } from "@/app/components/client-only";
import type { Meeting } from "@/types";

const MOCK_APY = 0.05;

function calcYield(budgetRemaining: number, depositTimestamp: string) {
  const days = (Date.now() - new Date(depositTimestamp).getTime()) / (1000 * 60 * 60 * 24);
  return budgetRemaining * MOCK_APY * (days / 365);
}

export default function CampaignDetailPage() {
  const { id } = useParams() as { id: string };
  const { user } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: campaign, isLoading } = useCampaign(id);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  async function handleApprove(meeting: Meeting) {
    if (!user) return;
    setApprovingId(meeting.id);
    const toastId = toast.loading("Approving & sending payout…");
    try {
      const payoutRes = await fetch("/api/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id, business_id: user.id }),
      });
      const payoutData = await payoutRes.json();
      if (!payoutRes.ok) throw new Error(payoutData.error || "Payout failed");

      const url = `https://explorer.solana.com/tx/${payoutData.signature}?cluster=devnet`;
      toast.success("Payout approved!", {
        id: toastId,
        description: `Tx: ${payoutData.signature?.slice(0, 8)}…`,
        action: { label: "View", onClick: () => window.open(url) },
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
    } catch (err: unknown) {
      toast.error("Failed", { id: toastId, description: (err as Error).message });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(meetingId: string) {
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      const dataRes = await res.json();
      if (!res.ok) throw new Error(dataRes.error || "Reject failed");
      toast.success("Meeting rejected.", {
        description: dataRes.cal_cancelled ? "Cal.com booking cancelled." : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
    } catch (err: unknown) {
      toast.error((err as Error).message);
    }
  }

  async function handleWithdraw() {
    if (!campaign || !user) return;
    setWithdrawing(true);
    const toastId = toast.loading("Processing withdrawal…");
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id, business_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      const url = `https://explorer.solana.com/tx/${data.tx_signature}?cluster=devnet`;
      toast.success("Withdrawal successful!", {
        id: toastId,
        description: `${data.amount?.toFixed(4)} SOL (incl. yield) returned.`,
        action: { label: "View", onClick: () => window.open(url) },
      });
      queryClient.invalidateQueries({ queryKey: ["campaigns", id] });
      router.push("/dashboard/business");
    } catch (err: unknown) {
      toast.error("Withdrawal failed", { id: toastId, description: (err as Error).message });
    } finally {
      setWithdrawing(false);
    }
  }

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!campaign) return <div className="p-8 text-center">Campaign not found.</div>;

  const remaining = campaign.budget_total - campaign.budget_used;
  const yieldEst = calcYield(remaining, campaign.deposit_timestamp);
  const isOwner = user?.id === campaign.business_id;
  const progress = campaign.meeting_capacity > 0
    ? (campaign.meetings_used / campaign.meeting_capacity) * 100
    : 0;

  return (
    <ClientOnly>
      <div className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold tracking-tight">{campaign.title}</h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                campaign.status === "ACTIVE" ? "bg-success/10 text-success"
                : campaign.status === "CLOSED" ? "bg-warning/10 text-warning"
                : "bg-muted text-muted-foreground"
              }`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-muted-foreground">
              {campaign.company} · <span className="bg-secondary px-2 py-0.5 rounded text-xs font-medium">{campaign.category}</span>
            </p>
            {campaign.description && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                {campaign.description}
              </p>
            )}
            {campaign.tx_signature && (
              <div className="mt-3 text-xs text-muted-foreground">
                Deposit tx:{" "}
                <a href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-brand hover:underline font-mono">
                  {campaign.tx_signature.slice(0, 8)}…
                </a>
              </div>
            )}
          </div>
          {isOwner && campaign.status !== "WITHDRAWN" && remaining > 0 && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="shrink-0 border border-destructive text-destructive hover:bg-destructive/10 px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw Escrow"}
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Reward / Meeting", value: `${campaign.reward_per_meeting} SOL` },
            { label: "Budget Total", value: `${campaign.budget_total} SOL` },
            { label: "Paid Out", value: `${campaign.budget_used.toFixed(4)} SOL`, color: "text-warning" },
            { label: "Est. Yield", value: `+${yieldEst.toFixed(6)} SOL`, color: "text-success", badge: "Mock" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-5 text-center shadow-sm">
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">{s.label}</div>
              <div className={`text-xl font-bold ${s.color ?? ""}`}>{s.value}</div>
              {s.badge && (
                <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase font-medium mt-1 inline-block">
                  {s.badge}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Meeting capacity progress */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-8">
          <div className="flex justify-between text-sm font-medium mb-2">
            <span>Meeting Capacity</span>
            <span>{campaign.meetings_used} / {campaign.meeting_capacity}</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Meetings Table */}
        <section>
          <h2 className="text-xl font-bold mb-4">Submitted Meetings</h2>
          {!campaign.meetings || campaign.meetings.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-2xl bg-card text-muted-foreground">
              No meetings submitted yet.
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="px-5 py-3 text-left font-medium">Prospect</th>
                    <th className="px-5 py-3 text-left font-medium">Contact</th>
                    <th className="px-5 py-3 text-left font-medium">Date</th>
                    <th className="px-5 py-3 text-left font-medium">Notes</th>
                    <th className="px-5 py-3 text-left font-medium">Status</th>
                    <th className="px-5 py-3 text-left font-medium">Tx</th>
                    <th className="px-5 py-3 text-left font-medium">Cal.com</th>
                    {isOwner && <th className="px-5 py-3 text-left font-medium">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {campaign.meetings.map((m) => (
                    <tr key={m.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-5 py-3 font-medium">{m.prospect_name}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{m.prospect_contact}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(m.scheduled_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[160px] truncate">
                        {m.notes || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          m.status === "APPROVED" ? "bg-success/10 text-success"
                          : m.status === "REJECTED" ? "bg-destructive/10 text-destructive"
                          : "bg-warning/10 text-warning"
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {m.payout?.tx_signature && m.payout.status === "SUCCESS" ? (
                          <a
                            href={`https://explorer.solana.com/tx/${m.payout.tx_signature}?cluster=devnet`}
                            target="_blank" rel="noopener noreferrer"
                            className="text-brand hover:underline text-xs font-mono"
                          >
                            {m.payout.tx_signature.slice(0, 8)}…
                          </a>
                        ) : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {m.calendar_event_id ? (
                          <a
                            href={`https://app.cal.com/booking/${m.calendar_event_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 font-medium transition-colors whitespace-nowrap"
                          >
                            📅 View Cal.com Booking
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">Cal.com booking not created</span>
                        )}
                      </td>
                      {isOwner && (
                        <td className="px-5 py-3">
                          {m.status === "PENDING" ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleApprove(m)}
                                disabled={approvingId === m.id}
                                className="text-xs px-3 py-1 bg-success/10 hover:bg-success/20 text-success border border-success/30 rounded-lg font-medium transition-colors disabled:opacity-50"
                              >
                                {approvingId === m.id ? "…" : "Approve"}
                              </button>
                              <button
                                onClick={() => handleReject(m.id)}
                                className="text-xs px-3 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-lg font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Withdrawal History */}
        {campaign.withdrawals && campaign.withdrawals.length > 0 && (
          <section className="mt-10">
            <h2 className="text-xl font-bold mb-4">Transaction History</h2>
            <div className="space-y-3">
              {campaign.withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-card border border-border rounded-xl p-4">
                  <div>
                    <div className="font-semibold text-sm">Withdrawal</div>
                    <div className="text-xs text-muted-foreground">{new Date(w.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">{w.amount.toFixed(4)} SOL</div>
                    <a
                      href={`https://explorer.solana.com/tx/${w.tx_signature}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-brand hover:underline font-mono"
                    >
                      {w.tx_signature.slice(0, 8)}… ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </ClientOnly>
  );
}
