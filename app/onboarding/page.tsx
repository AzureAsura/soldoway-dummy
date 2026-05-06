"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { toast } from "sonner";
import { useAppStore } from "@/stores/app-store";
import type { Role } from "@/types";

import { ClientOnly } from "@/app/components/client-only";

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Please log in first.</p>
      </div>
    );
  }

  return (
    <ClientOnly>
      <main className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="max-w-lg w-full animate-slide-up">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">Choose your role</h1>
            <p className="text-muted-foreground">
              This determines your experience on Soldoway. You can&apos;t change
              this later.
            </p>
          </div>

          <div className="grid gap-4 mb-8">
            {ROLES.map((role) => (
              <button
                key={role.value}
                id={`role-${role.value.toLowerCase()}`}
                onClick={() => setSelectedRole(role.value)}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 ${
                  selectedRole === role.value
                    ? "border-brand bg-brand/5"
                    : "border-border bg-card hover:border-brand/40"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{role.emoji}</span>
                  <div>
                    <div className="font-semibold text-foreground">
                      {role.label}
                    </div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {role.desc}
                    </div>
                  </div>
                  {selectedRole === role.value && (
                    <span className="ml-auto text-brand">✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <button
            id="onboarding-complete"
            onClick={handleComplete}
            disabled={!selectedRole || isLoading}
            className="w-full bg-brand hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
          >
            {isLoading ? "Setting up your account…" : "Continue →"}
          </button>
        </div>
      </main>
    </ClientOnly>
  );
}
