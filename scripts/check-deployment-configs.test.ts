import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, expect, test } from "vitest";
import {
  readDeploymentConfigs,
  validateDeploymentConfigs,
} from "./check-deployment-configs.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function pair() {
  return structuredClone(readDeploymentConfigs(repositoryRoot));
}

test("the repository deployment configuration pair passes validation", () => {
  expect(validateDeploymentConfigs({ ...pair(), root: repositoryRoot })).toEqual([]);

  const result = spawnSync(
    process.execPath,
    [resolve(repositoryRoot, "scripts/check-deployment-configs.mjs")],
    { cwd: dirname(repositoryRoot), encoding: "utf8" },
  );

  expect(result.status, result.stderr || result.stdout).toBe(0);
});

test("swapped Worker names cannot cross the apex and Alpha targets", () => {
  const configs = pair();
  [configs.landing.name, configs.alpha.name] = [configs.alpha.name, configs.landing.name];

  expect(validateDeploymentConfigs({ ...configs, root: repositoryRoot })).toEqual([
    'landing Worker name must be "zigoals"',
    'Alpha Worker name must be "zigoals-alpha"',
  ]);
});

test("the obsolete config-relative landing asset path is rejected", () => {
  const configs = pair();
  configs.landing.assets.directory = "./landing";

  expect(validateDeploymentConfigs({ ...configs, root: repositoryRoot })).toContain(
    'landing assets.directory must be "."',
  );
});

test.each([
  ["landing", "alpha.zigoals.app/*", "zigoals.app"],
  ["alpha", "zigoals.app/*", "alpha.zigoals.app"],
] as const)("%s routes cannot claim the other deployment host", (target, route, expectedHost) => {
  const configs = pair();
  configs[target].routes = [{ pattern: route, custom_domain: true }];

  expect(validateDeploymentConfigs({ ...configs, root: repositoryRoot })).toContain(
    `${target} routes may target only ${expectedHost}`,
  );
});

test.each([
  ["landing", "route", 42],
  ["alpha", "routes", { pattern: "alpha.zigoals.app/*" }],
  ["landing", "routes", [{}]],
] as const)("%s rejects a malformed %s shape", (target, field, value) => {
  const configs = pair();
  Object.assign(configs[target], { [field]: value });

  expect(validateDeploymentConfigs({ ...configs, root: repositoryRoot })).toContain(
    `${target} route/routes must be strings or objects with a pattern`,
  );
});

test("the Alpha self-reference must bind back to zigoals-alpha", () => {
  const configs = pair();
  configs.alpha.services[0].service = "zigoals";

  expect(validateDeploymentConfigs({ ...configs, root: repositoryRoot })).toContain(
    "Alpha WORKER_SELF_REFERENCE must target zigoals-alpha",
  );
});

test.each([
  ["main", "worker.mjs"],
  ["services", [{ binding: "WORKER_SELF_REFERENCE", service: "zigoals-alpha" }]],
  ["vars", { ENVIRONMENT: "alpha" }],
] as const)("the static apex rejects the executable or binding field %s", (field, value) => {
  const configs = pair();
  Object.assign(configs.landing, { [field]: value });

  expect(validateDeploymentConfigs({ ...configs, root: repositoryRoot })).toContain(
    `static landing config must not define ${field}`,
  );
});

test("validation fails when the landing entry asset is missing", () => {
  const configs = pair();
  const root = mkdtempSync(resolve(tmpdir(), "zigoals-deployment-config-test-"));
  temporaryDirectories.push(root);

  expect(validateDeploymentConfigs({ ...configs, root })).toContain(
    "landing/index.html must exist",
  );
});

test("validation fails without the narrow landing asset allowlist", () => {
  const configs = pair();
  const root = mkdtempSync(resolve(tmpdir(), "zigoals-deployment-config-test-"));
  temporaryDirectories.push(root);
  mkdirSync(resolve(root, "landing"));
  writeFileSync(resolve(root, "landing/index.html"), "<!doctype html>");

  expect(validateDeploymentConfigs({ ...configs, root })).toContain(
    'landing/.assetsignore must allow only "index.html"',
  );
});


test.each([undefined, 10, 539, 1000, 5001, 30000, "2000"])("Alpha CPU cap cannot silently drift from reviewed 2000ms: %s", cpu_ms => {
  const configs = pair();
  configs.alpha.limits = {cpu_ms};
  expect(validateDeploymentConfigs({...configs,root:repositoryRoot})).toContain("Alpha limits.cpu_ms must be the reviewed 2000ms guardrail");
});
test.each([true, ["/*"], undefined])("Alpha must explicitly serve matching assets before Worker: %s", run_worker_first => {
  const configs = pair();
  configs.alpha.assets.run_worker_first = run_worker_first;
  expect(validateDeploymentConfigs({...configs,root:repositoryRoot})).toContain("Alpha assets.run_worker_first must be false");
});
