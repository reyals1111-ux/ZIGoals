# Session AX — resume file ("PROFESSIONAL REVIEW & POLISH")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-ax-pro-review` from `main` `36bd987f` (PR #110 merged), Draft PR "Session AX — Professional review &
polish". Rules: CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in
`docs/architecture/ADR-047-session-ax.md`.

**Safe to merge now: no (CI runs 2047–2049 on the docs-only Part 0/3 commits are main's code; the review fixes are not in yet).**

## Done
- Part 0: branch, Draft PR #111, ADR-047 (brief, plan, approval with 8 amendments, verbatim), STATUS Part 0.
- Part 3: OWNER_STEPS "Optional / later" lines (`659bf583`); CR-22 at 14 px committed on `ax/p3-owner` (`7d09d2b5`).

## In progress
- Part 1: heavy-profile helper; reviewers a (SECURITY.md), b (DATA_QA.md), c (UX_VISUAL.md), d (A11Y.md),
  e (CONTENT.md) running on the :3101 production build of `main`'s code. Reviewer f (performance) starts when the
  heavy profile is ready ($SP/HEAVY_PROFILE.md). Wave 2 (g product, h phone-native) after the first six.
- Part 3: builder on `ax/p3-owner` (worktree `$SP/wt-p3`): CR-22 browser check, Today "More" with the two Showcase
  examples, the erase-scope sentence + specs.

## Next
- Collect the review tables → REVIEW.md "before" scores → fix batches: Blockers (security, data loss) → merge
  `ax/p3-owner` → Majors (security and data first) → wave 2 → their Blockers/Majors → intermittents and shards →
  Minors → re-check, re-score, LAUNCH_READINESS.md, docs, STATUS.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time (`flock` on the scratchpad's
  `browser.lock`).
