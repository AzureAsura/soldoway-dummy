"use client";

import { FloatingLogo } from "@/components/FloatingLogo";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomeClient() {
  const { ready, authenticated, login, user } = usePrivy();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  // Fetch role once authenticated
  useEffect(() => {
    if (!authenticated || !user?.id) {
      setRole(null);
      return;
    }
    fetch(`/api/users/me?id=${encodeURIComponent(user.id)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => { });
  }, [authenticated, user?.id]);

  function handleGetStarted() {
    if (!authenticated) {
      login();
      return;
    }
    if (role === "SALES") router.push("/tasks");
    else if (role === "BUSINESS") router.push("/campaigns/new");
    else router.push("/onboarding");
  }

  function handleDashboard() {
    if (!authenticated) {
      login();
      return;
    }
    if (role === "SALES") router.push("/dashboard/sales");
    else if (role === "BUSINESS") router.push("/dashboard/business");
    else router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
      {/* Hero Section */}
      {/* <section className="px-6 py-24 md:py-32 flex flex-col items-center text-center max-w-5xl mx-auto animate-fade-in">


        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Sales rewards, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-500">on-chain.</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Business deposit SOL into escrow. Sales log meetings. Smart contracts
          automatically reward productive calls — trustless, instant, transparent.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center w-full max-w-md mx-auto">
          <button
            id="cta-get-started"
            onClick={handleGetStarted}
            disabled={!ready}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white font-bold px-8 py-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get Started →
          </button>
          <button
            id="cta-dashboard"
            onClick={handleDashboard}
            disabled={!ready}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-black font-bold px-8 py-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            View Dashboard
          </button>
        </div>
      </section> */}

      <section className="relative px-4 pt-32 pb-24 md:pt-48 md:pb-40 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          <div className="flex flex-col items-start text-left z-10 animate-fade-in">
            <h1 className="text-5xl md:text-[84px] font-black tracking-[-0.04em] leading-[0.95] mb-8 text-[#111111]">
              Scalable Sales.<br />
              Programmable Payouts.
            </h1>

            <p className="text-lg md:text-xl text-gray-500 max-w-lg mb-10 leading-snug font-medium">
              Stop letting your marketing budget sit idle. Build a high-performance B2B sales engine on Solana. Deposit USDC, automate instant payouts for booked meetings, and earn DeFi yield on your capital. 100% Gasless.
            </p>

            <div className="flex flex-col w-full max-w-md gap-4">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  id="cta-get-started"
                  onClick={handleGetStarted}
                  disabled={!ready}
                  className="flex-1 bg-black text-white font-bold px-8 py-5 rounded-2xl transition-all active:scale-95 disabled:opacity-50"
                >
                  Get Started
                </button>

                <button
                  id="cta-dashboard"
                  onClick={handleDashboard}
                  disabled={!ready}
                  className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-black font-bold px-8 py-5 rounded-2xl transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                >
                  View Dashboard
                </button>
              </div>
            </div>
          </div>

          <FloatingLogo />


        </div>
      </section>

      <section className="px-6 py-20 bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">The Efficiency Gap</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Why the traditional sales reward model is broken, and how Soldoway fixes it.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white p-8 md:p-10 rounded-2xl border border-gray-200 shadow-sm">
              <h3 className="text-xl font-bold text-gray-400 mb-6 uppercase tracking-wider">Traditional</h3>
              <ul className="space-y-5 text-gray-600">
                <li className="flex items-start gap-4">
                  <span className="text-red-500 text-xl leading-none">✕</span>
                  <span className="leading-snug">Manual and slow payout processing</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-red-500 text-xl leading-none">✕</span>
                  <span className="leading-snug">Lack of transparency in reward calculation</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-red-500 text-xl leading-none">✕</span>
                  <span className="leading-snug">Prone to manipulation and disputes</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-red-500 text-xl leading-none">✕</span>
                  <span className="leading-snug">Idle budget sits in bank accounts doing nothing</span>
                </li>
              </ul>
            </div>
            <div className="bg-black text-white p-8 md:p-10 rounded-2xl shadow-xl">
              <h3 className="text-xl font-bold text-gray-400 mb-6 uppercase tracking-wider">Soldoway</h3>
              <ul className="space-y-5 text-gray-300">
                <li className="flex items-start gap-4">
                  <span className="text-green-400 text-xl leading-none">✓</span>
                  <span className="text-white font-medium leading-snug">Automated, instant on-chain payouts</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-green-400 text-xl leading-none">✓</span>
                  <span className="text-white font-medium leading-snug">100% transparent smart contract logic</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-green-400 text-xl leading-none">✓</span>
                  <span className="text-white font-medium leading-snug">Trustless execution via escrow</span>
                </li>
                <li className="flex items-start gap-4">
                  <span className="text-green-400 text-xl leading-none">✓</span>
                  <span className="text-white font-medium leading-snug">Idle funds generate yield automatically</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-24 max-w-5xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">How It Works</h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg">A seamless workflow from campaign creation to automated payout.</p>
        </div>
        <div className="grid md:grid-cols-4 gap-8 md:gap-6">
          {[
            { step: "1", title: "Deposit", desc: "Business deposits SOL and creates a campaign." },
            { step: "2", title: "Connect", desc: "Sales browses campaigns and submits prospect meetings." },
            { step: "3", title: "Approve", desc: "Business reviews and approves productive meetings." },
            { step: "4", title: "Earn", desc: "Reward is automatically sent to Sales wallet on-chain." },
          ].map((item) => (
            <div key={item.step} className="bg-white border border-gray-200 p-6 md:p-8 rounded-2xl shadow-sm relative pt-12 text-center hover:border-gray-300 transition-colors">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-black text-white rounded-full flex items-center justify-center text-xl font-bold border-4 border-white shadow-sm">
                {item.step}
              </div>
              <h3 className="font-bold text-lg mb-3 text-black">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core Infrastructure */}
      <section className="px-6 py-24 bg-gray-50 border-y border-gray-200">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Core Infrastructure</h2>
            <p className="text-gray-500 max-w-2xl mx-auto text-lg">Built on cutting-edge Web3 and SaaS technologies.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Solana", desc: "Lightning fast, low cost transactions." },
              { name: "Anchor Framework", desc: "Secure and audited smart contract escrow." },
              { name: "Privy", desc: "Seamless and gasless wallet authentication." },
              { name: "Cal.com", desc: "Native meeting scheduling integration." },
              { name: "Kamino", desc: "Idle fund yield generation on Devnet." },
              { name: "Next.js", desc: "High-performance React application framework." },
            ].map((tech) => (
              <div key={tech.name} className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:border-gray-300 transition-all hover:shadow-md">
                <h3 className="font-bold text-lg mb-2 text-black">{tech.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24 max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {[
            { q: "How is the Business funds secured?", a: "Funds are stored in a smart contract escrow, fully trustless." },
            { q: "Do Sales need SOL to get started?", a: "No, Privy handles gasless transactions." },
            { q: "How does Business verify meetings?", a: "Business reviews meeting data submitted by Sales and manually approves." },
            { q: "Can funds be withdrawn anytime?", a: "Yes, Business can withdraw remaining funds along with yield at any time." },
            { q: "What is yield in Soldoway?", a: "Idle funds are staked to a DeFi protocol to generate passive yield while the campaign is running." },
          ].map((faq, i) => (
            <details key={i} className="group bg-white border border-gray-200 rounded-xl shadow-sm [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer items-center justify-between gap-1.5 p-6 font-bold text-black text-lg">
                {faq.q}
                <span className="shrink-0 transition duration-300 group-open:-rotate-180">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </span>
              </summary>
              <div className="px-6 pb-6 text-gray-600 leading-relaxed border-t border-gray-100 pt-5">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-gray-200 text-center bg-white">
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <span className="font-extrabold text-2xl tracking-tight mb-2 text-black">Soldoway</span>
          <p className="text-sm text-gray-500 mb-6">Sales rewards, on-chain.</p>
          <p className="text-xs text-gray-400">© {new Date().getFullYear()} Soldoway Platform. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
