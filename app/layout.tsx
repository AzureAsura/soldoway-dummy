import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";
import { Navbar } from "./components/navbar";
import { cn } from "@/lib/utils";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Soldoway — Onchain Sales Rewards",
    template: "%s | Soldoway",
  },
  description:
    "Decentralized B2B sales reward system on Solana. Businesses deposit SOL into escrow, Sales reps earn rewards for every approved meeting — trustless and on-chain.",
  keywords: ["Solana", "DeFi", "B2B sales", "crypto rewards", "blockchain", "web3"],
  openGraph: {
    title: "Soldoway — Onchain Sales Rewards",
    description: "B2B sales reward system powered by Solana smart contracts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          inter.variable,
          interTight.variable,
          jetbrainsMono.variable,
          "antialiased"
        )}
      >
        <Providers>
          <Navbar />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
