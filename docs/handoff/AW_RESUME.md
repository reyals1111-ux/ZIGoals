# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: no — run 2038 on `8314213f` red (6 main shards: spec reads before a lazily loaded part arrives,
and the task editor not opening; being fixed at the cause); the next push waits for 2038 to finish.**

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
- Persona walks (fresh agent, E4) → FRIEND_READINESS.md; its `tests/zz-persona-*` files are never committed.
- CI 2038's failures: av2-r5-everyday and polish2-af:150 (spec reads before a chunk arrives: fixed in the spec,
  deliberate); av-task-minutes, av-deadlines, l5-fourth-pass (the task editor: local repro first).
- zigi-states:200 (WebKit) attempt 1: the reminder knock and the push-open greeting rested ZIGi at a plain idle over
  the set-up ask; they now rest where the machine rests (`zigiResting`, bus.ts).

## Next
- Push when 2038 finishes; two green runs on the final head (E1); CI rows' verdicts with run evidence; ADR-046 closing
  table; STATUS final entry; ≤12-line report.

## Team
- Builders as above; review/research: review b2 and the privacy audit. Hand-backs: scratchpad registry-<group>.md.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
