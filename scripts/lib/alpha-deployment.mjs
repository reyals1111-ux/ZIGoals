import assert from "node:assert/strict";

export const REPOSITORY = "reyals1111-ux/ZIGoals";
export const OWNER = "reyals1111-ux";
export const WORKER = "zigoals-alpha";
const SHA = /^[a-f0-9]{40}$/;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const HOSTED_SOURCE_MISMATCH = "Hosted build commit differs from reviewed source";
const DEFAULT_PROPAGATION_ATTEMPTS = 12;
const DEFAULT_PROPAGATION_DELAY_MS = 5_000;
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function alphaRuntimeSecrets(coinGeckoKey) {
  assert(
    typeof coinGeckoKey === "string" && coinGeckoKey.length > 0,
    "CoinGecko Alpha runtime secret missing",
  );
  return { COINGECKO_DEMO_API_KEY: coinGeckoKey };
}

export function alphaDeploymentEnvironment(source, outputPath) {
  const result = {
    ...source,
    WRANGLER_OUTPUT_FILE_PATH: outputPath,
    WRANGLER_SEND_METRICS: "false",
    CI: "true",
  };
  delete result.GH_TOKEN;
  delete result.COINGECKO_DEMO_API_KEY;
  return result;
}

export function alphaDeployArgs(secretPath) {
  assert(
    typeof secretPath === "string" && secretPath.length > 0,
    "Alpha runtime secrets file required",
  );
  return [
    "--filter", "@zigoals/web",
    "exec", "opennextjs-cloudflare", "deploy",
    "--config", "wrangler.alpha.jsonc",
    "--name", WORKER,
    "--",
    "--secrets-file", secretPath,
  ];
}

export function assertDispatch(env) {
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch", "Manual dispatch required");
  assert.equal(env.GITHUB_REPOSITORY, REPOSITORY, "Canonical repository required");
  assert.equal(env.GITHUB_ACTOR, OWNER, "Owner must dispatch");
  assert.equal(env.GITHUB_TRIGGERING_ACTOR, OWNER, "Owner must trigger the run");
  assert.equal(env.GITHUB_RUN_ATTEMPT, "1", "Use a fresh dispatch; reruns are refused");
  assert.equal(env.GITHUB_REF, "refs/heads/main", "Select the main branch");
  assert.equal(env.OWNER_APPROVAL, "true", "Explicit owner approval required");
  assert.match(env.EXPECTED_COMMIT ?? "", SHA, "Full reviewed SHA required");
  assert.equal(env.EXPECTED_COMMIT, env.GITHUB_SHA, "Reviewed SHA must equal dispatch SHA");
}

export function assertSource({ expected, dispatched, remote, head, dirty, node, pnpm }) {
  assert.match(expected ?? "", SHA, "Full reviewed SHA required");
  for (const [label, actual] of Object.entries({ dispatched, remote, head })) {
    assert.equal(actual, expected, `${label} must equal the exact reviewed main SHA`);
  }
  assert.equal(dirty, "", "Source tree must be clean, including untracked files");
  assert.equal(node, "v24.19.0", "Node must be 24.19.0");
  assert.equal(pnpm, "11.19.0", "pnpm must be 11.19.0");
}

export function assertBuild(build, expected, version) {
  assert.deepEqual(build, { environment: "PUBLIC_ALPHA_UNDEPLOYED", version, commit: expected, dirty: false }, "Alpha build identity must match clean reviewed source");
}

export function assertEnvironment(env, policies) {
  assert.equal(env?.name, "alpha", "Configure the alpha GitHub environment first");
  assert.equal(env.can_admins_bypass, false, "Disable administrator bypass for alpha");
  assert.deepEqual(env.deployment_branch_policy, { protected_branches: false, custom_branch_policies: true }, "alpha must use selected branch policies");
  const reviewers = env.protection_rules?.filter(rule => rule.type === "required_reviewers");
  assert.equal(reviewers?.length, 1, "alpha requires owner review");
  assert.equal(reviewers[0].prevent_self_review, false, "The sole owner must be able to approve their own dispatch");
  assert.deepEqual(reviewers[0].reviewers.map(r => ({ type: r.type, login: r.reviewer?.login })), [{ type: "User", login: OWNER }], "Only the owner may approve alpha");
  assert.equal(policies?.total_count, 1, "alpha must allow only main");
  assert.deepEqual(policies.branch_policies?.map(p => ({ name: p.name, type: p.type })), [{ name: "main", type: "branch" }], "alpha must allow only the main branch, never tags");
}

