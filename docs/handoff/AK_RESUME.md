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
- PRIVACY lines (`4948628d`); Daylio/Habitica/YNAB (`322096dc`); focus and wind-down sounds (`9c902707`); CI pin fixes (`8c718525`); theme sheets (`987460f9`, build them from a clean worktree at HEAD, never from the shared tree while lanes run); ADR closing rows (`9c6fc39c`); verifier stage 11 (`d80a1d0d`).

## Owner follow-up 1 (F0–F12, 31 Oct evening) — the current plan
Full text: ADR-036 "Owner follow-up 1". Work until about Sun 1 Nov 11:00 UTC and beyond until done; Part 13 swap moved out
(F11 instead); A13 is an owner check after the deploy. Up to 6 helper lanes + fresh F1/F2 agents.

### Browser slot protocol
One build or browser run at a time: every Playwright run and every rebuild of the clean worktree goes through
`flock -o /tmp/claude-0/-home-user-ZIGoals/a64d6793-df8d-5435-a8c1-37163e44c609/scratchpad/browser.lock -c '<command>'`
(`-o`: the lock is never inherited by a server the command starts; a server started inside a plain `flock -c` held the
lock and deadlocked F1/F2 once). The production server runs on 127.0.0.1:3101 from the clean worktree
(scratchpad/ak-build, a detached checkout of a pushed commit), started with `setsid … < /dev/null`; only the lead
rebuilds it (scratchpad/scripts/rebuild.sh <sha>). Chromium, ≤ 2 workers, `timeout 900`. Before pushing a lane's work,
typecheck what is committed (a lane's edit once slipped into another lane's commit: e9b3a8d6).

### State (1 Nov, 02:40 UTC) — owner follow-ups 2 and 3 (NOVA; sections Q, G, N, B, T, M, Z) are the current plan
- The owner's messages: ADR-036 "Owner follow-up 2" and "Owner follow-up 3" (verbatim; scratchpad/owner-followup-{2,3}.md).
  Architecture: scratchpad/nova-architecture.md (one engine — Q28). F12 waits (now Z4).
- Pushed head: 6c44dc3e. Integrated since 58224a69: B and T 1f9a7f23; G2 54200bff; Q1 audit eea0e358; G7 06e86e00;
  M f88b8ab8; G3 21f404ef; NOVA N0–N12 + G1a + G1b + lead wiring cf3cf2e1; themes and test fixes b552ba14; Q1F 6c44dc3e.
- Running: the browser verification of 6c44dc3e (lead; scratchpad/specs-int.txt + journeys), lanes FU (Calm for JS
  loops, G7 follow-ups, habit section count), G8 (ZIGi/NOVA tools for G1a/G1b), W (AFL9: staking over WalletConnect,
  journey 7b; TIER 3 wallet).
- Next: G1 #21 insight feedback (lead); Help lines for Journal/Music, ecosystem status, buffer days; Journal and Music in
  the sidebar and rail (More on phones); weight lines for /app/nova, /app/notes, /app/tasks; M5 after-measures; M7 theme
  parity and the layout audit; G4 journeys on phone and themes; G5 exploratory agent; G6 intermittents; G2's second
  review (RELEASE_REVIEW_2.md); then Z1–Z4.
- Sandbox-only unit failures (also on eea0e358): lib/vault/finance-homes.test.ts (cross-tab storage) and
  scripts/pre-run11-setup.test.mjs; CI decides.
- STATUS.md:472 says the X030 swap is in components/checklist/celebration-zigi.ts (removed in e30840fe; the slot is
  components/zigi/studio4.ts) — correct it in the final STATUS (Z4).

### Owner follow-up 4 (1 Nov, later) — P1–P8, up to 10 lanes
- The owner's message: ADR-036 "Owner follow-up 4 (P1–P8)" (verbatim; scratchpad/owner-followup-4.md). Z4 waits until
  P1–P8 and the open G4, M5, M7 and Z3 rows are done.
- Lanes: WB (missing specs and pins), G4 (journeys on phone and themes), M7 (theme parity, layout audit, M5 → P8),
  P1 (WIRING_AUDIT_2 rows left), P2 (RELEASE_REVIEW_2 to zero), P3 (fresh NOVA design critic, then a polish lane),
  P4 (fresh first-run reviewer, then fixes), P5 (fresh landing reviewer, then fixes), P6 (accessibility sweep),
  P7 (fresh exploratory tester, round 3).

### Owner follow-up 5 (1 Nov) and Part 13 restored
- Follow-up 5 (decisions FR-17, OD-1…OD-5; last checks C1–C4): ADR-036 "Owner decisions and last checks". Owner decision 6
  (Checklist overlay rules only if identical; Earn's first load accepted): ADR-036 "Owner decision 6".
- Part 13 restored (verbatim: ADR-036 "Owner follow-up 5: Part 13 restored"; scratchpad/owner-message-7.md): watch
  `git ls-remote origin review/studio4-assets` every 15 min; when it lands, Part 13 per docs/handoff/STUDIO4_SWAP_RUNBOOK.md
  and the delivery's INTEGRATION-HANDOFF.md. Until Part 13 is done: the PR stays Draft; no C3 full-suite runs, no C2
  WIRING_AUDIT_3, no Z4.
- Meanwhile: CI-fix lanes (CI-A done: d4781513, 82698b7c; CI-B ZIGi, CI-C1 Today/Wealth/Earn, CI-C2 Settings/run10/run11,
  CI-D routes/PWA/push/parity), P8c (Checklist overlay rules, identical-look proof), CI shards (a6727680, TIER 3 CI).
- Pushed head: 82698b7c.

## Notes
- Typecheck needs `NODE_OPTIONS=--max-old-space-size=6144` in this sandbox.
- Sandbox-only unit failures (as earlier sessions): vault/finance-homes ×3, scripts/pre-run11-setup ×2.
- Vitest runs from the repo root (root vitest.config.ts parses JSX).
