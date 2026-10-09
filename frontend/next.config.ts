import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = isDev
  ? {
      // Proxy API calls to the FastAPI backend during development.
      async rewrites() {
        const apiUrl = process.env.API_URL ?? "http://localhost:8000";
        return [{ source: "/api/:path*", destination: `${apiUrl}/api/:path*` }];
      },
    }
  : {
      // Production builds are static files served by FastAPI (see Dockerfile).
      // Trailing slashes emit nda/index.html, which FastAPI's StaticFiles serves for /nda.
      output: "export",
      trailingSlash: true,
    };

export default nextConfig;
