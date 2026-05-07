// "use client";

// import Link from "next/link";
// import { usePrivy } from "@privy-io/react-auth";
// import { useAppStore } from "@/stores/app-store";
// import { usePathname } from "next/navigation";
// import { ClientOnly } from "./client-only";

// export function Navbar() {
//   const { login, logout, authenticated } = usePrivy();
//   const { role, user } = useAppStore();
//   const pathname = usePathname();

//   if (pathname?.startsWith("/dashboard") || pathname?.startsWith("/tasks") || pathname?.startsWith("/campaigns")) {
//     return null;
//   }

//   return (
//     <ClientOnly>
//       <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
//         <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
//           <Link
//             href="/"
//             className="font-bold text-xl tracking-tight flex items-center gap-2"
//           >
//             <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-brand to-brand-light flex items-center justify-center text-white text-xs font-black shadow-sm">
//               S
//             </span>
//             <span>Soldoway</span>
//           </Link>

//           <div className="flex items-center gap-3">
//             {authenticated ? (
//               <>
//                 {role === "BUSINESS" && (
//                   <>
//                     <Link
//                       href="/dashboard/business"
//                       className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
//                     >
//                       Dashboard
//                     </Link>
//                     <Link
//                       href="/campaigns/new"
//                       className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
//                     >
//                       + New Campaign
//                     </Link>
//                   </>
//                 )}
//                 {role === "SALES" && (
//                   <>
//                     <Link
//                       href="/dashboard/sales"
//                       className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
//                     >
//                       Dashboard
//                     </Link>
//                     <Link
//                       href="/tasks"
//                       className="text-sm font-medium bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
//                     >
//                       Browse Tasks
//                     </Link>
//                   </>
//                 )}
//                 {!role && (
//                   <Link
//                     href="/dashboard"
//                     className="text-sm font-medium hover:text-brand transition-colors"
//                   >
//                     Dashboard
//                   </Link>
//                 )}
//                 <button
//                   onClick={logout}
//                   className="text-sm px-4 py-2 border border-border bg-secondary text-secondary-foreground rounded-lg hover:bg-accent transition-colors"
//                 >
//                   Logout
//                 </button>
//               </>
//             ) : (
//               <button
//                 onClick={login}
//                 id="nav-login"
//                 className="text-sm px-5 py-2 bg-brand text-white font-semibold rounded-lg hover:bg-brand-dark transition-all shadow-sm hover:shadow-md"
//               >
//                 Log in / Sign up
//               </button>
//             )}
//           </div>
//         </div>
//       </nav>
//     </ClientOnly>
//   );
// }


"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";
import { usePathname } from "next/navigation";
import { ClientOnly } from "./client-only";
import { ArrowUpRight, Circle } from "lucide-react";

export function Navbar() {
  const { login, logout, authenticated } = usePrivy();
  const { role } = useAppStore();
  const pathname = usePathname();

  if (
    pathname?.startsWith("/dashboard") ||
    pathname?.startsWith("/tasks") ||
    pathname?.startsWith("/campaigns")
  ) {
    return null;
  }

  return (
    <ClientOnly>
      <div className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center px-6">
        <nav className="w-full max-w-6xl h-[64px] md:h-[72px] bg-[#F1F1F1]/80 backdrop-blur-xl border border-white/20 rounded-full px-4 md:px-8 flex items-center justify-between shadow-sm">

          <Link
            href="/"
            className="flex items-center gap-2 text-black font-bold text-xl md:text-2xl tracking-tight shrink-0"
          >
            <Circle className="fill-black w-5 h-5 md:w-6 md:h-6" />
            <span>Soldoway</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            {authenticated ? (
              <>
                {!role && (
                  <Link
                    href="/dashboard"
                    className="text-xs md:text-sm font-semibold text-black/70 hover:text-black transition-colors px-2"
                  >
                    Dashboard
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="bg-black text-white text-[13px] md:text-[15px] font-medium px-4 md:px-6 py-2.5 md:py-3 rounded-full flex items-center gap-2 hover:bg-black/80 transition-all active:scale-95 whitespace-nowrap"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={login}
                id="nav-login"
                className="bg-black text-white text-[13px] md:text-[15px] font-medium px-5 md:px-7 py-2.5 md:py-3.5 rounded-full flex items-center gap-2 hover:bg-black/90 transition-all active:scale-95 shadow-lg whitespace-nowrap"
              >
                Get Started <ArrowUpRight size={16} className="md:w-[18px]" />
              </button>
            )}
          </div>
        </nav>
      </div>
    </ClientOnly>
  );
}