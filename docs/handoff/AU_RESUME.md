# Session AU — resume file ("FRIENDS DRESS REHEARSAL")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (from `main` `836534c3`), one Draft PR. Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-044-session-au.md` (the approved plan and the owner's two additions). Order: 0, 1, 2, 3, 4, end.

## Toolchain in the sandbox
- Pinned Node 24.19.0 into the scratchpad (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`), its
  `bin` first on PATH; `corepack enable pnpm`; `pnpm install --frozen-lockfile --ignore-scripts`.
- Browser runs: Chromium at `/opt/google/chrome/chrome`, at most 2 workers, one run at a time; production build on 3101.

## Done
- Part 0: ADR-044, this file, STATUS stub, frozen readers #37–#57 PASS (#57 = `836534c3`).
- Part 3 (early, TIER 3 CI): `apps/web/playwright.main.shards.ts` (14 duration-balanced lists, MAIN_SHARD=n/14);
  predicted 34–38 min per shard. **Every new spec must be added to the list its error names** (and `webkit-au-*` files to
  `playwright.webkit.shards.ts`, the shortest list).
- Part 1 walks: scratchpad `walks/` (kit.ts, steps.ts, <persona>.walk.ts, walks.config.ts; run1 = all 20, run2 = Tom/Lina/Jules
  fixed scripts, run3 = Tom with a valid barcode fixture); baseline server = worktree `scratchpad/base` (code of 22e82425)
  on port 3101. Reviewers done: Sanne, Max (review-*.md in walks/).
- Fixes committed: F-1 first five adds a left-out page; F-2 Allow Health in NOVA → Permissions; F-3 no second setup card;
  F-4 Today's habit count on the habit day; F-5 Tasks follow the day end; F-6 goal-kind hint; T-5 barcode message;
  F-MEAL words-only meal (`zigoals:meal-words:v1`, TIER 3 stored formats); answers D-ETA, D-NL-COINS, D-ALLOW-HEALTH
  (TIER 3 AI tools).

## In progress
- Helper B: answer rows R-1…R-14 (lib/ai only). Reviewers for Lina and Jules; Tom's reviewer after run3.
- S-8: Today at 390 on day 7 is 409 px wide (find the element at the integration build).

## Next
- Integration build of the branch; re-run frozen readers (new key); route weights (Health was 530.9 of 531).
- Persona specs `tests/au/<persona>.spec.ts` (desktop 1440) and `tests/au/webkit-au-<persona>.spec.ts` (phone, also WebKit);
  add each to the main shard lists and the WebKit shortest list.
- Part 2 rest: Showcase mood tags + price change (D8), roving helper (D18), D34/D36 look, D20 minors.
- Part 4 docs; ADR closing table; STATUS final entry.
