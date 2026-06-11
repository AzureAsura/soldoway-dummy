"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";
import { createSolanaRpc, createSolanaRpcSubscriptions } from "@solana/kit";
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
  const [solanaConnectors, setSolanaConnectors] = useState<unknown>(null);

  useEffect(() => {
    import("@privy-io/react-auth/solana")
      .then((mod) => setSolanaConnectors(mod.toSolanaWalletConnectors()))
      .catch(console.error);
  }, []);

  if (!privyAppId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-destructive/30">
          <h2 className="text-xl font-bold text-destructive mb-2">Missing Configuration</h2>
          <p className="text-sm text-muted-foreground">
            Add <code className="font-mono">NEXT_PUBLIC_PRIVY_APP_ID</code> to{" "}
            <code className="font-mono">.env</code> to initialize auth.
          </p>
        </div>
      </div>
    );
  }

  if (!solanaConnectors) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider
        appId={privyAppId}
        config={{
          solana: {
            rpcs: {
              "solana:devnet": {
                rpc: createSolanaRpc("https://api.devnet.solana.com"),
                rpcSubscriptions: createSolanaRpcSubscriptions("wss://api.devnet.solana.com"),
              },
            },
          },
          loginMethods: ["wallet"],
          appearance: {
            theme: "light",
            accentColor: "#7c3aed",
            walletList: ["phantom", "solflare"],
          },
          externalWallets: {
            solana: {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              connectors: solanaConnectors as any,
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
          <Toaster richColors position="bottom-right" />
          {children}
        </AuthGuard>
      </PrivyProvider>
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
