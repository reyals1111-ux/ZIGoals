# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: no — runs 2031–2033 red (2033: checks, WebKit 4/6, main 7/14/15/20, each read and fixed or recorded);
run 2034 on `edade545` in progress; batch 2 being integrated.**

## Done
- Part 0 (`485bd80b`); ADR-046 with the plan and the owner's 12 amendments verbatim.
- Part 2: earn-guide-zigi:54 and zigi-mini-window:81 split at their cause (test length under tracing); Settings' lower
  groups lazy (auth/sync parts kept eager); NOVA's star read-back deferred; Notifications card's local facts at mount;
  WebKit 4 → 6 shards; main lists repacked from measured JSON; webkit-aw-flows in the WebKit phone set.
- Batch 1 merged and wired: kcal (1a), programmes + Read aloud (1d), FR-TJ-7 (1e, filters after the cards), X1 Due, X2
  Marvin, X3 Evernote/5MJ, X4 Strides. Registries, frozen fixture, corpus (+29 intents), Help (+24 answers, 5 grouped
  What's new lines), shards, theme sheets. Review b1: 0 Blockers, 2 Majors fixed (activity extras and goal repeat now sync).
- Batch 2 merged so far: simplicity-c (Settings search EN/NL from one index; Help aliases), X5 Paprika, X6 Happy Scale /
  Sleep as Android.

## In progress
- Builders: simplicity-a (Today/Goals/Health/Wealth), simplicity-b (Tasks/Journal/Notes/Agenda/NOVA), X7 money,
  p5-answers (Dutch answers), habits-tj7 (split the long Showcase spec), programmes (27 px sideways scroll at 1440).
- Integrator: batch-2 build + specs (aw-*), CI 2034.

## Next
- Merge X7, simplicity a/b, p5-answers; review b2; Part 5 small fixes builder; Part 6 (round trip, sweep SWEEP.md, privacy
  audit incl. Read aloud line, persona walks, offline specs); Part 7 OWNER_STEPS; Part 8 docs; speed attempt 2.

## Team
- 6 builders as above; review/research: none running. Hand-backs: scratchpad registry-<group>.md.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
