import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "Soldoway — Onchain Sales Rewards",
  description:
    "Decentralized B2B sales reward system on Solana. Business deposit SOL, Sales earn rewards for every productive meeting.",
};

export default function HomePage() {
  return <HomeClient />;
}
