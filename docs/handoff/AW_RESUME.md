# Session AW — resume file ("FINISH LINE")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-aw-finish-line` from `main` `8fa8aa1d` (Alpha #59), Draft PR "Session AW — Finish line". Rules:
CLAUDE.md, the owner's brief, the plan and the approval, all verbatim in `docs/architecture/ADR-046-session-aw.md`.

**Safe to merge now: no — run 2034 on `edade545` red (main 8/10/14/15/17/20: X1/X3 specs already fixed after it; What's
new count, help-page timeout, j06 Settings jump, a10-life Tasks at 768, aw-programmes overflow being fixed); batch 2
being integrated.**

## Done
- Part 0 (`485bd80b`); ADR-046 with the plan and the owner's 12 amendments verbatim.
- Part 2: earn-guide-zigi:54 and zigi-mini-window:81 split at their cause (test length under tracing); Settings' lower
  groups lazy (auth/sync parts kept eager); a Settings jump now waits for a lazily loaded target (j06, `c8b78474`);
  NOVA's star read-back deferred; Notifications card's local facts at mount; WebKit 4 → 6 shards; main lists repacked
  from measured JSON; webkit-aw-flows in the WebKit phone set.
- Batch 1 merged and wired: kcal (1a), programmes + Read aloud (1d), FR-TJ-7 (1e), X1 Due, X2 Marvin, X3 Evernote/5MJ,
  X4 Strides. Review b1: 0 Blockers, 2 Majors fixed.
- Batch 2 merged and wired: simplicity-c, X5 Paprika, X6 Happy Scale / Sleep as Android, X7 Cashew / Money Manager
  (`f773772c`, TIER 3), simplicity-a and -b (`93132562`); Help: 150 "Where: …" sentences (`14f0da35`), seven grouped
  What's new lines; help-page's all-answers test in four quarters (deliberate).
- Part 5 already-have checks done (BL-10, CR-19, M-9, PK-6, PK-10, PK-16, L-9, PK-18): scratchpad already-have.md, to
  go into the verdict table.

## In progress
- Builders: programmes (27 px sideways scroll at 1440), p5-answers (Dutch answers), p5-fixes (small fixes).
- Review b2 (fresh agent) and the privacy audit (research agent), both read-only, reports to the scratchpad.
- Integrator: local spec run of batch 2 (aw-* and touched specs); then a fresh build with all merges and a re-run of the
  failures (a10-life:120 at 768 still to fix: X2's Pick one and the progress line push the first task 56 px down).

## Next
- Push once typecheck/lint pass and no CI run is in progress; merge p5-answers, p5-fixes, programmes; fix review b2's
  Blockers and Majors; Part 6 (round trip, sweep SWEEP.md, privacy fixes incl. Read aloud line, persona walks, offline
  specs); Part 7 OWNER_STEPS; Part 8 docs; speed attempt 2.

## Team
- Builders as above; review/research: review b2 and the privacy audit. Hand-backs: scratchpad registry-<group>.md.

## Toolchain in the sandbox
- Pinned Node 24.19.0 in the scratchpad (`node-v24.19.0-linux-x64/bin` first on PATH); `corepack enable pnpm`;
  `pnpm install --frozen-lockfile --ignore-scripts`. Typecheck and build need `NODE_OPTIONS=--max-old-space-size=8192`.
- Production build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, then
  `pnpm --filter @zigoals/web exec next start --hostname 127.0.0.1 --port 3101`; Chromium at `/opt/google/chrome/chrome`
  (the sandbox's Playwright Chromium), at most 2 workers, one browser run at a time.
