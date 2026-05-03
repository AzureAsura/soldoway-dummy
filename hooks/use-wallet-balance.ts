"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";
import { getConnection } from "@/lib/solana";

/**
 * Polls the wallet balance every 20s and syncs it to the Zustand store.
 */
export function useWalletBalance() {
  const { walletAddress, setWalletBalance } = useAppStore();

  const query = useQuery<number>({
    queryKey: ["wallet-balance", walletAddress],
    queryFn: async () => {
      if (!walletAddress) return 0;
      const { PublicKey } = await import("@solana/web3.js");
      const lamports = await getConnection().getBalance(
        new PublicKey(walletAddress)
      );
      return lamports / 1e9; // Convert to SOL
    },
    enabled: Boolean(walletAddress),
    refetchInterval: 20_000, // Poll every 20s
    staleTime: 10_000,
  });

  // Keep Zustand store in sync with latest balance
  useEffect(() => {
    if (query.data !== undefined) {
      setWalletBalance(query.data);
    }
  }, [query.data, setWalletBalance]);

  return query;
}
