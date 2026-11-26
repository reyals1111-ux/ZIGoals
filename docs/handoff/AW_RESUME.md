# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: yes (CI runs 2043 and 2044)**: every job green in both, 0 failed, no job re-run. The tests green
only on their retry are named in CI_INTERMITTENTS.md. The run on the final docs-only head confirms it. If that run is red:
fix at the cause (at most 2 attempts), record it in ADR-046 and STATUS, push again.

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
- Nothing. Session AW is complete: the STATUS entry is the final commit.

## Next
- The owner: merge PR #110, then OWNER_STEPS.md in order.

## Team
- Builders as above; review/research: review b2 and the privacy audit. Hand-backs: scratchpad registry-<group>.md.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
