"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface FeatureCard {
  category: string;
  title: string;
  desc: string;
  imgUrl: string;
}

const features: FeatureCard[] = [
  {
    category: "INFRASTRUCTURE",
    title: "Zero-Gas Experience via Privy",
    desc: "Your sales partners join using familiar Email or Google logins; we handle the complex blockchain transactions seamlessly.",
    imgUrl: "https://images.prismic.io/coinmetro-website/ZyCwJa8jQArTz74m_GasFeesExplained_WhyEthereumTransactionsCanBeExpensive_26OCT2024_1.png?auto=format,compress",
  },
  {
    category: "DEFI INTEGRATION",
    title: "Yield-Bearing Escrow Vaults",
    desc: "While awaiting verification, idle funds are deployed into Solana's premier DeFi liquidity pools to offset marketing spend.",
    imgUrl: "https://blog.pintu.co.id/wp-content/uploads/2025/01/solana-quantum.jpg",
  },
  {
    category: "API SYNC",
    title: "Real-time B2B Validation",
    desc: "Seamlessly integrate your CRM with the blockchain to ensure real-time meeting validation and pipeline synchronization.",
    imgUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop",
  },
  {
    category: "SECURITY",
    title: "Trustless Smart Contracts",
    desc: "Funds are locked on-chain and only released when verified milestones are achieved, providing absolute transparency.",
    imgUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?q=80&w=800&auto=format&fit=crop",
  },
];

export function FeatureCarousel() {
  return (
    <section className="bg-white text-black py-24 md:py-32 overflow-hidden">
      <div className="max-w-[90rem] mx-auto px-6">
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 items-start">
          
          {/* Left Column - Tight Typography */}
          <div className="w-full lg:w-[35%] shrink-0 lg:sticky lg:top-32">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-5xl md:text-6xl font-black tracking-tighter leading-[0.9] mb-8 uppercase"
            >
              Where Capital <br /> Meets <br /> Verifiability.
            </motion.h2>
            <div className="h-[3px] w-20 bg-black mb-8" />
            <p className="text-xl text-gray-500 font-bold leading-tight max-w-sm">
              We treat every dollar of your B2B sales budget as a working asset.
            </p>
          </div>

          {/* Right Column - Polished Carousel (Statis) */}
          <div className="w-full lg:w-[65%] min-w-0">
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
              <CarouselContent className="-ml-6 py-6">
                {features.map((feature, i) => (
                  <CarouselItem 
                    key={i} 
                    className="pl-6 basis-[85%] sm:basis-[55%] md:basis-[45%] lg:basis-[43%]"
                  >
                    {/* FIXED: Hapus hover:y-[-10] dan hover:shadow */}
                    <div className="relative h-[520px] w-full rounded-[2.5rem] overflow-hidden border-2 border-black bg-white transition-all duration-300">
                      
                      {/* Image - Solid Border Bottom (Tanpa Zoom) */}
                      <div className="relative h-[45%] w-full overflow-hidden border-b-2 border-black">
                        {/* FIXED: Hapus group-hover:scale-110 */}
                        <img 
                          src={feature.imgUrl} 
                          alt={feature.title}
                          className="w-full h-full object-cover"
                        />
                        {/* FIXED: Hapus icon ArrowUpRight yang muncul pas hover */}
                      </div>

                      {/* Content */}
                      <div className="relative h-[55%] p-8 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                            {feature.category}
                          </span>
                          <h3 className="text-2xl font-black mt-3 leading-none tracking-tighter uppercase">
                            {feature.title}
                          </h3>
                        </div>
                        
                        <p className="text-sm font-bold text-gray-500 leading-snug line-clamp-4">
                          {feature.desc}
                        </p>

                        {/* FIXED: Hapus line divider yang berubah warna */}
                        <div className="w-full h-[1px] bg-black/10" />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              {/* Navigation - Solid Minimalist */}
              <div className="flex items-center gap-4 mt-8">
                <CarouselPrevious className="static translate-y-0 translate-x-0 h-14 w-14 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none" />
                <CarouselNext className="static translate-y-0 translate-x-0 h-14 w-14 border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none" />
              </div>
            </Carousel>
          </div>

        </div>
      </div>
    </section>
  );
}