import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validateRepositoryDeploymentConfigs, readDeploymentConfigs } from "./check-deployment-configs.mjs";
import { REPOSITORY, WORKER, assertDispatch, assertSource, assertBuild, assertEnvironment, assertAlphaConfig, currentDeployment, performDeployment } from "./lib/alpha-deployment.mjs";
import { smokeAlpha } from "./lib/alpha-smoke.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = process.env;
const run = (command, args) => execFileSync(command, args, { cwd: root, encoding: "utf8", timeout: 30000 }).trim();
const read = path => JSON.parse(readFileSync(path, "utf8"));
const evidence = () => {
  assert(env.RUNNER_TEMP, "GitHub runner evidence directory required");
  const directory = resolve(env.RUNNER_TEMP, "zigoals-alpha-evidence");
  mkdirSync(directory, { recursive: true });
  return directory;
};
const evidenceFile = name => resolve(evidence(), name);
function save(name, value) {
  writeFileSync(evidenceFile(name), JSON.stringify(value, null, 2) + "\n");
}
function note(text) {
  console.log(text);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, text + "\n\n");
}
async function jsonGet(url, token, label) {
  assert(token, `${label} credential missing`);
  const response = await fetch(url, {
    redirect: "error", signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "User-Agent": "ZIGoals-Alpha-Deploy" },
  });
  assert(response.ok, `${label} read failed (HTTP ${response.status}); no response body logged`);
  return response.json();
}
const github = path => jsonGet(`https://api.github.com/repos/${REPOSITORY}/${path}`, env.GH_TOKEN, "GitHub");
const remoteMain = async () => (await github("git/ref/heads/main")).object?.sha;
async function authorize() {
  assertDispatch(env);
  assert.equal(await remoteMain(), env.EXPECTED_COMMIT, "main moved since dispatch; dispatch the reviewed current SHA again");
  const environment = await github("environments/alpha");
  const policies = await github("environments/alpha/deployment-branch-policies?per_page=100");
  assertEnvironment(environment, policies);
}
async function checkSource() {
  assertDispatch(env);
  assertSource({
    expected: env.EXPECTED_COMMIT, dispatched: env.GITHUB_SHA, remote: await remoteMain(),
    head: run("git", ["rev-parse", "HEAD"]),
    dirty: run("git", ["status", "--porcelain", "--untracked-files=normal"]),
    node: process.version, pnpm: run("pnpm", ["--version"]),
  });
  assert.deepEqual(validateRepositoryDeploymentConfigs(root), [], "Deployment config isolation check failed");
  assertAlphaConfig(readDeploymentConfigs(root).alpha);
  assert.equal(read(resolve(root, "package.json")).packageManager, "pnpm@11.19.0");
  assert.equal(read(resolve(root, "package.json")).engines.node, "24.19.0");
  assert.equal(readFileSync(resolve(root, ".node-version"), "utf8").trim(), "24.19.0");
}
function checkBuild() {
  const build = read(resolve(root, "apps/web/.open-next/alpha-build.json"));
  assertBuild(build, env.EXPECTED_COMMIT, read(resolve(root, "apps/web/package.json")).version);
  assert(existsSync(resolve(root, "apps/web/.open-next/worker.js")), "Built Alpha Worker missing");
  save("alpha-build.json", build);
}
function cloudflare(path) {
  assert.match(env.CLOUDFLARE_ACCOUNT_ID ?? "", /^[a-f0-9]{32}$/, "Set the Alpha account ID in the alpha environment");
  return jsonGet(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/workers/scripts/${WORKER}/${path}`, env.CLOUDFLARE_API_TOKEN, "Cloudflare");
}
const current = async () => currentDeployment(await cloudflare("deployments"));

async function captureRollback() {
  await authorize();
  await checkSource();
  checkBuild();
  const rollback = await current();
  // Persist the current version even if the health/version-detail checks fail.
  save("rollback.json", { ...rollback, capturedAt: new Date().toISOString(), validated: false });
  note(`Current Alpha rollback version: \`${rollback.versionId}\` (deployment \`${rollback.deploymentId}\`).`);
  const version = await cloudflare(`versions/${rollback.versionId}`);
  assert.equal(version.success, true, "Rollback version lookup failed");
  assert.equal(version.result?.id, rollback.versionId, "Rollback version detail mismatch");
  const smoke = await smokeAlpha();
  assert.deepEqual(await current(), rollback, "Alpha changed during rollback validation");
  save("rollback.json", { ...rollback, capturedAt: new Date().toISOString(), validated: true, smoke });
}

