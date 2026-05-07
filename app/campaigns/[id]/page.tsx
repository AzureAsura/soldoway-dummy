"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/use-campaigns";
import { ClientOnly } from "@/app/components/client-only";
import { SidebarLayout } from "@/app/components/sidebar-layout";
import type { Meeting } from "@/types";
import { useQueryClient } from "@tanstack/react-query";


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
    <SidebarLayout role="BUSINESS">
      <div className="mx-auto p-4 md:p-8 animate-fade-in space-y-10">
        {/* Header */}
        {/* <div className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <h1 className="text-3xl font-extrabold text-black tracking-tight">{campaign.title}</h1>
              <span className={`text-xs font-bold px-3 py-1 rounded-md border uppercase tracking-wider ${campaign.status === "ACTIVE" ? "bg-green-50 text-green-700 border-green-200"
                  : campaign.status === "CLOSED" ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-gray-500 text-sm flex items-center gap-2">
              <span className="font-medium text-black">{campaign.company}</span>
              <span className="text-gray-300">•</span>
              <span className="bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs font-medium text-gray-600">{campaign.category}</span>
            </p>
            {campaign.description && (
              <p className="mt-4 text-sm text-gray-600 leading-relaxed bg-gray-50 border border-gray-100 p-4 rounded-lg">
                {campaign.description}
              </p>
            )}
            {campaign.tx_signature && (
              <div className="mt-4 text-xs text-gray-400 flex items-center gap-2">
                <span>Deposit tx:</span>
                <a href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                  target="_blank" rel="noopener noreferrer"
                  className="text-black hover:underline font-mono bg-gray-50 border border-gray-200 px-2 py-0.5 rounded transition-colors">
                  {campaign.tx_signature.slice(0, 8)}…
                </a>
              </div>
            )}
          </div>
          {isOwner && campaign.status !== "WITHDRAWN" && remaining > 0 && (
            <button
              onClick={handleWithdraw}
              disabled={withdrawing}
              className="shrink-0 bg-white border border-red-200 text-red-600 hover:bg-red-50 px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-sm"
            >
              {withdrawing ? "Withdrawing…" : "Withdraw Escrow"}
            </button>
          )}
        </div> */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8 py-6">
          {/* Left Content Section */}
          <div className="flex-1 space-y-5">
            {/* Header & Status Area */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  {campaign.title}
                </h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide border ${campaign.status === "ACTIVE"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : campaign.status === "CLOSED"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                  }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${campaign.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"
                    }`}></span>
                  {campaign.status}
                </span>
              </div>

              {/* Meta Info */}
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold text-slate-700">{campaign.company}</span>
                <span className="h-4 w-px bg-slate-200"></span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-bold uppercase tracking-wider">
                  {campaign.category}
                </span>
              </div>
            </div>

            {/* Description Card */}
            {campaign.description && (
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-gray-100 to-gray-50 rounded-xl blur opacity-25"></div>
                <div className="relative leading-relaxed text-slate-600 bg-white border border-slate-100 p-5 rounded-xl shadow-sm">
                  {campaign.description}
                </div>
              </div>
            )}

            {/* Transaction Badge */}
            {campaign.tx_signature && (
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <span className="uppercase tracking-widest font-medium">Verified Deposit</span>
                <a
                  href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-indigo-500 hover:text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded transition-all border border-indigo-100/50"
                >
                  {campaign.tx_signature.slice(0, 20)}…
                </a>
              </div>
            )}
          </div>

          {isOwner && campaign.status !== "WITHDRAWN" && remaining > 0 && (
            <div className="shrink-0">
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="w-full md:w-auto group relative flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-600 hover:text-white px-8 py-3.5 rounded-xl font-bold transition-all duration-200 shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l-4-4m0 0l-4 4m4-4v12" />
                </svg>
                {withdrawing ? "Processing..." : "Withdraw Escrow"}
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: "Reward / Meeting", value: `${campaign.reward_per_meeting} SOL` },
            { label: "Budget Total", value: `${campaign.budget_total} SOL` },
            { label: "Paid Out", value: `${campaign.budget_used.toFixed(4)} SOL`, color: "text-black" },
            { label: "Est. Yield", value: `+${yieldEst.toFixed(6)} SOL`, color: "text-green-600", badge: "Mock" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-center shadow-sm">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 flex justify-between items-center">
                <span>{s.label}</span>
                {s.badge && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                    {s.badge}
                  </span>
                )}
              </div>
              <div className={`text-2xl font-bold ${s.color ?? "text-black"}`}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Meeting capacity progress */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between text-xs font-semibold text-gray-600 mb-3">
            <span>Meeting Capacity</span>
            <span>{campaign.meetings_used} / {campaign.meeting_capacity}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>

        {/* Meetings Table */}
        <section>
          <h2 className="text-2xl font-bold text-black tracking-tight mb-6">Submitted Meetings</h2>
          {!campaign.meetings || campaign.meetings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-2xl bg-white text-gray-500 text-sm">
              No meetings submitted yet.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-6 py-4">Prospect</th>
                    <th className="px-6 py-4">Contact</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Notes</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Tx</th>
                    <th className="px-6 py-4">Cal.com</th>
                    {isOwner && <th className="px-6 py-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {campaign.meetings.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-black whitespace-nowrap">{m.prospect_name}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs whitespace-nowrap">{m.prospect_contact}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-xs">
                        {new Date(m.scheduled_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate text-xs" title={m.notes || ""}>
                        {m.notes || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide border ${m.status === "APPROVED" ? "bg-green-50 text-green-700 border-green-200"
                          : m.status === "REJECTED" ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.payout?.tx_signature && m.payout.status === "SUCCESS" ? (
                          <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded inline-block">
                            <a
                              href={`https://explorer.solana.com/tx/${m.payout.tx_signature}?cluster=devnet`}
                              target="_blank" rel="noopener noreferrer"
                              className="text-black hover:underline text-xs font-mono"
                            >
                              {m.payout.tx_signature.slice(0, 8)}…
                            </a>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.calendar_event_id ? (
                          <a
                            href={`https://app.cal.com/booking/${m.calendar_event_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-100 text-black font-medium transition-colors"
                          >
                            <span>📅</span> View Booking
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>
                      {isOwner && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {m.status === "PENDING" ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleApprove(m)}
                                disabled={approvingId === m.id}
                                className="text-xs px-3 py-1.5 bg-black text-white hover:bg-gray-800 rounded-md font-medium transition-colors disabled:opacity-50"
                              >
                                {approvingId === m.id ? "…" : "Approve"}
                              </button>
                              <button
                                onClick={() => handleReject(m.id)}
                                className="text-xs px-3 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-md font-medium transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs italic">—</span>
                          )}
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
          <section className="mt-12">
            <h2 className="text-2xl font-bold text-black tracking-tight mb-6">Transaction History</h2>
            <div className="space-y-4">
              {campaign.withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between bg-white border border-gray-200 shadow-sm rounded-xl p-5">
                  <div>
                    <div className="font-semibold text-sm text-black">Withdrawal</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(w.created_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-black">{w.amount.toFixed(4)} SOL</div>
                    <a
                      href={`https://explorer.solana.com/tx/${w.tx_signature}?cluster=devnet`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-black hover:underline font-mono mt-1 inline-block"
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
    </SidebarLayout>
  );
}
