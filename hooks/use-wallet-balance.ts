"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";

/**
 * Polls the Solana wallet balance every 20s and syncs to the Zustand store.
 * Uses the wallet address from the Zustand store (set during auth sync).
 */
export function useWalletBalance() {
  const { walletAddress, setWalletBalance } = useAppStore();
  const { user } = usePrivy();

  // Use Privy wallet address as fallback if store doesn't have it yet
  const address = walletAddress || user?.wallet?.address || null;

  const query = useQuery<number>({
    queryKey: ["wallet-balance", address],
    queryFn: async () => {
      if (!address) return 0;
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(address));
      return lamports / 1e9;
    },
    enabled: Boolean(address),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  useEffect(() => {
    if (query.data !== undefined) {
      setWalletBalance(query.data);
    }
  }, [query.data, setWalletBalance]);

  return query;
}
