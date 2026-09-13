import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  transpilePackages: [
    "@zigoals/goal-engine",
    "@zigoals/chain-config",
    "@zigoals/shared-types",
    "@zigoals/strategy-types",
  ],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://testnet-api.zigchain.com https://testnet-rpc.zigchain.com ws://127.0.0.1:3100; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
          },
        ],
      },
    ];
  },
};
export default config;
