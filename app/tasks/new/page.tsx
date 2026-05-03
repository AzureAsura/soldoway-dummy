"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useWalletBalance } from "@/hooks/use-wallet-balance";

export default function NewTaskPage() {
  const router = useRouter();
  const { user } = usePrivy();
  const { data: balance } = useWalletBalance();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reward_amount: "",
    budget_total: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Not authenticated");
    
    const reward = parseFloat(formData.reward_amount);
    const budget = parseFloat(formData.budget_total);

    if (isNaN(reward) || isNaN(budget) || reward <= 0 || budget <= 0) {
      return toast.error("Amounts must be greater than 0");
    }
    if (reward > budget) {
      return toast.error("Reward cannot exceed total budget");
    }
    if (balance !== undefined && budget > balance) {
      return toast.error("Insufficient SOL balance");
    }

    setIsSubmitting(true);
    try {
      // 1. TODO (Step 3): Call on-chain create_task() instruction
      // const tx = await program.methods.createTask(new BN(budget * 1e9), new BN(reward * 1e9)).rpc();
      // const escrowPda = deriveEscrowPDA(taskId);
      
      // Mock PDA for now
      const mockPda = "EscrowMockPdaAddress1111111111111111111111111";

      // 2. Save to database
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          reward_amount: reward,
          budget_total: budget,
          businessId: user.id,
          escrowPda: mockPda,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create task");
      }

      toast.success("Task created and SOL deposited to escrow!");
      router.push("/dashboard/business");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 animate-fade-in">
      <h1 className="text-3xl font-bold mb-2">Create New Task</h1>
      <p className="text-muted-foreground mb-8">
        Deposit SOL into escrow to automatically reward sales reps for productive meetings.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <label className="block text-sm font-medium mb-2">Campaign Title</label>
          <input
            type="text"
            required
            className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="e.g., Enterprise SaaS Pitches Q3"
            value={formData.title}
            onChange={(e) => setFormData(p => ({ ...p, title: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description / Requirements</label>
          <textarea
            className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand"
            placeholder="Explain what counts as a productive meeting..."
            value={formData.description}
            onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Reward per Meeting (SOL)</label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="0.5"
              value={formData.reward_amount}
              onChange={(e) => setFormData(p => ({ ...p, reward_amount: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Total Budget (SOL)</label>
            <input
              type="number"
              required
              step="0.01"
              min="0.01"
              className="w-full bg-input/50 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="10.0"
              value={formData.budget_total}
              onChange={(e) => setFormData(p => ({ ...p, budget_total: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Available balance: {balance?.toFixed(4) || "0.00"} SOL
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand hover:bg-brand-dark text-white font-semibold py-4 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Depositing SOL..." : "Deposit Escrow & Create Task"}
        </button>
      </form>
    </div>
  );
}
