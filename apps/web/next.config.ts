import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import pkg from "./package.json";
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
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
