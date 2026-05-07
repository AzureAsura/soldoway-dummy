"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";

const comparisons = [
  {
    topic: "Capital",
    old: { title: "Capital Stagnation", desc: "Marketing budgets sit idle in banks." },
    new: { title: "Automated DeFi Yield", desc: "Budget grows automatically in DeFi." },
  },
  {
    topic: "Payouts",
    old: { title: "Manual Overhead", desc: "Payouts are slow, manual, and opaque." },
    new: { title: "Instant Smart Payouts", desc: "Payouts are instant and on-chain." },
  },
  {
    topic: "Experience",
    old: { title: 'The "SOL" Hurdle', desc: "High friction, wallets, and gas costs." },
    new: { title: "Zero-Gas Experience", desc: "No wallets or gas required." },
  },
  {
    topic: "Data",
    old: { title: "Opaque Data", desc: "Disconnected B2B networking." },
    new: { title: "API-First Transparency", desc: "Real-time, transparent B2B sync." },
  },
];

export function EfficiencyGap() {
  return (
    <section className="py-24 bg-gray-100 text-black">
      <div className="max-w-6xl mx-auto px-6">
        
        {/* Header - Lebih Rapi */}
        <div className="mb-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            The Efficiency Gap
          </h2>
          <p className="text-lg font-medium text-black/60 max-w-xl mx-auto">
            Replacing legacy friction with high-performance infrastructure.
          </p>
        </div>

        {/* Table - Garis Pinggir & Dalam Solid */}
        <div className="border-[2px] border-black rounded-3xl overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <div className="overflow-x-auto no-scrollbar">
            <div className="min-w-[800px]">
              
              {/* Header Row */}
              <div className="grid grid-cols-12 border-b-[2px] border-black bg-white">
                <div className="col-span-3 py-6 px-8 text-[11px] font-black uppercase tracking-[0.2em]">
                  Comparison
                </div>
                <div className="col-span-4 py-6 px-8 border-l-[2px] border-black bg-[#fafafa]">
                  <div className="flex items-center gap-2">
                    <X size={16} strokeWidth={3} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Traditional Friction</span>
                  </div>
                </div>
                <div className="col-span-5 py-6 px-8 border-l-[2px] border-black bg-white">
                  <div className="flex items-center gap-2 text-black">
                    <Check size={16} strokeWidth={3} />
                    <span className="text-[11px] font-black uppercase tracking-widest">Soldoway Advantage</span>
                  </div>
                </div>
              </div>

              {/* Rows */}
              {comparisons.map((item, i) => (
                <div 
                  key={i}
                  className="grid grid-cols-12 border-b-[2px] border-black last:border-b-0 hover:bg-gray-50/50 transition-colors"
                >
                  {/* Topic */}
                  <div className="col-span-3 py-8 px-8 flex items-center">
                    <span className="text-sm font-bold uppercase tracking-wider">{item.topic}</span>
                  </div>

                  {/* Old Cell */}
                  <div className="col-span-4 py-8 px-10 border-l-[2px] border-black bg-[#fafafa]/50">
                    <h3 className="text-lg font-bold line-through decoration-black/30 decoration-[2px] mb-1">
                      {item.old.title}
                    </h3>
                    <p className="text-sm font-medium text-black/50 leading-relaxed">
                      {item.old.desc}
                    </p>
                  </div>

                  {/* New Cell */}
                  <div className="col-span-5 py-8 px-10 border-l-[2px] border-black bg-white">
                    <h3 className="text-lg font-bold mb-1 tracking-tight">
                      {item.new.title}
                    </h3>
                    <p className="text-sm font-medium text-black/70 leading-relaxed">
                      {item.new.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Swipe Info */}
        <div className="mt-6 flex justify-center lg:hidden">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] border-2 border-black px-4 py-2 rounded-full">
            ← Swipe to Compare →
          </p>
        </div>
      </div>
    </section>
  );
}