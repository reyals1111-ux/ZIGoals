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

## Next steps (exact)
1. Part 4 item 30 (trader tools, D11) and item 36 (xpub, A5; TIER 3 dependency declares `@scure/bip32@1.7.0`).
2. Run `node scripts/frozen-readers.mjs` (#37–#51) once after Part 4's stored formats.
3. ADR-035: add P14 (Showcase pairings redrawn), catalog measurements, the qs line; PRIVACY.md gets every AH/AI/AJ key in Part 10.
4. Parts 5–10 per the plan.

## Sandbox notes
- Stop the server with `for p in $(pgrep -f "^next-server"); do kill $p; done` (`pgrep -x next-server` misses it; `pkill -f next-server` kills its own shell).
- Unit tests run from the repo root (root vitest.config.ts has the JSX transform). Six fail in this sandbox only and on the branch without AJ's latest changes (pre-run11-setup ×2, visual-format ja-JP, finance-homes ×3); CI passes them.
- Playwright projects are `desktop` and `mobile`.

## Open readings
- None beyond ADR-035's P-list.
