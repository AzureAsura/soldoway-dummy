"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import type { Task } from "@/types";

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = usePrivy();

  const { data: task, isLoading, refetch } = useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json();
    },
    enabled: Boolean(id),
  });

  async function handleWithdraw() {
    if (!task || !user) return;
    try {
      toast("Initiating withdrawal...");
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: task.id, businessId: user.id }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to withdraw");
      }

      toast.success("Successfully withdrew remaining funds!");
      refetch();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Withdrawal failed");
    }
  }

  if (isLoading) return <div className="p-8 text-center animate-pulse">Loading task...</div>;
  if (!task) return <div className="p-8 text-center">Task not found.</div>;

  const remaining = task.budget_total - task.budget_used;

  return (
    <div className="max-w-4xl mx-auto p-8 animate-fade-in">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
          <p className="text-muted-foreground">{task.description}</p>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${task.status === "ACTIVE" ? "bg-brand/10 text-brand" : "bg-muted border border-border"}`}>
            {task.status}
          </span>
          <div className="mt-2 text-sm">Escrow: <span className="font-mono">{task.escrow_pda.slice(0, 8)}...</span></div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-10">
        <div className="bg-card border border-border p-5 rounded-xl text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-1">Total Budget</div>
          <div className="text-2xl font-bold">{task.budget_total} SOL</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-1">Paid Out</div>
          <div className="text-2xl font-bold text-success">{task.budget_used} SOL</div>
        </div>
        <div className="bg-card border border-border p-5 rounded-xl text-center">
          <div className="text-xs text-muted-foreground font-semibold uppercase mb-1">Remaining</div>
          <div className="text-2xl font-bold text-brand">{remaining.toFixed(2)} SOL</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Meetings Logged</h2>
        {task.status === "ACTIVE" && remaining > 0 && user?.id === task.business_id && (
          <button 
            onClick={handleWithdraw}
            className="text-sm border border-destructive text-destructive hover:bg-destructive/10 px-4 py-2 rounded-lg transition-colors font-medium"
          >
            Withdraw Remaining Funds
          </button>
        )}
      </div>

      {task.meetings && task.meetings.length > 0 ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-secondary text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Prospect</th>
                <th className="px-6 py-4 font-medium">Sales Rep</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {task.meetings.map(m => (
                <tr key={m.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-6 py-4 font-medium">{m.prospect_name}</td>
                  <td className="px-6 py-4 font-mono text-xs">{m.sales_id.slice(0, 8)}...</td>
                  <td className="px-6 py-4">{new Date(m.scheduled_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    {m.status === "DONE" ? (
                      <span className={m.outcome === "PRODUCTIVE" ? "text-success font-semibold" : "text-muted-foreground"}>
                        {m.outcome?.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-warning">Pending</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {m.payout ? (
                      <span className="text-brand font-medium">{m.payout.amount} SOL</span>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center p-8 border border-dashed border-border rounded-xl text-muted-foreground">
          No meetings logged by sales reps yet.
        </div>
      )}
    </div>
  );
}
