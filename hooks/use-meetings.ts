"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Meeting } from "@/types";

/**
 * Fetch meetings for the current Sales user.
 * Polls every 5s to catch approval/rejection status updates.
 */
export function useMeetings(salesId?: string) {
  return useQuery<Meeting[]>({
    queryKey: ["meetings", salesId],
    queryFn: async () => {
      if (!salesId) return [];
      const res = await fetch(`/api/meetings?salesId=${salesId}`);
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json() as Promise<Meeting[]>;
    },
    refetchInterval: 5000,
    staleTime: 4000,
    enabled: Boolean(salesId),
  });
}

/**
 * Fetch meetings for a specific campaign (for Business view).
 * Polls every 5s.
 */
export function useCampaignMeetings(campaignId?: string) {
  return useQuery<Meeting[]>({
    queryKey: ["meetings", "campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) return [];
      const res = await fetch(`/api/meetings?campaignId=${campaignId}`);
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json() as Promise<Meeting[]>;
    },
    refetchInterval: 5000,
    staleTime: 4000,
    enabled: Boolean(campaignId),
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
