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

### State (1 Nov, 00:45 UTC) — owner follow-up 2 (NOVA; sections Q, G, N, B, T, M, Z) is the current plan
- The owner's message: ADR-036 "Owner follow-up 2" (verbatim; scratchpad/owner-followup-2.md). F12 waits (now Z4).
- Architecture and lane ownership for NOVA: scratchpad/nova-architecture.md (one engine — Q28: NOVA is a surface and a
  persona on ZIGi's engine; never a second key store, chat store, memory or tool system).
- Pushed head before follow-up 2: 58224a69 (F0–F11 integrated; X1 chain-invisible 9ccb860a + verifier 271420e7; JB
  journey bugs c53dbfaf + 07058ae3; F8 a15ea685; Governance landmarks 0e264929).
- Running lanes (≤ 8 helpers + fresh reviewers):
  - X1 (resumed, Q2): the X1 browser failures (logs scratchpad/x1-b{1..10}.log); the :3101 server stays at 271420e7 for it.
  - Research (N0 + M0): docs/research/session-ak/NOVA.md and MOTION_2026.md only.
  - Q1 wiring auditor (fresh, read-only): docs/review/session-ak/WIRING_AUDIT.md.
  - NA NOVA surface: app/app/nova/page.tsx, components/nova/** (not chat/setup/workflows/panels), lib/nova/{store,layout*,widgets/**,dock*,share-setup*,orb*}.
  - NB NOVA chat + ZIGi bridge: components/nova/chat/**, lib/nova/bridge*, components/nova/command-bar*, additive edits in components/ai/{use-chat-session,ai-chat,chat-header}.tsx and lib/ai/{chats,history,continue,session}.ts.
  - NC setup guide + privacy: app/app/nova/setup/**, components/nova/setup/**, lib/nova/{setup*,privacy-mode*,redact*,local-servers*}, one send-path hook.
  - ND briefs, workflows, memory, panels, cost: lib/nova/{workflows/**,briefs*}, components/nova/{workflows,panels}/**, additive lib/ai/memory.ts.
  - NE engine reads/acts: lib/ai/{context-pack,tools,actions,evals,local-answers}/** additions; REAL_MODEL_TODO NOVA cases.
  - B notes: lib/notes/**, components/notes/**, app/app/notes/**, additive components/journal/** + lib/journal/**, lib/search/notes*, minimal mounts in search-palette and quick-add.
  - T tasks/time: lib/tasks/**, components/tasks/**, components/agenda/**, lib/agenda/**, lib/ics/**, lib/focus-sessions/** + focus components.
- Lead-only files: Help, What's new, manifest (NOVA and Capture shortcuts), egress/CSP/PRIVACY, registries, Showcase,
  shell/nav/rail/More entries, Customize start page, the ⌘/Ctrl+J mount, weights, STATUS/ADR/AK_RESUME.
- Next waves: G1 (BUILD list 2 rest), G2 (release review rest + second review), G3 + M (visual system and motion, after
  MOTION_2026.md), G4 (journeys on phone/themes), G5 (exploratory agent), G6, G7, G8; then Z1–Z4.
- STATUS.md:472 says the X030 swap is in components/checklist/celebration-zigi.ts (removed in e30840fe; the slot is
  components/zigi/studio4.ts) — correct it in the final STATUS (Z4).

## Notes
- Typecheck needs `NODE_OPTIONS=--max-old-space-size=6144` in this sandbox.
- Sandbox-only unit failures (as earlier sessions): vault/finance-homes ×3, scripts/pre-run11-setup ×2.
- Vitest runs from the repo root (root vitest.config.ts parses JSX).
