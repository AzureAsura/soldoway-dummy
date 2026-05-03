"use client";

import { useQuery } from "@tanstack/react-query";
import type { Meeting } from "@/types";

/**
 * Fetch meetings for the current Sales user.
 * Polls every 15s to catch payout status updates.
 */
export function useMeetings(salesId?: string) {
  return useQuery<Meeting[]>({
    queryKey: ["meetings", salesId],
    queryFn: async () => {
      const res = await fetch("/api/meetings");
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json() as Promise<Meeting[]>;
    },
    refetchInterval: 5000, // Poll for payout updates
    enabled: Boolean(salesId),
  });
}

/**
 * Fetch a single meeting by ID.
 */
export function useMeeting(id: string) {
  return useQuery<Meeting>({
    queryKey: ["meetings", id],
    queryFn: async () => {
      const res = await fetch(`/api/meetings/${id}`);
      if (!res.ok) throw new Error("Failed to fetch meeting");
      return res.json() as Promise<Meeting>;
    },
    enabled: Boolean(id),
  });
}
