import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // N'annonce pas « X-Powered-By: Next.js » dans les réponses HTTP.
  poweredByHeader: false,
};

export default nextConfig;
