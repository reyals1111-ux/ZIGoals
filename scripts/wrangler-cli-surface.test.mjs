import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "vitest";
import { wranglerDevArgs, wranglerDevEnv } from "./run11/recovery-admin.mjs";

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
  // Session X Part 10 (Session N1 follow-up): LANDING.md runs `wrangler dev --persist-to`.
  ["dev", ["--config", "--env-file", "--ip", "--port", "--persist-to"]],
  ["types", ["--config", "--include-env", "--include-runtime", "--check"]],
  ["secret put", ["--config", "--name"]],
  ["secret delete", ["--config", "--name"]],
  ["whoami", []],
];
const help = (command) => {
  const result = spawnSync(wrangler, [...command.split(" "), "--help"], {
    cwd: root, encoding: "utf8", timeout: 60000,
    env: { ...process.env, WRANGLER_SEND_METRICS: "false", WRANGLER_WRITE_LOGS: "false" },
  });
  expect(result.status, result.stdout + result.stderr).toBe(0);
  return result.stdout;
};
const lists = (text, flag) => new RegExp(`(^|[\\s,])${flag}(?=[\\s,])`, "m").test(text);
test.each(surface)("wrangler %s accepts the flags we use", (command, flags) => {
  const text = help(command);
  for (const flag of flags) expect(lists(text, flag), `${command} ${flag}`).toBe(true);
});
// Session R1 Part 3b: the recovery-admin tool's own launch (scripts/run11/recovery-admin.mjs), built by the same
// function the tool runs. 4.144.0 rejected its former --disable-dev-registry, so every Cloudflare-contacting
// command failed with "wrangler dev did not start".
test("the recovery-admin launch passes only flags the pinned wrangler dev lists, and keeps a private dev registry", () => {
  const dir = "/tmp/zigoals-recovery-admin-fixture";
  const args = wranglerDevArgs({ adminConfig: "admin.local.jsonc", port: 8801, inspector: 9229, envFile: `${dir}/admin.env`, dir });
  expect(args[0]).toBe("dev");
  const flags = args.filter((arg) => arg.startsWith("--")).map((arg) => arg.split("=")[0]);
  expect(flags).not.toContain("--disable-dev-registry");
  const text = help("dev");
  for (const flag of flags) expect(lists(text, flag), `dev ${flag}`).toBe(true);
  expect(lists(text, "--disable-dev-registry")).toBe(false);
  const env = wranglerDevEnv({ dir, base: { PATH: "/usr/bin" } });
  expect(relative(dir, env.WRANGLER_REGISTRY_PATH)).toBe("registry");
  expect(env).toMatchObject({ PATH: "/usr/bin", WRANGLER_SEND_METRICS: "false", CLOUDFLARE_INCLUDE_PROCESS_ENV: "false" });
});
