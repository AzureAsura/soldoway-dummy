"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { ClientOnly } from "./client-only";

type SidebarItem = {
  label: string;
  href: string;
  icon?: React.ReactNode;
};

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

  const businessLinks: SidebarItem[] = [
    { label: "Dashboard", href: "/dashboard/business" },
    { label: "New Campaign", href: "/campaigns/new" },
    // { label: "Active Campaigns", href: "/dashboard/business" }, // Already on dashboard
  ];

  const salesLinks: SidebarItem[] = [
    { label: "Dashboard", href: "/dashboard/sales" },
    { label: "Browse Campaign", href: "/tasks" },
    // { label: "Submitted Meetings", href: "/dashboard/sales" }, // Already on dashboard
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
          {/* Top Navbar for Mobile/General */}
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

            {/* User Profile / Status Mock */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
                {role === "BUSINESS" ? "B" : "S"}
              </div>
            </div>
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
