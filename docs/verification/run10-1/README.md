# Run #10.1 foundation verification

**THIS PR DOES NOT CLAIM TO RESOLVE THE ORIGINAL LIVE 503 INCIDENT.**

Branch: `codex/run10-beta-reliability-foundation`. Exact base: `95ff4d3ea3e0d8c2c33b497bdcefaac0cc539a90`; fetched and verified before changes and again before PR preparation. The original checkout was clean and left untouched; a fresh isolated worktree was created from the remote base. No child task, merge, deployment, rollback or public market request was performed.

## Checks

Final local toolchain: Node `24.19.0`, pnpm `11.19.0`.

| Check | Actual result |
| --- | --- |
| `git diff --check` | PASS |
| Focused foundation, pair contract, coordinator, quotes route, media, acceptance and import-boundary suite | 8 files, 61 tests PASS |
| Provider-foundation regressions | 17 tests PASS |
| Pure budget policy | 10 tests PASS, explicit deterministic clocks and injected synthetic limits |
| Pair-result adapter | 5 tests PASS |
| Coordinator key/schema and compile-time private-field rejection | 2 tests PASS |
| Acceptance classifier | 8 tests PASS, including BLOCKED and incomplete reachable runner |
| JSON/media hardening | 10 tests PASS |
| Server import regression | 2 tests PASS |
| `pnpm test` | 83 files, 1,064 tests PASS |
| `pnpm lint` | PASS |
| `pnpm typecheck` | PASS |
| `pnpm check:deploy-configs` | PASS: isolated and internally consistent |
| `pnpm --filter @zigoals/web build:alpha` | PASS: OpenNext bundle generated |
| `pnpm --filter @zigoals/web check:alpha` | PASS: Wrangler dry-run; no deployment |
| Native Next negative build probe | Expected compile failure: `'server-only' cannot be imported from a Client Component module`; temporary probe removed |
| Source/deployable/diff credential scan | PASS; limited credential-pattern scan plus available named runtime-secret exact matching, not an exhaustive audit |

The build/dry-run verifies local foundation source. It is not a deployment or release attestation. No new Cloudflare binding was added; dry-run lists only the existing self-reference and assets bindings.

## Regression and design evidence

The first-batch test retains 250 verified coin results when coin batch two fails. A separate partition test retains Bitcoin across RWA failure. Mixed Bitcoin/ZIG failure preserves Bitcoin recovery if token fallback fails. All-failed, fallback-success, stale-retention, exact units, wrong/unexpected/duplicate identities and unsupported RWA currency are covered. The public POST integration returns the recovered Bitcoin quote plus a generic degradation error.

The old parser files are unchanged. Responses validate atomically. The legacy array adapter remains available and all-or-nothing; the server cache consumes the new structured loader. Internal v1 per-pair results preserve timestamps/provenance and separate completeness from freshness/degradation. External pair-envelope publication is deferred.

Review caught and corrected an extra-token-attempt path: failed non-ZIG recovery still short-circuits token fallback, preserving existing retry bounds. A dedicated regression proves two calls, not three, in that path. Subsequent independent requested batches may still run within existing process-local admission.

Budget tests cover absent/partial config, rolling/concurrent/day/month limits, monitoring reserve inside totals, no double charge or settlement, cancellation only before dispatch, conservative uncertain-dispatch charge, separate retry/fallback cost, immutable input transitions, real period rollover and refusal of regressed/overlapping periods. The policy and coordinator are not imported into production admission. Durable persistence, queues, coalescing and breakers remain future work.

## Diff security review

Local review found no credential values or private portfolio payloads added. Coordinator keys use strict public schemas; accounting projects explicit cost/priority/period fields. No wallet/user ID is added to operational state. Server-generated opaque tokens must remain server-generated in the eventual coordinator implementation.

No changes to contracts, Goal Manager, Goal Engine, financial/accounting semantics, reversal semantics, product UI components, CSP/deployment workflow, Alpha binding config, exact-decimal parser or quote identity/timestamp parser. No provider #2, budget activation, bypass, expanded fallback retry, telemetry or automatic deployment gate. Generic 403 remains UNKNOWN unless independent runner evidence establishes BLOCKED.

## Release, privacy and outstanding work

Run #9.2 final evidence is corrected in STATUS and the release README: PR #19; reviewed `2a9deead68ddd187b13f0505319cf0962f97adff`; deployed main equals this base; deployment `35702856008` SUCCESS / VERIFIED, 11/11 smoke; Worker `768673e8-9d39-4022-b1c0-fdd805fa2318`; rollback `cca2b972-3b40-47a6-affe-1249fe260465`.

Immediate ZIG/catalog/history 503 observations remain separate from Bitcoin 200 / VERIFIED and successful deployment. Run #10.0's HTTP 403 / Error 1010 client denial does not diagnose provider failure. Live incident UNCONFIRMED; approved runner market acceptance remains outstanding.

PRIVACY now distinguishes legacy wallet/network metadata, origin-wide tracked Goals/Positions/simulation, origin-wide Habits/Health, tab-scoped Showcase isolation and readable module backups. Wallet switching does not hide origin-wide data.

Owner decisions before production coordination: actual minute/day/month limits, billing/reset boundaries, other credential consumers, monitoring reserve, activation policy, cache backend, entitlement and approved smoke runner. See the [canonical master plan](../../RUN_10_BETA_RELIABILITY_MASTER_PLAN.md). Run #11 retains durable local history/recovery; Run #12 retains contribution revisions/funding corrections/financial history. Owner UI review remains separate. Goal Manager NOT DEPLOYED; signing/broadcast DISABLED; PUBLIC_ALPHA_UNDEPLOYED.
