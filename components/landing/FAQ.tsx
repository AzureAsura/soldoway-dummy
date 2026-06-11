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
    <section className="px-6 py-24 md:py-32 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
        
        {/* Kolom Kiri: Judul */}
        <div className="lg:w-1/3 shrink-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <h2 className="font-bold text-4xl md:text-5xl lg:text-[3.5rem] tracking-tight leading-[1.1] text-gray-900">
              Frequently Asked<br className="hidden lg:block" /> Questions
            </h2>
          </motion.div>
        </div>

        {/* Kolom Kanan: List FAQ */}
        <div className="lg:w-2/3 flex flex-col space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = openIndex === i;

            return (
              <div 
                key={i}
                className={`rounded-[1.5rem] transition-colors duration-300 ${
                  isOpen ? "bg-[#F7F7F8]" : "bg-transparent hover:bg-gray-50/50"
                }`}
              >
                <button
                  onClick={() => toggleFAQ(i)}
                  className="w-full flex items-center justify-between gap-6 p-6 md:p-8 text-left focus:outline-none"
                >
                  <span className="font-semibold text-gray-900 text-lg md:text-xl lg:text-2xl tracking-tight">
                    {faq.q}
                  </span>
                  <span className="shrink-0 text-gray-400">
                    {isOpen ? <Minus className="w-6 h-6 md:w-7 md:h-7" /> : <Plus className="w-6 h-6 md:w-7 md:h-7" />}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 md:px-8 pb-8 text-gray-600 leading-relaxed md:leading-[1.8] text-base md:text-lg">
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