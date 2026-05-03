"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import { ClientOnly } from "@/app/components/client-only";
import type { Task } from "@/types";

export default function BusinessDashboardPage() {
  const { user } = usePrivy();
  const { data: balance, isLoading: balanceLoading } = useWalletBalance();

  const { data: tasks, isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: ["business-tasks", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      const allTasks = await res.json();
      return allTasks.filter((t: Task) => t.business_id === user?.id);
    },
    enabled: Boolean(user?.id),
    refetchInterval: 5000, // Poll every 5s
  });

  if (tasksLoading) {
    return (
      <ClientOnly>
        <div className="p-8 text-muted-foreground text-center animate-pulse">Loading dashboard...</div>
      </ClientOnly>
    );
  }

  const activeTasks = tasks?.filter(t => t.status === "ACTIVE") || [];
  const totalBudget = activeTasks.reduce((acc, t) => acc + t.budget_total, 0);
  const totalUsed = activeTasks.reduce((acc, t) => acc + t.budget_used, 0);

  // Mock Kamino Yield Calculation (5% APY)
  const MOCK_APY = 0.05;
  const totalYield = activeTasks.reduce((acc, t) => {
    const msSinceDeposit = Date.now() - new Date(t.created_at).getTime();
    const daysSinceDeposit = msSinceDeposit / (1000 * 60 * 60 * 24);
    // Real yield applies to the *remaining* amount over time, but for the mock we can use deposit_amount or remaining_budget
    const deposit_amount = t.budget_total - t.budget_used; 
    const taskYield = deposit_amount * MOCK_APY * (daysSinceDeposit / 365);
    return acc + taskYield;
  }, 0);

  return (
    <ClientOnly>
      <div className="max-w-5xl mx-auto p-8 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-brand">Business Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage your active sales campaigns and escrow funds.</p>
          </div>
          <Link 
            href="/tasks/new"
            className="bg-brand hover:bg-brand-light text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
          >
            + Create New Task
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Wallet Balance</div>
            <div className="text-2xl font-bold">{balanceLoading ? "..." : balance?.toFixed(4) || "0.00"} SOL</div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Active Escrow Budget</div>
            <div className="text-2xl font-bold text-brand">{totalBudget.toFixed(2)} SOL</div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Estimated Yield</div>
            <div className="text-2xl font-bold text-success flex items-center gap-2">
              +{totalYield.toFixed(6)} SOL
              <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase">Mock</span>
            </div>
          </div>
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <div className="text-sm font-medium text-muted-foreground mb-1">Total Payouts</div>
            <div className="text-2xl font-bold text-warning">{totalUsed.toFixed(2)} SOL</div>
          </div>
        </div>

        <h2 className="text-xl font-bold mb-4">Your Tasks</h2>
        {activeTasks.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-card">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-semibold mb-2">No active tasks</h3>
            <p className="text-muted-foreground mb-6">Create a task to deposit SOL and start rewarding your sales team.</p>
            <Link href="/tasks/new" className="text-brand hover:underline font-medium">Create your first task →</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTasks.map(task => (
              <Link key={task.id} href={`/tasks/${task.id}`} className="group bg-card border border-border p-6 rounded-2xl hover:border-brand/40 transition-colors shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-lg group-hover:text-brand transition-colors">{task.title}</h3>
                  <span className="bg-brand/10 text-brand text-xs font-semibold px-2.5 py-1 rounded-full">
                    {task.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-6 h-10">
                  {task.description || "No description provided."}
                </p>
                <div className="flex items-center justify-between pt-4 border-t border-border-low">
                  <div>
                    <div className="text-xs text-muted-foreground">Reward</div>
                    <div className="font-semibold">{task.reward_amount} SOL/mtg</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Remaining Budget</div>
                    <div className="font-semibold">{(task.budget_total - task.budget_used).toFixed(2)} SOL</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ClientOnly>
  );
}
