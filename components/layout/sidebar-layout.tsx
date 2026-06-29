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
      <div className="flex h-screen overflow-hidden bg-white text-black font-sans antialiased">
        {/* Mobile Sidebar Overlay */}
        {isMobileOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#6be1d9]/10 lg:bg-white border-r-4 border-black transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:w-64 flex flex-col ${
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          {/* Sidebar Header Logo */}
          <div className="h-20 flex items-center px-6 border-b-4 border-black bg-white shrink-0">
            <Link href="/" className="font-black text-2xl tracking-tight flex items-center gap-3 text-black">
              <span className="uppercase tracking-wider">Soldoway</span>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-8 space-y-3 overflow-y-auto bg-white">
            {links.map((link) => {
              const isActive = pathname === link.href || (link.label !== "Dashboard" && link.href === "/dashboard/" + role.toLowerCase() && false);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center px-4 py-3 rounded-[12px] text-sm font-black uppercase tracking-wider border-2 border-black transition-all ${
                    isActive
                      ? "bg-[#6be1d9] text-black shadow-[4px_4px_0px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                      : "bg-white text-black hover:bg-[#6be1d9]/20 hover:shadow-[2px_2px_0px_0px_#000]"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t-4 border-black bg-white shrink-0">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center px-4 py-3 border-2 border-black rounded-[12px] text-sm font-black uppercase tracking-wider text-black bg-white shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          {/* Top Navbar */}
          <header className="h-20 flex items-center justify-between px-6 lg:px-8 border-b-4 border-black bg-white shrink-0">
            <div className="flex items-center lg:hidden">
              <button
                onClick={() => setIsMobileOpen(true)}
                className="p-2.5 mr-3 text-black rounded-[10px] border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none focus:outline-none"
              >
                <svg
                  className="w-6 h-6 stroke-[3]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <span className="font-black text-xl uppercase tracking-wider">
                {role === "BUSINESS" ? "Business" : "Sales"}
              </span>
            </div>
            
            <div className="hidden lg:flex items-center text-base font-black uppercase tracking-widest text-black/50">
              {role === "BUSINESS" ? "Business Dashboard" : "Sales Dashboard"}
            </div>

            {/* Wallet balance + address */}
            {address ? (
              <div className="flex items-center gap-3">
                {/* Balance pill */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[#6be1d9]/10 border-2 border-black shadow-[2px_2px_0px_0px_#000]">
                  <span className="text-xs font-black text-black uppercase tracking-wider hidden sm:inline">SOL</span>
                  <span className="text-sm font-black text-black tabular-nums">
                    {balanceLoading || balance === undefined ? "…" : balance.toFixed(4)}
                  </span>
                </div>

                {/* Address pill */}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied");
                  }}
                  title={address}
                  className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-[12px] bg-white border-2 border-black shadow-[4px_4px_0px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                >
                  <span className="w-6 h-6 rounded-full bg-black flex items-center justify-center text-[#6be1d9] text-[10px] font-black border border-black">
                    {role === "BUSINESS" ? "B" : "S"}
                  </span>
                  <span className="text-sm font-mono font-bold text-black">
                    {address.slice(0, 4)}…{address.slice(-4)}
                  </span>
                </button>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-white border-2 border-black shadow-[2px_2px_0px_0px_#000] flex items-center justify-center text-base font-black text-black">
                {role === "BUSINESS" ? "B" : "S"}
              </div>
            )}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto bg-[#6be1d9]/5 ">
            <div className="mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ClientOnly>
  );
}