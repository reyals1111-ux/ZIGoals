# ADR-025: Session AC, "Polish to zero": session decisions

Status: **In progress** on `feature/session-ac-polish`, from `main` `9e41f0d1` (Merge #86, Session AB-Design; live as
Alpha #41), in a cloud sandbox. This record holds the owner's decisions at plan approval and every decision the session
took without asking (the brief: decide by the project rules and the safest option). Resume point:
`docs/handoff/AC_RESUME.md`. Captures: the orphan branch `review/session-ac-screens`.

## Owner decisions (2026-10-15, plan approval)
- **The brief:** the owner's findings on Alpha #41 (Part 1: habit cards, starfield depth, footer, tab titles), the
  owner's decisions of 2026-10-15 (Part 2: duplicates, one Water card, vision images, four items recorded only), every
  leftover from AA and AB (Part 3), tests and CI (Part 4), Gate C once, then What's new, Help and the STATUS entry as the
  final commit. One PR, merge commits only, Tier 3 in its own `TIER 3 (<area>): …` commits; never merge, deploy,
  dispatch a workflow, approve an environment or push to `main`; no new dependency; no wallet, signing, key, auth or
  sync-protocol change. Additive only: no redesign, no feature or card removed.
- **Amendments at approval (owner, pre-approved):**
  1. Usage: work lean, keep `AC_RESUME.md` current at every part, resume from it after a pause, never re-plan.
  2. Priority: Parts 0–2 and items 4, 9a, 9b, 9e, 9f, 10, 13, 15 first. Cut order on "lean finish" or after Saturday
     16:00 Brussels: 16 (the WebKit trace dive; WebKit stays advisory), 9c (the muted-token lift), 11 #12 (Showcase
     figure drift), 12 (small builds), 9d's stacked rows (the scroll hint stays), 17 — each recorded as "not done + why".
  3. The starfield veil uses the exact colour the page bottom already ends on (the footer's final plain dark purple),
     checked by pixel samples at the top and the bottom of a long page, desktop and phone.
  4. Captures before and after only of the views the items change (listed in `AC_RESUME.md`).
  5. One independent review: a fresh subagent over the Tier 3 commits and the after-captures of items 1–7; one fix
     round, one final check.

## Where the project rules and the brief meet
- **Branch:** the harness named `claude/vigilant-bohr-glbnlw`; the owner named `feature/session-ac-polish`. The owner's
  explicit instruction is followed, as AB-Cloud did; the harness branch is left untouched.
- **"CSS counts on every page's weight":** `scripts/check-weight-budget.mjs` counts only the scripts a page's HTML loads.
  Every script budget stays as it is; the CSS each page loads is measured separately and kept at a net change ≤ 0
  against `main` by trimming first.
- **Protected baseline:** the starfield and the footer are AB-Design's accepted look; this brief is the owner's
  approval for items 2 and 3 exactly.

## Leftover table (items 1–17; outcomes filled as each part lands)
| # | Item | Plan | Outcome |
|---|---|---|---|
| 1 | Habit day grid on folded cards | `.habit-cadence` above the fold; equal heights, aligned controls | — |
| 2 | Starfield depth | Document-position veils over the fixed art, static | — |
| 3 | Footer block removed, facts moved | Notice + Help "About this Alpha" + Settings / Your data; tests and verifier moved (Tier 3) | — |
| 4 | Tab titles | Settings layout template; route walk; layout guard; verifier review | — |
| 5 | Duplicates on Today and Wealth | Default placement without twins (Tier 3 storage); one holdings list | — |
| 6 | One Water card | Ring, one-tap with Undo, target, history in one card | — |
| 7 | Vision "Change image" | Tile ⋯ with the existing photo store | — |
| 8 | Font, palette, date format, Light/Customize | Recorded only | Recorded (below) |
| 9 | Alignment, 1024 px wrap, muted copy, phone tables, "1 CUSTOM", Reminders rows | Re-check and fix | — |
| 10 | Showcase wording | One wording; dead banner removed | — |
| 11 | Personas #5 #7 #12 #13 #24 #26 | Verify or fix | — |
| 12 | Not built / judged items | Small ones built, the rest named | — |
| 13 | Friends pack | Known limitations, FRIENDS_GUIDE, Help pointers | — |
| 14 | Three notes | Recorded | Recorded (below) |
| 15 | today-screens clock | One fixed time | — |
| 16 | WebKit rotating set and the first-`goto` crash | Traces, causes, fixes; required only after two greens | — |
| 17 | Mac-only failures | Run here once | — |

## Recorded only (item 8, owner)
- Inter vs the system font: the system stack stays; Inter is for a later Customize session.
- The palette stays: one pillar colour per app area; habit cards keep their rotating tones.
- The date format: later (Beta).
- Light mode and Customize: a later session.

## Notes (item 14)
- A future `zigoals:goal-extras:v2` needs a reader for both versions: the photo tidy-up keys on the v1 record, so a
  build that reads only v2 would see no photo references after a rollback and could remove photos (AA-Cloud's security
  read, info 6).
- DNS rebinding remains the recipe-import route's low exposure: the route checks the host's literal form, not the
  address it resolves to at fetch time (ADR-021's security read).
- Fitbit's legacy Web API switches off on 2026-10-30; no Fitbit integration is live in this app, so nothing breaks.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| E1 | 0 | The branch is `feature/session-ac-polish`, from `9e41f0d`; its upstream is unset so nothing can be pushed to `main` by accident. | The owner's instruction; no push can reach `main`. |
| E2 | 0 | Node 24.19.0 is installed outside the checkout (`/root/node-v24.19.0-linux-x64`, checked against nodejs.org's SHASUMS256); the Chrome channel points at the preinstalled Playwright Chromium locally only; WebKit is not installed here, so WebKit evidence comes from CI's advisory job on the PR. | The project's toolchain without touching the repository; no browser download. |
