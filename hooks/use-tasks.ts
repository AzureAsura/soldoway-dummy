"use client";

import { useQuery } from "@tanstack/react-query";
import type { Task } from "@/types";

/**
 * Fetch all tasks (for Sales to browse).
 */
export function useTasks() {
  return useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json() as Promise<Task[]>;
    },
    staleTime: 30_000,
  });
}

/**
 * Fetch a single task by ID.
 */
export function useTask(id: string) {
  return useQuery<Task>({
    queryKey: ["tasks", id],
    queryFn: async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (!res.ok) throw new Error("Failed to fetch task");
      return res.json() as Promise<Task>;
    },
    staleTime: 30_000,
    enabled: Boolean(id),
  });
}
