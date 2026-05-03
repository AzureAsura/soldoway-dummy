import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "ws",
    "@coral-xyz/anchor",
    "@solana/web3.js",
    "@privy-io/react-auth",
  ],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.privy.io; connect-src 'self' https: wss:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https: blob:; frame-src 'self' https://*.privy.io;",
          },
        ],
      },
    ];
  },
  // Stub Node built-ins for the client bundle
  turbopack: {
    resolveAlias: {
      fs: { browser: "./empty-module.js" },
      net: { browser: "./empty-module.js" },
      tls: { browser: "./empty-module.js" },
      crypto: { browser: "./empty-module.js" },
      os: { browser: "./empty-module.js" },
      "pino-pretty": { browser: "./empty-module.js" },
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        os: false,
        "pino-pretty": false,
      };
    }
    config.externals.push("pino-pretty", "encoding");
    return config;
  },
};

export default nextConfig;
