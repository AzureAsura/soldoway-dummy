"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ArrowLeftRight, TrendingUp } from "lucide-react";

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
      icon: <Shield className="w-5 h-5 text-black" />,

      bgColor: "bg-[#6be1d9]/20",
    },
    {
      label: "Transfers processed on-chain",
      value: 4981,
      icon: <ArrowLeftRight className="w-5 h-5 text-black" />,
      bgColor: "bg-[#6be1d9]/20",
    },
    {
      label: "Volume moved privately",
      value: yieldAmount,
      icon: <TrendingUp className="w-5 h-5 text-black" />,
      bgColor: "bg-[#6be1d9]", 
      suffix: "K",
      prefix: "$",
      isLive: true,
    },
  ];

  return (
    <section className="py-16 bg-[#6be1d9]/5 border-b-2 border-black">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}

          className="bg-white border-2 border-black rounded-[16px] p-4 md:p-6 shadow-[6px_6px_0px_0px_#000] relative overflow-hidden"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 relative z-10">
            {stats.map((stat, i) => (
              <div key={i} className="relative flex flex-col items-center text-center px-6 py-8 group">
                
                {i !== 0 && (
                  <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 h-20 w-[2px] bg-black" />
                )}

                <div className={`mb-6 w-12 h-12 rounded-[15px] border-2 border-black ${stat.bgColor} flex items-center justify-center shadow-[2px_2px_0px_0px_#000]`}>
                  {stat.icon}
                </div>

                <div className="space-y-3">
                  <div className="text-4xl md:text-5xl font-black tracking-tight text-black flex items-baseline justify-center tabular-nums">
                    {stat.prefix && <span className="mr-0.5">{stat.prefix}</span>}
                    <div className="overflow-hidden h-[1.1em]">
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={stat.isLive ? Math.floor(yieldAmount * 10) : stat.value}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          className="inline-block"
                        >
                          <CountUp value={stat.value} isCurrency={stat.isLive} />
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    {stat.suffix && <span>{stat.suffix}</span>}
                  </div>

                  {/* Label */}
                  <p className="text-black/70 text-xs font-bold uppercase tracking-wider max-w-[200px] mx-auto leading-normal">
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