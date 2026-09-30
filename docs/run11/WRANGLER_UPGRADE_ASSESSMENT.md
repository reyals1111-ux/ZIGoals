# Wrangler upgrade assessment: 4.131.1 → 4.x latest (2026-09-30)

**Update (Session D, 2026-09-30):** wrangler is now **4.144.0** (owner-approved, [PR #50](https://github.com/reyals1111-ux/ZIGoals/pull/50)). The upgrade followed the procedure below; results are in docs/STATUS.md and the owner's first-deploy checklist is [WATCHED_DEPLOY_WRANGLER.md](WATCHED_DEPLOY_WRANGLER.md). Also observed: a dry run writes a `deploy` entry to the output file too, with `version_id: null`, and `deployedVersion` refuses it (pinned with real output in `scripts/fixtures/wrangler-output/`). The text below is the assessment as written.

Status: **assessment only. Wrangler is not bumped** (`apps/web/package.json` stays at `4.131.1`). No wrangler command was run against a Cloudflare account; only local, account-free commands (`deploy --dry-run`, `dev`, `types`) were used.

## Evidence limits (read first)
- **changelog** = read from the official `packages/wrangler/CHANGELOG.md` and `packages/miniflare/CHANGELOG.md` in `cloudflare/workers-sdk` (shallow clone at `ddaa558`, 2026-09-30).
- **npm** = `npm view` on the public registry, or the published tarballs of wrangler 4.131.1, 4.143.1 and 4.144.0 and miniflare 5.20260911.0-alpha and 5.20260926.1-alpha, diffed where stated.
- **source** = this repository at the commit of this document.
- The GitHub advisories API was blocked here. The undici advisories were confirmed through npm's advisory data instead (the same data `pnpm audit` uses).
- Nothing below was verified against a live Cloudflare account. The Durable Object default in "DO migrations and bindings" is **UNVERIFIED** server-side.

## Versions (npm)
`latest` is **4.144.0**. Every wrangler release pins an exact miniflare, which pins an exact undici:

| wrangler | miniflare | undici | workerd |
|---|---|---|---|
| **4.131.1 (current)** | 5.20260911.0-alpha | 7.29.0 | 1.20260911.1 |
| 4.131.2 – 4.143.0 | 5.20260911.1 … 5.20260926.0-alpha | 7.29.0 | 1.20260911.1 … 1.20260926.1 |
| **4.143.1** | 5.20260926.1-alpha | **7.29.1** | 1.20260926.1 |
| **4.144.0 (latest)** | 5.20260926.1-alpha | 7.29.1 | 1.20260926.1 |

- Node: wrangler 4.144.0 and its miniflare require Node `>=22.0.0`, the same as 4.131.1. Node 24.19.0 is fine. (npm)
- Peers: wrangler's only peer is the optional `@cloudflare/workers-types`, which the repo does not use. `@opennextjs/cloudflare` 1.20.7 peers `wrangler ^4.125.0`, so both 4.143.1 and 4.144.0 fit. (npm)

## Would the undici audit findings clear?
**Yes, from 4.143.1.** All 10 current undici advisories (2 high: GHSA-rfgv-xxqx-mfg5 and GHSA-w293-vg96-wgc3, plus moderates and lows) have the range `<7.29.1`. npm's advisory data lists none for 7.29.1. (npm) The 4.143.1 changelog names the bump: "Undici 7.29.1 fixes GHSA-3wwx-pv8p-q78v". (changelog) An advisory check of the direct dependencies of wrangler 4.144.0 and miniflare 5.20260926.1-alpha returned nothing. (npm)

The undici findings stay in this PR because miniflare pins undici **exactly** (`7.29.0`). Clearing them without a wrangler bump would need a pnpm override that forces a version miniflare was not released with. The approval allows overrides only if unavoidable, and a wrangler upgrade is the clean route.

## Commands and outputs we use (source), and what changes (changelog, npm)
| Where | Command / output | Change 4.131.1 → 4.144.0 |
|---|---|---|
| `scripts/lib/alpha-deployment.mjs` `alphaDeployArgs` (Manual Alpha) | `opennextjs-cloudflare deploy --config wrangler.alpha.jsonc --name zigoals-alpha -- --secrets-file <file>`, which runs `wrangler deploy --secrets-file` | None mentioned. The `--secrets-file` description is identical: it applies additively, and omitted secrets are not deleted. (changelog, npm diff) |
| `scripts/lib/alpha-deployment.mjs` `deployedVersion` | `WRANGLER_OUTPUT_FILE_PATH` JSONL. Needs exactly one `type:"deploy"` entry with `version:1`, `worker_name`, and a UUID `version_id` | **Unchanged.** The `deploy` entry is identical in both tarballs: the same fields, written from one place, and the same set of entry types. 4.136.1 reads workers.dev URLs "from the Worker resource", which can change the `targets` content; `deployedVersion` does not read `targets`. (npm diff, changelog) |
| `scripts/alpha-deploy.mjs` rollback capture | The Cloudflare REST API (`/workers/scripts/zigoals-alpha/deployments`, `/versions/<id>`), **not wrangler** | Not affected by a wrangler upgrade. (source) |
| `pnpm --filter @zigoals/web check:alpha`, `pnpm check:landing`, `activation-check --dry-run` | `wrangler deploy --config … [--name …] --dry-run`, and the "Total Upload: X KiB / gzip: Y KiB" line | None mentioned. The line is printed by identical code. New optional flags only (`--durable-objects-code-update-mode`, `--zone`, `--zone-id`, `--x-route-zones`, `--event-code`). 4.136.0 changes module naming for `preserve_file_names` builds: absolute specifiers are rebased to `./<basename>`. It cites @opennextjs/cloudflare WASM imports and fixes a dry run that passed locally but failed on upload (10021). **Compare the dry-run upload size and module list before and after.** (changelog, npm diff) |
| `preview:alpha`, docs | `wrangler dev --config … --env-file … --ip --port` | None mentioned for these flags. 4.132.0 shows internal-error messages instead of an empty `✘ [ERROR]`. (changelog) |
| Owner rollback (MANUAL_ALPHA_WORKFLOW.md, CLOUDFLARE_ALPHA.md, LANDING.md) | `wrangler versions view`, `wrangler rollback <id>`, `wrangler deployments list`, `wrangler versions list`, `wrangler whoami` | `rollback` and `versions deploy` gain `--durable-objects-code-update-mode` (4.141.0; see below). 4.143.1: when the auth server cannot be reached, `whoami` / OAuth refresh keeps the stored credentials and no longer says "token has expired". No script parses that text. Nothing else mentioned. (changelog) |
| CPU checklist | `wrangler tail zigoals-alpha …` | None mentioned. (changelog) |
| Activation docs | `wrangler secret put` / `secret delete` | None mentioned. (changelog) |
| `pnpm typecheck`, `scripts/worker-types.test.mjs` (added in this PR) | `wrangler types` for `workers/worker-runtime.d.ts` and `workers/market-coordinator/worker-configuration.d.ts`, and `--check` in the test | 4.136.2 fixes trailing whitespace in the generated runtime header. **Regenerate** both files with the new version (the test fails until you do), and expect a diff (workerd 1.20260911 → 1.20260926 runtime types). Nothing mentioned for `--check`, `--include-runtime`, `--include-env` or the default file name. (changelog) |
| `scripts/run11/*` (about 20 test harnesses) | Miniflare loaded through wrangler: `new Miniflare(convertV4MiniflareOptions(…))`, `dispatchFetch`, `dispose`, `unsafeDirectSockets`, `useSQLite`, `resourcePersistencePath`, `outboundService` | The API is present with the same signatures in both versions. (npm diff) Behaviour to watch (changelog): known-length `dispatchFetch` bodies now carry `Content-Length` instead of chunked encoding (5.20260926.1-alpha); `type: "worker"` is no longer accepted in Worker configs (5.20260921.0-alpha; we do not pass it); fix for intermittent synchronous binding failures under load (5.20260916.0-alpha). Side note (npm, source): `durableObjectsPersist`, passed by `private-runtime.mjs` and `lifecycle-recovery.test.mjs`, is not a declared option in either version. `resourcePersistencePath`, passed alongside it, is what takes effect. |

## DO migrations and bindings
- **Deployed configs have no Durable Objects.** `apps/web/wrangler.alpha.jsonc` binds only `WORKER_SELF_REFERENCE`, and `landing/wrangler.jsonc` has no bindings. So the Manual Alpha deploy is not affected by DO changes. (source)
- **4.141.0 adds a DO code update strategy.** 4.144.0 sends `code_update_strategy` on every `deploy`, `versions deploy` and `rollback`, defaulting to `{mode:"deferred", max_delay:300}` (at most 5 minutes). Whether this differs from the server-side default that 4.131.1 relied on is **UNVERIFIED**. It matters only for the Stage 7 Workers with DOs (private-sync `PrivateVault`, lifecycle `LifecycleAuthority`, market coordinator `MarketAccount`, auth-abuse `AdmissionAuthority`, food `FoodBudget`). All are still local-only configs. (changelog, npm diff)
- No change mentioned to `migrations` / `new_sqlite_classes` handling or to compatibility-date handling. Our compatibility date stays `2026-09-13`; workerd moves to 1.20260926.1. (changelog)
- `nodejs_compat`: `@cloudflare/unenv-preset` 2.16.1 → 2.16.2 (4.136.1) keeps side-effect-only polyfills that install globals such as `performance`. This can change the Alpha bundle size slightly. (changelog)

## Breaking, deprecated and security items
- The breaking changes affect only experimental or beta features we do not use: `cloudflare.config.ts` imports (4.143.0), Build Output renames (4.136.0), the Container image env binding (4.136.0), the Web Search binding (4.132.0), and the Local Explorer Workflow field (4.133.0). (changelog)
- Security fixes: undici 7.29.1 (4.143.1); smol-toml 1.8.0 / 1.9.0 (4.136.3, 4.139.0). The TOML fixes do not affect our `.jsonc` configs. (changelog)
- Nothing we use is deprecated. (changelog)

## Recommendation
**Target wrangler 4.144.0.** It is `latest`, has the same miniflare/undici/workerd as 4.143.1, and adds only Containers SSH features. If the owner prefers the smallest step that clears the audit, choose 4.143.1. Upgrade in its own PR, as a single `TIER 3 (dependencies)` commit, after this PR and #47 have merged. It needs explicit owner approval, since wrangler is outside this session's approval.

## Upgrade procedure
1. **Bump:** set `"wrangler": "4.144.0"` in `apps/web/package.json`, then `pnpm install`. Check that the lockfile diff contains only wrangler, miniflare, workerd, `@cloudflare/*` and their own dependencies, and that `undici` becomes 7.29.1. Record every changed version in the commit.
2. **Audit:** `pnpm audit` should show no undici findings. `pnpm audit --prod` must stay clean.
3. **Types:** regenerate the Worker declarations with the commands in `workers/README.md`. Review `workers/runtime-overrides.d.ts`: drop any entry the new runtime types already cover. Commit the diff, then run `pnpm typecheck` and `scripts/worker-types.test.mjs`.
4. **Local gates (no account):** `pnpm lint`, `pnpm typecheck`, `pnpm test` (the Miniflare harnesses under `scripts/run11/` are the main regression net), `pnpm check:deploy-configs`, `pnpm check:landing`, `build:alpha`, and `check:alpha`. Compare "Total Upload / gzip" with the value before the upgrade. Then run `activation-check --dry-run` plus `RUN11_PACKAGED=1` packaged-runtime, `preview:alpha` with `public-alpha.spec.ts` and `diagnostics.spec.ts`, the CI browser integration step, and the full Playwright suite (2 workers).
5. **Output-file check:** `scripts/alpha-deployment.test.mjs` pins the JSONL parser. Also run one local `wrangler deploy --dry-run` with `WRANGLER_OUTPUT_FILE_PATH` set, before and after the bump, and compare the entries it writes.
6. **CI green** on the PR. Then merge by the owner.
7. **One owner-watched Manual Alpha deploy** of the merged `main`, using the normal workflow ([MANUAL_ALPHA_WORKFLOW.md](../deployment/MANUAL_ALPHA_WORKFLOW.md)). Before dispatching, note the live version ID from the latest STATUS deploy record. The workflow captures and validates it as the rollback. Confirm that the run reports `VERIFIED` with a new `version_id` and the expected rollback ID.
8. **Rollback ready:** if smoke or the owner checks fail, follow "Failures and recovery" in MANUAL_ALPHA_WORKFLOW.md: `wrangler versions view` / `wrangler rollback <captured id>` / `wrangler deployments list`, then `node scripts/alpha-deploy.mjs smoke`. Use the previous pinned toolchain if the new wrangler is suspected. `git switch` to the pre-upgrade commit and `pnpm install --frozen-lockfile` give wrangler 4.131.1 again.
9. Record the deploy in docs/STATUS.md as usual.
