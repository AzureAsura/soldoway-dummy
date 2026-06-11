"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useCampaign } from "@/hooks/use-campaigns";
import { ClientOnly } from "@/components/layout/client-only";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import type { Meeting } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { PLATFORM_FEE_RATE } from "@/lib/fees";
import { Check, X } from "lucide-react";

const MOCK_APY = 0.05;

function calcYield(budgetRemaining: number, depositTimestamp: string) {
  const days = (Date.now() - new Date(depositTimestamp).getTime()) / (1000 * 60 * 60 * 24);
  return budgetRemaining * MOCK_APY * (days / 365);
}

const neoCard =
  "bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000]";
const neoBtnDark =
  "bg-black text-white font-black border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
const neoBadge =
  "inline-flex items-center px-2 py-0.5 border-2 border-black rounded-[15px] text-[10px] font-black uppercase";

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
    <SidebarLayout role="BUSINESS">
      <div className="bg-[#f0fdfa] min-h-full p-6 md:p-8 animate-pulse">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="h-9 w-24 bg-[#e0e0e0] rounded-[5px]" />
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <div className="h-8 w-72 bg-[#e0e0e0] rounded-[5px]" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-[#e0e0e0] rounded-[5px]" />
                <div className="h-6 w-24 bg-[#e0e0e0] rounded-[5px]" />
              </div>
            </div>
            <div className="h-11 w-36 bg-[#e0e0e0] rounded-[5px]" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-6 space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="space-y-1">
                    <div className="h-3 w-20 bg-[#e0e0e0] rounded-[5px]" />
                    <div className="h-10 w-full bg-[#e0e0e0] rounded-[5px]" />
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] overflow-hidden">
                <div className="p-5 border-b-2 border-black">
                  <div className="h-5 w-40 bg-[#e0e0e0] rounded-[5px]" />
                </div>
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex gap-4 px-6 py-4 border-b border-black/10">
                    <div className="h-4 flex-1 bg-[#e0e0e0] rounded-[5px]" />
                    <div className="h-4 w-24 bg-[#e0e0e0] rounded-[5px]" />
                    <div className="h-8 w-20 bg-[#e0e0e0] rounded-[5px]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
  if (!campaign) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0fdfa]">
      <p className="text-black font-bold">Campaign not found.</p>
    </div>
  );

  const remaining = campaign.budget_total - campaign.budget_used;
  const yieldEst = calcYield(remaining, campaign.deposit_timestamp);
  const isOwner = user?.id === campaign.business_id;
  const progress = campaign.meeting_capacity > 0
    ? (campaign.meetings_used / campaign.meeting_capacity) * 100
    : 0;
  const utilization = campaign.budget_total > 0
    ? (campaign.budget_used / campaign.budget_total) * 100
    : 0;

  return (
    <SidebarLayout role="BUSINESS">
      <div className="bg-[#f0fdfa] min-h-full p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <section className="flex flex-col md:flex-row justify-between items-start gap-6">
          <div className="space-y-2 flex-1">
            {/* Title + Status */}
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-[48px] md:leading-[56px] font-black text-black tracking-tighter uppercase">
                {campaign.title}
              </h1>
              {/* <span className={`${neoBadge} ${
                campaign.status === "ACTIVE"
                  ? "bg-[#6be1d9]"
                  : campaign.status === "CLOSED"
                  ? "bg-black text-white"
                  : "bg-white"
              }`}>
                {campaign.status}
              </span> */}
            </div>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-2 text-black font-black text-sm uppercase tracking-wider">
              <span>{campaign.company}</span>
              <span>•</span>
              <span className="bg-black text-white px-2 py-0.5 rounded-[15px] text-[10px] font-bold">
                {campaign.category}
              </span>
            </div>

            {/* Description */}
            {campaign.description && (
              <p className="text-black bg-white border-2 border-black p-4 rounded-[15px] shadow-[2px_2px_0px_0px_#000] text-sm leading-relaxed font-medium max-w-2xl">
                {campaign.description}
              </p>
            )}

            {/* Deposit tx */}
            {campaign.tx_signature && (
              <a
                href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs text-black hover:bg-[#6be1d9] border-2 border-transparent hover:border-black px-1 rounded-[15px] inline-flex items-center gap-1 underline underline-offset-4 decoration-2 transition-all"
              >
                ↗ {campaign.tx_signature.slice(0, 8)}…{campaign.tx_signature.slice(-6)}
              </a>
            )}
          </div>

          {isOwner && campaign.status !== "WITHDRAWN" && remaining > 0 && (
            <div className="shrink-0">
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="px-6 py-3 bg-[#FF4D50] text-black font-black border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none uppercase tracking-tight disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {withdrawing ? "Processing…" : "Withdraw Escrow"}
              </button>
            </div>
          )}
        </section>

        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {/* Reward / Meeting */}
          <div className={`${neoCard} p-4 lg:p-5`}>
            <p className="text-[10px] font-black uppercase text-black mb-1 tracking-widest">
              Reward / Meeting
            </p>
            <p className="text-2xl font-black text-black mb-2">
              {campaign.reward_per_meeting} SOL
            </p>
            <p className="text-xs text-black font-bold italic">
              Rep nets{" "}
              <span className="bg-[#6be1d9] px-1 not-italic font-black">
                {(campaign.reward_per_meeting * (1 - PLATFORM_FEE_RATE)).toFixed(4)} SOL
              </span>{" "}
              after {(PLATFORM_FEE_RATE * 100).toFixed(0)}% fee
            </p>
          </div>

          {/* Budget Total */}
          <div className={`${neoCard} p-4 lg:p-5 flex flex-col`}>
            <p className="text-[10px] font-black uppercase text-black mb-1 tracking-widest">
              Budget Total
            </p>
            <p className="text-2xl font-black text-black flex-1 mb-4">
              {campaign.budget_total} SOL
            </p>
            {/* black track, teal fill — inverted per stitch */}
            <div className="h-2 bg-black border-2 border-black rounded-[2px] overflow-hidden">
              <div
                className="bg-[#6be1d9] h-full transition-all duration-500"
                style={{ width: `${Math.min(utilization, 100)}%` }}
              />
            </div>
          </div>

          {/* Paid Out */}
          <div className={`${neoCard} p-4 lg:p-5`}>
            <p className="text-[10px] font-black uppercase text-black mb-1 tracking-widest">
              Paid Out
            </p>
            <p className="text-2xl font-black text-black mb-2">
              {campaign.budget_used.toFixed(3)} SOL
            </p>
            <p className="text-xs text-black font-black uppercase">
              {utilization.toFixed(0)}% Utilization
            </p>
          </div>

          {/* Est. Yield */}
          <div className={`${neoCard} p-4 lg:p-5`}>
            <div className="flex justify-between items-start mb-1">
              <p className="text-[10px] font-black uppercase text-black tracking-widest">
                Est. Yield
              </p>
              <span className="px-2 py-0.5 bg-black text-white rounded-[15px] text-[9px] font-black">
                MOCK
              </span>
            </div>
            <p className="text-2xl font-black text-black mb-2">
              +{yieldEst.toFixed(6)} SOL
            </p>
            <p className="text-xs text-black font-bold">Accrued rewards</p>
          </div>
        </section>

        {/* ── Meeting Capacity Progress ────────────────────────────────── */}
        <section className={`${neoCard} p-4 lg:p-6`}>
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="text-lg font-black text-black uppercase">Meeting Capacity</h3>
              <p className="text-xs font-bold text-black/70 mt-0.5">
                Scheduled outreach limit for this campaign
              </p>
            </div>
            <span className="text-lg font-black text-black">
              {campaign.meetings_used} / {campaign.meeting_capacity}
            </span>
          </div>
          {/* black track, teal fill */}
          <div className="w-full bg-black h-4 border-2 border-black rounded-[15px] overflow-hidden">
            <div
              className="bg-[#6be1d9] h-full transition-all duration-700"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </section>

        {/* ── Submitted Meetings Table ─────────────────────────────────── */}
        <section className={`${neoCard} overflow-hidden`}>
          <div className="px-5 py-4 border-b-2 border-black flex justify-between items-center bg-[#6be1d9]/10">
            <h3 className="text-lg font-black text-black uppercase tracking-tighter">
              Submitted Meetings
            </h3>
            <span className="px-2 py-0.5 border-2 border-black rounded-[15px] text-[10px] font-black bg-white">
              {campaign.meetings?.length ?? 0} TOTAL
            </span>
          </div>

          {!campaign.meetings || campaign.meetings.length === 0 ? (
            <div className="py-16 text-center text-black text-sm font-bold">
              No meetings submitted yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[800px] lg:min-w-0">
                  <thead className="bg-[#6be1d9]/20 border-b-2 border-black">
                    <tr>
                      {["Prospect", "Contact", "Date", "Notes", "Status", "Tx", "Cal.com", ...(isOwner ? ["Actions"] : [])].map((h) => (
                        <th key={h} className="px-5 py-3 text-[10px] font-black text-black uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y-2 divide-black">
                    {campaign.meetings.map((m) => (
                      <tr key={m.id} className="hover:bg-[#6be1d9]/5 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap">
                          <div className="font-black text-black uppercase">{m.prospect_name}</div>
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-black whitespace-nowrap">
                          {m.prospect_contact}
                        </td>
                        <td className="px-5 py-4 text-sm font-bold text-black whitespace-nowrap">
                          {new Date(m.scheduled_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        </td>
                        <td className="px-5 py-4 text-xs text-black italic max-w-[150px] truncate" title={m.notes || ""}>
                          {m.notes || "—"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <span className={`${neoBadge} ${
                            m.status === "APPROVED"
                              ? "bg-[#00D6BD]/20"
                              : m.status === "REJECTED"
                              ? "bg-[#FF4D50]/20"
                              : "bg-[#FACC00]"
                          }`}>
                            {m.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {m.payout?.tx_signature && m.payout.status === "SUCCESS" ? (
                            <a
                              href={`https://explorer.solana.com/tx/${m.payout.tx_signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-black font-black underline"
                            >
                              {m.payout.tx_signature.slice(0, 8)}…
                            </a>
                          ) : (
                            <span className="text-black/40 font-bold">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          {m.calendar_event_id ? (
                            <a
                              href={`https://app.cal.com/booking/${m.calendar_event_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 border-2 border-black rounded-[15px] bg-white hover:bg-[#6be1d9] inline-flex items-center gap-1 text-xs font-bold transition-colors"
                            >
                              📅 View
                            </a>
                          ) : (
                            <span className="text-black/40 font-bold">—</span>
                          )}
                        </td>
                        {isOwner && (
                          <td className="px-5 py-4 whitespace-nowrap">
                            {m.status === "PENDING" ? (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApprove(m)}
                                  disabled={approvingId === m.id}
                                  className="flex items-center gap-1 bg-black text-white px-3 py-1 rounded-[15px] border-2 border-black text-[10px] font-black uppercase hover:bg-[#6be1d9] hover:text-black transition-all disabled:opacity-50"
                                >
                                  <Check size={12} />
                                  {approvingId === m.id ? "…" : "Approve"}
                                </button>
                                <button
                                  onClick={() => handleReject(m.id)}
                                  className="flex items-center gap-1 bg-white border-2 border-black text-black px-3 py-1 rounded-[15px] text-[10px] font-black uppercase hover:bg-[#FF4D50] transition-all"
                                >
                                  <X size={12} />
                                  Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-black/40 text-xs font-black italic">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Mobile scroll hint */}
              <div className="lg:hidden p-2 text-center text-[10px] text-black font-black uppercase tracking-widest border-t-2 border-black bg-[#6be1d9]/5">
                Scroll right for details
              </div>
            </>
          )}
        </section>

        {/* ── Transaction History — Timeline ───────────────────────────── */}
        {(campaign.withdrawals && campaign.withdrawals.length > 0) || campaign.tx_signature ? (
          <section className="max-w-2xl">
            <h3 className="text-lg font-black text-black mb-6 flex items-center gap-2 uppercase tracking-tighter">
              Transaction History
            </h3>

            <div className="space-y-0">
              {/* Withdrawals */}
              {campaign.withdrawals?.map((w, idx) => {
                const isLast = idx === (campaign.withdrawals?.length ?? 0) - 1 && !campaign.tx_signature;
                return (
                  <div key={w.id} className="relative pb-8 flex items-start gap-4">
                    {!isLast && (
                      <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-black" />
                    )}
                    <div className="flex-shrink-0 w-4 h-4 rounded-full bg-black border-2 border-black z-10 mt-1" />
                    <div className={`${neoCard} p-4 flex-grow flex justify-between items-center`}>
                      <div>
                        <p className="font-black text-black uppercase text-sm">Withdrawal</p>
                        <p className="text-[10px] font-bold text-black/60 mt-0.5">
                          {new Date(w.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                          {" • "}
                          <a
                            href={`https://explorer.solana.com/tx/${w.tx_signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono hover:underline text-black"
                          >
                            {w.tx_signature.slice(0, 8)}…
                          </a>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-black">{w.amount.toFixed(4)} SOL</p>
                        <p className="text-[10px] font-black text-[#FF4D50] uppercase">Outflow</p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Deposit */}
              {campaign.tx_signature && (
                <div className="relative pb-8 flex items-start gap-4">
                  <div className="absolute left-[7px] top-6 bottom-0 w-0.5 bg-black" />
                  <div className="flex-shrink-0 w-4 h-4 rounded-full bg-[#6be1d9] border-2 border-black z-10 mt-1" />
                  <div className={`${neoCard} p-4 flex-grow flex justify-between items-center`}>
                    <div>
                      <p className="font-black text-black uppercase text-sm">Escrow Deposit</p>
                      <p className="text-[10px] font-bold text-black/60 mt-0.5">
                        {new Date(campaign.deposit_timestamp).toLocaleDateString(undefined, { dateStyle: "medium" })}
                        {" • "}
                        <a
                          href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono hover:underline text-black"
                        >
                          {campaign.tx_signature.slice(0, 8)}…
                        </a>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-black">{campaign.budget_total} SOL</p>
                      <p className="text-[10px] font-black text-[#00D6BD] uppercase">Funding</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Campaign Created */}
              <div className="relative flex items-start gap-4">
                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-white border-2 border-black z-10 mt-1" />
                <div className={`${neoCard} p-4 flex-grow flex justify-between items-center opacity-50`}>
                  <div>
                    <p className="font-black text-black uppercase italic text-sm">Campaign Created</p>
                    <p className="text-[10px] font-bold text-black/60 mt-0.5">
                      {new Date(campaign.deposit_timestamp).toLocaleDateString(undefined, { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-black text-lg">+</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </SidebarLayout>
  );
}
