import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

// The committed Worker declarations must match the Worker config and the pinned wrangler
// (see workers/README.md). Offline; no account.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cwd = resolve(root, "workers/market-coordinator");
const wrangler = resolve(root, "apps/web/node_modules/.bin/wrangler");

test.each([
  ["runtime", ["../worker-runtime.d.ts", "--include-env=false"]],
  ["env", ["worker-configuration.d.ts", "--include-runtime=false"]],
])("generated %s declarations are up to date", (_kind, args) => {
  const result = spawnSync(wrangler, ["types", ...args, "-c", "wrangler.local.jsonc", "--check"], {
    cwd, encoding: "utf8", timeout: 60000,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_WRITE_LOGS: "false" },
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
});
