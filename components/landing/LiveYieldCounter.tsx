"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowLeftRight, TrendingUp } from "lucide-react";

// Logic CountUp biar smooth buat data live
function CountUp({ value, isCurrency = false }: { value: number; isCurrency?: boolean }) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = value;
    const duration = 2000;
    const increment = (end - start) / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if ((increment > 0 && start >= end) || (increment < 0 && start <= end)) {
        setDisplayValue(end);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);

  return (
    <>
      {isCurrency 
        ? displayValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) 
        : Math.floor(displayValue).toLocaleString()}
    </>
  );
}

export function LiveYieldCounter() {
  const [yieldAmount, setYieldAmount] = useState(610.8);

  useEffect(() => {
    const interval = setInterval(() => {
      setYieldAmount(prev => prev + (Math.random() * 0.1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    {
      label: "Privacy-preserving addresses generated",
      value: 2452,
      icon: <Shield className="w-5 h-5 text-blue-500" />,
      bgColor: "bg-blue-50",
    },
    {
      label: "Transfers processed on-chain",
      value: 4981,
      icon: <ArrowLeftRight className="w-5 h-5 text-emerald-500" />,
      bgColor: "bg-emerald-50",
    },
    {
      label: "Volume moved privately",
      value: yieldAmount,
      icon: <TrendingUp className="w-5 h-5 text-orange-500" />,
      bgColor: "bg-orange-50",
      suffix: "K",
      prefix: "$",
      isLive: true,
    },
  ];

  return (
    <section className="py-24 bg-gray-100">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="bg-white border-[8px] border-gray-100/50 rounded-[4rem] p-8 shadow-sm relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 relative z-10">
            {stats.map((stat, i) => (
              <div key={i} className="relative flex flex-col items-center text-center px-8 py-6 group">
                
                {/* Separator Line - Persis Screenshot */}
                {i !== 0 && (
                  <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-24 w-[1.5px] bg-gray-100" />
                )}

                {/* Icon Container with Soft Background */}
                <div className={`mb-8 w-14 h-14 rounded-2xl ${stat.bgColor} flex items-center justify-center`}>
                  {stat.icon}
                </div>

                {/* Stats Value */}
                <div className="space-y-4">
                  <div className="text-6xl font-bold tracking-tighter text-[#1A1D21] flex items-baseline justify-center tabular-nums">
                    {stat.prefix && <span className="mr-0.5">{stat.prefix}</span>}
                    <div className="overflow-hidden h-[1.1em]">
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={stat.isLive ? Math.floor(yieldAmount * 10) : stat.value}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -15 }}
                          className="inline-block"
                        >
                          <CountUp value={stat.value} isCurrency={stat.isLive} />
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    {stat.suffix && <span>{stat.suffix}</span>}
                  </div>

                  {/* Label */}
                  <p className="text-gray-400 text-sm font-medium leading-tight max-w-[180px] mx-auto">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}