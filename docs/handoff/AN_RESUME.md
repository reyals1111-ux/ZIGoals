# Session AN — "CI + TOOLING": resume file

Branch `feature/session-an-ci-tooling` (from `main` `c65882f3`). Plan approved once by the owner (with additions 1–4,
below); continue without questions. If the weekly limit pauses this session, resume here after Sunday's reset.

## Rules in force (brief)
- Own files only: `.github/workflows/*`, Playwright config and shard lists, `package.json`, `pnpm-workspace.yaml`,
  `pnpm-lock.yaml`, `docs/dependencies/`, this file, the AN entry in `docs/STATUS.md`, `scripts/ci/webkit-shards.test.ts`.
  Never PR #101's files (`apps/web/components/nova`, `apps/web/lib/nova`, `apps/web/lib/ai`, theme sheets, specs).
- Commit and push per part (≤ 30 min apart); lint, typecheck, focused tests before every push. At most 2 fix attempts per
  problem, then record the cause. A known CI intermittent gets one re-run. Poll CI at most every 10 min. Never merge,
  enable auto-merge, dispatch a workflow or deploy. Any command over 15 min is killed and rerun once with a timeout.
- Local note: `tsc` and eslint need `NODE_OPTIONS=--max-old-space-size=8192` in this sandbox (default heap OOM).

## Owner additions (with the approval)
1. The shard guard's error names the file and the fix ("… is a WebKit spec in no shard: add it to the shortest list in
   apps/web/playwright.webkit.shards.ts"); the unit test fails with the same text.
2. New transitive packages (`@isaacs/nonrecursive-glob-match`, `path-scurry` 3) only if their npm publisher is glob's and
   minimatch's maintainer; name, version, integrity in AN_REVIEW.md and the commit message; else stop that override.
3. The `.open-next` output's file list (with sizes) before and after the overrides is diffed; any difference beyond
   hashes and timestamps is explained or the override is reverted.
4. Commands over 15 min: kill, rerun once with a timeout.

## Parts
| Part | State | Commits | Evidence |
|---|---|---|---|
| 1 TIER 3 (CI): WebKit 3 → 4 duration-balanced shards | committed, awaiting CI | (this commit) | local `--list`: 176+130+150+136 = 592, 0 duplicates, union identical to the unsharded list; guard tested with a temporary new spec |
| 2 TIER 3 (dependencies): glob / minimatch overrides | next | — | — |
| 3 Third alert | identified (crypto-bigint 0.5.5, RUSTSEC-2026-0387, contract crypto stack; report, no fix) | — | OSV over Cargo.lock |
| END STATUS entry | — | — | — |

## Measurement (Part 1)
Per (project, file) durations rebuilt from the WebKit jobs' timestamped line-reporter logs (runs 1634, 1677, 1680; job
ids in the STATUS entry), median of three; desktop `zigi-accept-correct` ≈ 25 min alone is the floor of any shard.
