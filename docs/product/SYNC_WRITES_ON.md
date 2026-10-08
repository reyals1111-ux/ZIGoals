# Switching the sync writes on (ready-to-use instruction)

**Status: done.** Session W Part 1 (2026-10-06) set `SYNC_WRITES = true` in the Session W PR, exactly as described below,
by **owner decision W1**: "implement the switch-ON exactly as docs/product/SYNC_WRITES_ON.md describes …, overriding its
'from 2026-10-12' wait. The owner accepts that testers may lose test data during the Alpha; still never design a
migration that loses data, keep reads tolerant, and state the new rollback floor (Alpha must never roll back past #29)."
*Merged as `72ad872` (Merge #77) and live on the public Alpha as deploy #32 on 2026-10-07 (owner-reported); the public
Alpha has no accounts, so writes reach a cloud only on the acceptance stack after its redeploy (Session X, 2026-10-08).*

- **Rollback floor:** from the first Alpha deploy that carries the switch on, the Alpha's rollback target must be **#29 or
  later** (#29 is the first deploy that carried the v3 read support, `c97edbe`). At the time of writing the live Alpha is
  #31 and its rollback target #30 (both read v3), so the precondition below holds.
- **What changed in code:** the two lines below, plus test fixtures that now read Session P's four records where the app
  keeps them (`homeRecordsIn`, `lib/sync-homes-store.ts`) instead of from the device keys of the Showcase seed. Nothing
  else.
- **If the Session W PR is not merged before the 22–24 October acceptance redeploy,** the switch commit can be merged on
  its own; it is self-contained.

The rest of this page is the original instruction, kept as written.

## Why it is a separate step

With the switch on, the public Alpha writes Health v3 into the browser's own storage. No deployed build reads v3 before
PR #74, so a rollback to #28 would leave that person's Health section unreadable there until the roll-forward. Shipping
PR #74 with the switch off puts the v3 **read** support live first; the switch then turns on in a build whose rollback
target already reads everything it writes (docs/product/SYNC_HOMES.md, "The write switch").

## When (all three)

1. **At least 7 days after the first public Alpha deploy that carries PR #74** (the v3 read support). Write that deploy's
   date here when it happens: `D = ____-__-__`; earliest merge `D + 7 days`. If PR #74 deploys on 2026-10-05, that is
   **2026-10-12**.
2. **On or after 2026-10-11** (the T4 gap after deploy #27, TIMEZONE_DESIGN.md).
3. **Before the 22–24 October final acceptance redeploy**, which must carry it (FINAL_ACCTEST_REDEPLOY.md, "Before the
   redeploy"). If it cannot be merged by then, the acceptance redeploy goes ahead without it and Stage 8 rows 15 and 15c
   are marked "not run: switch off".

Also confirm, before merging: no "newer ZIGoals" refusals reported by anyone on the Alpha since PR #74's deploy, and the
Manual Alpha rollback target is PR #74's deploy or later.

## The PR (one line + its test)

Branch from the latest `main`, for example `fix/sync-writes-on-<date>`, and change exactly:

1. `apps/web/lib/vault/sync-writes.ts`: `export const SYNC_WRITES: boolean = false;` → `true`, and in the comment above it
   replace "Session U follow-up F1: shipped OFF." with "Switched on in <this PR>, <date>."
2. `apps/web/lib/sync-homes-store.test.ts`: the test "this build ships with the switch off" → "this build ships with the
   switch on", `toBe(false)` → `toBe(true)`.

Nothing else in code. `sync-writes-off.test.ts` passes the switch explicitly and keeps proving the switch-off state; the
browser specs (`fasting`, `health-goals`, `auto-checkins`, `weekly-review`, `export-everything`, `help-page`) follow the
switch by themselves.

**Docs in the same PR:** SYNC_HOMES.md status line ("The write switch is on since …"); ADR-013 status (Portfolio sync
available); the STATUS.md entry of that session, with the rollback floor below.

**Checks before asking for review:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, the production build and the full
Playwright suite (2 workers); CI green on the PR head.

## After it merges

1. Manual Alpha deployment of that `main` (docs/deployment/MANUAL_ALPHA_WORKFLOW.md), then
   `node scripts/verify-hosted-alpha.mjs`.
2. **Rollback floor:** from this deploy on, the Alpha's rollback target must be PR #74's deploy or later (the build that
   first carried v3 read support), never #28 or older. Record it in STATUS.md's release identity.
3. The 22–24 October acceptance redeploy builds from a `main` that contains this PR; Stage 8 rows 15 and 15c check it
   (STAGE8_OWNER_RUNSHEET.md).
