"use client";

import { useQuery } from "@tanstack/react-query";
import type { Campaign } from "@/types";

/**
 * Fetch all ACTIVE campaigns (for Sales marketplace).
 * Polls every 5s per spec.
 */
export function useCampaigns() {
  return useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json() as Promise<Campaign[]>;
    },
    refetchInterval: 5000,
    staleTime: 4000,
  });
}

/**
 * Fetch a single campaign by ID.
 * Polls every 5s for live status updates.
 */
export function useCampaign(id: string) {
  return useQuery<Campaign>({
    queryKey: ["campaigns", id],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${id}`);
      if (!res.ok) throw new Error("Failed to fetch campaign");
      return res.json() as Promise<Campaign>;
    },
    refetchInterval: 5000,
    staleTime: 4000,
    enabled: Boolean(id),
  });
}
