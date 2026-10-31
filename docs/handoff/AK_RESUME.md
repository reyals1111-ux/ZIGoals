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
- Part 1a: QR encoder (`75ed3a6d`); WalletConnect with the Reown id, CSP, the pairing panel (`249bf461`); AFL9 Keplr Mobile signing (`f9ccc351`).
- Part 1b: Alpha binds FOOD_LOOKUP (`8b0ae98c`); FDC step + the barcode UI (`f3ac1031`); runbook (`74902dcd`).
- Part 1c: CIQUAL + CoFID offline library (`f3ac1031`); Fineli waits on review/ak-food-data (A11).
- Part 1d: music mix, links, BYO Spotify, /app/music (`95952388`); keys and erase lists (`9277df6e`).
- Part 2: push-device Worker (`fa38be77`); the app side, sw.js, card, erase (`f9e103f7`); runbook, VAPID script, egress, PRIVACY (`28da0157`).
- Frozen readers #37–#52 PASS with the new keys (`215d3b11`, docs/verification/session-ak/frozen-readers-part2.txt).

## Lanes in flight
- None. Next waves: B (H health, W wealth, G goals/habits) after Part 3.

## Open readings
- Q17 (in code, to record in ADR-036): Playwright blocks service workers by default; SW specs opt in.
- Q18 (to record): AFL9 lives in lib/staking/execute.ts (the one signer file) as walletConnectKeplr; WC_STAKING_METHODS there.
- Q19 (to record): /push-sw.js stays unchanged for ADR-010 account devices; the shell does not register /sw.js there (no shim).
- Q20 (to record): price-alert pushes ride the morning and evening notifications (no silent price wakes, A2).

## Notes
- Typecheck needs `NODE_OPTIONS=--max-old-space-size=6144` in this sandbox.
- Sandbox-only unit failures (as earlier sessions): vault/finance-homes ×3, scripts/pre-run11-setup ×2.
- Still to wire in Part 1d/Part 4: startSoundscape in Focus Sessions and wind-down; the /app/music weight line (measure on a build).
- Badge icon /icons/zigoals-badge-96.png referenced by sw.js: create in Part 3 (A18 assets).

## Next step (exact)
- Part 3: manifest (Today, Log weight shortcuts, screenshots, iOS startup images), install entry in Settings and Help, the update prompt, lib/offline-queue, a production build, then Playwright specs (offline open, update flow, notifications card, push via CDP) with test.use({serviceWorkers:'allow'}).
