# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: set by run 2044** (on `54de2c88`, the same code as `c1eb7a1d`). Run 2043 on `c1eb7a1d` was green in
every job: 0 failed, and 1 test green only on its retry (`aw-x2-marvin:51`, first sighting). The STATUS final entry
records 2044's result.

## Done
- Part 0; ADR-046 with the plan and the owner's 12 amendments verbatim.
- Batches 1–3 merged and wired: kcal, programmes + Read aloud, FR-TJ-7, X1–X7, simplicity a/b/c, p5-fixes, p5-answers,
  offline (aw-offline.spec, list 12), round trip (`lib/aw-round-trip.test.ts`), content (#82 collections, #278 sleep
  lessons), showcase (labelled examples, corpus re-recorded deliberately).
- Reviews b1 and b2 (QUALITY-b2.md), every Blocker and Major fixed. Help: 150 "Where" sentences (HELP_WHERE_FIXES.json).
- Part 2: speed attempt 2 merged (ADR-046 D-SPEED: targets Carried, 2 failed attempts; every route lighter but Tasks
  +1.1 kB and Agenda +0.6 kB).
- Part 3: SIMPLICITY.md with before and after walks. Part 5: VERDICTS.md with integrator resolutions.
- Part 6: privacy audit and texts; SWEEP.md (360 views); offline specs green on build-8; frozen readers 102 passed.
- Part 7: OWNER_STEPS.md as one ordered checklist. Part 8 started: FRIENDS_GUIDE section "Session AW".

## In progress
- Part 8: the ADR-046 closing table is committed (`ec7b2665`). The STATUS final entry comes once run 2044 finishes; it is
  the final commit.

## Next
- When run 2044 ends: the STATUS final entry (last commit), push, the PR description, the ≤ 12-line report. If 2044 is
  red: fix at the cause (at most 2 attempts), then push again.

## Team
- Builders as above; review/research: review b2 and the privacy audit. Hand-backs: scratchpad registry-<group>.md.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
