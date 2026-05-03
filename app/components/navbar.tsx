"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";
import { ClientOnly } from "./client-only";

export function Navbar() {
  const { login, logout, authenticated } = usePrivy();
  const { role, user } = useAppStore();

  return (
    <ClientOnly>
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl tracking-tight flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-gradient-to-tr from-brand to-brand-light flex items-center justify-center text-white text-xs">S</span>
            Soldoway
          </Link>
          <div className="flex items-center gap-4">
            {authenticated ? (
              <>
                {role === "BUSINESS" && (
                  <Link href="/tasks/new" className="text-sm font-medium hover:text-brand transition-colors">
                    + Create Task
                  </Link>
                )}
                {role === "SALES" && (
                  <Link href="/tasks" className="text-sm font-medium hover:text-brand transition-colors">
                    Browse Tasks
                  </Link>
                )}
                <Link href="/dashboard" className="text-sm font-medium hover:text-brand transition-colors">
                  Dashboard
                </Link>
                <button
                  onClick={logout}
                  className="text-sm px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="text-sm px-5 py-2 bg-brand text-white font-medium rounded-lg hover:bg-brand-dark transition-colors shadow-sm"
              >
                Log in / Sign up
              </button>
            )}
          </div>
        </div>
      </nav>
    </ClientOnly>
  );
}
