# Session AT — resume file ("READY FOR FRIENDS")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-at-ready-for-friends` (from `main` `3d510124`), one Draft PR. Rules: CLAUDE.md, the owner's brief, and
`docs/architecture/ADR-043-session-at.md` (the approved plan and the owner's two changes). Order: 0, 1, 6, 2, 3, 4, 5, end.

## Toolchain in the sandbox
- `pnpm install --frozen-lockfile --ignore-scripts`.
- Pinned Node 24.19.0 is not preinstalled: download it into the scratchpad
  (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`) and put its `bin` first on PATH for unit runs.
- Browser specs: Chromium at `/opt/google/chrome/chrome`, at most 2 workers, one run at a time.

## Done
- Part 0: ADR-043, this file, the STATUS stub; Draft PR #107.
- Part 1: D1 Zignaly by date, D2 pre-run11 test, D3 Tab stops, D4 L7 rows (TIER 3 AI tools), D5 a11y-wcag-x, D6 CSV
  Value/Unit, D7 Someday counts, D9 shards (TIER 3 CI), D10 intermittents.
- Part 6: OWNER_STEPS.md rewritten as the weekend checklist.
- Part 2: D11 privacy page vs egress (landing/privacy.html), D12 restore coverage test + round-trip spec (not yet run).
- Part 4: FRIENDS_GUIDE (NOVA, setup guide, weather opt-in, AP–AT features). `scripts/help-screenshots.mjs` written.
- Part 5: D13 verifier stage 14 (unit-tested; browser run against a local build pending).

## In progress
- D8 (AP's seven minors): a helper's working-tree changes, to review and commit.

## Next (in order)
1. Commit D8. Production build (`NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
   `pnpm --filter @zigoals/web start` on :3100), route weights, then on it: tests/at/*, hosted-verifier-order, the
   Guide/reminder/Earn/Tasks specs touched, `meditation.spec.ts:55` (3 bells on dev: confirm on the build).
2. `node scripts/help-screenshots.mjs http://127.0.0.1:3100` → Help screenshots section (lazy, per theme, labelled) and
   the landing draft (NOVA figure + new cards, copies under landing/assets/product/), Help's What's new / Known
   limitations for AR, AS, AT (restore exclusions line promised by FRIENDS_GUIDE).
3. Part 2 (d) unknown-not-zero / as-of on first-seen figures; Part 3 polish sweep (fresh profile, 390/1440, 3 themes),
   phone performance on 5 pages, one fresh-helper UX review.
4. ADR-043 closing table, STATUS entry (final commit), report.
