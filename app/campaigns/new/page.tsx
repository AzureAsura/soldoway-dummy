"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignAndSendTransaction } from "@privy-io/react-auth/solana";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useWalletBalance } from "@/hooks/use-wallet-balance";
import bs58 from "bs58";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ArrowRight, CalendarCheck, CreditCard } from "lucide-react";

type PrivyWalletLike = { walletClientType?: string; wallet?: { name?: string } };
type PhantomProvider = {
  isPhantom?: boolean;
  isConnected?: boolean;
  connect: () => Promise<void>;
  signTransaction: (tx: import("@solana/web3.js").VersionedTransaction) => Promise<import("@solana/web3.js").VersionedTransaction>;
};
type WindowWithPhantom = Window & { phantom?: { solana?: PhantomProvider }; solana?: PhantomProvider };

const CATEGORIES = [
  "DeFi", "NFT", "AI", "CEX", "DEX", "Infra", "Security",
];

export default function NewCampaignPage() {
  const router = useRouter();
  const { user, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { signAndSendTransaction } = useSignAndSendTransaction();
  const queryClient = useQueryClient();
  const { data: balance } = useWalletBalance();

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
    budget_total: "",
  });

  const reward = parseFloat(form.reward_per_meeting) || 0;
  const budget = parseFloat(form.budget_total) || 0;
  const capacity = reward > 0 && budget > 0 ? Math.floor(budget / reward) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return toast.error("Not authenticated");

    if (isNaN(reward) || reward <= 0) return toast.error("Reward per meeting must be > 0");
    if (isNaN(budget) || budget <= 0) return toast.error("Total budget must be > 0");
    if (budget < reward) return toast.error("Budget must cover at least 1 meeting reward");
    const FEE_RESERVE = 0.002;
    if (balance !== undefined && budget + FEE_RESERVE > balance) {
      return toast.error(
        `Insufficient balance. You need ${(budget + FEE_RESERVE).toFixed(4)} SOL (${budget} SOL deposit + ~${FEE_RESERVE} SOL fees). You have ${balance.toFixed(4)} SOL.`
      );
    }

    setIsSubmitting(true);
    const toastId = toast.loading("Creating campaign on-chain…");

    try {
      // Deposit goes directly to the server wallet which acts as escrow custodian on Devnet.
      // This ensures the server wallet always has funds to pay out approved meetings.
      const { Connection, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } = await import("@solana/web3.js");
      const serverWalletAddress = process.env.NEXT_PUBLIC_SERVER_WALLET_ADDRESS;
      if (!serverWalletAddress) throw new Error("Server wallet address not configured");
      const mockPda = serverWalletAddress;

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
            (w) => (w as PrivyWalletLike).walletClientType === "phantom" || (w as PrivyWalletLike).wallet?.name?.toLowerCase?.().includes("phantom")
          );
          const wallet = phantomWallet ?? wallets[0];

          const messageV0 = new TransactionMessage({
            payerKey: new PublicKey(wallet.address),
            recentBlockhash: blockhash,
            instructions: [
              SystemProgram.transfer({
                fromPubkey: new PublicKey(wallet.address),
                toPubkey: new PublicKey(serverWalletAddress),
                lamports,
              }),
            ],
          }).compileToV0Message();

          const tx = new VersionedTransaction(messageV0);

          // Use window.phantom.solana directly.
          // IMPORTANT: use signTransaction (not signAndSendTransaction) so WE control
          // which RPC endpoint sends the tx — Phantom may be on mainnet which would
          // reject a devnet blockhash and throw "Unexpected error".
          const phantomProvider = (window as WindowWithPhantom).phantom?.solana ?? (window as WindowWithPhantom).solana;
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
        } catch (txErr: unknown) {
          console.error("Full transaction error:", txErr);
          const msg = txErr instanceof Error ? txErr.message : "Unknown error";
          throw new Error("On-chain deposit failed: " + msg);
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

  const neoInput =
    "w-full border-2 border-black rounded-[15px] bg-white px-4 py-3 text-black text-sm font-medium focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-all placeholder:text-black/30";

  return (
    <SidebarLayout role="BUSINESS">
      <div className="bg-[#f0fdfa] min-h-full p-6 md:p-8 animate-fade-in">
        <div className=" mx-auto py-4">

          <div className="mb-8">
            <h1 className="text-[40px] md:text-[48px] leading-[52px] md:leading-[56px] font-black text-black tracking-tight uppercase mb-2">
              Create Campaign
            </h1>
            <p className="text-black text-lg font-bold leading-relaxed">
              Deposit SOL into escrow and reward your sales team for every productive meeting.
            </p>
          </div>

          <div className="bg-white border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] overflow-hidden">
            <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">

              <section className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-black text-black uppercase tracking-widest">
                    Campaign Details
                  </h3>
                  <div className="h-0.5 bg-black mt-3 mb-6" />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-black uppercase tracking-widest">
                    Campaign Title <span className="text-[#FF4D50]">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    className={neoInput}
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-black uppercase tracking-widest">
                      Company <span className="text-[#FF4D50]">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className={neoInput}
                      value={form.company}
                      onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-black uppercase tracking-widest">
                      Category <span className="text-[#FF4D50]">*</span>
                    </label>
                    <select
                      required
                      className={neoInput}
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

                {/* Description */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-black uppercase tracking-widest">
                    Description
                  </label>
                  <textarea
                    rows={4}
                    className={`${neoInput} resize-none`}
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  />
                </div>
              </section>

              <section className="space-y-6">
                <div>
                  <h3 className="text-[11px] font-black text-black uppercase tracking-widest">
                    Escrow &amp; Rewards
                  </h3>
                  <div className="h-0.5 bg-black mt-3 mb-6" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-black uppercase tracking-widest">
                      Payout per Meeting <span className="text-[#FF4D50]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        step="0.001"
                        min="0.001"
                        placeholder="0.5"
                        className={`${neoInput} pr-16`}
                        value={form.reward_per_meeting}
                        onChange={(e) => setForm((p) => ({ ...p, reward_per_meeting: e.target.value }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold bg-[#6be1d9] border-2 border-black px-2 py-0.5 text-xs rounded-[15px] pointer-events-none">
                        SOL
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-bold text-black uppercase tracking-widest">
                      Total Vault Deposit <span className="text-[#FF4D50]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        required
                        type="number"
                        step="0.001"
                        min="0.001"
                        placeholder="10.0"
                        className={`${neoInput} pr-16`}
                        value={form.budget_total}
                        onChange={(e) => setForm((p) => ({ ...p, budget_total: e.target.value }))}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold bg-[#6be1d9] border-2 border-black px-2 py-0.5 text-xs rounded-[15px] pointer-events-none">
                        SOL
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-bold text-black uppercase tracking-widest">
                    Meeting Capacity{" "}
                    <span className="ml-1 text-[10px] font-medium normal-case tracking-normal text-black/50">
                      (auto-calculated)
                    </span>
                  </label>
                  <div className="w-full bg-[#6be1d9] border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">

                    <div className="relative z-10">
                      <span className="font-black text-3xl md:text-[40px] leading-none block uppercase text-black">
                        {capacity > 0 ? `${capacity} meetings` : "0 meetings"}
                      </span>
                      <span className="mt-2 inline-block text-[11px] font-bold bg-white/40 border-2 border-black/10 px-2 py-0.5 rounded-[15px] text-black">
                        Current balance:{" "}
                        <span className={
                          balance !== undefined && budget > balance
                            ? "text-[#FF4D50]"
                            : "font-black"
                        }>
                          {balance?.toFixed(4) ?? "…"} SOL
                        </span>
                      </span>
                    </div>
                    
                    <div className="relative z-10 bg-white border-2 border-black rounded-[15px] shadow-[2px_2px_0px_0px_#000] p-3 text-right shrink-0">
                      <p className="font-mono text-sm font-bold text-black mb-1">
                        {capacity > 0
                          ? `${reward} SOL × ${capacity} = ${(reward * capacity).toFixed(4)} SOL`
                          : "Enter values to calculate"}
                      </p>
                      <p className="font-mono text-sm font-black text-black">
                        = floor({budget > 0 ? budget : "deposit"} ÷ {reward > 0 ? reward : "reward"})
                      </p>
                    </div>
                    {/* Decorative circle */}
                    <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-black/5 rounded-full border-4 border-black/10 pointer-events-none" />
                  </div>
                </div>
              </section>

              {/* Campaign Summary */}
              {reward > 0 && capacity > 0 && budget >= reward && (
                <div className="bg-[#FACC00] border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] px-5 py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-x-6 gap-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-black">
                      <CalendarCheck size={16} className="text-black" />
                      <span>
                        Max meetings:{" "}
                        <strong className="bg-black text-[#FACC00] px-2 py-0.5 rounded-[15px] font-bold">
                          {capacity}
                        </strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm font-bold text-black">
                      <CreditCard size={16} className="text-black" />
                      <span>
                        Reward/meeting:{" "}
                        <strong className="bg-black text-[#FACC00] px-2 py-0.5 rounded-[15px] font-bold">
                          {reward} SOL
                        </strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-black uppercase">Total escrowed:</span>
                    <span className="font-black text-black text-lg bg-white border-2 border-black px-4 py-1 rounded-[15px] shadow-[2px_2px_0px_0px_#000]">
                      {budget} SOL
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white font-black border-2 border-black rounded-[15px] shadow-[4px_4px_0px_0px_#000] py-5 text-base flex items-center justify-center gap-3 uppercase tracking-wider transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating Campaign…
                  </>
                ) : (
                  <>
                    Deposit &amp; Create Campaign
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* ── Footer Branding ─────────────────────────────────────── */}
          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold text-black bg-[#6be1d9]/20 border-2 border-black px-2 py-0.5 rounded-[15px]">
                Secured by Solana Ledger
              </span>
              <span className="w-2 h-2 bg-black rounded-full" />
              <span className="text-[11px] font-bold text-black bg-[#6be1d9]/20 border-2 border-black px-2 py-0.5 rounded-[15px]">
                Non-Custodial Escrow
              </span>
            </div>
            <p className="text-[11px] text-black font-black uppercase tracking-widest">
              © 2026 Soldoway Terminal
            </p>
          </div>

        </div>
      </div>
    </SidebarLayout>
  );
}
