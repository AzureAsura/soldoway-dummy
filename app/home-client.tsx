"use client";

import { FloatingLogo } from "@/components/landing/FloatingLogo";
import { SoldowayCycle } from "@/components/landing/SoldowayCycle";
import { FeatureCarousel } from "@/components/landing/FeatureCarousel";
import { EfficiencyGap } from "@/components/landing/EfficiencyGap";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import FAQ from "@/components/landing/FAQ";
import Core from "@/components/landing/Core";
import { LiveYieldCounter } from "@/components/landing/LiveYieldCounter";

type FooterLink = {
  label: string;
  url: string;
};

function FooterColumn({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <p className="font-sans font-black text-xs md:text-sm text-white uppercase tracking-widest mb-4">{title}</p>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs md:text-sm text-white/60 hover:text-[#6be1d9] transition-colors duration-150"
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

        <div className="w-8 h-8 border-4 border-black border-t-[#6be1d9] rounded-full animate-spin" />
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
    <main className="min-h-screen bg-[#6be1d9]/5 text-black overflow-x-hidden selection:bg-black selection:text-[#6be1d9] font-sans antialiased">

      <section className="relative pb-20 pt-36 overflow-hidden border-b-2 border-black bg-white">
        <div className="max-w-6xl px-4 md:px-6 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-start text-left z-10"
          >
            <div className="mb-4 px-3 py-1 bg-[#6be1d9] border-2 border-black rounded-[6px] text-xs font-black uppercase tracking-widest shadow-[2px_2px_0px_0px_#000]">
              SOLANA ESCROW NETWORK
            </div>

            <h1 className="font-black text-4xl md:text-5xl lg:text-6xl tracking-tight uppercase leading-[1.05] mb-6 text-black">
              Scalable Sales.<br />
              Programmable Payouts.
            </h1>

            <p className="font-bold text-sm md:text-base text-black/80 max-w-xl mb-8 leading-relaxed">
              Build a high-performance B2B sales engine on Solana. Deposit USDC,
              automate instant payouts for booked meetings, and earn DeFi yield on
              your idle capital — 100% gasless.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
              <button
                id="cta-get-started"
                onClick={handleGetStarted}
                disabled={!ready}
                className="inline-flex items-center justify-center gap-2 bg-[#6be1d9] text-black border-2 border-black font-black text-sm uppercase tracking-widest px-6 py-4 rounded-[12px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-40"
              >
                Get Started <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>

              <button
                id="cta-dashboard"
                onClick={handleDashboard}
                disabled={!ready}
                className="inline-flex items-center justify-center gap-2 bg-white text-black border-2 border-black font-black text-sm uppercase tracking-widest px-6 py-4 rounded-[12px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] disabled:opacity-40"
              >
                View Dashboard
              </button>
            </div>
          </motion.div>

          <div className="w-full flex justify-center lg:justify-end">
            <FloatingLogo />
          </div>
        </div>
      </section>

      <LiveYieldCounter />
      <SoldowayCycle />
      <FeatureCarousel />
      <EfficiencyGap />
      <Core />
      <FAQ />

      <footer className="bg-black text-white border-t-4 border-black font-sans antialiased">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4">

          <div className="flex flex-col items-start md:pr-8 pb-6 md:pb-0 border-b-2 border-white/20 md:border-b-0 md:border-r-2 md:border-white/20">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-[6px] bg-white border-2 border-black flex items-center justify-center text-black text-sm font-black shadow-[2px_2px_0px_0px_#6be1d9]">
                S
              </span>
              <span className="font-black text-xl uppercase tracking-wider text-white">
                Soldoway
              </span>
            </div>
            <p className="font-mono text-white/60 text-xs mt-4 leading-relaxed max-w-[220px]">
              Sales rewards, on-chain. Powered by Solana.
            </p>
          </div>

          <div className="md:pl-8 pb-6 md:pb-0 border-b-2 border-white/20 md:border-b-0 md:border-r-2 md:border-white/20">
            <FooterColumn
              title="Product"
              links={[
                { label: "How It Works", url: "/" },
                { label: "Features", url: "/" },
                { label: "Infrastructure", url: "/" }
              ]}
            />
          </div>

          <div className="md:pl-8">
            <FooterColumn
              title="Connect"
              links={[
                { label: "Twitter / X", url: "https://x.com/soldoway_sales" },
                { label: "GitHub", url: "https://github.com/wayphantomme/soldoway-v2" },
              ]}
            />
          </div>

        </div>

        <div className="border-t-2 border-black py-4 px-4 text-center font-mono text-white/40 text-[10px] uppercase tracking-widest bg-zinc-950">
          © {new Date().getFullYear()} Soldoway Platform. All Rights Reserved.
        </div>
      </footer>

    </main>
  );
}