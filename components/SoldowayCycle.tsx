"use client";

import React from "react";
import { motion } from "framer-motion";
import { Wallet, Cpu, TrendingUp, Handshake } from "lucide-react";

const steps = [
  {
    title: "Business Deposit",
    description: "Securely lock your campaign budget in a transparent smart contract.",
    icon: <Wallet className="w-6 h-6 text-slate-700" />,
    type: "starter",
  },
  {
    title: "DeFi Yield Engine",
    description: "Idle funds are automatically routed to DeFi to generate passive yield.",
    icon: <Cpu className="w-6 h-6 text-slate-700" />,
    type: "engine",
  },
];

const outcomes = [
  {
    title: "Business Having Yield",
    description: "Harnessing the Solana DeFi ecosystem to turn marketing wait-time into measurable capital gains.",
    icon: <TrendingUp className="w-5 h-5 text-green-600" />,
  },
  {
    title: "Business Having B2B Meeting",
    description: "Validated meetings trigger an automatic, real-time payout to the sales partner.",
    icon: <Handshake className="w-5 h-5 text-blue-600" />,
  },
];

export function SoldowayCycle() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header Section */}
        <div className="text-center mb-20">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-[#111] mb-6 tracking-tight"
          >
            The Soldoway Cycle
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="text-gray-500 max-w-2xl mx-auto text-lg font-medium"
          >
            A smart escrow engine that secures your capital, generates passive yield, 
            and automates payouts for successful B2B meetings.
          </motion.p>
        </div>

        {/* Cycle Diagram */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-4">
          
          {/* Step 1 & 2 */}
          <div className="flex flex-col md:flex-row items-center gap-12 z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-8">
                <motion.div 
                  whileHover={{ y: -5 }}
                  className="flex flex-col items-center text-center max-w-[200px]"
                >
                  <div className="w-20 h-20 bg-[#F8FAFC] border border-slate-100 rounded-[2rem] flex items-center justify-center shadow-sm mb-6 transition-all hover:shadow-md hover:bg-white">
                    {step.icon}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.description}</p>
                </motion.div>
                
                {/* Flow Line Connector */}
                <div className="hidden md:block w-16 h-[2px] bg-slate-100 relative">
                  <motion.div 
                    animate={{ left: ["0%", "100%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute top-0 w-8 h-full bg-gradient-to-r from-transparent via-slate-400 to-transparent"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Forking Connector (Desktop) */}
          <div className="hidden lg:block relative w-20 h-64">
             <svg className="w-full h-full" viewBox="0 0 100 200" fill="none">
                <path d="M0 100 H40 C60 100 60 40 80 40 H100M40 100 C60 100 60 160 80 160 H100" stroke="#E2E8F0" strokeWidth="2" />
                <motion.path 
                  d="M0 100 H40 C60 100 60 40 80 40 H100M40 100 C60 100 60 160 80 160 H100" 
                  stroke="url(#grad1)" strokeWidth="2" strokeDasharray="10 10"
                  animate={{ strokeDashoffset: [-20, 0] }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#94A3B8" stopOpacity="0" />
                    <stop offset="50%" stopColor="#22C55E" />
                    <stop offset="100%" stopColor="#94A3B8" stopOpacity="0" />
                  </linearGradient>
                </defs>
             </svg>
          </div>

          {/* Outcome Cards (The Right Side) */}
          <div className="flex flex-col gap-6 w-full lg:w-[450px]">
            {outcomes.map((item, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.02, x: 10 }}
                className="group p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:border-green-100 transition-all duration-500 relative overflow-hidden"
              >
                {/* Subtle Background Glow */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-slate-50 group-hover:bg-green-50 rounded-full blur-3xl transition-colors" />
                
                <div className="relative flex items-start gap-6">
                  <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-white group-hover:shadow-sm transition-all">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm md:text-base">
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
}