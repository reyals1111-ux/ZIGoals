# ADR-044 — Session AU: "FRIENDS DRESS REHEARSAL"

Status: in progress (19 Nov 2026). Branch `feature/session-au-dress-rehearsal` from `main` `836534c3` (Merge PR #107,
Session AT; live as Alpha #57). One Draft PR. Resume file: `docs/handoff/AU_RESUME.md`. Friction log:
`docs/review/session-au/REHEARSAL.md`.

## Why this session exists
Before friends get the Alpha, use ZIGoals the way they will: five fresh people, a real first week each, phone and
desktop, and fix everything that gets in their way. Then close what Session AT carried.

## The brief (owner, 19 Nov; summary, in priority order)
1. **The dress rehearsal.** On a production build (`PUBLIC_ALPHA_UNDEPLOYED`), five fresh profiles, each a first week
   compressed with Playwright's clock (day 1, day 2, day 7; morning and evening), each at 390 and 1440, Nebula plus one
   other theme: Sanne (sleep and water, Dutch questions), Tom (gym, food logging with recorded barcode fixtures, workouts,
   a GPX import, a weight goal), Lina (bank-file import, budgets, bills, spending questions; never Earn), Max (habits,
   night owl: day ends at 03:00, the day goal, Checklist, streaks, Tasks), Jules (Earn read-only, a watch-only address,
   Markets, money questions to NOVA). Each sets up from "Your first five", uses its pillars, asks NOVA and ZIGi at least
   ten real questions, exports a backup and reloads on day 7. Every friction is a row in REHEARSAL.md; every blocker and
   major is fixed, and every cheap minor; each fix is proven by a spec in its persona's conditions; a wrong or vague
   answer becomes a corpus case (AS's corpus) and is fixed.
2. **AT's carried list:** the UX review's three majors (a meal in words alone; "when will I reach…" leading with the
   pace estimate instead of the target date; an "Allow Health" control in a NOVA reply) and its minors; Dutch coin
   questions (ADR-043 D4); Showcase examples for mood tags and a bill price change (D8: AS's pinned answers updated
   deliberately, marked, equally strict); the roving focus helper measuring every item on each change (D18); ADR-041 D34
   and D36 one more bounded look.
3. **CI headroom (TIER 3 CI):** every main shard with ≥ 10 min headroom, rebalanced by measured durations; the
   account-browser "no progress for 20000 ms" looked at (fixed if the cause is in the test, else recorded).
4. **Friends docs:** FRIENDS_GUIDE.md and Help's Known limitations from what the rehearsal found; a two-minute "First week
   with ZIGoals" note in docs/friends-alpha/.
Budget, stop rules, rules and the end are as in the brief (CLAUDE.md and the session prompt).

## The plan as approved (19 Nov)
Presented once in plan mode; approved as written. In short: Part 0 records (Alpha #57, frozen reader #57); Part 1 the
walks as scratchpad scripts on the production build (fixtures only: food lookup, Earn, Markets, mempool; everything else
503), each persona at 390 and 1440 in Nebula and one more theme (Sanne Light, Tom Dark, Lina Light, Max Dark, Jules
Light), screenshots and console logs reviewed, rows in REHEARSAL.md, fixes proven by `tests/au/` specs; Part 2 the
carried list (a words-only meal as an additive diary entry with unknown nutrients; a goal-ETA intent in the exact layer
that leads with the widget's pace estimate; the existing open-page action to NOVA → Permissions in the "Health is not
shared" reply; Dutch holdings; Showcase mood tags and a price change with AS's pinned answers moved deliberately; the
roving helper measuring only what changed; D34/D36 one look); Part 3 explicit duration-balanced main shard lists
(`playwright.main.shards.ts`, the WebKit pattern) and the account-browser stall; Part 4 the friends docs. Helpers write
code only; builds and browser runs one at a time.

**Owner approval (verbatim):** "Plan approved as written. Two additions:
1. Fresh eyes: after each persona walk, one fresh helper (not the integrator) reviews that walk's screenshots and console
   log, given only the persona's goal and the routes, and lists the frictions it sees; merge its rows into REHEARSAL.md
   (marked as found by the reviewer) before fixing.
2. iPhone Safari: the phone (390) part of each persona's proving spec also runs in CI's WebKit job (name it so the WebKit
   set picks it up, add it to the shortest WebKit shard list, keep every WebKit shard with ≥ 10 min headroom)."

## Decisions
(D-numbers are referenced from code comments; added as the session goes.)

- **D1 (Part 0 records).** PR #107 merged into `main` as `836534c3`. Main CI run 1869 on `3d510124` failed once on the
  integration job's account-browser sync test ("a step made no progress for 20000 ms"); run 1895 on `836534c3` (after
  #107) was green on the first attempt, so it did not recur on main. Alpha #57 = Manual Alpha deployment run 60, source
  `836534c3e9f1d430e52c029594ab29b4e8cd55b9`, version `e0bc17f3-27c0-4900-aa55-416f20ece6f6`, rollback
  `064ff8bc-8cc3-4ae7-8be4-783225ae75dd` (#56), VERIFIED after 4 reads, live prices verified (owner). Frozen readers gain
  #57 (`scripts/frozen-readers.mjs`).
