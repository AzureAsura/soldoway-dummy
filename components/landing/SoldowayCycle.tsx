"use client";

import React from "react";
import { motion } from "framer-motion";
import { Wallet, Cpu, TrendingUp, Handshake } from "lucide-react";

const steps = [
  {
    title: "Business Deposit",
    description: "Securely lock your campaign budget in a transparent smart contract.",
    icon: <Wallet className="w-6 h-6 text-black" />,
  },
  {
    title: "DeFi Yield Engine",
    description: "Idle funds are automatically routed to DeFi to generate passive yield.",
    icon: <Cpu className="w-6 h-6 text-black" />,
  },
];

const outcomes = [
  {
    title: "Business Having Yield",
    description: "Harnessing the Solana DeFi ecosystem to turn marketing wait-time into measurable capital gains.",
    icon: <TrendingUp className="w-5 h-5 text-black" />,
  },
  {
    title: "Business Having B2B Meeting",
    description: "Validated meetings trigger an automatic, real-time payout to the sales partner.",
    icon: <Handshake className="w-5 h-5 text-black" />,
  },
];

export function SoldowayCycle() {
  return (
    <section className="py-24 md:py-32 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-20 md:mb-40">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-5xl md:text-6xl font-black tracking-tighter mb-6 uppercase"
          >
            The Soldoway Cycle
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-xl text-gray-500 font-medium max-w-2xl mx-auto"
          >
            A smart escrow engine that secures your capital, generates passive yield, and automates payouts.
          </motion.p>
        </div>

        {/* Diagram Container */}
        <div className="relative flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-0">
          
          {/* 1. Steps Section */}
          <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-16 z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="relative flex flex-col items-center">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  className="w-24 h-24 bg-white border-2 border-black rounded-[2rem] flex items-center justify-center shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] mb-8"
                >
                  {step.icon}
                </motion.div>
                <div className="text-center max-w-[180px]">
                  <h3 className="text-lg font-black uppercase mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-gray-500 font-medium leading-relaxed">{step.description}</p>
                </div>

                {/* Horizontal Connector (Desktop) */}
                {idx === 0 && (
                  <div className="hidden lg:block absolute left-[100%] top-12 w-24 h-[2px] bg-black/10">
                    <motion.div 
                      initial={{ width: 0 }}
                      whileInView={{ width: "100%" }}
                      className="h-full bg-black"
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 2. Fork Connector (Desktop) - POSISI SUDAH DINAIKKAN */}
          <div className="hidden lg:block relative w-32 h-64 -mt-40 mx-4"> 
            {/* -mt-10 di atas buat naikin fork-nya secara instan */}
            <svg className="w-full h-full" viewBox="0 0 100 200" fill="none" preserveAspectRatio="xMidYMid meet">
              <motion.path
                d="M0 100 H40 C60 100 60 40 80 40 H100M40 100 C60 100 60 160 80 160 H100"
                stroke="black"
                strokeWidth="2.5"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              />
            </svg>
          </div>

          {/* 3. Mobile Connector (Vertical) */}
          <div className="lg:hidden flex flex-col items-center -my-8">
            <div className="w-[2px] h-16 bg-black relative">
               <motion.div 
                animate={{ y: [0, 64] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute top-0 left-[-2px] w-1.5 h-4 bg-black rounded-full"
               />
            </div>
          </div>

          {/* 4. Outcome Cards */}
          <div className="flex flex-col gap-6 w-full max-w-[480px] lg:-mt-32">
            {outcomes.map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.2 }}
                className="group p-8 bg-white border-2 border-black rounded-[2.5rem] shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-200"
              >
                <div className="flex items-start gap-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center shrink-0 border border-gray-100 group-hover:bg-black transition-colors">
                    {/* FIXED: Check valid element before cloning to avoid ReferenceError */}
                    {React.isValidElement(item.icon) 
                      ? React.cloneElement(item.icon as React.ReactElement<any>, { 
                          className: "group-hover:text-white transition-colors w-5 h-5" 
                        })
                      : item.icon
                    }
                  </div>
                  <div>
                    <h3 className="text-xl font-bold uppercase mb-2 tracking-tight">{item.title}</h3>
                    <p className="text-base text-gray-500 font-medium leading-relaxed">{item.description}</p>
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