"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { useAppStore } from "@/stores/app-store";
import { usePathname } from "next/navigation";
import { ClientOnly } from "./client-only";
import { ArrowUpRight } from "lucide-react";
import Image from "next/image";

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
      {/* Container utama ditaruh agak ke atas sedikit agar pas dengan shadow neobrutalism */}
      <div className="fixed top-4 md:top-5 left-0 right-0 z-50 flex justify-center px-4 md:px-6">
        {/* Floating Navbar: Diubah dari rounded-full ke rounded-[12px] dengan border-2 tebal dan shadow kaku */}
        <nav className="w-full max-w-5xl h-16 md:h-20 bg-white border-2 border-black rounded-[12px] px-4 md:px-6 flex items-center justify-between shadow-[4px_4px_0px_0px_#000]">

          {/* Logo Brand */}
          <Link
            href="/"
            className="flex items-center gap-2 text-black font-black text-lg md:text-xl uppercase tracking-wider shrink-0"
          >
            <div className="p-1 bg-white border-2 border-black rounded-[6px] shadow-[1.5px_1.5px_0px_0px_#000] shrink-0">
              <Image src={'/icon.svg'} alt="logo" priority width={24} height={24} className="md:w-[26px] md:h-[26px]" />
            </div>
            <span>Soldoway</span>
          </Link>

          {/* Menu / Tombol Aksi */}
          <div className="flex items-center gap-3 md:gap-4">
            {authenticated ? (
              <>
                {!role && (
                  <Link
                    href="/dashboard"
                    className="text-xs md:text-sm font-black uppercase tracking-wider text-black/70 hover:text-black transition-colors px-2"
                  >
                    Dashboard
                  </Link>
                )}
                {/* Tombol Logout */}
                <button
                  onClick={logout}
                  className="bg-white text-black border-2 border-black text-xs md:text-sm font-black uppercase tracking-widest px-4 md:px-5 py-2 md:py-2.5 rounded-[15px] shadow-[2.5px_2.5px_0px_0px_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[2.5px] active:translate-y-[2.5px]"
                >
                  Logout
                </button>
              </>
            ) : (
              /* Tombol Get Started (Belum Login) */
              <button
                onClick={login}
                id="nav-login"
                className="bg-[#6be1d9] text-black border-2 border-black text-xs md:text-sm font-black uppercase tracking-widest px-4 md:px-6 py-2.5 md:py-3 rounded-[15px] flex items-center gap-2 shadow-[3px_3px_0px_0px_#000] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] whitespace-nowrap"
              >
                Get Started <ArrowUpRight size={16} className="stroke-[3] md:w-[18px]" />
              </button>
            )}
          </div>
        </nav>
      </div>
    </ClientOnly>
  );
}


// "use client";

// import Link from "next/link";
// import { usePrivy } from "@privy-io/react-auth";
// import { useAppStore } from "@/stores/app-store";
// import { usePathname } from "next/navigation";
// import { ClientOnly } from "./client-only";
// import { ArrowUpRight, Circle } from "lucide-react";
// import Image from "next/image";

// export function Navbar() {
//   const { login, logout, authenticated } = usePrivy();
//   const { role } = useAppStore();
//   const pathname = usePathname();

//   if (
//     pathname?.startsWith("/dashboard") ||
//     pathname?.startsWith("/tasks") ||
//     pathname?.startsWith("/campaigns")
//   ) {
//     return null;
//   }

//   return (
//     <ClientOnly>
//       <div className="fixed top-4 md:top-6 left-0 right-0 z-50 flex justify-center px-6">
//         <nav className="w-full max-w-6xl h-[64px] md:h-[72px] bg-[#F1F1F1]/80 backdrop-blur-xl border border-white/20 rounded-full px-4 md:px-8 flex items-center justify-between shadow-sm">

//           <Link
//             href="/"
//             className="flex items-center gap-2 text-black font-bold text-xl md:text-2xl tracking-tight shrink-0"
//           >
//             <Image src={'/icon.svg'} alt="logo" priority width={30} height={30}/>
//             <span>Soldoway</span>
//           </Link>

//           <div className="flex items-center gap-2 md:gap-4">
//             {authenticated ? (
//               <>
//                 {!role && (
//                   <Link
//                     href="/dashboard"
//                     className="text-xs md:text-sm font-semibold text-black/70 hover:text-black transition-colors px-2"
//                   >
//                     Dashboard
//                   </Link>
//                 )}
//                 <button
//                   onClick={logout}
//                   className="bg-black text-white text-[13px] md:text-[15px] font-medium px-4 md:px-6 py-2.5 md:py-3 rounded-full flex items-center gap-2 hover:bg-black/80 transition-all active:scale-95 whitespace-nowrap"
//                 >
//                   Logout
//                 </button>
//               </>
//             ) : (
//               <button
//                 onClick={login}
//                 id="nav-login"
//                 className="bg-black text-white text-[13px] md:text-[15px] font-medium px-5 md:px-7 py-2.5 md:py-3.5 rounded-full flex items-center gap-2 hover:bg-black/90 transition-all active:scale-95 shadow-lg whitespace-nowrap"
//               >
//                 Get Started <ArrowUpRight size={16} className="md:w-[18px]" />
//               </button>
//             )}
//           </div>
//         </nav>
//       </div>
//     </ClientOnly>
//   );
// }