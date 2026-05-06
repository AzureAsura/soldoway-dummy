"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { ClientOnly } from "@/app/components/client-only";

// Dashboard redirects to role-specific page after auth check
export default function DashboardPage() {
  const { authenticated, ready } = usePrivy();
  const { role, isOnboarded } = useAppStore();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!authenticated) {
      toast.error("Please login to continue");
      router.replace("/");
      return;
    }
    if (!isOnboarded) {
      router.replace("/onboarding");
      return;
    }
    if (role === "BUSINESS") {
      router.replace("/dashboard/business");
    } else if (role === "SALES") {
      router.replace("/dashboard/sales");
    }
  }, [ready, authenticated, isOnboarded, role, router]);

  return (
    <ClientOnly>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading dashboard…</p>
        </div>
      </div>
    </ClientOnly>
  );
}
