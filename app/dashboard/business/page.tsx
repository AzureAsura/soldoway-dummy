"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/app/components/client-only";
import { SidebarLayout } from "@/app/components/sidebar-layout";
import type { Campaign, Meeting } from "@/types";

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

export default function BusinessDashboardPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  // Fetch all campaigns for this business (polls every 5s)
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

  // Fetch ALL meetings across all campaigns (polls every 5s)
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

  // ── Computed stats ──────────────────────────────────────────────────────────
  const activeCampaigns = campaigns?.filter((c) => c.status === "ACTIVE") ?? [];
  const allCampaigns = campaigns ?? [];

  const totalDeposit = allCampaigns.reduce((acc, c) => acc + c.budget_total, 0);
  const totalUsed = allCampaigns.reduce((acc, c) => acc + c.budget_used, 0);
  const totalRemaining = totalDeposit - totalUsed;
  const totalYield = activeCampaigns.reduce((acc, c) => acc + calculateYield(c), 0);

  // ── Withdraw handler ────────────────────────────────────────────────────────
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
        action: {
          label: "View",
          onClick: () => window.open(explorerUrl),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["business-campaigns", user.id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Withdrawal failed";
      toast.error("Withdrawal failed", { id: toastId, description: msg });
    } finally {
      setWithdrawingId(null);
    }
  }

  // ── Approve meeting handler ─────────────────────────────────────────────────
  // NOTE: Do NOT call PATCH /api/meetings/[id] first — /api/payout handles
  // the meeting status update + payout atomically in a single DB transaction.
  async function handleApprove(meeting: Meeting) {
    if (!user) return;
    setApprovingId(meeting.id);
    const toastId = toast.loading("Approving meeting & sending payout…");
    try {
      // Trigger on-chain payout — this also sets meeting.status = APPROVED atomically
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

  // ── Reject meeting handler ──────────────────────────────────────────────────
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
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientOnly>
    );
  }

  return (
    <SidebarLayout role="BUSINESS">
      <div className="p-4 md:p-8 animate-fade-in space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-black tracking-tight">Business Dashboard</h1>
            <p className="text-gray-500 mt-2 text-base">
              Manage campaigns, approve meetings, and track escrow yield.
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center justify-center bg-black hover:bg-gray-800 text-white px-6 py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            + New Campaign
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Wallet Balance",
              value: balanceLoading ? "…" : `${(balance ?? 0).toFixed(4)} SOL`,
            },
            {
              label: "Total Deposited",
              value: `${totalDeposit.toFixed(4)} SOL`,
            },
            {
              label: "Estimated Yield",
              value: `+${totalYield.toFixed(6)} SOL`,
              badge: "5% APY Mock",
            },
            {
              label: "Budget Remaining",
              value: `${totalRemaining.toFixed(4)} SOL`,
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center"
            >
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                <span>{stat.label}</span>
                {stat.badge && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                    {stat.badge}
                  </span>
                )}
              </div>
              <div className="text-3xl font-bold text-black">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Active Campaigns */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black tracking-tight">Active Campaigns</h2>
            <span className="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {activeCampaigns.length} active
            </span>
          </div>
          {allCampaigns.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-300 rounded-2xl bg-white flex flex-col items-center justify-center">
              <div className="text-4xl mb-4 text-gray-300">📋</div>
              <h3 className="text-lg font-bold text-black mb-2">No campaigns yet</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Create a campaign to deposit SOL and start rewarding your sales team for productive meetings.
              </p>
              <Link
                href="/campaigns/new"
                className="text-black font-semibold hover:underline"
              >
                Create your first campaign →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {allCampaigns.map((campaign) => {
                const yieldEst = calculateYield(campaign);
                const remaining = campaign.budget_total - campaign.budget_used;
                const progress = campaign.meeting_capacity > 0
                  ? (campaign.meetings_used / campaign.meeting_capacity) * 100
                  : 0;
                return (
                  <div
                    key={campaign.id}
                    className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-gray-300 transition-colors flex flex-col"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="pr-4">
                        <h3 className="font-bold text-lg text-black leading-tight mb-1">{campaign.title}</h3>
                        <p className="text-sm text-gray-500">
                          {campaign.company} <span className="mx-1.5 text-gray-300">•</span> {campaign.category}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                          campaign.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : campaign.status === "CLOSED"
                            ? "bg-yellow-50 text-yellow-700 border-yellow-200"
                            : "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>

                    {/* Meeting capacity progress bar */}
                    <div className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex justify-between text-xs font-semibold text-gray-600 mb-2">
                        <span>Meetings: {campaign.meetings_used} / {campaign.meeting_capacity}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-black rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-6">
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Reward</span>
                        <span className="text-base font-bold text-black">{campaign.reward_per_meeting} SOL</span>
                      </div>
                      <div className="flex flex-col border-l border-gray-100 pl-4">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Remaining</span>
                        <span className="text-base font-bold text-black">{remaining.toFixed(3)} SOL</span>
                      </div>
                      <div className="flex flex-col border-l border-gray-100 pl-4">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Est. Yield</span>
                        <span className="text-base font-bold text-green-600">+{yieldEst.toFixed(4)}</span>
                      </div>
                    </div>

                    {/* Tx link */}
                    {campaign.tx_signature && (
                      <div className="text-xs text-gray-400 mb-5 flex items-center gap-2">
                        <span>Deposit Tx:</span>
                        <a
                          href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-black hover:underline font-mono bg-gray-50 px-2 py-0.5 rounded"
                        >
                          {campaign.tx_signature.slice(0, 8)}…
                        </a>
                      </div>
                    )}

                    <div className="mt-auto flex gap-3 pt-4 border-t border-gray-100">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="flex-1 flex items-center justify-center text-sm py-2 bg-white hover:bg-gray-50 text-black border border-gray-300 rounded-lg font-medium transition-colors"
                      >
                        View Details
                      </Link>
                      {campaign.status !== "WITHDRAWN" && remaining > 0 && (
                        <button
                          onClick={() => handleWithdraw(campaign)}
                          disabled={withdrawingId === campaign.id}
                          className="flex items-center justify-center text-sm px-5 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
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

        {/* Meeting Log */}
        <section>
          <h2 className="text-2xl font-bold text-black tracking-tight mb-6">Meeting Log</h2>
          {!allMeetings || allMeetings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-300 rounded-2xl bg-white text-gray-500 text-sm">
              No meetings submitted yet.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Prospect</th>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Contact</th>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Date &amp; Time</th>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Notes</th>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Cal.com</th>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Payout Tx</th>
                    <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allMeetings.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-black whitespace-nowrap">{m.prospect_name}</td>
                      <td className="px-6 py-4 text-gray-600 text-xs whitespace-nowrap">{m.prospect_contact}</td>
                      <td className="px-6 py-4 text-gray-600 whitespace-nowrap text-xs">
                        {new Date(m.scheduled_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-6 py-4 text-gray-600 max-w-[200px] truncate text-xs" title={m.notes || ""}>
                        {m.notes || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide border ${
                            m.status === "APPROVED"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : m.status === "REJECTED"
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-yellow-50 text-yellow-700 border-yellow-200"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.calendar_event_id ? (
                          <a
                            href={`https://app.cal.com/booking/${m.calendar_event_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-black border border-gray-200 hover:bg-gray-100 px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-1.5 transition-colors"
                          >
                            <span>📅</span> View Booking
                          </a>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {m.payout?.tx_signature && m.payout.status === "SUCCESS" ? (
                          <div className="bg-gray-50 border border-gray-200 px-2 py-1 rounded inline-block">
                            <ExplorerLink sig={m.payout.tx_signature} />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>
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
                              onClick={() => handleReject(m)}
                              className="text-xs px-3 py-1.5 bg-white text-red-600 border border-red-200 hover:bg-red-50 rounded-md font-medium transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-xs italic">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </SidebarLayout>
  );
}
