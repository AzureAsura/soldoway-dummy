"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { PropsWithChildren, useState, useEffect } from "react";
import { AuthGuard } from "./auth-guard";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      })
  );

  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "";

  const [solanaConnectors, setSolanaConnectors] = useState<any>(null);

  useEffect(() => {
    import("@privy-io/react-auth/solana").then((mod) => {
      setSolanaConnectors(mod.toSolanaWalletConnectors());
    }).catch(console.error);
  }, []);

  if (!privyAppId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-destructive/30">
          <h2 className="text-xl font-bold text-destructive mb-2">
            Missing Configuration
          </h2>
          <p className="text-sm text-muted-foreground">
            Add <code className="font-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> to{" "}
            <code className="font-mono">.env</code> to initialize auth.
          </p>
        </div>
      </div>
    );
  }

  // Prevent Privy from crashing because connectors haven't loaded yet
  if (!solanaConnectors) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={privyAppId}
        config={{
          loginMethods: ["email", "google", "wallet"],
          appearance: {
            theme: "dark",
            accentColor: "#7c3aed",
            walletList: ["phantom", "solflare"],
          },
          externalWallets: {
            solana: {
              connectors: solanaConnectors,
            },
          },
          embeddedWallets: {
            solana: {
              createOnLogin: "users-without-wallets",
            },
          },
        }}
      >
        <AuthGuard>
          <Toaster position="bottom-right" richColors theme="dark" />
          {children}
        </AuthGuard>
      </PrivyProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
