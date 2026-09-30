import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";

// Every wrangler command and flag that our scripts, workflows and owner docs use must still be accepted by the
// pinned wrangler (scripts/alpha-deploy.mjs, activation-check, package.json, MANUAL_ALPHA_WORKFLOW.md,
// CLOUDFLARE_ALPHA.md, LANDING.md, CPU_OWNER_CHECKLIST.md, ACTIVATION.md). Help output only: offline, no account.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = resolve(root, "apps/web/node_modules/.bin/wrangler");
const surface = [
  ["deploy", ["--config", "--name", "--dry-run", "--outdir", "--secrets-file", "--strict"]],
  ["versions view", ["--config", "--name"]],
  ["versions list", ["--config", "--name"]],
  ["rollback", ["--config", "--name", "--message"]],
  ["deployments list", ["--config", "--name"]],
  ["tail", ["--version-id", "--method", "--ip", "--format"]],
  ["dev", ["--config", "--env-file", "--ip", "--port"]],
  ["types", ["--config", "--include-env", "--include-runtime", "--check"]],
  ["secret put", ["--config", "--name"]],
  ["secret delete", ["--config", "--name"]],
  ["whoami", []],
];
test.each(surface)("wrangler %s accepts the flags we use", (command, flags) => {
  const result = spawnSync(wrangler, [...command.split(" "), "--help"], {
    cwd: root, encoding: "utf8", timeout: 60000,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_WRITE_LOGS: "false" },
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  for (const flag of flags) expect(result.stdout, `${command} ${flag}`).toMatch(new RegExp(`(^|[\\s,])${flag}(?=[\\s,])`, "m"));
});
