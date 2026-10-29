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
- Part 2: items 11–13 (`32e37f7c`, `b187118e`). Item 14 (the `qs` override) still to do.
- Part 3: items 8–9 (`612d0441`); item 10 WIP (`969cafa3`, browser check pending).
- Part 4: item 6 WIP (`c8df9714`, browser check and frozen-readers run pending).

## Next steps (exact)
1. Re-run alone (no overlapping browser runs!): batch 3 of `scratchpad/part2.list` (goals, invisible-names, onboarding, persona-x, platform) and `checklist-overlay-af.spec.ts:578` — their first run overlapped with another run.
2. Item 14: `"express>qs": 6.16.1` in pnpm-workspace.yaml overrides, `pnpm install`, then lint/typecheck/unit/build/OpenNext/check:alpha dry run/preview smoke/frozen readers; one TIER 3 (dependency) commit.
3. Rebuild; browser-check the brief's check-in v2, Journal "Your week", Insights (Life review), Wealth chart By source; then `node scripts/frozen-readers.mjs`.
4. Part 4: items 5 (WE16 catalog; A4 first), 15 (alerts), 30 (trader tools), 36 (xpub; A5).

## Open readings
- None beyond ADR-035's P-list.
