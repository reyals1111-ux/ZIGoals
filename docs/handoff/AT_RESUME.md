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
  Value/Unit, D7 Someday counts, D9 shards (TIER 3 CI), D10 intermittents. D8 (AP's seven minors) with a helper.
- Part 6: OWNER_STEPS.md rewritten as the weekend checklist.

## In progress
- D8 (AP's seven minors): a helper's working-tree changes, to review and commit.

## Next
- Part 2 trust pass, Part 3 polish, Part 4 roadmap (Help screenshots, What's new, FRIENDS_GUIDE, landing draft),
  Part 5 verifier stages, then ADR-043 closing table and the STATUS entry (final commit).
- Known: `meditation.spec.ts:55` saw 3 bells instead of 2 on the dev server (Strict Mode?); confirm on the production build.
