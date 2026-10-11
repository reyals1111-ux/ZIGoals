# ADR-021: Session AA-Cloud, "Every page in order + Goals, the calculator, search and Life review": session decisions

Status: **In progress** on `feature/session-aa-cloud`, from `main` `32cb9c5` (Merge #82, Session Z-Local; live as Alpha
deploy #37). This record holds every decision Session AA-Cloud took without asking the owner (the brief asks for the safest
option that keeps the project's promises), and the owner's own decisions. A parallel lane, Session AA-Local
(`feature/session-aa-local`), owns ZIGi, Habits, Health features, the game layer and onboarding; the two lanes talk through
`docs/handoff/AA_CLOUD_TO_LOCAL.md` and `docs/handoff/AA_LOCAL_TO_CLOUD.md`.

## Owner decisions (2026-10-11, plan approval, "Approve & auto mode")
- **The brief:** Part 0 records; Part 1 every page in order (first); Part 2 Goals G1–G8; Part 3 the compound interest
  calculator; Part 4 one search; Part 5 Life review and cross-pillar insights; Part 6 skeletons, Undo, offline, the data
  health page; Part 7 home-screen shortcuts and the share target (Tier 3); Part 8 Showcase and Today; three gates; one PR,
  merge commits only, Tier 3 in its own commits; never merge, deploy, dispatch, approve, log in or handle secrets; no new
  dependency; English only, USD and EUR only.
- **A1 approved** (the branch, below).
- **Plan edits (approved with the plan):**
  1. No silent descoping: every item ships working; what cannot be done as written gets the closest safe version, the
     reason here and a line in the report.
  2. A visible premium pass on every page (shared section headings, card/chip/button tokens, spacing, designed empty
     states with a first action, new features in their own designed cards); before/after captures for every page and
     feature at 390/1024/1440, Showcase and empty, on `review/session-aa-cloud-screens` with a "what's better" line each,
     self-reviewed against the design rules.
  3. Device-only goal extras stay consistent: delete, archive, restore and a sync replacement carry the extras, the vision
     image and sub-goal links; Export everything and its restore include them; owner item and Help line "kept on this
     device for now" until the finance-homes session adds them to sync.
  4. A rich Showcase: at least 30 days of history, two or three insights passing the 14-days-per-group rule, a 3-level
     goal tree, a vision board of at least 6 goals, an average goal with values, two calculator scenarios, a weekly and a
     monthly Life review.
  5. The calculator: large number fields plus sliders for rate and years, live results, a stacked area chart with a
     per-year tooltip and milestone markers, what-if as overlaid lines with a legend, chart first on phones after the
     result figures; `decimal.js` confirmed as a runtime dependency before use.
  6. Today's final order names places for AA-Local's habit time-of-day widget, game card and Health coach card.
  7. Lean usage: the three Gate C agents run once each, one after another.
  8. Part 0 notes that Z-Local's PR description stayed in draft wording (the owner marked it ready by hand).

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| A1 | — | The owner-named branch `feature/session-aa-cloud` is used (as ADR-018 Y1); the harness's designated branch is the fallback only if the git proxy refuses the name. | The owner named the branch in the brief; AA-Local looks for it there. |
| A2 | — | The sandbox shipped Node 22.22.0; Node 24.19.0 (`.node-version`) was fetched from nodejs.org, checked against the release's `SHASUMS256.txt` (OK), unpacked to `/opt/node24` outside the checkout and put ahead of the sandbox's Node. | Release compatibility is only established under the pinned Node (CONTRIBUTING). |
| A3 | all | **No synced schema changes.** `privateGoalSchema` (`lib/positions.ts`) is strict with four goal types and is synced in the finance section; settings v1–v3 (`lib/dashboard-settings.ts`, synced) hold strict widget kinds and built-in ids. Adding a field, a fifth goal type, a widget kind or a built-in id there would make #32–#37 readers refuse the whole store. Every new record this session lives in a device-only, loose (`z.looseObject`), versioned key; Today's new widgets and "Today's focus" live outside the synced placement. | Older builds keep reading every goal and every Today layout byte for byte; the owner's "no sync changes" holds. |
| A4 | 1 | The progress slot is a module-level registry with `useSyncExternalStore`, whose server snapshot is always empty: a card registered in the browser appears right after hydration and never causes a hydration mismatch. The same registry serves four named places for AA-Local (`today:habit-time`, `today:game`, `today:coach`, `review:coach`). Habits' own slot line is AA-Local's to place (Habits stays untouched here). | One small API for every place AA-Local fills, no edits to either lane's files after this PR merges. |

## Handoff applied (from AA_LOCAL_TO_CLOUD.md)
Read at each gate on `origin/feature/session-aa-local`.

## Freeze check: differences expected
Filled per part; Gate C adds the measured counts.

## Assertions changed (deliberate, listed)
None yet.

## Rejected options
- Adding goal extras to `privateGoalSchema` or a fifth goal type to its enum (A3): older readers refuse the store.

## Consequences
Areas, visions, sub-goals, why/obstacle/plan and average goals stay on one device until the finance-homes session adds them
to sync (owner item).
