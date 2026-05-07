"use client";

import React from "react"; // Tambahin ini biar gak ReferenceError
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
    icon: Zap, // Kirim komponennya aja, jangan JSX-nya
    color: "#22c55e", 
    bgColor: "bg-green-50"
  },
  { 
    name: "Anchor Framework", 
    desc: "Secure and audited smart contract escrow for trustless fund management.",
    icon: ShieldCheck, 
    color: "#3b82f6", 
    bgColor: "bg-blue-50"
  },
  { 
    name: "Privy", 
    desc: "Seamless gasless wallet authentication — no crypto knowledge required.",
    icon: UserCircle, 
    color: "#a855f7", 
    bgColor: "bg-purple-50"
  },
  { 
    name: "Cal.com", 
    desc: "Native meeting scheduling integration for real-time payout triggers.",
    icon: Calendar, 
    color: "#f97316", 
    bgColor: "bg-orange-50"
  },
  { 
    name: "Kamino", 
    desc: "Idle fund yield generation via Solana's premier DeFi liquidity vaults.",
    icon: TrendingUp, 
    color: "#ec4899", 
    bgColor: "bg-pink-50"
  },
  { 
    name: "Next.js", 
    desc: "High-performance React application framework for a fast, reliable UI.",
    icon: Cpu, 
    color: "#0ea5e9", 
    bgColor: "bg-sky-50"
  },
];

const Core = () => {
  return (
    <section className="px-6 py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <h2 className="font-bold text-4xl md:text-5xl tracking-tight mb-4 text-black">
            Core Infrastructure
          </h2>
          <p className="text-gray-500 text-lg md:text-xl max-w-xl">
            Built on cutting-edge Web3 and SaaS technologies.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {techStack.map((tech, i) => {
            const IconComponent = tech.icon; // Ambil komponennya
            return (
              <motion.div
                key={tech.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="group p-8 rounded-[2.5rem] bg-[#F8F9FA] border border-gray-100 hover:border-black/10 hover:bg-white hover:shadow-xl hover:shadow-black/5 transition-all duration-300"
              >
                <div className={`w-12 h-12 ${tech.bgColor} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {/* Panggil sebagai komponen biasa */}
                  <IconComponent size={24} color={tech.color} strokeWidth={2.5} />
                </div>

                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-black tracking-tight">
                    {tech.name}
                  </h3>
                  <p className="text-gray-500 leading-relaxed font-medium">
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