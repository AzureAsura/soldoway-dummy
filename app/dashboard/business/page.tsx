"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { toast } from "sonner";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/app/components/client-only";
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
  const { user } = usePrivy();
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

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
  async function handleApprove(meeting: Meeting) {
    if (!user) return;
    setApprovingId(meeting.id);
    const toastId = toast.loading("Approving meeting & sending payout…");
    try {
      // 1. Approve meeting status
      const patchRes = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED" }),
      });
      if (!patchRes.ok) {
        const e = await patchRes.json();
        throw new Error(e.error || "Failed to approve meeting");
      }

      // 2. Trigger on-chain payout
      const payoutRes = await fetch("/api/payout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_id: meeting.id, business_id: user.id }),
      });
      const payoutData = await payoutRes.json();
      if (!payoutRes.ok) throw new Error(payoutData.error || "Payout failed");

      const explorerUrl = `https://explorer.solana.com/tx/${payoutData.signature}?cluster=devnet`;
      toast.success("Payout approved!", {
        id: toastId,
        description: `Tx: ${payoutData.signature?.slice(0, 8)}…`,
        action: { label: "View", onClick: () => window.open(explorerUrl) },
      });
      queryClient.invalidateQueries({ queryKey: ["business-campaigns", user.id] });
      queryClient.invalidateQueries({ queryKey: ["business-meetings"] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      toast.error("Approval failed", { id: toastId, description: msg });
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
      toast.success("Meeting rejected.");
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
    <ClientOnly>
      <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Manage campaigns, approve meetings, and track escrow yield.
            </p>
          </div>
          <Link
            href="/campaigns/new"
            className="inline-flex items-center gap-2 bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm hover:shadow-md"
          >
            + New Campaign
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            {
              label: "Wallet Balance",
              value: balanceLoading ? "…" : `${(balance ?? 0).toFixed(4)} SOL`,
              color: "",
            },
            {
              label: "Total Deposited",
              value: `${totalDeposit.toFixed(4)} SOL`,
              color: "text-foreground",
            },
            {
              label: "Estimated Yield",
              value: `+${totalYield.toFixed(6)} SOL`,
              color: "text-success",
              badge: "5% APY",
            },
            {
              label: "Budget Remaining",
              value: `${totalRemaining.toFixed(4)} SOL`,
              color: "text-brand",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">
                {stat.label}
              </div>
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              {stat.badge && (
                <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase font-medium mt-1 inline-block">
                  {stat.badge} Mock
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Active Campaigns */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Active Campaigns</h2>
            <span className="text-sm text-muted-foreground">
              {activeCampaigns.length} active
            </span>
          </div>
          {allCampaigns.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
              <p className="text-muted-foreground mb-6">
                Create a campaign to deposit SOL and start rewarding your sales team.
              </p>
              <Link
                href="/campaigns/new"
                className="text-brand hover:underline font-medium"
              >
                Create your first campaign →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {allCampaigns.map((campaign) => {
                const yieldEst = calculateYield(campaign);
                const remaining = campaign.budget_total - campaign.budget_used;
                const progress = campaign.meeting_capacity > 0
                  ? (campaign.meetings_used / campaign.meeting_capacity) * 100
                  : 0;
                return (
                  <div
                    key={campaign.id}
                    className="bg-card border border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-lg leading-tight">{campaign.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {campaign.company} · {campaign.category}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          campaign.status === "ACTIVE"
                            ? "bg-success/10 text-success"
                            : campaign.status === "CLOSED"
                            ? "bg-warning/10 text-warning"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>

                    {/* Meeting capacity progress bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Meetings: {campaign.meetings_used}/{campaign.meeting_capacity}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                      <div className="bg-secondary rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Reward</div>
                        <div className="text-sm font-bold">{campaign.reward_per_meeting} SOL</div>
                      </div>
                      <div className="bg-secondary rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Remaining</div>
                        <div className="text-sm font-bold">{remaining.toFixed(3)} SOL</div>
                      </div>
                      <div className="bg-success/5 border border-success/20 rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Est. Yield</div>
                        <div className="text-sm font-bold text-success">+{yieldEst.toFixed(4)}</div>
                      </div>
                    </div>

                    {/* Tx link */}
                    {campaign.tx_signature && (
                      <div className="text-xs text-muted-foreground mb-3">
                        Deposit tx:{" "}
                        <a
                          href={`https://explorer.solana.com/tx/${campaign.tx_signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand hover:underline font-mono"
                        >
                          {campaign.tx_signature.slice(0, 8)}…
                        </a>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="flex-1 text-center text-sm py-2 bg-secondary hover:bg-accent border border-border rounded-lg font-medium transition-colors"
                      >
                        View Details
                      </Link>
                      {campaign.status !== "WITHDRAWN" && remaining > 0 && (
                        <button
                          onClick={() => handleWithdraw(campaign)}
                          disabled={withdrawingId === campaign.id}
                          className="text-sm px-4 py-2 border border-destructive text-destructive hover:bg-destructive/10 rounded-lg font-medium transition-colors disabled:opacity-50"
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
          <h2 className="text-xl font-bold mb-4">Meeting Log</h2>
          {!allMeetings || allMeetings.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-card text-muted-foreground text-sm">
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
                    <th className="px-5 py-3 text-left font-medium">Payout Tx</th>
                    <th className="px-5 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {allMeetings.map((m) => (
                    <tr key={m.id} className="hover:bg-accent/40 transition-colors">
                      <td className="px-5 py-3 font-medium">{m.prospect_name}</td>
                      <td className="px-5 py-3 text-muted-foreground text-xs">{m.prospect_contact}</td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {new Date(m.scheduled_at).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground max-w-[180px] truncate">
                        {m.notes || "—"}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            m.status === "APPROVED"
                              ? "bg-success/10 text-success"
                              : m.status === "REJECTED"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-warning/10 text-warning"
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {m.payout?.tx_signature && m.payout.status === "SUCCESS" ? (
                          <ExplorerLink sig={m.payout.tx_signature} />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
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
                              onClick={() => handleReject(m)}
                              className="text-xs px-3 py-1 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 rounded-lg font-medium transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
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
    </ClientOnly>
  );
}
