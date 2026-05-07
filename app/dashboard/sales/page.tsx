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
import { SidebarLayout } from "@/app/components/sidebar-layout";
import type { Meeting } from "@/types";

export default function SalesDashboardPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: meetings, isLoading: meetingsLoading } = useMeetings(user?.id);
  


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
    PENDING: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    APPROVED: "bg-green-50 text-green-700 border border-green-200",
    REJECTED: "bg-red-50 text-red-700 border border-red-200",
  } as const;

  return (
    <SidebarLayout role="SALES">
      <div className="p-4 md:p-8 animate-fade-in space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-black tracking-tight">Sales Dashboard</h1>
            <p className="text-gray-500 mt-2 text-base">
              Track your meetings and claim on-chain rewards.
            </p>
          </div>
          <Link
            href="/tasks"
            className="inline-flex items-center justify-center bg-white border border-gray-300 text-black hover:bg-gray-50 px-6 py-3 rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            Browse Campaigns →
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Wallet Balance
            </div>
            <div className="text-3xl font-bold text-black">
              {balanceLoading ? "…" : `${(balance ?? 0).toFixed(4)} SOL`}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm relative overflow-hidden flex flex-col justify-center">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-gray-100 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                Claimable Rewards
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-black">
                  {totalClaimable.toFixed(4)} SOL
                </div>
                <button
                  onClick={handleClaim}
                  disabled={totalClaimable <= 0 || isClaiming}
                  id="claim-btn"
                  className="bg-black hover:bg-gray-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaiming ? "Claiming…" : "Claim"}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col justify-center">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
              Total Earned
            </div>
            <div className="text-3xl font-bold text-green-600">
              {totalEarned.toFixed(4)} SOL
            </div>
          </div>
        </div>

        {/* Meetings List */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-black tracking-tight">Submitted Meetings</h2>
            <Link
              href="/tasks"
              className="text-sm text-black hover:underline font-semibold"
            >
              + Submit New
            </Link>
          </div>

          {myMeetings.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-gray-300 rounded-2xl bg-white flex flex-col items-center justify-center">
              <div className="text-4xl mb-4 text-gray-300">🤝</div>
              <h3 className="text-lg font-bold text-black mb-2">No meetings yet</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                Browse active campaigns and submit your first meeting to start earning.
              </p>
              <Link
                href="/tasks"
                className="text-black font-semibold hover:underline"
              >
                Browse campaigns →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {myMeetings.map((m) => (
                <div
                  key={m.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:border-gray-300 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-lg text-black leading-tight">{m.prospect_name}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wide ${
                          statusColor[m.status as keyof typeof statusColor]
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 flex items-center flex-wrap gap-2 mb-3">
                      <span className="font-semibold text-gray-900">
                        {m.campaign?.title}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span>{m.prospect_contact}</span>
                      <span className="text-gray-300">•</span>
                      <span>
                        {new Date(m.scheduled_at).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {m.notes && (
                      <div className="text-sm text-gray-600 bg-gray-50 border border-gray-100 p-3 rounded-lg mb-3">
                        <span className="font-medium text-gray-400 mr-2">Notes:</span>
                        {m.notes}
                      </div>
                    )}
                    <div className="mt-2">
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
                        <span className="text-[10px] font-bold px-2 py-1 rounded-md bg-yellow-50 text-yellow-700 border border-yellow-200">
                          ⚠ No Cal.com Booking
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[120px]">
                    {/* Reward info */}
                    {m.status === "APPROVED" && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600 mb-1">
                          +{m.payout?.amount ?? m.campaign?.reward_per_meeting} SOL
                        </div>
                        {m.payout?.tx_signature && m.payout.status === "SUCCESS" && (
                          <a
                            href={`https://explorer.solana.com/tx/${m.payout.tx_signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-black hover:underline font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200"
                          >
                            {m.payout.tx_signature.slice(0, 6)}…
                          </a>
                        )}
                        {m.payout?.status === "PENDING" && (
                          <div className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">Pending Claim</div>
                        )}
                      </div>
                    )}

                    {/* Delete — only for PENDING meetings */}
                    {m.status === "PENDING" && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="text-sm px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors disabled:opacity-50"
                      >
                        {deletingId === m.id ? "…" : "Delete"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </SidebarLayout>
  );
}