async function deploy() {
  await authorize();
  const saved = read(evidenceFile("rollback.json"));
  assert.equal(saved.validated, true, "A validated rollback snapshot is required");
  checkBuild();
  const outputPath = evidenceFile("wrangler-output.jsonl");
  assert(!existsSync(outputPath), "Refusing to reuse Wrangler output from an earlier attempt");
  await performDeployment({ deploymentId: saved.deploymentId, versionId: saved.versionId }, {
    checkSource: async () => { await checkSource(); checkBuild(); }, current,
    publish: async () => {
      // No interpolated shell commands, user-selected targets, environments or flags.
      // OpenNext delegates to pinned Wrangler and preserves the existing domains.
      const deployEnv = { ...env, WRANGLER_OUTPUT_FILE_PATH: outputPath, WRANGLER_SEND_METRICS: "false", CI: "true" };
      delete deployEnv.GH_TOKEN;
      const result = spawnSync("pnpm", ["--filter", "@zigoals/web", "exec", "opennextjs-cloudflare", "deploy", "--config", "wrangler.alpha.jsonc", "--name", WORKER], {
        cwd: root, stdio: "inherit", timeout: 300000,
        env: deployEnv,
      });
      return { code: result.status, output: existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "" };
    },
    smoke: () => smokeAlpha({ expectedCommit: env.EXPECTED_COMMIT }),
    save: value => {
      save("deployment.json", { ...value, commit: env.EXPECTED_COMMIT, recordedAt: new Date().toISOString() });
      // Preserve outputs even if later rollout verification or smoke fails.
      if (env.GITHUB_OUTPUT) {
        appendFileSync(env.GITHUB_OUTPUT, `rollback_version_id=${value.rollbackVersionId}\n`);
        if (value.newVersionId) appendFileSync(env.GITHUB_OUTPUT, `new_version_id=${value.newVersionId}\n`);
      }
    },
  });
}

function summary() {
  const path = evidenceFile("deployment.json");
  const rollbackPath = evidenceFile("rollback.json");
  const report = existsSync(path) ? read(path) : { status: "NOT_DEPLOYED", newVersionId: null };
  const rollback = report.rollbackVersionId ?? (existsSync(rollbackPath) ? read(rollbackPath).versionId : null);
  note([
    "## Manual Alpha deployment", "",
    `- Result: **${report.status}**`, `- Worker: \`${WORKER}\``,
    `- Reviewed source: \`${env.EXPECTED_COMMIT}\``,
    `- New version ID: \`${report.newVersionId ?? "NOT_CONFIRMED"}\``,
    `- Rollback version ID: \`${rollback ?? "NOT_CAPTURED"}\``,
    `- Last observed live version: \`${report.observedLiveVersionId ?? "NOT_CHECKED"}\``,
    "- Read deployment.json and rollback.json in the evidence artifact before taking recovery action.",
    "- A failed/interrupted upload may already be live. No automatic retry or rollback was performed.",
    "- Owner visual, real Keplr/reload/reconnect, Habit/Health persistence and mobile checks remain separate.",
  ].join("\n"));
}

try {
  switch (process.argv[2]) {
    case "authorize": await authorize(); note(`Owner dispatch verified for \`${env.EXPECTED_COMMIT}\`. Approve the alpha environment to continue.`); break;
    case "source": await checkSource(); break;
    case "build": await checkSource(); checkBuild(); break;
    case "capture": await captureRollback(); break;
    case "deploy": await deploy(); break;
    case "summary": summary(); break;
    case "smoke": console.log(JSON.stringify(await smokeAlpha(), null, 2)); break;
    default: throw Error("Expected authorize, source, build, capture, deploy, summary or smoke");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
