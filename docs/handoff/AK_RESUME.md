# Session AK — resume file
Read this first when resuming (a fresh workspace included); then ADR-036 and the approved plan summary below.

## How to resume in a fresh workspace
1. `cd /home/user/ZIGoals && git fetch origin feature/session-ak-number-one && git checkout feature/session-ak-number-one && git pull --ff-only origin feature/session-ak-number-one`.
2. `pnpm install --frozen-lockfile --ignore-scripts` (Node 22 in the sandbox against the project's 24, as in earlier cloud sessions).
3. Browser tests: point the Chrome channel at the preinstalled Playwright Chromium, locally only:
   `mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-*/chrome-linux*/chrome /opt/google/chrome/chrome`.
   Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then `TZ=UTC pnpm --filter @zigoals/web exec next start -p 3101`; specs with `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 … --workers=2`. One build or browser run at a time; `timeout 900` on every command.
4. Push at least every 45 minutes; update this file after every push. Merge commits only; never rebase or force-push.
5. Studio-4 and food data: `git ls-remote origin review/studio4-assets review/ak-food-data` at Part 13's start, at Part 1c, and about every 3 hours.

## The plan (approved 31 Oct, with owner amendments A1–A22)
Parts in order: 0 records → 1 integrations (WalletConnect, food Worker, EU food library, music; 1e moves to Part 16) → 2 push (device Worker, snapshot, action queue) → 3 PWA (/sw.js, offline, install) → 4 Health → 5 Habits → 6 Goals → 7 Wealth (+ bank files) → 8 cross-pillar → 9 chess → 10 the COMPETITORS.md build list → 11 visual (+ the AK tour) → 12 ZIGi + Studio-4 preparation → 13 the art swap → 14 leftovers, docs, landing, mainnet v6 day → 15 security review → 16 sweeps, PR out of Draft, PR review, STATUS. Readings Q1–Q16 and the lanes are in ADR-036.

## Done (pushed; Draft PR #99)
- Part 0 (`9c5d7ee6`): records, ADR-036 (A12 table filled), this file, frozen readers #37–#52.
- Research (`e417ca9b`): docs/research/session-ak/ COMPETITORS (23 ranked build items → Part 10), EXCHANGES_NEXT, LICENCES, WALLETS, FORMATS.
- Part 1a: QR (`75ed3a6d`); WalletConnect (`249bf461`); AFL9 Keplr Mobile signing (`f9ccc351`).
- Part 1b: FOOD_LOOKUP binding (`8b0ae98c`); FDC + barcode UI (`f3ac1031`); runbook (`74902dcd`). Part 1c: CIQUAL + CoFID (`f3ac1031`); Fineli waits on review/ak-food-data.
- Part 1d: music (`95952388`, `9277df6e`).
- Part 2: push-device Worker (`fa38be77`); app side, sw.js, card, erase (`f9e103f7`); runbook, VAPID, egress, PRIVACY (`28da0157`).
- Part 3 PWA (`afce4a4f`, `02ec25f2`). A6 storage headroom (`883d1dcb`). 8.8–8.9 export bridges, test restore, backup reminder (`3110c81f`).
- Wave B libraries: lane H (`e7cecde0`), W (`92b94a8f`), G (`ca810a31`); registries (`e3f99620`).
- 8.10 AFL8 Checklist extras section (`e7d9951e`, TIER 3 auth/sync; effective at private-sync redeploy).
- Part 7 wiring (`5074567f`); Parts 5–6 wiring (`a74c33af`); Part 4 health (`7d435846`); Part 9 Lichess (`1f84a28e`).

## Lanes in flight (wave C, started ~31 Oct late)
- M money (COMPETITORS 1, 10, 11, 12, 17, 18, 22), S self/insights (2, 6, 9, 13, 14), X cross-pillar (8.1–8.7, item 19), T training/nutrition (3, 5, 8, 15, 20, 21). Rules for lanes: scratchpad lane-rules.md (recreate from this list if lost).

## To do by the lead (after wave C)
- PRIVACY.md lines: food scans, nutrient extras, grocery, calorie week, meal photos (opt-in, IndexedDB, exported as files), Lichess token (device-only, revoke on Disconnect).
- Help/What's new for Parts 4–9; Daylio/Habitica/YNAB importers wiring (IMPORT_FORMATS); startSoundscape in Focus Sessions and wind-down; frozen readers rerun with all new keys; route weights on a build.
- Known limitation to record: new grocery ticks are device-only (earlier ticks in the Health journal still count).
- Then Parts 11–16 as planned.

## Notes
- Typecheck needs `NODE_OPTIONS=--max-old-space-size=6144` in this sandbox.
- Sandbox-only unit failures (as earlier sessions): vault/finance-homes ×3, scripts/pre-run11-setup ×2.
- Vitest runs from the repo root (root vitest.config.ts parses JSX).
