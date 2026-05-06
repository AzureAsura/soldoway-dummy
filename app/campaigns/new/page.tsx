"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import bs58 from "bs58";

const CATEGORIES = [
  "SaaS", "Fintech", "Healthcare", "E-commerce", "Real Estate",
  "Education", "Logistics", "HR & Recruiting", "Marketing", "Other",
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const queryClient = useQueryClient();
  const { data: balance } = useWalletBalance();

  // Auth guard
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
    }
  }, [ready, authenticated, router]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: "",
    company: "",
    category: "",
    description: "",
    reward_per_meeting: "",
    meeting_capacity: "",
    budget_total: "",
  });

  const reward = parseFloat(form.reward_per_meeting) || 0;
  const capacity = parseInt(form.meeting_capacity) || 0;
  const budget = parseFloat(form.budget_total) || 0;
  const minBudget = reward * capacity;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Not authenticated");

    if (isNaN(reward) || reward <= 0) return toast.error("Reward per meeting must be > 0");
    if (isNaN(capacity) || capacity <= 0) return toast.error("Meeting capacity must be > 0");
    if (isNaN(budget) || budget <= 0) return toast.error("Total budget must be > 0");
    if (budget < minBudget) {
      return toast.error(`Budget must be at least ${minBudget.toFixed(4)} SOL (${capacity} meetings × ${reward} SOL)`);
    }
    const FEE_RESERVE = 0.002; // Reserve for tx fees (Phantom adds ComputeBudget instructions)
    if (balance !== undefined && budget + FEE_RESERVE > balance) {
      return toast.error(
        `Insufficient balance. You need ${(budget + FEE_RESERVE).toFixed(4)} SOL (${budget} SOL deposit + ~${FEE_RESERVE} SOL fees). You have ${balance.toFixed(4)} SOL.`
      );
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating campaign on-chain…");

    try {
      // Create a random Keypair to act as the PDA for Devnet testing
      const { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
      const escrowKeypair = Keypair.generate();
      const mockPda = escrowKeypair.publicKey.toBase58();
      
      let txSignature = "mock_tx_" + Date.now();

      // Only attempt real transaction if user has a connected solana wallet
      if (wallets && wallets.length > 0) {
        try {
          const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
          const connection = new Connection(rpcUrl, "confirmed");
          const lamports = Math.floor(budget * 1e9);
          const { blockhash } = await connection.getLatestBlockhash("confirmed");

          // Prefer Phantom external wallet; wallets[0] is Privy embedded which fails
          const phantomWallet = wallets.find(
            (w) => (w as any).walletClientType === "phantom" || (w as any).wallet?.name?.toLowerCase?.().includes("phantom")
          );
          const wallet = phantomWallet ?? wallets[0];

          const messageV0 = new TransactionMessage({
            payerKey: new PublicKey(wallet.address),
            recentBlockhash: blockhash,
            instructions: [
              SystemProgram.transfer({
                fromPubkey: new PublicKey(wallet.address),
                toPubkey: escrowKeypair.publicKey,
                lamports,
              }),
            ],
          }).compileToV0Message();

          const tx = new VersionedTransaction(messageV0);

          // Use window.phantom.solana directly.
          // IMPORTANT: use signTransaction (not signAndSendTransaction) so WE control
          // which RPC endpoint sends the tx — Phantom may be on mainnet which would
          // reject a devnet blockhash and throw "Unexpected error".
          const phantomProvider = (window as any).phantom?.solana ?? (window as any).solana;
          if (phantomProvider?.isPhantom) {
            if (!phantomProvider.isConnected) await phantomProvider.connect();
            // Phantom signs only — no network send yet
            const signedTx = await phantomProvider.signTransaction(tx);
            // We send via our devnet RPC
            const rawBytes = signedTx.serialize();
            txSignature = await connection.sendRawTransaction(rawBytes, {
              skipPreflight: false,
              preflightCommitment: "confirmed",
              maxRetries: 3,
            });
          } else {
            // Fallback: Privy Wallet Standard (for embedded or non-Phantom wallets)
            const txBytes = tx.serialize();
            const result = await signAndSendTransaction({
              transaction: txBytes,
              wallet,
              chain: "solana:devnet",
            });
            txSignature =
              typeof result.signature === "string"
                ? result.signature
                : bs58.encode(result.signature);
          }

          console.log("Transaction result signature:", txSignature);
          await connection.confirmTransaction(txSignature, "confirmed");
        } catch (txErr: any) {
          console.error("Full transaction error:", txErr);
          throw new Error("On-chain deposit failed: " + (txErr.message || "Unknown error"));
        }
      } else {
        toast.info("No active wallet connection found. Using mock transaction.");
      }

      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: user.id,
          title: form.title,
          company: form.company,
          category: form.category,
          description: form.description || undefined,
          reward_per_meeting: reward,
          meeting_capacity: capacity,
          budget_total: budget,
          escrowPda: mockPda,
          txSignature: txSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create campaign");

      const explorerUrl = `https://explorer.solana.com/tx/${txSignature}?cluster=devnet`;
      toast.success("Campaign created!", {
        id: toastId,
        description: `${budget} SOL deposited into escrow.`,
        action: {
          label: "View",
          onClick: () => window.open(explorerUrl),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["business-campaigns", user.id] });
      router.push("/dashboard/business");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error("Failed to create campaign", { id: toastId, description: msg });
    } finally {
      setIsSubmitting(false);
    }
  }

  const field = (
    label: string,
    key: keyof typeof form,
    props?: React.InputHTMLAttributes<HTMLInputElement>
  ) => (
    <div>
      <label className="block text-sm font-medium mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand transition-shadow"
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Campaign</h1>
        <p className="text-muted-foreground">
          Deposit SOL into escrow and reward your sales team for every productive meeting.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-border rounded-2xl p-7 shadow-sm space-y-6"
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Campaign Details
          </h2>
          {field("Campaign Title *", "title", {
            required: true,
            placeholder: "e.g., Enterprise SaaS Q3 Outreach",
          })}
          <div className="grid grid-cols-2 gap-4">
            {field("Company *", "company", {
              required: true,
              placeholder: "e.g., Acme Corp",
            })}
            <div>
              <label className="block text-sm font-medium mb-1.5">Category *</label>
              <select
                required
                className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
                value={form.category}
                onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
              >
                <option value="">Select category…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Description</label>
            <textarea
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 min-h-[100px] focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder="What counts as a productive meeting? Any requirements for the sales rep?"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
        </div>

        {/* Escrow Config */}
        <div className="space-y-4 pt-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Escrow & Rewards
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {field("Payout per Meeting (SOL) *", "reward_per_meeting", {
              required: true,
              type: "number",
              step: "0.001",
              min: "0.001",
              placeholder: "0.5",
            })}
            {field("Meeting Capacity *", "meeting_capacity", {
              required: true,
              type: "number",
              min: "1",
              step: "1",
              placeholder: "20",
            })}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Total Vault Deposit (SOL) *
            </label>
            <input
              required
              type="number"
              step="0.001"
              min="0.001"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand"
              placeholder={minBudget > 0 ? `Min: ${minBudget.toFixed(3)}` : "10.0"}
              value={form.budget_total}
              onChange={(e) => setForm((p) => ({ ...p, budget_total: e.target.value }))}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
              <span>
                Min required:{" "}
                <span className={budget < minBudget && minBudget > 0 ? "text-destructive font-semibold" : ""}>
                  {minBudget > 0 ? `${minBudget.toFixed(4)} SOL` : "—"}
                </span>
              </span>
              <span>
                Your balance:{" "}
                <span className={balance !== undefined && budget > balance ? "text-destructive font-semibold" : ""}>
                  {balance?.toFixed(4) ?? "…"} SOL
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Summary */}
        {reward > 0 && capacity > 0 && budget >= minBudget && (
          <div className="bg-brand/5 border border-brand/20 rounded-xl p-4 text-sm space-y-1">
            <div className="font-semibold text-brand mb-2">Campaign Summary</div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Max meetings rewarded</span>
              <span className="font-medium">{capacity}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Reward per meeting</span>
              <span className="font-medium">{reward} SOL</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total escrowed</span>
              <span className="font-bold">{budget} SOL</span>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand hover:bg-brand-dark text-white font-bold py-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base"
        >
          {isSubmitting ? "Creating Campaign…" : "Deposit & Create Campaign →"}
        </button>
      </form>
    </div>
  );
}
