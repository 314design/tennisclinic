import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gömülü Postgres (PGlite) WebAssembly dosyalarıyla birlikte Node'dan yüklenir
  agentRules: false,
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
