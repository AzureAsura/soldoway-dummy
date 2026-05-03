import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Soldoway — Onchain Sales Rewards",
  description:
    "Decentralized B2B sales reward system on Solana. Business deposit SOL, Sales earn rewards for every productive meeting.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="max-w-3xl w-full text-center animate-fade-in">
        {/* Logo / Brand */}
        <div className="inline-flex items-center gap-2 bg-brand/10 border border-brand/20 px-4 py-1.5 rounded-full text-brand text-sm font-medium mb-8">
          <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
          Live on Solana Devnet
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Sales rewards,{" "}
          <span className="gradient-text">on-chain.</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Business deposit SOL into escrow. Sales log meetings. Smart contracts
          automatically reward productive calls — trustless, instant, transparent.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/onboarding"
            id="cta-get-started"
            className="inline-flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark text-white font-semibold px-8 py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand/25"
          >
            Get Started →
          </Link>
          <Link
            href="/dashboard"
            id="cta-dashboard"
            className="inline-flex items-center justify-center gap-2 border border-border bg-card hover:bg-accent text-foreground font-semibold px-8 py-3.5 rounded-xl transition-all duration-200"
          >
            View Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-6 max-w-lg mx-auto">
          {[
            { label: "Avg Reward", value: "0.5 SOL" },
            { label: "Settlement", value: "< 5s" },
            { label: "Fee", value: "0%" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-2xl p-4 text-center"
            >
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
