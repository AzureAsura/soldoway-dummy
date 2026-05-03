"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { isOnboarded, setUser, setRole, setOnboarded, reset } = useAppStore();
  const [dbChecked, setDbChecked] = useState(false);

  // Sync session & fetch user data from DB if authenticated but not onboarded yet
  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      // User logged out, reset state
      reset();
      setDbChecked(true);
      return;
    }

    if (authenticated && privyUser?.id && !isOnboarded && !dbChecked) {
      let isMounted = true;
      const fetchUser = async () => {
        try {
          const res = await fetch(`/api/users/me?id=${privyUser.id}`);
          if (res.ok) {
            const userData = await res.json();
            if (isMounted) {
              setUser(userData);
              setRole(userData.role);
              setOnboarded(true);
            }
          }
        } catch (e) {
          console.error("Failed to fetch user data", e);
        } finally {
          if (isMounted) {
            setDbChecked(true);
          }
        }
      };
      fetchUser();

      return () => { isMounted = false; };
    } else if (isOnboarded && !dbChecked) {
      setDbChecked(true);
    }
  }, [ready, authenticated, privyUser?.id, isOnboarded, dbChecked, setUser, setRole, setOnboarded, reset]);

  const isProtectedRoute = pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/tasks") ||
    pathname?.startsWith("/meetings");

  // Protected Routes logic
  useEffect(() => {
    if (!ready) return;
    
    // Wait for DB check to finish if user is authenticated
    if (authenticated && !dbChecked) return;

    if (isProtectedRoute) {
      if (!authenticated) {
        router.replace("/");
      } else if (!isOnboarded) {
        router.replace("/onboarding");
      }
    }
  }, [ready, authenticated, dbChecked, isOnboarded, isProtectedRoute, router]);

  // If trying to access protected route but we're still checking, show nothing to prevent flash
  if (isProtectedRoute && (!ready || (authenticated && !dbChecked) || !authenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
