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
- Part 4: TR1–TR14, B1, B2, B4–B8, J1, HA2 (M16–M22).
- Part 5: VA1–VA10, C1–C3, C8, B3, B9 (M23–M25).
- Part 12: `799935f3` (SE1, SE2, SE4, SE5, SE7–SE9, SE12, SE14 device lock, H5, B-199; M43–M44). SE3 → Part 13, RM5 → Part 15.
- Part 11: `0e66fea8` (CI 1224/1225 fixes, TO1, TO2, TO5) and batch 2 (TO4/H6/DE4, TO7–TO13, CO1; M40–M42).
- Part 10: `e194278a` (TIER 3 verifier: Earn title), `facc2b0f` wording/calculator/empty states, AF3 `/api/earn/shares` (TIER 3 egress) (M37–M39).
- Part 9: `f927c2d5` WE1, `351c51c5` WE2–WE7/WE9–WE12/WE14/C12, `8a7e9727` WE4/WE8/WE13/WE15/WE18/WE19/WE21/WE22/J14/J17/DE5 + lib/ah-device-keys.ts (M34–M36).
- Part 8: `b492379f`, `e3937889` (M32–M33); CI 1212/1215 fixes `63d0c6de`.
- Part 7: `32354145`, `e6e55ec4` (M29–M31); CI 1210 fixes `06f01019`.
- Part 6: DE8 `0425bd79`, HE1/HE2 `8120ec92`, RM7 `fb21c2b8`, HE3–HE14 + C9 + C11 `2361b562` and the fasting messages (M26–M28). J8 already fixed; HE4/J5/L4 owner step; HE10 → Part 13; HE11 layout → Part 18.

## Next step
- Part 11 done (M40–M42). Part 10 done (M37–M39). Before every push: full unit suite (sandbox-only failures: finance-homes, visual-format ja-JP, pre-run11-setup), typecheck (NODE_OPTIONS=--max-old-space-size=8192), lint, theme check, focused browser specs against a production build on :3101 (build with NODE_OPTIONS=--max-old-space-size=8192; start the server only after the build has finished).
- Next: Part 13 layout, a11y, themes, speed (LA1–LA10, D2, D3, E1–E3, F1, F3, AF10, AF15) plus the carried items below and SE3 (one "Backup & restore" card, a shorter Settings page). Start with the "already fixed" check for its rows.
- Activity filter counts are aria-hidden on purpose: specs click the filters by exact name.
- Sandbox note: Node 22 here formats compact numbers differently from Node 24 and Chrome; an SSR'd compact format needs an explicit minimumFractionDigits or the page fails to hydrate (theme parity then fails).
- Carried: HE10 and WE10's sheet padding (B-151) into Part 13 (LA1); HE11's counter layout into Part 18; TO7's duplicate Quick add on tablets into Part 13; SE3's Settings wall into Part 13; RM5's friends pack into Part 15; WE15's doc-link 404s recheck into Part 16; the landing's staking line (DE1) into Part 15.
- New device keys: register them in lib/ah-device-keys.ts (personal or display).
- Theme layers for this session: apps/web/themes/<theme>.ah-*.css, every rule scoped `:root[data-theme=<theme>]`.

## Open decisions
- None.
