import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Root-level dev/debug scripts — CommonJS by design, not part of the app
    "airdrop.js",
    "check_balance.js",
    "empty-module.js",
    "test-privy.js",
    "test-privy-sign.js",
    "test-privy-types.js",
    "test-types.js",
  ]),
]);

export default eslintConfig;
