import type { NextConfig } from "next";

/**
 * The `pg` driver and the job worker must run on the Node.js runtime, never on
 * the edge runtime, so they are kept out of the client bundle explicitly.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Produces .next/standalone, which the Docker runtime stage copies.
  output: "standalone",
  poweredByHeader: false,
  // The PostgreSQL driver is a native Node.js dependency. It must stay outside
  // the bundle on the Node server, and must not be traced at all for the edge
  // runtime or the browser, where it can never run.
  serverExternalPackages: ["pg"],
  webpack: (config, { isServer, nextRuntime }) => {
    if (!isServer || nextRuntime === "edge") {
      config.resolve.alias = {
        ...config.resolve.alias,
        pg: false,
        "pg-native": false,
      };
    }
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
