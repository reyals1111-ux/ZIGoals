# Session AH — resume file

Read this first when resuming (fresh workspace or after a pause). Then CLAUDE.md, apps/web/AGENTS.md, ADR-033, and the top STATUS entry.

## How to resume in a fresh workspace
1. `git fetch origin feature/session-ah-polish && git checkout feature/session-ah-polish` (never rebase or force-push; update from `main` with a merge commit).
2. `pnpm install --frozen-lockfile --ignore-scripts`.
3. Scope file: `git fetch origin review/session-ah-scope && git show origin/review/session-ah-scope:owner-scope/AH_SCOPE.md > <scratchpad>/AH_SCOPE.md` (read-only; never commit it).
4. Chrome channel locally: `mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-*/chrome-linux64/chrome /opt/google/chrome/chrome`.
5. Continue at "Next step" below.

## The plan (approved 25 Oct, with eight owner amendments in ADR-033)
Parts in order: 0 records/RM8 · 1 security deps · 2 CI stability · 3 data safety · 4 numbers · 5 forms/limits · 6 Health + workouts · 7 Habits · 8 Goals · 9 Wealth/Markets/Portfolio · 10 Staking/Earn/Governance · 11 Today/first run · 12 Settings/Help/Activity · 13 layout/a11y/themes/speed · 14 competitor features · 15 landing/launch · 16 final sweeps · finish (STATUS last, CI green, out of Draft).
Each part starts with the "already fixed" check for its own rows (amendment 2) and closes every finding ID per row (amendment 1).
Shared modules: one net worth, one price service, one rounding, one count per thing, one plausibility-limits module, inline field errors, confirm-or-undo.

## Rules while working
- At most 2 helpers, reading/research only. Builds and Playwright runs one at a time, Chromium, ≤ 2 workers, 15-min timeout.
- Commit and push at least every 45 min ("WIP" when unfinished); update this file after every push.
- Before every push: lint, typecheck, focused tests. Tier 3 commits labelled with risk and rollback.
- ≤ 20 self-check captures (scratchpad only). Used: 0.

## Done
- Part 0: records (Alpha #49, AG Polish 3 merged), ADR-033, this file.

## Next step
- Open the Draft PR; RM8 verify-then-do; then Part 1.

## Open decisions
- None.
