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
          // SAMEORIGIN rather than DENY: the report viewer embeds this
          // application's own PDF route, which DENY blocked. Framing by any
          // other site is still refused, which is what the header is for.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          // Only once there is a real certificate to hold the browser to.
          // Sent without includeSubDomains, so a deployment on a subdomain
          // cannot commit the rest of the organisation's domain to HTTPS.
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=15552000" }]
            : []),
        ],
      },
    ];
  },
};

export default nextConfig;