export function assertAlphaConfig(config) {
  // Deliberately stricter than the general config checker. Changing this reviewed
  // deployment envelope requires a code review, even for an Alpha-only route.
  const reviewed = {
    $schema: "node_modules/wrangler/config-schema.json", name: WORKER,
    main: ".open-next/worker.js", compatibility_date: "2026-09-13",
    compatibility_flags: ["nodejs_compat", "global_fetch_strictly_public"],
    workers_dev: true, preview_urls: false,
    assets: { directory: ".open-next/assets", binding: "ASSETS", run_worker_first: false },
    services: [{ binding: "WORKER_SELF_REFERENCE", service: WORKER }],
    limits: { cpu_ms: 2000 }, observability: { enabled: false },
  };
  // Avoid including arbitrary config values in a failure report.
  try { assert.deepEqual(config, reviewed); }
  catch { throw Error("Alpha config differs from the reviewed Worker-only configuration"); }
}

export function currentDeployment(body) {
  assert.equal(body?.success, true, "Cloudflare deployment query did not succeed");
  // Cloudflare defines element zero as the deployment actively serving traffic.
  const latest = body.result?.deployments?.[0];
  assert.match(latest?.id ?? "", UUID, "No valid current deployment ID");
  assert.equal(latest.strategy, "percentage", "Unexpected deployment strategy");
  assert.equal(latest.versions?.length, 1, "Rollback requires exactly one live version");
  assert.equal(latest.versions[0].percentage, 100, "Rollback requires 100% traffic");
  assert.match(latest.versions[0].version_id ?? "", UUID, "No valid rollback version ID");
  return { deploymentId: latest.id, versionId: latest.versions[0].version_id };
}

export function deployedVersion(jsonl) {
  const entries = jsonl.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
  const deployments = entries.filter(entry => entry.type === "deploy");
  assert.equal(deployments.length, 1, "Expected exactly one structured Wrangler deployment result");
  const entry = deployments[0];
  assert.equal(entry.version, 1, "Unexpected Wrangler output schema");
  assert.equal(entry.worker_name, WORKER, "Wrangler deployed an unexpected Worker");
  assert.match(entry.version_id ?? "", UUID, "Wrangler did not report a valid version ID");
  return entry.version_id;
}

async function smokeAfterPropagation(live, io) {
  const attempts = io.smokeAttempts ?? DEFAULT_PROPAGATION_ATTEMPTS;
  const delayMs = io.smokeDelayMs ?? DEFAULT_PROPAGATION_DELAY_MS;
  assert(Number.isInteger(attempts) && attempts >= 1, "Smoke attempts must be a positive integer");
  assert(Number.isInteger(delayMs) && delayMs >= 0, "Smoke delay must be a non-negative integer");

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await io.smoke();
    } catch (error) {
      const retryable =
        error instanceof Error &&
        error.message === HOSTED_SOURCE_MISMATCH;

      if (!retryable || attempt === attempts) throw error;

      // Cloudflare can report the new Worker version before the custom hostname
      // serves that exact build. Wait briefly, but never retry through a Worker
      // version change or any other smoke/security failure.
      await (io.sleep ?? wait)(delayMs);
      assert.deepEqual(
        await io.current(),
        live,
        "Alpha changed while waiting for hosted build propagation",
      );
    }
  }

  throw Error("Unreachable smoke retry state");
}

export async function performDeployment(rollback, io) {
  const report = {
    status: "NOT_DEPLOYED", worker: WORKER, rollbackVersionId: rollback.versionId,
    rollbackDeploymentId: rollback.deploymentId, newVersionId: null,
  };
  let attempted = false;
  try {
    io.save(report);
    await io.checkSource();
    assert.deepEqual(await io.current(), rollback, "Live Alpha changed since rollback capture; dispatch again");
    // Check main once more after the Cloudflare read, immediately before publish.
    await io.checkSource();
    attempted = true;
    report.status = "DEPLOYMENT_ATTEMPTED";
    io.save(report);
    const result = await io.publish(); // Exactly one mutation; never retry or auto-rollback.
    report.newVersionId = deployedVersion(result.output);
    io.save(report);
    assert.equal(result.code, 0, "Deploy command failed; inspect live state before any retry");
    assert.notEqual(report.newVersionId, rollback.versionId, "Deploy did not produce a new version");
    const live = await io.current();
    report.observedLiveVersionId = live.versionId;
    report.newDeploymentId = live.deploymentId;
    io.save(report);
    assert.equal(live.versionId, report.newVersionId, "Live version differs from this run's deployed version");
    report.smoke = await smokeAfterPropagation(live, io);
    assert.deepEqual(await io.current(), live, "Alpha changed during smoke checks");
    report.status = "VERIFIED";
    io.save(report);
    return report;
  } catch (error) {
    report.status = attempted ? "NEEDS_OWNER_REVIEW" : "NOT_DEPLOYED";
    report.error = error.message;
    // A CLI error can follow a successful upload. Observe, but never attribute
    // that live version to this run without the structured Wrangler result.
    if (attempted) {
      try { report.observedLiveVersionId = (await io.current()).versionId; }
      catch { report.observedLiveVersionId = null; }
    }
    io.save(report);
    throw error;
  }
}
