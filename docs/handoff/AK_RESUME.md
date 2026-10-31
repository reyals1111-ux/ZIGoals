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

## Done (pushed)
- (Part 0 in progress.)

## Lanes in flight
- R research (docs/research/session-ak/): COMPETITORS.md, EXCHANGES_NEXT.md, LICENCES.md, WALLETS.md, FORMATS.md.
- Leftover extraction (read-only) for ADR-036's A12 table.

## Open readings
- None beyond ADR-036 Q1–Q16.

## Next step (exact)
- Commit and push Part 0; open the Draft PR; then Part 1 (lanes F food, U audio, Q qr+wc).
