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
    <section className="bg-white text-black py-16 md:py-24 border-b-2 border-black overflow-hidden font-sans antialiased">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">
          
          {/* Kolom Kiri: Sticky Header */}
          <div className="w-full lg:w-[35%] shrink-0 lg:sticky lg:top-28">
            <motion.h2 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="text-3xl md:text-5xl font-black tracking-tight leading-[1.05] mb-6 uppercase text-black"
            >
              Where Capital <br className="hidden lg:block" /> Meets <br className="hidden lg:block" /> Verifiability.
            </motion.h2>
            <div className="h-[4px] w-16 bg-[#6be1d9] border border-black mb-6" />
            <p className="text-sm md:text-base text-black/70 font-bold leading-normal max-w-sm">
              We treat every dollar of your B2B sales budget as a working asset.
            </p>
          </div>

          <div className="w-full lg:w-[65%] min-w-0">
            <Carousel opts={{ align: "start", loop: false }} className="w-full">
              <CarouselContent className="-ml-4 py-4">
                {features.map((feature, i) => (
                  <CarouselItem 
                    key={i} 
                    className="pl-4 basis-[88%] sm:basis-[55%] md:basis-[48%] lg:basis-[47%]"
                  >
                    <div className="relative h-[460px] w-full rounded-[16px] overflow-hidden border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000]">
                      
                      <div className="relative h-[40%] w-full overflow-hidden border-b-2 border-black bg-zinc-100">
                        <img 
                          src={feature.imgUrl} 
                          alt={feature.title}
                          className="w-full h-full object-cover  transition-all duration-300"
                        />
                      </div>

                      <div className="relative h-[60%] p-6 flex flex-col justify-between">
                        <div>
                          <span className="inline-block text-[10px] font-black uppercase tracking-wider text-black bg-[#6be1d9] border border-black px-2 py-0.5 rounded-[4px]">
                            {feature.category}
                          </span>
                          <h3 className="text-xl font-black mt-3 leading-tight tracking-tight uppercase text-black">
                            {feature.title}
                          </h3>
                        </div>
                        
                        <p className="text-xs md:text-sm font-bold text-black/70 leading-normal line-clamp-4">
                          {feature.desc}
                        </p>

                        <div className="w-full h-[2px] bg-black" />
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              
              <div className="flex items-center gap-3 mt-6 justify-end">
                <CarouselPrevious className="static translate-y-0 translate-x-0 h-11 w-11 border-2 border-black bg-white text-black hover:bg-[#6be1d9] hover:text-black transition-all rounded-[15px] shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" />
                <CarouselNext className="static translate-y-0 translate-x-0 h-11 w-11 border-2 border-black bg-white text-black hover:bg-[#6be1d9] hover:text-black transition-all rounded-[15px] shadow-[3px_3px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none" />
              </div>
            </Carousel>
          </div>

        </div>
      </div>
    </section>
  );
}