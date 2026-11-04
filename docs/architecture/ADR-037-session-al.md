# ADR-037 — Session AL: "FIX EVERYTHING"

- **Status:** in progress (branch `feature/session-al-fix-everything`; not merged, not deployed)
- **Base:** `main` `17069c7d` (Merge #99, Session AK), live as Alpha #53
- **Scope sources:** the owner's brief for Session AL (Parts 0–17, the fix-proof rules R1–R9, the non-negotiables), `review/session-al-scope:owner-scope/AL_SCOPE.md` (O1–O7, B, C, D1–D13, E, F, G), the Grok report on #53 (`owner-scope/grok-2026-11-04/`), AH_SCOPE and AI_SCOPE. The scope branches are read-only and never merged.

## Why this session exists
Bots re-tested #53 after Sessions AH–AK. In their conditions, many rows those sessions had closed as Fixed were still open: the width, the theme, an empty profile vs the Showcase, the time of day, and the production build. Across the report "STILL OPEN" appears 962 times against 322 "FIXED". AL closes every row the way a person experiences it, and proves each fix the same way (R1–R9).

## Owner decisions (4 Nov 2026, final; AL_SCOPE A)
- **O1 Fix everything.** Every non-POSITIVE finding is in scope. A finding that conflicts with a standing decision (AL_SCOPE F) closes as "Owner decision"; any honest part of it is still fixed.
- **O2 Placeholder pricing, one-time.**
  - Prices: ZIGoals €20, ZIGoals Premium €50.
  - Every surface says "Placeholder prices · nothing is charged during the Alpha · prices may change".
  - Surfaces: `/app/plans`, a Settings "Plan" row ("Alpha: everything free"), the Premium badge links to Plans, Help and What's new.
  - No payment code, checkout, buy button, server or account. € only. Not on the landing.
- **O3 Launchers.**
  - At ≥ 901 px the floating, edge-foldable ZIGi, Earn dock, Music and Checklist launchers stay.
  - Below 901 px nothing floats. One "Apps & extras" button (phone top bar, tablet rail) opens a sheet with ZIGi, NOVA, Checklist, Tasks, Notes, Journal, Agenda, Earn and Music, each shown only when switched on.
  - The phone top bar's Checklist pill stays. The sheet works on every page, Settings included.
- **O4 Desktop sidebar.**
  - A compact, foldable "Apps" group below the main pages with NOVA, Tasks, Notes, Journal and Agenda (those switched on). The fold state is device-only, and the group is keyboard accessible.
  - The main pages, fold marks, sky and layout stay unchanged.
  - Journey, Life review, Stories and the ZIGi states stay out.
- **O5 NOVA HUD motion exception.**
  - Ambient motion while NOVA is visible. Calm means slower and fewer effects.
  - Motion Off and reduced motion mean fully still.
  - Motion pauses when the page is hidden or off-screen. No pointer tracking.
- **O6 Tasks.**
  - Tasks becomes Todoist/TickTick level (AL_SCOPE C).
  - The Checklist keeps its protected daily orbit. Its List view may gain a "Tasks due today" section.
  - The naming is clarified in copy only.
- **O7 Usage.** The biggest session ever: use the weekly usage fully and never cut scope.
- **Standing decisions that still hold:** AL_SCOPE F (quoted in the brief and AL_SCOPE).

## Owner amendments to the plan (A1–A12, verbatim intent)
- **A1, replays per pillar.**
  - After each pillar lane (L1–L8) says it's done, a fresh replay agent replays that lane's ledger rows on the production build, into `GROK53_REPLAY_<lane>_<n>.md`.
  - STILL OPEN goes straight back to the lane.
  - Then come the two full rounds. A lane's task is ticked only when its own replay shows zero STILL OPEN, apart from Owner decision, Not possible and Waits on owner.
- **A2, a root-cause taxonomy before the ledger** ([`ROOT_CAUSE_KEYS.md`](../review/session-al/ROOT_CAUSE_KEYS.md)).
  - Every ledger helper tags with the same keys and proposes its bot's rows.
  - The integrator merges from the per-bot files and the keys, never by holding every line at once.
- **A3, L10 split** into L10a (shell, launchers, sidebar, chrome, widths, themes, `/app/plans`) and L10b (field-error, limits, Undo/toast, format layer). L10b takes L9's slot when it frees up. At most 10 helpers at once.
- **A4, no idle pillar lanes.**
  - While the primitives are being built, the lanes write failing reproduction specs and make the fixes that don't depend on primitives.
  - They adopt the primitives in a second pass. Primitives land first, as small, stable APIs.
- **A5, the copy audit goes to the owning lanes.** L4 writes a per-file list in `COPY_AUDIT.md`. Each lane applies the fixes in its own files, and the integrator applies only those in shared files.
- **A6, bot conditions as code.**
  - Time-of-day conditions use Playwright's clock API or a fixed time zone, never the real clock.
  - Fresh-profile findings are proven in a fresh empty profile, and also in the Showcase where that applies.
- **A7, the Undo/toast refactor.**
  - Surfaces move lane by lane.
  - The Checklist's protected Undo pins stay unchanged.
  - Every move has a test that checks the store record is restored.
- **A8, the whole verifier import graph.**
  - Erasable syntax only, with `erasableSyntaxOnly` where needed.
  - Proven with plain Node 24.19.0 and with CI's Node.
- **A9, a true task list at every push.** AL_RESUME.md carries live counts: ledger rows, Fixed, Reopened, and STILL OPEN per lane.
- **A10, no early finish.**
  - When everything is closed and usage remains, run cycles: a fresh exploratory round plus a fresh mini release review of the most-used flows, fixing everything found with tests.
  - Repeat until a full cycle finds no Major or Minor, then do Part 17.
  - Never close a row as "out of time".
- **A11, Part 15.** Each competitor or roadmap item gets its own R9 row. Web-possible items that don't conflict with AL_SCOPE F are built, and rank decides only the order.
- **A12, HUD proof.**
  - A two-way interconnection spec covering the HUD, the page and another tab.
  - Idle CPU and 60 fps at CPU 4× in Full motion, recorded.
  - Reduced motion and Motion Off proven fully still.
  - The first-time-viewer review also covers a phone width.

## Readings (taken without asking; the owner pre-accepted Q1–Q5)
- **Q1, branch.** The brief names `feature/session-al-fix-everything`, while the cloud session was handed `claude/upbeat-franklin-wzyrfb`. The brief's branch is used. The git proxy accepted the push on 4 Nov, so no fallback was needed.
- **Q2, test folder.** The repo has no top-level `tests/`, so the reproduction and guard specs live in `apps/web/tests/grok53/<pillar>/`. That folder is inside Playwright's `testDir`, so CI runs it as part of the browser suite.
- **Q3, Node.** The sandbox shipped Node 22. Node 24.19.0, the project's pin, is installed outside the repository (`/opt/node24`). Nothing is committed for it.
- **Q4, ledger files.** `GROK53_LEDGER.md` holds the AL rows, the counts and the keep-list. `ledger/<bot>.md` holds one line per finding id.
- **Q5, Premium label.** "Premium · free during Alpha" is aligned to "Premium · free during the Alpha" (O2), and the badge links to `/app/plans`.

## Lessons (R2: why earlier closes were wrong)
_Filled in from the history map: one line per REOPENED row._

## Closing table (R9)
Outcomes: Fixed (commit, test, replay FIXED) · Already fixed (replay FIXED on main before any change, with the evidence) · Owner decision (named) · Not possible (evidence) · Waits on owner (the named step).

| Row | Finding ids | Outcome | Commits | Test | Replay |
|---|---|---|---|---|---|
| _Filled in as rows close._ | | | | | |
