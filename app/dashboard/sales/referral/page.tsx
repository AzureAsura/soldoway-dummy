"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Users, Zap, CreditCard, Copy, Share2, TrendingUp, Plus } from "lucide-react";

/* ─── Neobrutalism style constants ──────────────────────────────────────── */
const neoCard = "bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000]";
const neoBtnDark =
  "bg-black text-white font-black border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";
const neoBtnMain =
  "bg-[#6be1d9] text-black font-black border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none";

export default function ReferralPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  // Referral query
  const { data: referralData, isLoading } = useQuery({
    queryKey: ["referrals", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const res = await fetch(`/api/referrals?referrerId=${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch referrals");
      return res.json();
    },
    enabled: Boolean(user?.id),
  });

  function copyLink() {
    const link =
      typeof window !== "undefined"
        ? `${window.location.origin}/ref/${referralData?.referral_code}`
        : `soldoway.app/ref/${referralData?.referral_code}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (isLoading) {
    return (
      <SidebarLayout role="SALES">
        <div className="bg-[#f0fdfa] min-h-full p-6 md:p-8 animate-pulse">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="space-y-2 mb-8">
              <div className="h-10 w-72 bg-[#e0e0e0] rounded-[5px]" />
              <div className="h-4 w-96 bg-[#e0e0e0] rounded-[5px]" />
            </div>
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 lg:col-span-8 space-y-6">
                <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-8 space-y-4">
                  <div className="h-3 w-28 bg-[#e0e0e0] rounded-[5px]" />
                  <div className="flex gap-4">
                    <div className="flex-1 h-14 bg-[#e0e0e0] rounded-[5px]" />
                    <div className="h-14 w-24 bg-[#e0e0e0] rounded-[5px]" />
                  </div>
                  <div className="h-12 w-full bg-[#e0e0e0] rounded-[5px]" />
                </div>
                <div className="grid grid-cols-3 gap-5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-6 space-y-4">
                      <div className="h-3 w-24 bg-[#e0e0e0] rounded-[5px]" />
                      <div className="h-8 w-12 bg-[#e0e0e0] rounded-[5px]" />
                    </div>
                  ))}
                </div>
                <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] overflow-hidden">
                  <div className="p-5 border-b-2 border-black">
                    <div className="h-5 w-32 bg-[#e0e0e0] rounded-[5px]" />
                  </div>
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-6 px-6 py-4 border-b border-black/10">
                      <div className="h-4 flex-1 bg-[#e0e0e0] rounded-[5px]" />
                      <div className="h-4 w-28 bg-[#e0e0e0] rounded-[5px]" />
                      <div className="h-4 w-24 bg-[#e0e0e0] rounded-[5px]" />
                    </div>
                  ))}
                </div>
              </div>
              <aside className="col-span-12 lg:col-span-4 space-y-6">
                <div className="bg-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-6 space-y-4">
                  <div className="h-5 w-32 bg-[#e0e0e0] rounded-[5px]" />
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-10 h-10 bg-[#e0e0e0] rounded-[5px] shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-[#e0e0e0] rounded-[5px]" />
                        <div className="h-3 w-full bg-[#e0e0e0] rounded-[5px]" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-[#e0e0e0] border-2 border-black rounded-[5px] h-40" />
                <div className="bg-[#e0e0e0] border-2 border-black rounded-[5px] h-36" />
              </aside>
            </div>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  const referralCode = referralData?.referral_code ?? "";
  const totalReward = referralData?.total_reward ?? 0;
  const referredUsers: { id: string; wallet_address: string; created_at?: string }[] =
    referralData?.referred_users ?? [];
  const rewards: { amount: number; created_at: string; meeting_id?: string }[] =
    referralData?.rewards ?? [];

  const referralLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/ref/${referralCode}`
      : `soldoway.app/ref/${referralCode}`;

  const progressPct = Math.min((referredUsers.length / 10) * 100, 100);

  return (
    <SidebarLayout role="SALES">
      <div className="bg-[#f0fdfa] min-h-full p-6 md:p-8 animate-fade-in">
        <div className="max-w-7xl mx-auto">

          {/* ── Page Header ─────────────────────────────────────────────── */}
          <div className="mb-8">
            <h1 className="text-[40px] leading-none font-black uppercase tracking-tighter italic text-black mb-2">
              Referral Program
            </h1>
            <p className="text-lg font-bold text-black/80">
              Invite other sales reps. Earn 1% of every payout they receive.
            </p>
          </div>

          {!referralData ? (
            <div className="py-20 border-2 border-dashed border-black rounded-[5px] bg-white flex flex-col items-center text-center">
              <h3 className="text-xl font-black text-black mb-2">No Referral Data</h3>
              <p className="text-black/60 text-sm font-bold">Your referral code could not be loaded.</p>
            </div>
          ) : (
            <div className="grid grid-cols-12 gap-6">

              {/* ── Main Column (8/12) ────────────────────────────────── */}
              <div className="col-span-12 lg:col-span-8 space-y-6">

                {/* Referral Link Hero Card */}
                <section className={`${neoCard} p-6 md:p-8 bg-[#6be1d9]/5`}>
                  <label className="text-xs font-black uppercase tracking-widest mb-3 block text-black">
                    Your Referral Link
                  </label>
                  <div className="flex flex-col md:flex-row items-stretch gap-4 mt-2">
                    {/* Link display */}
                    <div className="flex-1 bg-white border-2 border-black rounded-[5px] px-5 py-4 flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_#000]">
                      <span className="font-mono text-sm font-bold text-black truncate">
                        {referralLink}
                      </span>
                      <Copy size={16} className="text-black shrink-0" />
                    </div>
                    {/* Buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={copyLink}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 text-sm uppercase tracking-wide ${neoBtnDark}`}
                      >
                        <Copy size={16} />
                        {copied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ url: referralLink, title: "Join Soldoway" });
                          } else {
                            copyLink();
                          }
                        }}
                        className="flex items-center justify-center bg-white border-2 border-black rounded-[5px] px-5 py-4 shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                      >
                        <Share2 size={16} />
                      </button>
                    </div>
                  </div>
                  {/* Info strip */}
                  <div className="mt-6 p-4 bg-white border-2 border-black rounded-[5px] flex items-center gap-3">
                    <div className="w-7 h-7 bg-black rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[#6be1d9] text-[13px] font-black leading-none">i</span>
                    </div>
                    <p className="font-bold text-sm text-black">
                      Anyone who signs up with your link earns you 1% of their meeting rewards
                    </p>
                  </div>
                </section>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  {/* Referred Users */}
                  <div className={`${neoCard} p-6 flex flex-col justify-between`}>
                    <p className="text-xs font-black uppercase text-black/60 tracking-widest">
                      Referred Users
                    </p>
                    <div className="flex items-end justify-between mt-4">
                      <h3 className="text-3xl font-black italic text-black">{referredUsers.length}</h3>
                      <div className="w-12 h-12 bg-[#6be1d9] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                        <Users size={20} />
                      </div>
                    </div>
                  </div>

                  {/* Active Referrals */}
                  <div className={`${neoCard} p-6 flex flex-col justify-between`}>
                    <p className="text-xs font-black uppercase text-black/60 tracking-widest">
                      Active Referrals
                    </p>
                    <div className="flex items-end justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-3xl font-black italic text-black">{referredUsers.length}</h3>
                        {referredUsers.length > 0 && (
                          <div className="w-2 h-2 bg-[#22c55e] rounded-full animate-pulse" />
                        )}
                      </div>
                      <div className="w-12 h-12 bg-[#6be1d9] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                        <Zap size={20} className={referredUsers.length > 0 ? "animate-pulse" : ""} />
                      </div>
                    </div>
                  </div>

                  {/* Total Earned — black card */}
                  <div className="bg-black text-white border-2 border-black rounded-[5px] shadow-[4px_4px_0px_0px_#000] p-6 flex flex-col justify-between">
                    <p className="text-xs font-black uppercase text-white/60 tracking-widest">
                      Total Referral Earned
                    </p>
                    <div className="flex items-end justify-between mt-4">
                      <h3 className="text-2xl font-black text-[#6be1d9] uppercase">
                        {totalReward.toFixed(4)} SOL
                      </h3>
                      <div className="w-12 h-12 bg-white text-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#6be1d9]">
                        <CreditCard size={20} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referred Users Table */}
                <div className={`${neoCard} overflow-hidden`}>
                  <div className="px-6 py-5 border-b-2 border-black flex justify-between items-center bg-white">
                    <h3 className="text-xl font-black uppercase italic text-black">Your Referrals</h3>
                    {referredUsers.length > 0 && (
                      <span className="text-xs font-black text-black border-2 border-black px-3 py-1 rounded-[5px]">
                        {referredUsers.length} total
                      </span>
                    )}
                  </div>

                  {referredUsers.length === 0 ? (
                    <div className="py-16 text-center text-black/60 text-sm font-bold">
                      No referred users yet. Share your link to start earning!
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead className="bg-[#6be1d9]/20 border-b-2 border-black">
                            <tr>
                              {["Wallet", "Joined Date", "Your Earnings (SOL)"].map((h) => (
                                <th key={h} className="px-6 py-4 text-xs font-black uppercase text-black">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y-2 divide-black/10">
                            {referredUsers.map((ru) => {
                              const userReward = rewards
                                .filter((r) => r.meeting_id)
                                .reduce((acc, r) => acc + r.amount, 0);
                              return (
                                <tr key={ru.id} className="hover:bg-[#6be1d9]/5 transition-colors">
                                  <td className="px-6 py-4 font-mono font-bold text-black text-sm">
                                    {ru.wallet_address.slice(0, 6)}…{ru.wallet_address.slice(-4)}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-black">
                                    {ru.created_at
                                      ? new Date(ru.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })
                                      : "—"}
                                  </td>
                                  <td className="px-6 py-4 text-sm font-black text-[#16a34a]">
                                    +{totalReward > 0 ? (totalReward / referredUsers.length).toFixed(4) : "0.0000"}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <div className="p-4 border-t-2 border-black bg-black text-center">
                        <span className="text-white text-xs font-black uppercase tracking-widest hover:text-[#6be1d9] transition-colors cursor-default">
                          {referredUsers.length} referral{referredUsers.length !== 1 ? "s" : ""} total
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── Sidebar Column (4/12) ─────────────────────────────── */}
              <aside className="col-span-12 lg:col-span-4 space-y-6">

                {/* Recent Rewards */}
                <section className={`${neoCard} p-6`}>
                  <h3 className="text-xl font-black uppercase italic text-black mb-6">Recent Rewards</h3>

                  {rewards.length === 0 ? (
                    <div className="py-8 text-center text-sm font-bold text-black/60">
                      No rewards yet — start referring!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {rewards.slice(0, 4).map((r, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-4 p-3 border-2 border-transparent hover:border-black hover:bg-[#6be1d9]/10 transition-all rounded-[5px]"
                        >
                          <div className="w-10 h-10 border-2 border-black bg-[#6be1d9] flex items-center justify-center shrink-0">
                            <Plus size={18} />
                          </div>
                          <div>
                            <p className="font-black text-sm text-black">
                              +{r.amount.toFixed(4)} SOL
                            </p>
                            <p className="text-[11px] font-bold text-black/60 uppercase">
                              from meeting approval ·{" "}
                              {new Date(r.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button className={`w-full mt-6 py-3 text-xs uppercase tracking-widest ${neoBtnMain}`}>
                    View Reward History
                  </button>
                </section>

                {/* Leaderboard Status */}
                <section className="bg-black text-white border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[5px] p-8 relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4 pointer-events-none">
                    <TrendingUp size={160} />
                  </div>
                  <h4 className="text-xl font-black uppercase italic relative z-10">Leaderboard</h4>
                  <p className="text-sm font-bold mt-4 text-white/80 leading-relaxed relative z-10">
                    {referredUsers.length >= 10
                      ? "You've reached Elite status! Keep referring to maintain your rank."
                      : `You're ${referredUsers.length > 0 ? `at ${referredUsers.length} referrals` : "just getting started"}. Reach 10 referrals to unlock the `}
                    {referredUsers.length < 10 && (
                      <span className="text-[#6be1d9] font-black underline decoration-2 underline-offset-4">
                        Elite Sales Badge
                      </span>
                    )}
                    {referredUsers.length < 10 && "."}
                  </p>
                  {/* neo progress bar: white/20 track with border, teal fill */}
                  <div className="mt-8 w-full bg-white/20 h-4 border-2 border-white rounded-[5px] relative z-10 overflow-hidden">
                    <div
                      className="bg-[#6be1d9] h-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs font-black uppercase relative z-10 text-white/80 tracking-widest">
                    {referredUsers.length} / 10 Referrals
                  </p>
                </section>

                {/* How it Works */}
                <section className="bg-[#FACC00] border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-[5px] p-6 relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-black opacity-5 rounded-full pointer-events-none" />
                  <p className="text-xs font-black text-black/60 uppercase tracking-widest mb-4">How it Works</p>
                  <div className="space-y-3 text-sm text-black">
                    <div className="flex items-start gap-3">
                      <span className="font-black text-lg leading-none mt-0.5 shrink-0">1</span>
                      <p className="font-bold">Share your unique referral link with other sales reps</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-black text-lg leading-none mt-0.5 shrink-0">2</span>
                      <p className="font-bold">They sign up and submit productive meetings</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="font-black text-lg leading-none mt-0.5 shrink-0">3</span>
                      <p className="font-bold">You earn <strong>1% of every reward</strong> they receive — automatically on-chain</p>
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
