"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role, User } from "@/types";

type AppState = {
  // ─── Auth & User ───────────────────────────────────────────────
  user: User | null;
  isAuthenticated: boolean;
  isOnboarded: boolean;

  // ─── Wallet ────────────────────────────────────────────────────
  walletAddress: string | null;
  walletBalance: number | null; // SOL

  // ─── Role (set during onboarding) ──────────────────────────────
  role: Role | null;

  // ─── Actions ───────────────────────────────────────────────────
  setUser: (user: User) => void;
  setWalletAddress: (address: string | null) => void;
  setWalletBalance: (balance: number | null) => void;
  setRole: (role: Role) => void;
  setOnboarded: (value: boolean) => void;
  reset: () => void;
};

const initialState = {
  user: null,
  isAuthenticated: false,
  isOnboarded: false,
  walletAddress: null,
  walletBalance: null,
  role: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setUser: (user) =>
        set({ user, isAuthenticated: true, role: user.role }),

      setWalletAddress: (walletAddress) => set({ walletAddress }),

      setWalletBalance: (walletBalance) => set({ walletBalance }),

      setRole: (role) => set({ role }),

      setOnboarded: (isOnboarded) => set({ isOnboarded }),

      reset: () => set(initialState),
    }),
    {
      name: "soldoway-app-store",
      // Only persist non-sensitive fields
      partialize: (state) => ({
        role: state.role,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);
