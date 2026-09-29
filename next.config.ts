import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gömülü Postgres (PGlite) WebAssembly dosyalarıyla birlikte Node'dan yüklenir
  agentRules: false,
  // Arama motorlarına tüm yanıtlarda "dizine ekleme" bildirilir
  async headers() {
    return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] }];
  },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;
