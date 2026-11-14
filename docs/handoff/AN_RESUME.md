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
| 1 TIER 3 (CI): WebKit 3 → 4 duration-balanced shards | proven on CI run 1683 (43279591582): 176+130+150+136 = 592 started, 0 duplicates, set = `--list`; slowest shard's tests 37.4 → 29.5 min | `0f2d8876` | local `--list`: 176+130+150+136 = 592, 0 duplicates, union identical to the unsharded list; guard tested with a temporary new spec |
| 2 TIER 3 (dependencies): glob / minimatch overrides | committed (option 2; upstream has not moved) | `921ea417`, `b1ab27ae` | pnpm audit 0; lint/typecheck; build:alpha + check:alpha; .open-next lists in docs/dependencies/AN_REVIEW.md; pnpm test |
| 3 Third alert | recorded in docs/dependencies/AN_REVIEW.md §3: identified (crypto-bigint 0.5.5, RUSTSEC-2026-0387, contract crypto stack; report, no fix) | — | OSV over Cargo.lock |
| END STATUS entry | committed (final commit) | (this commit) | run 1686 green after one re-run except WebKit `zigi-earn-coach-af:59` (2/2; cause and proposed spec fix in STATUS) |

## Measurement (Part 1)
Per (project, file) durations rebuilt from the WebKit jobs' timestamped line-reporter logs (runs 1634, 1677, 1680; job
ids in the STATUS entry), median of three; desktop `zigi-accept-correct` ≈ 25 min alone is the floor of any shard.

## Next steps
1. Done: clean rebuild and `.open-next` comparison (AN_REVIEW.md §2); WebKit proof from run 1683.
2. Full CI on the Part 2 head: run 1685 (43284806298, `b1ab27ae`). Run 1683's failures (re-run = 1685): WebKit `zigi-memory-page:22` (class B segfault), `zigi-chat-polish:319` (first sighting, log 164 < 200 px at 900×500); Chromium `a11y-wcag-x:49`, `run11-route-mobile-acceptance:30`, `fourth-pass-field-errors:106` (also on PR #101 run 1678), `spending-ai:52`. Untouched by this diff; a second failure means investigate.
3. STATUS entry as the final commit; mark PR #102 ready only if the owner's rules say so (they don't: keep Draft until the owner).

## State at the end
Complete. The STATUS entry is the final commit. The only open item is the owner's: `zigi-earn-coach-af:59` (a spec outside this session's files).
