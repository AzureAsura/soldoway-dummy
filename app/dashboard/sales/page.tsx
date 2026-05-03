"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useMeetings } from "@/hooks/use-meetings";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/app/components/client-only";
import type { Meeting } from "@/types";

export default function SalesDashboardPage() {
  const { user } = usePrivy();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();
  const { data: meetings, isLoading: meetingsLoading } = useMeetings(user?.id);
  const [isClaiming, setIsClaiming] = useState(false);

  if (meetingsLoading) {
    return <div className="p-8 text-muted-foreground text-center animate-pulse">Loading dashboard...</div>;
  }

  const myMeetings = meetings || [];
  
  const totalEarned = myMeetings
    .filter(m => m.payout?.status === "SUCCESS")
    .reduce((acc, m) => acc + (m.payout?.amount || 0), 0);

  const pendingMeetings = myMeetings.filter(m => m.status === "PENDING" || m.status === "CONFIRMED");
  const completedMeetings = myMeetings.filter(m => m.status === "DONE");

  const pendingPayouts = myMeetings.filter(m => m.payout?.status === "PENDING");
  const totalClaimable = pendingPayouts.reduce((acc, m) => acc + (m.payout?.amount || 0), 0);
  
  async function handleClaim() {
    if (!user?.id || totalClaimable <= 0) return;
    setIsClaiming(true);
    try {
      const res = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sales_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to claim");
      toast.success(`Successfully claimed ${data.claimed_amount} SOL! Tx: ${data.signature}`);
    } catch (err: any) {
      toast.error(err.message || "Claim failed");
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <ClientOnly>
      <div className="max-w-5xl mx-auto p-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-brand">Sales Dashboard</h1>
            <p className="text-muted-foreground mt-1">Track your meetings and claim your on-chain rewards.</p>
          </div>
          <Link 
            href="/tasks"
            className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm border border-border"
          >
            Browse Tasks
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Wallet Balance</div>
            <div className="text-3xl font-bold">{balanceLoading ? "..." : balance?.toFixed(4) || "0.00"} SOL</div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm relative overflow-hidden hover:shadow-md transition-shadow">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-brand/10 rounded-full blur-2xl"></div>
            <div className="text-sm font-medium text-muted-foreground mb-1 relative z-10">Claimable Rewards</div>
            <div className="flex items-center justify-between relative z-10">
              <div className="text-3xl font-bold text-brand">{totalClaimable.toFixed(2)} SOL</div>
              <button 
                onClick={handleClaim} 
                disabled={totalClaimable <= 0 || isClaiming}
                className="bg-brand hover:bg-brand-light text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {isClaiming ? "Claiming..." : "Claim"}
              </button>
            </div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Earned (Claimed)</div>
            <div className="text-3xl font-bold text-success">{totalEarned.toFixed(2)} SOL</div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
              Pending Actions 
              <span className="bg-warning/20 text-warning text-xs px-2 py-1 rounded-full">{pendingMeetings.length}</span>
            </h2>
            {pendingMeetings.length === 0 ? (
              <div className="p-6 border border-dashed border-border rounded-2xl bg-card/50 text-center text-sm text-muted-foreground">
                No pending meetings. Book a meeting from an available task!
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMeetings.map(m => (
                  <div key={m.id} className="bg-card border border-border p-5 rounded-2xl shadow-sm hover:border-brand/40 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold">{m.prospect_name}</div>
                      <div className="text-xs text-muted-foreground">{new Date(m.scheduled_at).toLocaleDateString()}</div>
                    </div>
                    <div className="text-sm text-brand font-medium mb-4">{m.task?.title} ({m.task?.reward_amount} SOL)</div>
                    <Link 
                      href={`/meetings/${m.id}`}
                      className="block w-full text-center py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border rounded-lg text-sm font-medium transition-colors"
                    >
                      Submit Outcome
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">Recent History</h2>
            {completedMeetings.length === 0 ? (
              <div className="p-6 border border-dashed border-border rounded-2xl bg-card/50 text-center text-sm text-muted-foreground">
                No completed meetings yet.
              </div>
            ) : (
              <div className="space-y-4">
                {completedMeetings.slice(0, 5).map(m => (
                  <div key={m.id} className="bg-card border border-border p-5 rounded-2xl shadow-sm flex items-center justify-between hover:border-brand/40 transition-colors">
                    <div>
                      <div className="font-medium text-sm">{m.prospect_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {m.outcome === "PRODUCTIVE" ? (
                          <span className="text-success flex items-center gap-1">✓ Productive</span>
                        ) : (
                          <span className="text-muted-foreground flex items-center gap-1">✗ Not Productive</span>
                        )}
                      </div>
                    </div>
                    {m.outcome === "PRODUCTIVE" && (
                      <div className="text-right">
                        <div className="text-sm font-bold text-brand">+{m.task?.reward_amount} SOL</div>
                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                          {m.payout?.status === "SUCCESS" ? "PAID" : "PENDING"}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientOnly>
  );
}
