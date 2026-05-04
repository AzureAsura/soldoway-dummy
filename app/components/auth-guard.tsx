"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";

const PUBLIC_ROUTES = ["/", "/onboarding"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { isOnboarded, setUser, setRole, setWalletAddress, setOnboarded, reset } =
    useAppStore();

  // Track if we've fetched from DB for this session to avoid loops
  const hasFetched = useRef(false);
  const fetchingRef = useRef(false);

  // ── Step 1: Sync Privy user with DB ────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      reset();
      hasFetched.current = false;
      return;
    }

    if (!privyUser?.id) return;
    if (hasFetched.current || fetchingRef.current) return;

    // Sync wallet address from Privy into Zustand immediately
    const walletAddr = privyUser.wallet?.address ?? null;
    if (walletAddr) setWalletAddress(walletAddr);

    // If already onboarded (persisted in localStorage), skip DB fetch
    if (isOnboarded) {
      hasFetched.current = true;
      return;
    }

    // Fetch user from DB to see if they have a role
    fetchingRef.current = true;
    fetch(`/api/users/me?id=${privyUser.id}`)
      .then(async (res) => {
        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          setRole(userData.role);
          setOnboarded(true);
          if (userData.wallet_address) setWalletAddress(userData.wallet_address);
        }
        // 404 = not onboarded yet, that's fine
      })
      .catch((e) => console.error("[AuthGuard] fetch user failed:", e))
      .finally(() => {
        hasFetched.current = true;
        fetchingRef.current = false;
      });
  }, [ready, authenticated, privyUser?.id]);

  // ── Step 2: Route Guard ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ready) return;
    if (!authenticated && !hasFetched.current && !isOnboarded) {
      // Still loading – don't redirect yet
      if (authenticated) return;
    }

    const isPublic = PUBLIC_ROUTES.includes(pathname ?? "");
    const isProtected =
      !isPublic &&
      (pathname?.startsWith("/dashboard") ||
        pathname?.startsWith("/tasks") ||
        pathname?.startsWith("/campaigns") ||
        pathname?.startsWith("/meetings"));

    if (!isProtected) return;

    if (!authenticated) {
      router.replace("/");
      return;
    }

    if (authenticated && !isOnboarded && hasFetched.current) {
      router.replace("/onboarding");
      return;
    }
  }, [ready, authenticated, isOnboarded, pathname]);

  // ── Loading spinner for protected routes ────────────────────────────────────
  const isProtected =
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/tasks") ||
    pathname?.startsWith("/campaigns") ||
    pathname?.startsWith("/meetings");

  if (isProtected && (!ready || (authenticated && !hasFetched.current && !isOnboarded))) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Checking authentication…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
