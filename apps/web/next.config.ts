import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import pkg from "./package.json";
import egress from "./lib/egress-policy.json";
import { SVG_CSP } from "./lib/csp-compose.mjs";
function publicBuildIdentity() {
  try {
    const run = (args: string[]) =>
      execFileSync("git", args, {
        encoding: "utf8",
        timeout: 4000,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: "0" },
      }).trim();
    const commit = run(["rev-parse", "HEAD"]);
    return {
      commit: /^[a-f0-9]{40}$/.test(commit) ? commit : "Unknown",
      dirty: Boolean(
        run(["status", "--porcelain", "--untracked-files=normal"]),
      ),
    };
  } catch {
    return { commit: "Unknown", dirty: true };
  }
}
const build = publicBuildIdentity();
const config: NextConfig = {
  devIndicators: false,
  env: {
    NEXT_PUBLIC_APP_ENVIRONMENT: process.env.NEXT_PUBLIC_APP_ENVIRONMENT ?? "INVALID_CONFIGURATION",
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_APP_COMMIT: build.commit,
    NEXT_PUBLIC_APP_DIRTY: String(build.dirty),
  },
  transpilePackages: [
    "@zigoals/goal-engine",
    "@zigoals/chain-config",
    "@zigoals/shared-types",
    "@zigoals/strategy-types",
  ],
  poweredByHeader: false,
  async headers() {
    return [
      // Session U Part 6 (FIX_PLAN D2, FINDINGS Q-WEB-03): an SVG opened on its own runs no script and loads nothing from
      // elsewhere. The same value as public/_headers' "/*.svg" rule, which serves these files on Cloudflare.
      { source: "/:file(.*\\.svg)", headers: [{ key: "Content-Security-Policy", value: SVG_CSP }] },
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          // Session U Part 6 (FIX_PLAN D1, FINDINGS Q-WEB-01): a page this app opens, or that opens it, gets no handle on it.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: egress.permissionsPolicy.global,
          },
        ],
      },
      // Permissions-Policy per route (one source: lib/egress-policy.json). Next applies the last matching entry for the
      // same header key, so the order is global → every app page → Health. The app's own pages allow the microphone
      // for ZIGi's voice input (ADR-012); the camera stays Health-only for the barcode scanner.
      {source:"/app/:path*",headers:[{key:"Permissions-Policy",value:egress.permissionsPolicy.app}]},
      {source:"/app/health",headers:[{key:"Permissions-Policy",value:egress.permissionsPolicy.health}]},
    ];
  },
};
export default config;
