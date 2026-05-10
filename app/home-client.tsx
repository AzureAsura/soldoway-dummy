"use client";

import { FloatingLogo } from "@/components/FloatingLogo";
import { SoldowayCycle } from "@/components/SoldowayCycle";
import { FeatureCarousel } from "@/components/FeatureCarousel";
import { EfficiencyGap } from "@/components/EfficiencyGap";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import FAQ from "@/components/FAQ";
import Core from "@/components/Core";
import { LiveYieldCounter } from "@/components/LiveYieldCounter";

type FooterLink = {
  label: string;
  url: string;
};

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="font-heading font-semibold text-sm text-white/80 mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.url}
              target="_blank" // Opsional: buka di tab baru untuk link sosmed
              rel="noopener noreferrer" // Keamanan saat pakai target="_blank"
              className="font-body text-sm text-white/40 hover:text-white/80 transition-colors duration-150"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomeClient() {
  const { ready, authenticated, login, user } = usePrivy();
  const router = useRouter();

  const { data: roleData } = useQuery({
    queryKey: ["user-role", user?.id],
    queryFn: async () => {
      const r = await fetch(`/api/users/me?id=${encodeURIComponent(user!.id)}`);
      return r.ok ? r.json() : null;
    },
    enabled: Boolean(authenticated && user?.id),
  });
  const role: string | null = roleData?.role ?? null;

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    if (roleData === undefined) return;

    if (roleData?.role === "SALES") {
      router.replace("/dashboard/sales");
    } else if (roleData?.role === "BUSINESS") {
      router.replace("/dashboard/business");
    } else {
      router.replace("/onboarding");
    }
  }, [ready, authenticated, user?.id, roleData, router]);

  if (!ready || authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function handleGetStarted() {
    if (!authenticated) { login(); return; }
    if (role === "SALES") router.push("/tasks");
    else if (role === "BUSINESS") router.push("/campaigns/new");
    else router.push("/onboarding");
  }

  function handleDashboard() {
    if (!authenticated) { login(); return; }
    if (role === "SALES") router.push("/dashboard/sales");
    else if (role === "BUSINESS") router.push("/dashboard/business");
    else router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white text-foreground overflow-x-hidden selection:bg-foreground selection:text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative px-6 pb-20 pt-36 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start text-left z-10"
          >
            <h1 className="font-heading font-extrabold text-5xl md:text-6xl lg:text-7xl tracking-[-0.03em] leading-[1.05] mb-6 text-foreground">
              Scalable Sales.<br />
              Programmable Payouts.
            </h1>

            <p className="font-body text-lg text-muted max-w-xl mb-10 leading-relaxed">
              Build a high-performance B2B sales engine on Solana. Deposit USDC,
              automate instant payouts for booked meetings, and earn DeFi yield on
              your idle capital — 100% gasless.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <button
                id="cta-get-started"
                onClick={handleGetStarted}
                disabled={!ready}
                className="inline-flex items-center justify-center gap-2 bg-black text-white font-heading font-semibold px-7 py-4 rounded-full transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
              >
                Get Started <ArrowRight className="w-5 h-5" />
              </button>

              <button
                id="cta-dashboard"
                onClick={handleDashboard}
                disabled={!ready}
                className="inline-flex items-center justify-center gap-2 bg-white border border-border text-foreground font-heading font-semibold px-7 py-4 rounded-full transition-all duration-200 hover:bg-surface hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50"
              >
                View Dashboard
              </button>
            </div>
          </motion.div>

          <FloatingLogo />
        </div>
      </section>

      <LiveYieldCounter />

      <SoldowayCycle />
      <FeatureCarousel />
      <EfficiencyGap />
      <Core />
      <FAQ />


      <footer className="bg-surface-dark text-white border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-2 md:grid-cols-3 gap-10">

          {/* Kolom 1: Branding */}
          <div className="col-span-2 md:col-span-1">
            <span className="font-heading font-bold text-xl">Soldoway</span>
            <p className="font-body text-white/50 text-sm mt-3 leading-relaxed max-w-[200px]">
              Sales rewards, on-chain. Powered by Solana.
            </p>
          </div>

          <FooterColumn
            title="Product"
            links={[
              { label: "How It Works", url: "/" },
              { label: "Features", url: "/" },
              { label: "Infrastructure", url: "/" }
            ]}
          />

          <FooterColumn
            title="Connect"
            links={[
              { label: "Twitter / X", url: "https://x.com/soldoway_sales" },
              { label: "GitHub", url: "https://github.com/wayphantomme/soldoway-v2" },
            ]}
          />

        </div>

        <div className="border-t border-white/10 py-5 px-6 text-center font-body text-white/30 text-xs">
          © {new Date().getFullYear()} Soldoway Platform. All Rights Reserved.
        </div>
      </footer>

    </main>
  );
}
