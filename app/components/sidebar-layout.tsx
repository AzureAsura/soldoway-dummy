"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClientOnly } from "./client-only";

type SidebarItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

type WalletLike = { walletClientType?: string; wallet?: { name?: string } };

export function SidebarLayout({
  children,
  role,
}: {
  children: React.ReactNode;
  role: "BUSINESS" | "SALES";
}) {
  const { logout } = usePrivy();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Prefer external wallet (Phantom) over Privy embedded — same priority as campaigns/new
  const { wallets } = useWallets();
  const connected =
    wallets.find(
      (w) =>
        (w as WalletLike).walletClientType === "phantom" ||
        (w as WalletLike).wallet?.name?.toLowerCase?.().includes("phantom")
    ) ?? wallets[0];
  const address = connected?.address ?? null;

  const { data: balance, isLoading: balanceLoading } = useQuery<number>({
    queryKey: ["connected-wallet-balance", address],
    queryFn: async () => {
      if (!address) return 0;
      const { Connection, PublicKey } = await import("@solana/web3.js");
      const rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.devnet.solana.com";
      const connection = new Connection(rpcUrl, "confirmed");
      const lamports = await connection.getBalance(new PublicKey(address));
      return lamports / 1e9;
    },
    enabled: Boolean(address),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const businessLinks: SidebarItem[] = [
    { label: "Dashboard", href: "/dashboard/business" },
    { label: "New Campaign", href: "/campaigns/new" },
  ];

  const salesLinks: SidebarItem[] = [
    { label: "Dashboard", href: "/dashboard/sales" },
    { label: "Browse Campaign", href: "/tasks" },
    { label: "Referral", href: "/dashboard/sales/referral" },
  ];

  const links = role === "BUSINESS" ? businessLinks : salesLinks;

  return (
    <ClientOnly>
      <div className="flex h-screen overflow-hidden bg-white text-black font-sans">
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-64 flex flex-col ${isMobileOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="h-16 flex items-center px-6 border-b border-gray-200 shrink-0">
            <Link href="/" className="font-bold text-xl tracking-tight flex items-center gap-2 text-black">
              <span className="w-7 h-7 rounded-lg bg-black flex items-center justify-center text-white text-xs font-black shadow-sm">
                S
              </span>
              <span>Soldoway</span>
            </Link>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.label !== "Dashboard" && link.href === "/dashboard/" + role.toLowerCase() && false /* logic can be refined */);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? "bg-black text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-black"
                    }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 shrink-0">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Navbar */}
          <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-gray-200 bg-white shrink-0">
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-2 -ml-2 mr-2 text-gray-600 hover:text-black rounded-lg hover:bg-gray-100 focus:outline-none"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <span className="font-bold text-lg">{role === "BUSINESS" ? "Business" : "Sales"}</span>
            </div>
            <div className="hidden lg:flex items-center text-sm font-medium text-gray-500">
              {role === "BUSINESS" ? "Business Dashboard" : "Sales Dashboard"}
            </div>

            {/* Wallet balance + address */}
            {address ? (
              <div className="flex items-center gap-2 sm:gap-3">
                {/* Balance pill — visible at all breakpoints */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider hidden sm:inline">SOL</span>
                  <span className="text-sm font-bold text-black tabular-nums">
                    {balanceLoading || balance === undefined ? "…" : balance.toFixed(4)}
                  </span>
                </div>

                {/* Address pill — click to copy; hidden below sm */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied");
                  }}
                  title={address}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-white text-[10px] font-black">
                    {role === "BUSINESS" ? "B" : "S"}
                  </span>
                  <span className="text-sm font-mono font-medium text-gray-700">
                    {address.slice(0, 4)}…{address.slice(-4)}
                  </span>
                </button>
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {role === "BUSINESS" ? "B" : "S"}
              </div>
            )}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50">
            <div className=" mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ClientOnly>
  );
}
