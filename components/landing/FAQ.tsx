"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    { q: "How are business funds secured?", a: "Funds are stored in a smart contract escrow on Solana — fully trustless and auditable. Neither Soldoway nor any third party can access them without your approval." },
    { q: "Do sales reps need SOL to get started?", a: "No. Privy handles all gasless transactions behind the scenes so your partners sign up with Email or Google and never touch a wallet." },
    { q: "How does the business verify meetings?", a: "Meeting data from Cal.com is submitted by the sales rep. The business reviews the details and manually approves productive outcomes before any payout is released." },
    { q: "Can funds be withdrawn anytime?", a: "Yes. The business can withdraw remaining funds — along with any accrued DeFi yield — at any time directly from their dashboard." },
    { q: "What is yield in Soldoway?", a: "While a campaign is running, idle USDC is deployed into Kamino's DeFi liquidity vaults to generate passive yield, offsetting your overall marketing spend." },
  ];

  return (
    <section className="px-4 md:px-6 py-16 md:py-24 max-w-6xl mx-auto font-sans antialiased">
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
        
        {/* Kolom Kiri: Judul Utama Sticky */}
        <div className="lg:w-1/3 shrink-0 lg:sticky lg:top-28 h-fit">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="inline-block mb-3 px-2 py-0.5 bg-[#6be1d9] border border-black text-[10px] font-black uppercase tracking-widest rounded-[4px] shadow-[1.5px_1.5px_0px_0px_#000]">
              HELP CENTER
            </div>
            <h2 className="font-black text-3xl md:text-5xl lg:text-5xl tracking-tight leading-[1.05] text-black uppercase">
              Frequently Asked<br className="hidden lg:block" /> Questions
            </h2>
          </motion.div>
        </div>

        {/* Kolom Kanan: List FAQ Stacked Border */}
        <div className="lg:w-2/3 flex flex-col space-y-4">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;

            return (
              <div 
                key={i}
                /* Mengubah dari background tipis melayang ke sistem box panel bertumpuk */
                className={`rounded-[12px] border-2 border-black transition-all duration-150 ${
                  isOpen 
                    ? "bg-[#6be1d9] shadow-[4px_4px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]" 
                    : "bg-white hover:bg-[#6be1d9]/5 shadow-[3px_3px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_0px_#000]"
                }`}
              >
                <button
                  onClick={() => toggleFAQ(i)}
                  className="w-full flex items-center justify-between gap-6 p-5 md:p-6 text-left focus:outline-none"
                >
                  <span className="font-black text-black text-base md:text-lg lg:text-xl uppercase tracking-wide leading-tight">
                    {faq.q}
                  </span>
                  {/* Indikator tombol plus/minus brutal dengan frame border tipis */}
                  <span className="shrink-0 p-1 bg-white border-2 border-black rounded-[6px] text-black shadow-[1.5px_1.5px_0px_0px_#000]">
                    {isOpen ? <Minus className="w-4 h-4 stroke-[3]" /> : <Plus className="w-4 h-4 stroke-[3]" />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden border-t-2 border-black bg-white rounded-b-[10px]"
                    >
                      <div className="p-5 md:p-6 text-black/80 font-bold text-xs md:text-sm leading-relaxed md:leading-[1.6]">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;