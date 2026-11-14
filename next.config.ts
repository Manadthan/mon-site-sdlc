import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // N'annonce pas « X-Powered-By: Next.js » dans les réponses HTTP.
  poweredByHeader: false,
  experimental: {
    // Les photos sont réduites dans le navigateur (~300 Ko) ; marge pour les cas limites (DESIGN.md §5).
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
