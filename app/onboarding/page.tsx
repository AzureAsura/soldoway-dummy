"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import type { Role } from "@/types";

import { ClientOnly } from "@/components/layout/client-only";

const ROLES: { value: Role; label: string; desc: string; emoji: string }[] = [
  {
    value: "BUSINESS",
    label: "Business",
    desc: "Deposit SOL into escrow and reward your sales team for productive meetings.",
    emoji: "🏢",
  },
  {
    value: "SALES",
    label: "Sales",
    desc: "Log meetings, mark outcomes, and automatically earn SOL rewards.",
    emoji: "🤝",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user: privyUser, authenticated, ready } = usePrivy();
  const { isOnboarded, setUser, setRole, setOnboarded } = useAppStore();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Automatically redirect based on auth/onboarding status
  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
    } else if (isOnboarded) {
      router.replace("/dashboard");
    }
  }, [ready, authenticated, isOnboarded, router]);

  async function handleComplete() {
    if (!selectedRole || !privyUser) return;
    setIsLoading(true);

    try {
      const referralCode = localStorage.getItem("referral_code");

      const res = await fetch("/api/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          role: selectedRole,
          privyUserId: privyUser.id,
          walletAddress: privyUser.wallet?.address || "no_wallet_yet",
          referralCode: referralCode || undefined
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Onboarding failed");
      }

      const userData = await res.json();
      setUser(userData);
      setRole(selectedRole);
      setOnboarded(true);

      toast.success(`Welcome to Soldoway as ${selectedRole}!`);
      localStorage.removeItem("referral_code"); // Clean up
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#6be1d9]/5 text-black font-sans antialiased">
        <div className="p-5 bg-white border-2 border-black rounded-[12px] shadow-[3px_3px_0px_0px_#000]">
          <p className="font-black uppercase tracking-wider text-xs">Please log in first.</p>
        </div>
      </div>
    );
  }

  return (
    <ClientOnly>
      <main className="min-h-screen flex items-center justify-center bg-[#6be1d9]/5 px-4 py-8 text-black font-sans antialiased">
        {/* Container Utama - Border diturunkan ke border-2, shadow dikurangi */}
        <div className="max-w-md w-full bg-white border-2 border-black rounded-[20px] p-6 md:p-8 shadow-[6px_6px_0px_0px_#000]">
          
          {/* Header */}
          <div className="text-center mb-8 border-b-2 border-black pb-6">
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wide mb-2">
              Choose your role
            </h1>
            <p className="text-xs md:text-sm font-bold text-black/60 max-w-sm mx-auto">
              This determines your experience on Soldoway. You can&apos;t change this later.
            </p>
          </div>

          {/* Grid Role Pilihan */}
          <div className="grid gap-4 mb-6">
            {ROLES.map((role) => {
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  id={`role-${role.value.toLowerCase()}`}
                  onClick={() => setSelectedRole(role.value)}
                  className={`w-full text-left p-4 rounded-[12px] border-2 border-black transition-all ${
                    isSelected
                      ? "bg-[#6be1d9] shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]"
                      : "bg-white hover:bg-[#6be1d9]/5 hover:shadow-[3px_3px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Emoji Container */}
                    <span className="text-2xl p-1.5 bg-white border-2 border-black rounded-[15px] shadow-[1.5px_1.5px_0px_0px_#000] shrink-0">
                      {role.emoji}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-base uppercase tracking-wider">
                        {role.label}
                      </div>
                      <div className="text-xs font-bold text-black/70 mt-0.5 leading-normal">
                        {role.desc}
                      </div>
                    </div>

                    {/* Checkmark Bulat */}
                    <div className={`w-5 h-5 rounded-full border-2 border-black flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? "bg-black text-[#6be1d9]" : "bg-white text-transparent"
                    }`}>
                      <span className="text-[10px] font-black">✓</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Tombol Aksi Utama */}
          <button
            id="onboarding-complete"
            onClick={handleComplete}
            disabled={!selectedRole || isLoading}
            className="w-full bg-black disabled:bg-black/10 disabled:text-black/30 disabled:border-black/5 disabled:shadow-none disabled:cursor-not-allowed text-[#6be1d9] border-2 border-black font-black text-sm uppercase tracking-widest py-3.5 rounded-[12px] shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          >
            {isLoading ? "Setting up your account…" : "Continue →"}
          </button>
        </div>
      </main>
    </ClientOnly>
  );
}