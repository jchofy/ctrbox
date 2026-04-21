import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["better-sqlite3", "rebrowser-playwright", "pino"],
};

export default nextConfig;
