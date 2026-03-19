import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["pdf-to-img", "pdfjs-dist"],
  experimental: {
    useCache: true,
  },
};

export default nextConfig;
