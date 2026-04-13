import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@oc/db", "@oc/auth", "@oc/shared"],
  serverExternalPackages: ["better-sqlite3"],
  allowedDevOrigins: ["*.trycloudflare.com"],
  poweredByHeader: false,
};

export default nextConfig;
