"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SidebarLayout } from "@/app/components/sidebar-layout";

export default function ReferralPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();

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

  if (isLoading) {
    return (
      <SidebarLayout role="SALES">
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
        </div>
      </SidebarLayout>
    );
  }

  return (
    <SidebarLayout role="SALES">
      <div className="p-4 md:p-8 animate-fade-in mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-extrabold text-black tracking-tight mb-2">Referral Program</h1>
          <p className="text-gray-500 text-base">
            Invite other sales reps and earn passive income from their success.
          </p>
        </div>

        {referralData ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6 md:p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-black mb-6 flex items-center gap-3 border-b border-gray-100 pb-4">
              <span>🎁</span> Your Rewards
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-3">Your Referral Link</p>
                <div className="flex items-center gap-3">
                  <code className="bg-gray-50 border border-gray-200 px-4 py-3 rounded-lg flex-1 text-sm font-mono overflow-x-auto text-black font-medium">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/ref/${referralData.referral_code}`
                      : `soldoway.app/ref/${referralData.referral_code}`}
                  </code>
                  <button
                    onClick={() => {
                      const link =
                        typeof window !== "undefined"
                          ? `${window.location.origin}/ref/${referralData.referral_code}`
                          : `soldoway.app/ref/${referralData.referral_code}`;
                      navigator.clipboard.writeText(link);
                      toast.success("Referral link copied!");
                    }}
                    className="bg-black hover:bg-gray-800 text-white px-5 py-3 rounded-lg text-sm font-semibold transition-colors shrink-0 shadow-sm"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-4 leading-relaxed">
                  Share this link. You will earn <strong className="text-black font-bold">1%</strong> of the reward for every productive meeting your referrals submit!
                </p>
              </div>

              <div className="flex flex-col justify-center">
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Referral Earnings
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {(referralData.total_reward || 0).toFixed(4)} SOL
                    </div>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">
                      Referred Users
                    </div>
                    <div className="text-3xl font-bold text-black">
                      {referralData.referred_users?.length || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {referralData.referred_users && referralData.referred_users.length > 0 && (
              <div className="mt-10 border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Referred Users</h3>
                <div className="flex flex-wrap gap-2">
                  {referralData.referred_users.map((ru: { id: string; wallet_address: string }) => (
                    <span
                      key={ru.id}
                      className="text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-md font-mono text-gray-700"
                    >
                      {ru.wallet_address.slice(0, 4)}...{ru.wallet_address.slice(-4)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 border border-dashed border-gray-300 rounded-2xl bg-white flex flex-col items-center justify-center">
            <h3 className="text-lg font-bold text-black mb-2">No Referral Data</h3>
            <p className="text-gray-500">Your referral code could not be loaded.</p>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
