# Session W — Gate C (2026-10-07)

Local evidence for the final gate of [PR #77](https://github.com/reyals1111-ux/ZIGoals/pull/77). Toolchain: Node 24.19.0,
pnpm 11.19.0, frozen install; production builds (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED`, `next start`);
Playwright's Chromium stands in for Chrome (CLAUDE.md); 2 workers; never two suites at once. Main is `1063765`.

## Full browser suite (both projects), build of `06de700`
61 minutes. 1,475 passed, 146 skipped, 15 unexpected.

| Project | Passed | Skipped | Failed |
|---|---:|---:|---:|
| desktop | 745 | 64 | 9 |
| phone (mobile) | 730 | 82 | 6 (one timed out) |

- **Real, fixed in `ff5042b`:** `run9-2-life.spec.ts:95` "Life functional text stays readable at 320 pixels" on both
  projects: the six Settings group titles were 13 px (Part 24); now 14 px. On a build of `ff5042b`: `run9-2-life` and
  `settings-groups` 20 passed (both projects). CI found the same failure on `06de700` (run 37647165195).
- **Local-only, identical on main's build and green in CI's real Chrome (listed in every gate):** the brand-film specs
  (`logo-quickadd-goals-header.spec.ts:53`, `:79`) ×2 projects; the 320 px checks `coherence.spec.ts:25`,
  `owner-polish.spec.ts:31`, `phone-pages.spec.ts:10` (×2) and `run9-2-product.spec.ts:41` (the slogan at 320 px);
  `today-screens.spec.ts:23` (×2; the Showcase Today measures about 9.9 screens here against 9.7, about 0.35 less in
  CI); `run11-goal-options-pointer.spec.ts:5` (phone, timed out).
- **Under the full suite's load only:** `ui-design-pass.spec.ts:335` (liquid glass hover intent, desktop) passes 5/5
  alone on the same build and passes in CI; its press-then-move path is not changed by Session W.

## Freeze check (desktop and tablet), main `1063765` vs branch `ff5042b`
`scripts/desktop-freeze-check.mjs`, fresh captures of both builds on this machine: 155 captures each, 0 page errors on
both; 24 identical (the empty-state Today, Staking, Ecosystem and Activity at all six sizes), 131 different. Every difference
is in the plan's authorized table:

| Captures | What differs | Parts |
|---|---|---|
| Showcase: every page | the Chess entry in the navigation; the music button | 14, 20 (the one listed class) |
| Showcase and empty Today-based captures (Today, the ZIGi launcher, the Quick add dialog) | What's new for this release (Session V's links folded); the My links card in the Showcase | 24, 19 |
| Goals, goal detail | the Health goals' note ("Kept with your Health records", W1); "On track?" | 1, 11 |
| Habits | "Habit ideas", the challenge group, the time-zone note | 10, 17 |
| Health | the Sleep and Meditation cards, the Devices entry (was "Your wearables"), quick logging's pins and buttons | 4, 5, 8, 9 |
| Wealth (and the add-asset sheet over it) | Accounts, debts & net worth | 12 |
| Portfolio | Portfolio v2 (holdings table, market watch, "Find a coin"), the sync note (W1) | 15, 1 |
| Markets | "Show markets as: Cards / Table" | 16 |
| Settings | the six groups and their chips; Your pages & buttons, Your time zone, Chess, My links, Music | 24, 2, 17, 14, 19, 20 |
| Help | "New: your whole life" and its questions | 24 |

## Page weight (gzip, page scripts) vs main
Every page and the shell are within `scripts/weight-budgets.json` (`node scripts/check-weight-budget.mjs`, exit 0).
Raw numbers: [PAGE_WEIGHT.json](PAGE_WEIGHT.json).

| Page | main | branch | Δ |
|---|---:|---:|---:|
| `/app` | 616.9 kB | 646.1 kB | +29.2 kB |
| `/app/goals` | 515.1 kB | 519.6 kB | +4.5 kB |
| `/app/habits` | 525.6 kB | 543.4 kB | +17.8 kB |
| `/app/health` | 550.8 kB | 567.7 kB | +16.9 kB |
| `/app/wealth` | 542.5 kB | 556.1 kB | +13.6 kB |
| `/app/markets` | 512.3 kB | 523.2 kB | +10.9 kB |
| `/app/portfolio` | 515.8 kB | 545.7 kB | +29.9 kB |
| `/app/staking` | 534.7 kB | 548.4 kB | +13.7 kB |
| `/app/activity` | 497.6 kB | 503.6 kB | +6.0 kB |
| `/app/settings` | 525.9 kB | 570.6 kB | +44.7 kB |
| `/app/help` | 493.6 kB | 499.7 kB | +6.1 kB |
| `/app/chess` | — | 508.1 kB | new |
| shell (every app page) | 491.6 kB | 497.7 kB | **+6.1 kB** (the plan's +3 kB is not met; [SESSION_W_PERFORMANCE.md](../../performance/SESSION_W_PERFORMANCE.md)) |

## Packaged Alpha and configuration (tree of `06de700`)
- `build:alpha`, `check:alpha` (dry run: 17,807.73 KiB, gzip 3,675.69 KiB), `check:alpha-artifact`,
  `check:deploy-configs`: pass.
- Packaged (Miniflare, hermetic): `alpha-packaged-headers` 4 and `alpha-packaged-prices` 6 pass; the static-miss revert
  proof is in [STATIC_MISS.json](../w-d2/STATIC_MISS.json).
- `preview:alpha` (wrangler dev): `public-alpha` and `diagnostics` specs 16 passed.
- Unit, full suite: 447 files passed, 17 skipped; 4,082 tests passed, 37 skipped.

## Revert gate (newest first, cumulative)
A scratch worktree at `ff5042b` with every workspace `node_modules` linked; `git revert -n` of each part's commits,
newest part first, then the repository's typecheck (app and Workers: `tsc --noEmit` and
`tsc --noEmit -p tsconfig.workers.json`, as `pnpm typecheck` runs them). The baseline typechecks.

| Step (newest first) | Applies cleanly | Typechecks |
|---|---|---|
| 24 fix `ff5042b` → 23 `06de700` → 22 fix `5948120` → 26 `cd38a0b` → 2 fix `5d6a3b4` → 24 fix `160199b` → 25 `8ea5727` → 24 `98060dc` → 22 `8e182b0` `030fdc0` | yes, every step | yes, every step |
| 19–20 fix `296605b` → 21 `417a382` → 19 fix `aaa2f6f` → 20 `bab31b3` → 19 `8ae1bfe` → 18 `c545c99` `69ca6ea` → 16 `22a2874` → 15 `561016e` | yes, every step | yes, every step |
| 12 fix `aaf32bc` → 14 `56e55cc` → 13 `1b188bb` → 12 `5ba4aaa` → 11 `2fc054c` → 10 `e94a8ed` → 8–9 fix `c63c1b4` → 9 `dd950fa` `c9c6f21` | yes, every step | yes, every step |
| 8c `08c5cc4` → 5 fix `c58f573` → 8b `dc8f3e0` → 8a `960f383` → 7 `c873fd8` → 4 fix `247d232` → 6 `628c04b` → 5 `23cb248` → 4 `43f80a8` | yes, every step | yes, every step |
| 1 fix `3879b65` → 3 `71c51cc` → 17 fix `44e96e1` → 2 `261a2b5` → 17 `e5a1554` → 1e `5367eb8` → 1d `aed6e20` → 1c `6b81f0c` → 1b `c51618b` → 1 `90a4b00` | yes, every step | yes, every step |

So any newest-first suffix of this PR reverts cleanly and typechecks, down to `main`'s code. Part 27's own commits (the
CI step and this evidence) revert alone.
