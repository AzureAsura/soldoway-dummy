"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/components/layout/client-only";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import type { Campaign, Meeting } from "@/types";
import {
  Check, X, ArrowRight, Plus,
  Megaphone, Wallet, CalendarCheck, TrendingUp,
} from "lucide-react";

const MOCK_APY = 0.05;

function calculateYield(campaign: Campaign): number {
  const depositMs = Date.now() - new Date(campaign.deposit_timestamp).getTime();
  const days = depositMs / (1000 * 60 * 60 * 24);
  const remaining = campaign.budget_total - campaign.budget_used;
  return remaining * MOCK_APY * (days / 365);
}

function ExplorerLink({ sig }: { sig: string }) {
  const url = `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand hover:underline text-xs font-mono"
    >
      {sig.slice(0, 8)}…{sig.slice(-4)}
    </a>
  );
}

/* ─── Neobrutalism style constants ──────────────────────────────────────── */
const neoCard =
  "bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000]";
const neoBtnDark =
  "bg-white text-black font-bold border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
const neoBadge =
  "border-2 border-black rounded-[15px] px-2 py-0.5 text-[12px] font-bold";

export default function BusinessDashboardPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  const { data: campaigns, isLoading: campaignsLoading } = useQuery<Campaign[]>({
    queryKey: ["business-campaigns", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const all: Campaign[] = await res.json();
      return all.filter((c) => c.business_id === user?.id);
    },
    enabled: Boolean(user?.id),
    refetchInterval: 5000,
  });

  const campaignIds = campaigns?.map((c) => c.id) ?? [];
  const { data: allMeetings } = useQuery<Meeting[]>({
    queryKey: ["business-meetings", campaignIds.join(",")],
    queryFn: async () => {
      if (campaignIds.length === 0) return [];
      const results = await Promise.all(
        campaignIds.map((id) =>
          fetch(`/api/meetings?campaignId=${id}`).then((r) => r.json())
        )
      );
      return results.flat() as Meeting[];
    },
    enabled: campaignIds.length > 0,
    refetchInterval: 5000,
  });

  const activeCampaigns = campaigns?.filter((c) => c.status === "ACTIVE") ?? [];
  const allCampaigns = campaigns ?? [];
  const totalDeposit = allCampaigns.reduce((acc, c) => acc + c.budget_total, 0);
  const totalUsed = allCampaigns.reduce((acc, c) => acc + c.budget_used, 0);
  const totalRemaining = totalDeposit - totalUsed;
  const totalYield = activeCampaigns.reduce((acc, c) => acc + calculateYield(c), 0);
  const pendingMeetings = allMeetings?.filter((m) => m.status === "PENDING") ?? [];
  const approvedMeetings = allMeetings?.filter((m) => m.status === "APPROVED") ?? [];

  async function handleWithdraw(campaign: Campaign) {
    if (!user) return;
    setWithdrawingId(campaign.id);
    const toastId = toast.loading("Processing withdrawal…");
    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaign.id, business_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdrawal failed");
      const explorerUrl = `https://explorer.solana.com/tx/${data.tx_signature}?cluster=devnet`;
      toast.success("Withdrawal successful!", {
        id: toastId,
        description: `${data.amount.toFixed(4)} SOL (incl. yield) returned to your wallet.`,
        action: { label: "View", onClick: () => window.open(explorerUrl) },
      });
      queryClient.invalidateQueries({ queryKey: ["business-campaigns", user.id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Withdrawal failed";
      toast.error("Withdrawal failed", { id: toastId, description: msg });
    } finally {
      setWithdrawingId(null);
    }
  }

  async function handleApprove(meeting: Meeting) {
    if (!user) return;
    setApprovingId(meeting.id);
    const toastId = toast.loading("Approving meeting & sending payout…");
    try {
      const payoutRes = await fetch("/api/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id, business_id: user.id }),
      });
      const payoutData = await payoutRes.json();
      if (!payoutRes.ok) throw new Error(payoutData.error || "Payout failed");
      const explorerUrl = `https://explorer.solana.com/tx/${payoutData.tx_signature}?cluster=devnet`;
      toast.success("Payout sent!", {
        id: toastId,
        description: `${payoutData.tx_signature?.slice(0, 8)}… SOL sent to Sales wallet.`,
        action: { label: "View on Explorer", onClick: () => window.open(explorerUrl) },
      });
      queryClient.invalidateQueries({ queryKey: ["business-campaigns", user.id] });
      queryClient.invalidateQueries({ queryKey: ["business-meetings", campaignIds.join(",")] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      toast.error("Payout failed", { id: toastId, description: msg });
    } finally {
      setApprovingId(null);
    }
  }

  async function handleReject(meeting: Meeting) {
    if (!user) return;
    try {
      const res = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REJECTED" }),
      });
      if (!res.ok) {
        const e = await res.json();
        throw new Error(e.error || "Failed to reject");
      }
      const data = await res.json();
      toast.success("Meeting rejected.", {
        description: data.cal_cancelled ? "Cal.com booking cancelled." : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["business-meetings"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rejection failed";
      toast.error(msg);
    }
  }

  if (campaignsLoading) {
    return (
      <ClientOnly>
        <SidebarLayout role="BUSINESS">
          <div className="bg-[#f0fdfa] min-h-full p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-pulse">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <div className="h-8 w-64 bg-[#e0e0e0] rounded-[5px]" />
                <div className="h-4 w-48 bg-[#e0e0e0] rounded-[5px]" />
              </div>
              <div className="h-12 w-40 bg-[#e0e0e0] border-2 border-black/10 rounded-[5px]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-5 space-y-4">
                  <div className="h-6 w-6 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-3 w-24 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-12 w-16 bg-[#e0e0e0] rounded-[5px]" />
                </div>
              ))}
            </div>
            <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] overflow-hidden">
              <div className="p-5 border-b-2 border-black bg-[#6be1d9]/10">
                <div className="h-5 w-40 bg-[#e0e0e0] rounded-[5px]" />
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex gap-6 px-6 py-4 border-b border-black/10">
                  <div className="h-4 flex-1 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-4 w-24 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-4 w-24 bg-[#e0e0e0] rounded-[5px]" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-5 space-y-4">
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-[#e0e0e0] rounded-[5px]" />
                    <div className="h-6 w-16 bg-[#e0e0e0] rounded-[5px]" />
                  </div>
                  <div className="h-5 w-3/4 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-3 w-full bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-10 w-full bg-[#e0e0e0] rounded-[5px]" />
                </div>
              ))}
            </div>
          </div>
        </SidebarLayout>
      </ClientOnly>
    );
  }

  return (
    <SidebarLayout role="BUSINESS">
      <div className="bg-[#f0fdfa] min-h-full p-6 md:p-8 space-y-8 max-w-7xl mx-auto animate-fade-in">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-[32px] font-black leading-tight tracking-tight text-black">
              Business Dashboard
            </h1>
            <p className="text-base font-medium text-black/70 mt-1">
              Manage your sales campaigns and approve meetings.
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className={`inline-flex items-center gap-2 px-6 py-3 ${neoBtnDark}`}
          >
            <Plus size={16} />
            Create Campaign
          </Link>
        </div>

        {/* ── Stats Grid ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Active Campaigns */}
          <div className={`${neoCard} p-5`}>
            <div className="flex justify-between items-start mb-4">
              <Megaphone size={22} className="text-black" />
              <span className="w-3 h-3 rounded-full bg-[#00D6BD] border border-black" />
            </div>
            <p className="text-[11px] font-bold text-black/60 uppercase tracking-widest mb-1">
              Active Campaigns
            </p>
            <p className="text-[48px] font-black leading-none tracking-tight text-black">
              {activeCampaigns.length}
            </p>
          </div>

          {/* Total Deposited */}
          <div className={`${neoCard} p-5`}>
            <div className="mb-4">
              <Wallet size={22} className="text-black" />
            </div>
            <p className="text-[11px] font-bold text-black/60 uppercase tracking-widest mb-1">
              Total Deposited
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-[48px] font-black leading-none tracking-tight text-black">
                {totalDeposit.toFixed(1)}
              </p>
              <p className="text-xl font-bold text-black/60">SOL</p>
            </div>
          </div>

          {/* Meetings Approved */}
          <div className={`${neoCard} p-5`}>
            <div className="mb-4">
              <CalendarCheck size={22} className="text-black" />
            </div>
            <p className="text-[11px] font-bold text-black/60 uppercase tracking-widest mb-1">
              Meetings Approved
            </p>
            <p className="text-[48px] font-black leading-none tracking-tight text-black">
              {approvedMeetings.length}
            </p>
          </div>

          {/* Total Paid Out */}
          <div className={`${neoCard} p-5`}>
            <div className="mb-4">
              <TrendingUp size={22} className="text-black" />
            </div>
            <p className="text-[11px] font-bold text-black/60 uppercase tracking-widest mb-1">
              Total Paid Out
            </p>
            <div className="flex items-baseline gap-2">
              <p className="text-[48px] font-black leading-none tracking-tight text-black">
                {totalUsed.toFixed(1)}
              </p>
              <p className="text-xl font-bold text-black">SOL</p>
            </div>
          </div>
        </div>

        {/* ── Action Required — Pending Meetings ──────────────────────── */}
        {pendingMeetings.length > 0 && (
          <section className={`${neoCard} overflow-hidden`}>
            {/* Section header */}
            <div className="px-6 py-4 border-b-2 border-black flex justify-between items-center bg-[#6be1d9]/10">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-black text-black">Action Required</h2>
                <span className={`${neoBadge} bg-[#FACC00]`}>
                  {pendingMeetings.length} PENDING
                </span>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#6be1d9]/20 border-b-2 border-black">
                    {["Campaign", "Prospect", "Contact", "Scheduled", "Actions"].map((h) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-bold text-black uppercase tracking-wider${h === "Actions" ? " text-right" : ""}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10">
                  {pendingMeetings.map((m) => (
                    <tr key={m.id} className="hover:bg-[#6be1d9]/5 transition-colors">
                      <td className="px-5 py-4 text-sm font-bold text-black whitespace-nowrap">
                        {allCampaigns.find((c) => c.id === m.campaign_id)?.title ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-sm font-medium text-black whitespace-nowrap">
                        {m.prospect_name}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-black/70 whitespace-nowrap">
                        {m.prospect_contact}
                      </td>
                      <td className="px-5 py-4 text-sm text-black/70 whitespace-nowrap">
                        {new Date(m.scheduled_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleApprove(m)}
                            disabled={approvingId === m.id}
                            className={`w-10 h-10 flex items-center justify-center ${neoBtnDark} disabled:opacity-50 disabled:cursor-not-allowed`}
                            title="Approve"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => handleReject(m)}
                            disabled={approvingId === m.id}
                            className="w-10 h-10 flex items-center justify-center border-2 border-black rounded-[15px] bg-[#FF4D50]/20 transition-all hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Reject"
                          >
                            <X size={16} className="text-black" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── My Campaigns ────────────────────────────────────────────── */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-black tracking-tight">My Campaigns</h2>
            <span className={`${neoBadge} bg-white`}>
              {allCampaigns.length} TOTAL
            </span>
          </div>

          {allCampaigns.length === 0 ? (
            <div className={`${neoCard} border-dashed py-20 flex flex-col items-center justify-center`}>
              <div className="w-14 h-14 bg-[#6be1d9]/20 border-2 border-black rounded-[15px] flex items-center justify-center mb-4 shadow-[2px_2px_0px_0px_#000]">
                <Megaphone size={28} className="text-black" />
              </div>
              <h3 className="text-lg font-black text-black mb-2">No campaigns yet</h3>
              <p className="text-black/70 mb-6 max-w-md text-sm text-center font-medium">
                Create a campaign to deposit SOL and start rewarding your sales team for productive meetings.
              </p>
              <Link
                href="/campaigns/new"
                className="text-black font-black text-[13px] flex items-center gap-1 group underline decoration-2 underline-offset-4"
              >
                Create your first campaign{" "}
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allCampaigns.map((campaign) => {
                const yieldEst = calculateYield(campaign);
                const remaining = campaign.budget_total - campaign.budget_used;
                const progress =
                  campaign.meeting_capacity > 0
                    ? (campaign.meetings_used / campaign.meeting_capacity) * 100
                    : 0;
                return (
                  <div
                    key={campaign.id}
                    className={`${neoCard} p-5 flex flex-col`}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`${neoBadge} bg-[#6be1d9]/20 mb-2 inline-block uppercase`}>
                          {campaign.category}
                        </span>
                        <h3 className="text-xl font-black text-black mt-1 leading-tight">
                          {campaign.title}
                        </h3>
                        <p className="text-sm font-medium text-black/70 mt-0.5">{campaign.company}</p>
                      </div>
                      <span
                        className={`${neoBadge} flex items-center gap-1.5 shrink-0 ${
                          campaign.status === "ACTIVE"
                            ? "bg-[#00D6BD]/20 text-black"
                            : campaign.status === "CLOSED"
                            ? "bg-black text-white"
                            : "bg-white text-black"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full border border-black ${
                            campaign.status === "ACTIVE"
                              ? "bg-[#00D6BD]"
                              : campaign.status === "CLOSED"
                              ? "bg-white"
                              : "bg-black/40"
                          }`}
                        />
                        {campaign.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-5">
                      <div className="flex justify-between text-[11px] font-bold text-black mb-2 uppercase">
                        <span>Meetings Booked</span>
                        <span>
                          {campaign.meetings_used}/{campaign.meeting_capacity}
                        </span>
                      </div>
                      <div className="w-full bg-[#e0e0e0] border-2 border-black rounded-[2px] h-3 overflow-hidden">
                        <div
                          className="bg-black h-full transition-all duration-500"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Stats 2-col */}
                    <div className="grid grid-cols-2 gap-3 mb-4 flex-grow">
                      <div className="bg-[#6be1d9]/10 border-2 border-black rounded-[15px] p-3">
                        <p className="text-[10px] text-black uppercase font-bold tracking-wider mb-1">
                          Reward/Meeting
                        </p>
                        <p className="text-xl font-black text-black">
                          {campaign.reward_per_meeting} SOL
                        </p>
                      </div>
                      <div className="bg-[#6be1d9]/10 border-2 border-black rounded-[15px] p-3">
                        <p className="text-[10px] text-black uppercase font-bold tracking-wider mb-1">
                          Budget Remaining
                        </p>
                        <p className="text-xl font-black text-black">
                          {remaining.toFixed(3)} SOL
                        </p>
                      </div>
                    </div>

                    {/* Est. Yield */}
                    {yieldEst > 0 && (
                      <div className="mb-4 text-[11px] text-black font-bold">
                        +{yieldEst.toFixed(6)} SOL est. yield
                        <span className="ml-2 bg-[#6be1d9]/20 border border-black text-black px-1.5 py-0.5 rounded-[3px] text-[10px] font-bold">
                          Mock
                        </span>
                      </div>
                    )}

                    {/* Tx link */}
                    {campaign.tx_signature && (
                      <div className="text-[11px] text-black/70 mb-4 flex items-center gap-1.5 font-medium">
                        <span>Deposit:</span>
                        <a
                          href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-black hover:underline bg-[#6be1d9]/10 border border-black px-1.5 py-0.5 rounded-[3px]"
                        >
                          {campaign.tx_signature.slice(0, 10)}…
                        </a>
                      </div>
                    )}

                    {/* Card Footer */}
                    <div className="pt-4 border-t-2 border-black flex justify-between items-center mt-auto">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="text-black font-black text-[13px] flex items-center gap-1 group underline decoration-2 underline-offset-4"
                      >
                        VIEW DETAILS{" "}
                        <ArrowRight
                          size={14}
                          className="group-hover:translate-x-1 transition-transform"
                        />
                      </Link>
                      {campaign.status !== "WITHDRAWN" && remaining > 0 && (
                        <button
                          onClick={() => handleWithdraw(campaign)}
                          disabled={withdrawingId === campaign.id}
                          className="text-[13px] px-4 py-1.5 border-2 border-black bg-[#FF4D50]/20 rounded-[15px] font-bold transition-all hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {withdrawingId === campaign.id ? "…" : "Withdraw"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Meeting Log ─────────────────────────────────────────────── */}
        {allMeetings && allMeetings.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-black tracking-tight">Meeting Log</h2>
              <span className={`${neoBadge} bg-white`}>
                {allMeetings.length} TOTAL
              </span>
            </div>
            <div className={`${neoCard} overflow-x-auto`}>
              <table className="w-full text-sm text-left">
                <thead className="bg-[#6be1d9]/20 border-b-2 border-black">
                  <tr>
                    {["Prospect", "Contact", "Date & Time", "Notes", "Status", "Cal.com", "Payout Tx", "Actions"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-5 py-3 text-[11px] font-bold text-black uppercase tracking-wider whitespace-nowrap"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black/10">
                  {allMeetings.map((m) => (
                    <tr key={m.id} className="hover:bg-[#6be1d9]/5 transition-colors">
                      <td className="px-5 py-4 font-bold text-black whitespace-nowrap">
                        {m.prospect_name}
                      </td>
                      <td className="px-5 py-4 text-xs font-mono text-black/70 whitespace-nowrap">
                        {m.prospect_contact}
                      </td>
                      <td className="px-5 py-4 text-black/70 whitespace-nowrap text-xs">
                        {new Date(m.scheduled_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td
                        className="px-5 py-4 text-black/70 max-w-[180px] truncate text-xs"
                        title={m.notes || ""}
                      >
                        {m.notes || "—"}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span
                          className={`${neoBadge} uppercase ${
                            m.status === "APPROVED"
                              ? "bg-[#00D6BD]/20 text-black"
                              : m.status === "REJECTED"
                              ? "bg-[#FF4D50]/20 text-black"
                              : "bg-[#FACC00] text-black"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {m.calendar_event_id ? (
                          <a
                            href={`https://app.cal.com/booking/${m.calendar_event_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-black border-2 border-black hover:bg-[#6be1d9]/10 px-3 py-1 rounded-[15px] font-bold inline-flex items-center gap-1.5 transition-colors"
                          >
                            📅 View
                          </a>
                        ) : (
                          <span className="text-black/40 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {m.payout?.tx_signature && m.payout.status === "SUCCESS" ? (
                          <div className="bg-[#6be1d9]/10 border-2 border-black px-2 py-1 rounded-[15px] inline-block">
                            <ExplorerLink sig={m.payout.tx_signature} />
                          </div>
                        ) : (
                          <span className="text-black/40 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {m.status === "PENDING" ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(m)}
                              disabled={approvingId === m.id}
                              className={`p-1.5 ${neoBtnDark} disabled:opacity-50 disabled:cursor-not-allowed`}
                              title="Approve"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              onClick={() => handleReject(m)}
                              disabled={approvingId === m.id}
                              className="p-1.5 border-2 border-black bg-[#FF4D50]/20 rounded-[15px] transition-all hover:translate-x-[1px] hover:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Reject"
                            >
                              <X size={14} className="text-black" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-black/40 text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </SidebarLayout>
  );
}
