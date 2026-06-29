"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Zap, 
  ShieldCheck, 
  UserCircle, 
  Calendar, 
  TrendingUp, 
  Cpu 
} from "lucide-react";

const techStack = [
  { 
    name: "Solana", 
    desc: "Lightning fast, low cost transactions powering instant on-chain payouts.",
    icon: Zap,
    bgColor: "bg-[#6be1d9]" // Solid cyan aksen utama
  },
  { 
    name: "Anchor Framework", 
    desc: "Secure and audited smart contract escrow for trustless fund management.",
    icon: ShieldCheck, 
    bgColor: "bg-white"
  },
  { 
    name: "Privy", 
    desc: "Seamless gasless wallet authentication — no crypto knowledge required.",
    icon: UserCircle, 
    bgColor: "bg-white"
  },
  { 
    name: "Cal.com", 
    desc: "Native meeting scheduling integration for real-time payout triggers.",
    icon: Calendar, 
    bgColor: "bg-white"
  },
  { 
    name: "Kamino", 
    desc: "Idle fund yield generation via Solana's premier DeFi liquidity vaults.",
    icon: TrendingUp, 
    bgColor: "bg-white"
  },
  { 
    name: "Next.js", 
    desc: "High-performance React application framework for a fast, reliable UI.",
    icon: Cpu, 
    bgColor: "bg-white"
  },
];

const Core = () => {
  return (
    <section className=" py-16 md:py-24 bg-white border-b-2 border-black font-sans antialiased">
      <div className="max-w-6xl px-4 md:px-6 mx-auto">
        
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 md:mb-16"
        >
          <div className="inline-block mb-3 px-2 py-0.5 bg-black text-[#6be1d9] text-[10px] font-black uppercase tracking-widest rounded-[4px]">
            PRODUCTION READYSTARK
          </div>
          <h2 className="font-black text-3xl md:text-5xl tracking-tight mb-3 uppercase text-black">
            Core Infrastructure
          </h2>
          <p className="text-black/70 text-xs md:text-sm font-bold max-w-xl leading-normal">
            Built on cutting-edge Web3 and SaaS technologies.
          </p>
        </motion.div>

        {/* High-Density Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {techStack.map((tech, i) => {
            const IconComponent = tech.icon;
            return (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                /* Card Transform: Kotak kaku tebal, hilangkan shadow soft, pakai shadow hard */
                className="group p-6 rounded-[12px] bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000] transition-all duration-150"
              >
                {/* Icon Container Frame */}
                <div className={`w-10 h-10 ${tech.bgColor} border-2 border-black rounded-[15px] flex items-center justify-center mb-5 shadow-[2px_2px_0px_0px_#000] group-hover:bg-[#6be1d9] transition-colors duration-200`}>
                  <IconComponent size={18} className="text-black stroke-[2.5]" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-black uppercase tracking-wider">
                    {tech.name}
                  </h3>
                  <p className="text-xs md:text-sm text-black/70 leading-relaxed font-bold">
                    {tech.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Core;