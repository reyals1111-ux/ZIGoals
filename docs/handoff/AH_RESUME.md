# Session AH — resume file

Read this first when resuming (fresh workspace or after a pause). Then CLAUDE.md, apps/web/AGENTS.md, ADR-033, and the top STATUS entry.

## How to resume in a fresh workspace
1. `git fetch origin feature/session-ah-polish && git checkout feature/session-ah-polish` (never rebase or force-push; update from `main` with a merge commit).
2. `pnpm install --frozen-lockfile --ignore-scripts`.
3. Scope file: `git fetch origin review/session-ah-scope && git show origin/review/session-ah-scope:owner-scope/AH_SCOPE.md > <scratchpad>/AH_SCOPE.md` (read-only; never commit it).
4. Chrome channel locally: `mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-*/chrome-linux64/chrome /opt/google/chrome/chrome`.
5. Continue at "Next step" below.

## The plan (approved 25 Oct, with eight owner amendments in ADR-033)
Parts in order (Part 18 added by the owner on 25 Oct after Part 17: the Checklist top bar (owner exception to PROTECTED), the phone top bar without the page name, Health quick counters aligned and typeable; Part 17 added by the owner on 25 Oct: the Health journal date drives the whole Health page + the date bar; last, before the final STATUS commit and CI round): 0 records/RM8 · 1 security deps · 2 CI stability · 3 data safety · 4 numbers · 5 forms/limits · 6 Health + workouts · 7 Habits · 8 Goals · 9 Wealth/Markets/Portfolio · 10 Staking/Earn/Governance · 11 Today/first run · 12 Settings/Help/Activity · 13 layout/a11y/themes/speed · 14 competitor features · 15 landing/launch · 16 final sweeps · finish (STATUS last, CI green, out of Draft).
Each part starts with the "already fixed" check for its own rows (amendment 2) and closes every finding ID per row (amendment 1).
Shared modules: one net worth, one price service, one rounding, one count per thing, one plausibility-limits module, inline field errors, confirm-or-undo.

## Rules while working
- At most 2 helpers, reading/research only. Builds and Playwright runs one at a time, Chromium, ≤ 2 workers, 15-min timeout.
- Commit and push at least every 45 min ("WIP" when unfinished); update this file after every push.
- Before every push: lint, typecheck, focused tests. Tier 3 commits labelled with risk and rollback.
- ≤ 20 self-check captures (scratchpad only). Used: 0.

## Done
- Part 0: records (Alpha #49, AG Polish 3 merged), ADR-033, this file, Draft PR #95, RM8 (M4; QA2-04 fixed `dd4dc885`).
- Part 1: `c117baf9` vitest 5.0.3, `a0a1fab4` vite 8.3.3, `bfe62b3d` glob 10.5.0, body-parser 2.4.0, undici 7.30.1/8.12.2; frozen-readers #37–#49 (M6). `pnpm audit` clean.

## Sandbox notes
- Full unit suite here: 81 files fail on `main` too (M2, M7); compare failure sets with `<scratchpad>/fail-main.txt` (regenerate on a fresh workspace by running the suite on `main`).
- Never `pkill -f <pattern>` with the plain pattern: it kills the calling shell (exit 144). Use `pkill -f "[n]ext-server"`.
- Production server: `cd apps/web && TZ=UTC npx next start --hostname 127.0.0.1 --port 3100` in the background; weights `node scripts/check-weight-budget.mjs http://127.0.0.1:3100`.

- Part 2 so far: `9b1dd80f` staking execute test, `ba33c973` doProbe content-length (domain-review-race), AF7 verifier (TIER 3), `75766fec` AF6, `6966c04d` source-pinning + pagehide save, `6055f5ab` layout-fixes/J055/motion/parity.
- Part 2 later: quick-add early tap, ADR M8–M10 (`e6bade8e`).
- Part 3: DS1 (already safe; `ah-multitab`), DS4, DS5, DS2, DS3, DS6, DS7, DS8, DS9, A7, J2 (M11–M15).

## Next step
- Part 3 done (`9dab86af`, `3bc64a6d`, `749e2d75`; ADR rows `3038f6c0`).
- Part 4 in progress. Done (`0dc8ae4d`, `bfd6d7fd`, `05037e8b`): TR1, TR2, TR3, TR4, TR5, TR8, TR13, B1, B2, B4, B7 (one valuation rule, one net worth with unvalued holdings named, the Showcase holds loaded quotes as "Showcase price", `formatQuantity` ≤ 8 dp). Next: TR7 (hide the currency switch, "coming later"), TR6/B5, TR9/B8 + HA2, TR10, TR11, TR12/B6, TR14; then ADR M16/M17 and the Part 4 rows.
- CI: a later push never cancels a PR run (ci.yml concurrency); later pushes queue.
- Shared pieces made in Part 3: `components/ui/confirm-inline.tsx` (in-place confirm), `lib/undo-removal.ts` + `components/ui/remove-with-undo.ts` (labelled Undo for removals), `tests/ah-helpers.ts`.

## Open decisions
- None.
