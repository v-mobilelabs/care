import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: ["pdf-to-img", "pdfjs-dist"],
  experimental: {
    useCache: true,
  },
  async redirects() {
    return [
      {
        source: "/patient",
        destination: "/user",
        permanent: true,
      },
      {
        source: "/patient/:path*",
        destination: "/user/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
