import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* @google/model-viewer ships ESM-only — transpile it so both local Turbopack
     and Vercel's production build resolve it reliably. */
  transpilePackages: ["@google/model-viewer"],
};

export default nextConfig;
