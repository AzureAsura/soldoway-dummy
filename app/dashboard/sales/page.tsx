"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMeetings } from "@/hooks/use-meetings";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/app/components/client-only";
import type { Meeting } from "@/types";

export default function SalesDashboardPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: meetings, isLoading: meetingsLoading } = useMeetings(user?.id);
  
  // Referral query
  const { data: referralData } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/referrals?referrerId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
    enabled: Boolean(user?.id),
  });

  const [isClaiming, setIsClaiming] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auth guard
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  const myMeetings = meetings ?? [];

  const totalEarned = myMeetings
    .filter((m) => m.payout?.status === "SUCCESS")
    .reduce((acc, m) => acc + (m.payout?.amount ?? 0), 0);

  const pendingPayouts = myMeetings.filter((m) => m.payout?.status === "PENDING");
  const totalClaimable = pendingPayouts.reduce(
    (acc, m) => acc + (m.payout?.amount ?? 0),
    0
  );

  // ── Claim handler ────────────────────────────────────────────────────────────
  async function handleClaim() {
    if (!user?.id || totalClaimable <= 0) return;
    setIsClaiming(true);
    const toastId = toast.loading("Processing claim on-chain…");
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Claim failed");

      const explorerUrl = `https://explorer.solana.com/tx/${data.tx_signature}?cluster=devnet`;
      toast.success("Reward claimed!", {
        id: toastId,
        description: `${data.claimed_amount?.toFixed(4)} SOL received.`,
        action: {
          label: "View",
          onClick: () => window.open(explorerUrl),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["meetings", user.id] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Claim failed";
      toast.error("Claim failed", { id: toastId, description: msg });
    } finally {
      setIsClaiming(false);
    }
  }

  // ── Delete PENDING meeting + cancel Cal.com booking ─────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Delete this meeting? The Cal.com booking will also be cancelled.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Meeting deleted.", {
        description: data.cal_cancelled ? "Cal.com booking cancelled." : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["meetings", user?.id] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  if (meetingsLoading) {
    return (
      <ClientOnly>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </ClientOnly>
    );
  }

  const statusColor = {
    PENDING: "bg-warning/10 text-warning",
    APPROVED: "bg-success/10 text-success",
    REJECTED: "bg-destructive/10 text-destructive",
  } as const;

  return (
    <ClientOnly>
      <div className="max-w-6xl mx-auto px-6 py-10 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Track your meetings and claim on-chain rewards.
            </p>
          </div>
          <Link
            href="/tasks"
            className="inline-flex items-center gap-2 bg-secondary hover:bg-accent border border-border text-foreground px-5 py-2.5 rounded-xl font-semibold transition-colors"
          >
            Browse Campaigns →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Wallet Balance
            </div>
            <div className="text-3xl font-bold">
              {balanceLoading ? "…" : `${(balance ?? 0).toFixed(4)} SOL`}
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-brand/5 rounded-full blur-2xl" />
            <div className="relative z-10">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Claimable Rewards
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-brand">
                  {totalClaimable.toFixed(4)} SOL
                </div>
                <button
                  onClick={handleClaim}
                  disabled={totalClaimable <= 0 || isClaiming}
                  id="claim-btn"
                  className="bg-brand hover:bg-brand-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isClaiming ? "Claiming…" : "Claim"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Total Earned
            </div>
            <div className="text-3xl font-bold text-success">
              {totalEarned.toFixed(4)} SOL
            </div>
          </div>
        </div>

        {/* Referral Program */}
        {referralData && (
          <section className="mb-10 bg-brand/5 border border-brand/20 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span>🎁</span> Referral Program
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Your Referral Link</p>
                <div className="flex items-center gap-2">
                  <code className="bg-background border border-border px-3 py-2 rounded-lg flex-1 text-sm overflow-x-auto">
                    {typeof window !== "undefined" ? `${window.location.origin}/ref/${referralData.referral_code}` : `soldoway.app/ref/${referralData.referral_code}`}
                  </code>
                  <button
                    onClick={() => {
                      const link = typeof window !== "undefined" ? `${window.location.origin}/ref/${referralData.referral_code}` : `soldoway.app/ref/${referralData.referral_code}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Referral link copied!");
                    }}
                    className="bg-secondary hover:bg-accent border border-border px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this link. You will earn 1% of the reward for every productive meeting your referrals submit!
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Referral Earnings</div>
                    <div className="text-xl font-bold text-brand">{(referralData.total_reward || 0).toFixed(4)} SOL</div>
                  </div>
                  <div className="bg-background border border-border rounded-xl p-4">
                    <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Referred Users</div>
                    <div className="text-xl font-bold">{referralData.referred_users?.length || 0}</div>
                  </div>
                </div>
              </div>
            </div>
            
            {referralData.referred_users && referralData.referred_users.length > 0 && (
              <div className="mt-6 border-t border-brand/10 pt-4">
                <h3 className="text-sm font-semibold mb-3">Referred Users</h3>
                <div className="flex flex-wrap gap-2">
                  {referralData.referred_users.map((ru: any) => (
                    <span key={ru.id} className="text-xs bg-background border border-border px-2 py-1 rounded-md font-mono">
                      {ru.wallet_address.slice(0,4)}...{ru.wallet_address.slice(-4)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Meetings List */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Submitted Meetings</h2>
            <Link
              href="/tasks"
              className="text-sm text-brand hover:underline font-medium"
            >
              + Submit New Meeting
            </Link>
          </div>

          {myMeetings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-lg font-semibold mb-2">No meetings yet</h3>
              <p className="text-muted-foreground mb-6">
                Browse active campaigns and submit your first meeting.
              </p>
              <Link
                href="/tasks"
                className="text-brand hover:underline font-medium"
              >
                Browse campaigns →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {myMeetings.map((m) => (
                <div
                  key={m.id}
                  className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-brand/30 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-semibold text-base">{m.prospect_name}</span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            statusColor[m.status as keyof typeof statusColor]
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {(m.campaign as any)?.title}
                        </span>
                        {" · "}
                        {m.prospect_contact}
                        {" · "}
                        {new Date(m.scheduled_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                      {m.notes && (
                        <div className="text-xs text-muted-foreground mt-1 italic">
                          &ldquo;{m.notes}&rdquo;
                        </div>
                      )}
                      {m.calendar_event_id ? (
                        <div className="mt-2">
                          <a
                            href={`https://app.cal.com/booking/${m.calendar_event_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand hover:underline font-medium inline-flex items-center gap-1"
                          >
                            📅 View Cal.com Booking
                          </a>
                        </div>
                      ) : (
                        <div className="mt-1.5">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                            ⚠ Cal.com booking not created
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Reward info */}
                      {m.status === "APPROVED" && (
                        <div className="text-right">
                          <div className="text-sm font-bold text-success">
                            +{m.payout?.amount ?? (m.campaign as any)?.reward_per_meeting} SOL
                          </div>
                          {m.payout?.tx_signature && m.payout.status === "SUCCESS" && (
                            <a
                              href={`https://explorer.solana.com/tx/${m.payout.tx_signature}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-brand hover:underline font-mono"
                            >
                              {m.payout.tx_signature.slice(0, 8)}…
                            </a>
                          )}
                          {m.payout?.status === "PENDING" && (
                            <div className="text-xs text-warning">Pending claim</div>
                          )}
                        </div>
                      )}

                      {/* Delete — only for PENDING meetings */}
                      {m.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(m.id)}
                            disabled={deletingId === m.id}
                            className="text-xs px-3 py-1.5 border border-destructive/50 text-destructive rounded-lg hover:bg-destructive/10 transition-colors font-medium disabled:opacity-50"
                          >
                            {deletingId === m.id ? "…" : "Delete"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </ClientOnly>
  );
}
