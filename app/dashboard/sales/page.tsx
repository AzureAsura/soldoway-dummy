"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useMeetings } from "@/hooks/use-meetings";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/components/layout/client-only";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import type { Meeting } from "@/types";
import { PLATFORM_FEE_RATE } from "@/lib/fees";
import { Wallet, TrendingUp, ArrowRight, Trash2, Plus, CalendarDays, Award } from "lucide-react";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/* ─── Neobrutalism style constants ──────────────────────────────────────── */
const neoCard =
  "bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none";
const neoBtnDark =
  "bg-white text-black font-black border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
const neoBtnPrimary =
  "bg-[#6be1d9] text-black font-bold border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
const neoBtnDanger =
  "bg-[#FF4D50] text-black border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

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

  // ── Claim handler ─────────────────────────────────────────────────────────
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

  // ── Delete PENDING meeting + cancel Cal.com booking ──────────────────────
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
        <SidebarLayout role="SALES">
          <div className="bg-[#f0fdfa] min-h-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-24 space-y-8 animate-pulse">
            <div className="flex justify-between items-end">
              <div className="space-y-2">
                <div className="h-12 w-72 bg-[#e0e0e0] rounded-[5px]" />
                <div className="h-4 w-56 bg-[#e0e0e0] rounded-[5px]" />
              </div>
              <div className="h-12 w-44 bg-[#e0e0e0] border-2 border-black/10 rounded-[5px]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className={`border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-6 space-y-4 ${i === 1 ? "bg-[#6be1d9]/30" : "bg-white"}`}>
                  <div className="h-3 w-28 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-10 w-24 bg-[#e0e0e0] rounded-[5px]" />
                </div>
              ))}
            </div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-6 space-y-4">
                <div className="flex justify-between">
                  <div className="h-5 w-48 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="h-6 w-20 bg-[#e0e0e0] rounded-[5px]" />
                </div>
                <div className="h-4 w-36 bg-[#e0e0e0] rounded-[5px]" />
                <div className="h-4 w-full bg-[#e0e0e0] rounded-[5px]" />
              </div>
            ))}
          </div>
        </SidebarLayout>
      </ClientOnly>
    );
  }

  return (
    <SidebarLayout role="SALES">
      <div className="bg-[#f0fdfa] min-h-full max-w-7xl mx-auto px-4 md:px-8 pt-8 pb-24 space-y-8 animate-fade-in">

        {/* ── Page Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-[40px] md:text-[48px] leading-[52px] md:leading-[56px] font-black text-black tracking-tighter">
              Sales Dashboard
            </h1>
            <p className="text-lg text-black/80 mt-1">
              Track your meetings and claim on-chain rewards.
            </p>
          </div>
          <Link
            href="/tasks"
            className={`inline-flex items-center gap-2 px-6 py-3 ${neoBtnDark} shrink-0`}
          >
            Browse Campaigns
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* ── Stats Row ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Wallet Balance */}
          <div className={`${neoCard} p-6`}>
            <p className="text-[11px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <Wallet size={16} />
              Wallet Balance
            </p>
            <p className="text-[40px] font-black text-black leading-none">
              {balanceLoading ? "…" : (balance ?? 0).toFixed(4)}
              <span className="text-black/40 font-bold text-xl ml-2">SOL</span>
            </p>
          </div>

          {/* Claimable Rewards — teal highlighted card */}
          <div className="bg-[#6be1d9] border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] p-6 flex flex-col justify-between relative overflow-hidden transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-black/5 rounded-full border-4 border-black/10 pointer-events-none" />
            <div>
              <p className="text-[11px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
                <Award size={16} />
                Claimable Rewards
              </p>
              <p className="text-[40px] font-black text-black leading-none">
                {totalClaimable.toFixed(4)}
                <span className="text-black/40 font-bold text-xl ml-2">SOL</span>
              </p>
            </div>
            <button
              onClick={handleClaim}
              disabled={totalClaimable <= 0 || isClaiming}
              className={`mt-6 w-full py-3 flex items-center justify-center gap-2 ${neoBtnDark} disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[4px_4px_0px_0px_#000]`}
            >
              {isClaiming ? (
                <>
                  <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  Claiming…
                </>
              ) : "Claim Now"}
            </button>
          </div>

          {/* Total Earned */}
          <div className={`${neoCard} p-6`}>
            <p className="text-[11px] font-black text-black uppercase tracking-widest mb-4 flex items-center gap-2">
              <TrendingUp size={16} />
              Total Earned
            </p>
            <p className="text-[40px] font-black text-black leading-none">
              {totalEarned.toFixed(4)}
              <span className="text-black/40 font-bold text-xl ml-2">SOL</span>
            </p>
          </div>
        </div>

        {/* ── Submitted Meetings ──────────────────────────────────────── */}
        <section className="space-y-4">

          {/* Section Header */}
          <div className="flex justify-between items-center px-1">
            <h2 className="text-2xl font-black text-black flex items-center gap-2">
              Submitted Meetings
              {myMeetings.length > 0 && (
                <span className="bg-black text-white border-2 border-black rounded-[15px] px-2 py-0.5 text-xs font-bold">
                  {myMeetings.length} Total
                </span>
              )}
            </h2>
            <Link
              href="/tasks"
              className="font-black text-black flex items-center gap-1 hover:bg-[#6be1d9]/20 px-3 py-1.5 rounded-[15px] border-2 border-transparent hover:border-black transition-all"
            >
              <Plus size={18} />
              Submit New
            </Link>
          </div>

          {/* Empty State */}
          {myMeetings.length === 0 && (
            <div className="py-24 flex flex-col items-center text-center space-y-6">
              <div className="text-[64px]">🤝</div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-black">No meetings yet</h3>
                <p className="text-black/70 text-base font-medium">
                  Start earning rewards by engaging with top-tier campaigns.
                </p>
              </div>
              <Link
                href="/tasks"
                className={`inline-flex items-center gap-2 px-8 py-4 ${neoBtnPrimary}`}
              >
                Browse Campaigns <ArrowRight size={16} />
              </Link>
            </div>
          )}

          {/* Meeting Cards */}
          <div className="space-y-6">
            {myMeetings.map((m) => {
              const isApproved = m.status === "APPROVED";
              const isPending = m.status === "PENDING";
              const isRejected = m.status === "REJECTED";
              const initials = getInitials(m.prospect_name);

              return (
                <div
                  key={m.id}
                  className={`bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] p-6 flex flex-col md:flex-row gap-6 transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                    isRejected ? "grayscale opacity-80" : ""
                  }`}
                >
                  {/* Left: Details */}
                  <div className="flex-1 space-y-4">

                    {/* Name + status row */}
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <span className={`w-12 h-12 rounded-full border-2 border-black flex items-center justify-center font-black text-black shrink-0 ${
                        isApproved
                          ? "bg-[#6be1d9]"
                          : isPending
                          ? "bg-[#FACC00]"
                          : "bg-black/10"
                      }`}>
                        {initials}
                      </span>

                      <div className="min-w-0">
                        <h4 className="text-xl font-black text-black leading-tight truncate">
                          {m.prospect_name}
                        </h4>
                        <p className="text-[12px] text-black/60 mt-0.5 truncate">
                          {m.campaign?.title} · {m.prospect_contact} ·{" "}
                          {new Date(m.scheduled_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>

                      {/* Status badge */}
                      <span className={`ml-auto shrink-0 border-2 border-black rounded-[15px] px-2 py-0.5 text-xs font-bold uppercase ${
                        isApproved
                          ? "bg-[#00D6BD]/20"
                          : isPending
                          ? "bg-[#FACC00]"
                          : "bg-[#FF4D50]/20"
                      }`}>
                        {m.status}
                      </span>
                    </div>

                    {/* Notes */}
                    {m.notes && (
                      <div className={`bg-[#f0fdfa] p-4 rounded-[15px] border-2 border-black border-l-8 ${
                        isApproved
                          ? "border-l-black"
                          : isPending
                          ? "border-l-[#FACC00]"
                          : "border-l-[#FF4D50]"
                      }`}>
                        <p className="text-sm italic text-black font-bold">"{m.notes}"</p>
                      </div>
                    )}

                    {/* Cal.com button + ref */}
                    <div className="flex items-center gap-3">
                      {m.calendar_event_id ? (
                        <a
                          href={`https://app.cal.com/booking/${m.calendar_event_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`bg-white border-2 border-black rounded-[15px] px-4 py-2 text-sm font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all ${
                            isRejected ? "opacity-50 pointer-events-none" : ""
                          }`}
                        >
                          <CalendarDays size={16} />
                          View Booking
                        </a>
                      ) : (
                        <span className="text-[10px] font-bold px-3 py-1.5 bg-[#FACC00] border-2 border-black text-black rounded-[15px]">
                          ⚠ No Cal.com Booking
                        </span>
                      )}
                      {m.payout?.tx_signature && m.payout.status === "SUCCESS" && (
                        <span className="text-black/60 text-[12px] font-mono bg-black/5 px-2 py-1 rounded-[15px] border border-black/10">
                          Ref: #{m.id.slice(-6).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Reward / Action */}
                  <div className="md:w-64 border-t-2 md:border-t-0 md:border-l-2 border-black pt-5 md:pt-0 md:pl-8 flex flex-col justify-center items-end text-right gap-2">

                    {isApproved && (
                      <>
                        <p className="text-2xl font-black text-black">
                          +{(m.payout?.amount ?? m.campaign?.reward_per_meeting ?? 0).toFixed(4)} SOL
                        </p>
                        <p className="text-[10px] text-black/60 font-bold">
                          after {(PLATFORM_FEE_RATE * 100).toFixed(0)}% platform fee
                        </p>
                        {m.payout?.tx_signature && m.payout.status === "SUCCESS" && (
                          <a
                            href={`https://explorer.solana.com/tx/${m.payout.tx_signature}?cluster=devnet`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] font-mono font-black text-black flex items-center gap-1 hover:underline underline-offset-2 mt-1"
                          >
                            tx: {m.payout.tx_signature.slice(0, 6)}…{m.payout.tx_signature.slice(-4)}
                            <span className="text-[10px]">↗</span>
                          </a>
                        )}
                        {m.payout?.status === "PENDING" && (
                          <span className="text-[10px] font-bold text-black bg-[#FACC00] px-3 py-1 rounded-[15px] border-2 border-black">
                            PENDING CLAIM
                          </span>
                        )}
                      </>
                    )}

                    {isPending && (
                      <button
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className={`p-3 flex items-center justify-center ${neoBtnDanger} disabled:opacity-50 disabled:cursor-not-allowed`}
                        title="Delete meeting"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}

                    {isRejected && (
                      <>
                        <p className="text-sm font-bold text-[#FF4D50] uppercase tracking-tighter">Unqualified Lead</p>
                        <p className="text-[10px] text-black/60 mt-1 font-bold">Campaign criteria not met</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ── FAB — Submit New Meeting ─────────────────────────────────── */}
      <Link
        href="/tasks"
        className={`fixed bottom-8 right-8 w-16 h-16 rounded-full flex items-center justify-center z-50 ${neoBtnDark} shadow-[6px_6px_0px_0px_#000] hover:shadow-none`}
        title="Submit New Meeting"
      >
        <Plus size={28} />
      </Link>
    </SidebarLayout>
  );
}
