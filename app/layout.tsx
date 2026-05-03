import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./components/providers";
import { Navbar } from "./components/navbar";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Soldoway — Onchain Sales Rewards",
    template: "%s | Soldoway",
  },
  description:
    "Decentralized B2B sales reward system on Solana. Business deposit SOL into escrow, Sales earn rewards for every productive meeting — fully automated on-chain.",
  keywords: ["Solana", "DeFi", "B2B sales", "crypto rewards", "blockchain", "web3"],
  openGraph: {
    title: "Soldoway — Onchain Sales Rewards",
    description: "B2B sales reward system powered by Solana smart contracts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
