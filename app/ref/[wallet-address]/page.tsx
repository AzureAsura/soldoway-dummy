"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ClientOnly } from "@/app/components/client-only";

export default function ReferralPage() {
  const router = useRouter();
  const params = useParams();
  const walletAddress = params["wallet-address"] as string;

  useEffect(() => {
    if (walletAddress) {
      localStorage.setItem("referral_code", walletAddress);
      toast.success("Referral code applied!", {
        description: "You will be redirected to the landing page shortly.",
      });
      // Redirect to landing page
      setTimeout(() => {
        router.replace("/");
      }, 2000);
    }
  }, [walletAddress, router]);

  return (
    <ClientOnly>
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center animate-fade-in">
          <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h1 className="text-xl font-bold">Applying referral code...</h1>
          <p className="text-muted-foreground mt-2">Please wait.</p>
        </div>
      </div>
    </ClientOnly>
  );
}
