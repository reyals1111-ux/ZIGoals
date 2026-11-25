# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: no — run 2031 (Part 0) red on two known intermittents; run 2032 on `a280acac` in progress; batch 1 not complete.**

## Done
- Part 0 (`485bd80b`); ADR-046 with the plan and the owner's 12 amendments verbatim.
- Part 2: earn-guide-zigi:54 at its cause (`3115574d`); Settings' lower groups lazy (`1df5ca90`, weight 521.7 → 409.5 kB);
  NOVA's star read-back deferred (`3e2153c1`, D36); WebKit 4 → 6 shards and the main lists repacked (`48eb8149`).
- Batch 1 merged so far: aw/kcal (+ registries `6a57168a`), aw/habits-tj7 (FR-TJ-7). Shards and theme sheets `a280acac`.

## In progress
- Builders (worktrees under /home/user/aw-wt/<group>, branches aw/<group>): programmes (+ Read aloud), x1-due, x2-marvin,
  x3-notes-journal, x4-strides, x5-paprika. Hand-backs in scratchpad `registry-<group>.md`.
- Integrator: full unit suite on the merged tree; Settings/NOVA/backup specs on build 1; CI run 2032.
- Still to wire for kcal + habits: Help entries (scratchpad tools/add_help.py), What's new (grouped, AW), corpus cases
  (`cases-aw-kcal.ts` into cases.ts + expected.json), WebKit phone set (amendment 7).

## Next
- Merge the remaining batch-1 branches, wire registries/Help/What's new/corpus/shards, one build, specs, fresh review
  helper, fix, push. Speed attempt 2 (Settings hydration task, shell chunk +1.2 kB). Batch 2 builders: x6, x7,
  simplicity a/b/c, Part 5 builders as slots free.

## Team
- 6 builders as above; review/research helpers: none running (inventory and codemap done: scratchpad inventory.md, codemap.md).

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
