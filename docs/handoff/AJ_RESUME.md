# Session AJ — resume file
Read this first when resuming (a fresh workspace included); then ADR-035 and the plan summary below.

## How to resume in a fresh workspace
1. `cd /home/user/ZIGoals && git fetch origin feature/session-aj-big-leap && git checkout feature/session-aj-big-leap && git pull --ff-only origin feature/session-aj-big-leap`.
2. `pnpm install --frozen-lockfile --ignore-scripts` (Node 22 here against the project's 24, as earlier cloud sessions).
3. Browser tests: point the Chrome channel at the preinstalled Playwright Chromium, locally only:
   `mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-*/chrome-linux*/chrome /opt/google/chrome/chrome`.
   Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then `TZ=UTC pnpm --filter @zigoals/web exec next start -p 3101`; specs with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 … --project=… --workers=2`. One build or browser run at a time; `timeout 900` on every command.
4. Push at least every 45 minutes; update this file after every push.

## The plan (approved 29 Oct, with owner amendments A1–A9)
Parts in order: 0 records → 1 ZIGChain v6 (items 1, 3, 4; A1–A3) → 2 security and CI (11–14) → 3 ZIGi (8–10) → 4 Wealth (5, 6, 15, 30, 36; A4, A5) → 5 Health (22, 25–28) → 6 Goals/Habits/My Universe (29, 34, 35; A7) → 7 Settings/look/Earn (16–21, 24, 32; A8) → 8 Guide and research (31, 33) → 9 Landing (23) → 10 sweeps and finish (A6, A9). Readings P1–P8 in ADR-035.

## Done (pushed)
- Part 0 (`11fb8fd8`): records, ADR-035, this file, frozen readers #37–#51, Draft PR #98.
- Part 1 complete: `5754e43b` TIER 3 chain config (reviewed-versions rule, D1), `dffab5ee` TIER 3 wallet (v6 base fee at quote time, signed fee = reviewed fee; A1, A2), `1359caeb` TIER 3 verifier (stage 4 base fee A3; stage 7 drops pre-#50 set), `7f2fac82` TIER 3 activation tooling (item 4), the Staking connect error (P11). Research notes (`eae8a0f8`).
- Part 2 complete: items 11–13 (`32e37f7c`, `b187118e`, checklist :578 observer in the item-5 batch), item 14 `c77fa396` (TIER 3 dependency: express>qs 6.16.1; `pnpm audit` clean; build:alpha, check:alpha dry run and artifact check pass).
- Part 3 complete: items 8–9 (`612d0441`); item 10 (`969cafa3`, fixes `50169562`: Welcome back now write-free from records, lastSeenDay removed; Showcase season redrawn for the gap rule, P14; browser specs pass).
- Part 4: item 6 (`c8df9714`), item 5 catalog (`613a3a28`; measured v1 4.5 MB/1.52 MB gz → v2 0.78 MB/0.31 MB gz), item 15 alerts (`ed583b26`, `46d37acf`, spec `d5649595`).
- Part 4 complete: item 30 trader tools (`326ff45a`), item 36 xpub (`78886d80` dependency, `e4f9add4`, `1a55c97a`), frozen readers #37–#51 pass (`abbaa5d1`, docs/verification/session-aj/frozen-readers-part4.txt), ADR P14–P19.
- Part 5 complete: items 25/26/27/28 (`7712703c`, GPX strict XML reader `7cdd93db`), item 22 FSVO search (`dcd5c1da`, TIER 3 egress routes).
- Part 6 complete: Life Score and Focus Sessions (`7712703c`), item 35 habit everyday time (`db25f9d2`, TIER 3 stored format + auth/sync), Guided Journeys (`77747265`), specs and /app/guided weight line (`581bae14`).
- CI fixes: repeat cards and prompt budget (`cc22456c`), checklist landing wait (`3981aed5`), knock first-paint waits (`ca1568e0`).

## Next steps (exact)
1. Part 7: item 32 Customize (D5; Inter self-hosted + OFL), 17 one dismissible notice (D4, P7), 19 SE3 anchor, 18 undo from Activity, 20 wizard skip link, 21 contrast items, 24 A8 list (M41/M43/M47 + AF13/H3), 16 Earn orbit (D3).
2. Part 8: Guide phase 2 (D6), ADR-011 update. Part 9: landing MO6. Part 10: sweeps (A6 coverage test, PRIVACY for AH/AI/AJ keys, What's new, Help), final STATUS, CI green, PR out of Draft, report.
3. ADR-035: add P20 (FSVO foods keep the source in the brand; provenance format unchanged), P21 (GPX strict XML reader, Trusted Types), P22 (repeat cards shown with a note), P23 (prompt budget).

## Sandbox notes
- Stop the server with `for p in $(pgrep -f "^next-server"); do kill $p; done` (`pgrep -x next-server` misses it; `pkill -f next-server` kills its own shell).
- Unit tests run from the repo root (root vitest.config.ts has the JSX transform). Six fail in this sandbox only and on the branch without AJ's latest changes (pre-run11-setup ×2, visual-format ja-JP, finance-homes ×3); CI passes them.
- Playwright projects are `desktop` and `mobile`.

## Open readings
- None beyond ADR-035's P-list.
