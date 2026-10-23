# Session AG Polish 3 — resume file

Branch `feature/session-ag-polish-3` from `main` `261f32a` (Alpha #48). One PR, kept in Draft until the end. Decisions: `docs/architecture/ADR-032-session-ag-polish-3.md`.

**Hard deadline:** everything pushed, CI green, out of Draft and reported before **Sun 25 Oct 11:00 Brussels (10:00 UTC)**.

**References:** `review/session-ag-polish-3-refs` (`owner-refs/`). Load them into the scratchpad with `git show`; never check them out, commit them or ship them. 05 is the target look; 01 is scrapped.

## Rules in force (short)
- One commit per part, pushed. Tier 3 commits are labelled "TIER 3 (<area>)" with their risk and rollback.
- No new dependencies. No wallet, signing, contract, key, auth, sync, CSP or deploy-workflow changes.
- Phone changes apply at ≤ 640 px only; computers and tablets keep their layout.
- Reduced motion and Motion Off are respected. Theme parity in Nebula, Light and Dark.
- Route weight within budget (`/app/checklist` ≤ 492 kB).
- At most 2 helpers. Builds and Playwright run one at a time (Chromium, ≤ 2 workers).
- At most 10 scratchpad captures and 1 fix round, never committed. CI polled at most every 10 min.
- Known CI intermittents (one re-run each): `execute.test.ts:116`, `domain-review-race.test.mjs:41`, `run9-2-product.spec.ts:30`, and the WebKit "ZIGi box empty" class.

## Owner amendments (after approval; ADR-032)
1. **Legend:** Some orbits = at least one item done but not all; All orbits = every item done; Nothing = none. The label, the title and the screen-reader words say the same thing.
2. **No jump on first open:** the phone path is hidden until measured, or shows already settled. The scroll to the current node runs after that. The spec checks that positions are unchanged between the first paint and 1 s later.
3. **Computers and tablets unchanged:** `--lane-gap`, `--orbit-gap` and the new spacing apply on phones only. Run the layout audit and the theme parity check on a computer.
4. **ZIGi on phones:** its box never overlaps the line, a node, a tab or the NEXT badge. Checked in the new phone spec over three sample paths.
5. **Deadline unchanged.**
6. **(MAJOR, after Part 1's first commit) The phone river, redone (river v2).** Reference 06, the session's own preview, is wrong: nodes stacked down one side and a near-vertical line.
   - Every stretch is an S-swing through a waypoint (two C1 cubics), swinging ≥ 30 % of the column and bowing beside its chord, the swings alternating.
   - The stations alternate across the width: every 3 in a row reach both outer thirds, never 3 in one half.
   - The first screen at 390 × 844 spans ≥ 65 % with ≥ 2 turns and stations on both sides.
   - The tests must make 06 fail. A visual gate comes before Part 2. Report the numbers here.

## Plan summary
- **Part 0:** records.
- **Part 1:** the phone river (`lib/path/phone-river.ts`). The line flows through each node's centre, trimmed at the rings. Planets stay top-in, bottom-out. Each tab hangs on the side the line comes from. Gaps are seeded, then widened only where needed. Property tests; the computer's `flowSegments` digest is pinned.
- **Part 2:** the cause of the planet square, then the fix, an asset alpha test and a halo spec.
- **Part 3:** remove `ProgressSegments`.
- **Part 4:** the List: ticked rows stay in place; banners and rows share one column.
- **Part 5:** three-state legend.
- **Part 6:** the footer arc as C1 cubics, its colour along the path.
- **Part 7:** Earn dock off by default (TIER 3).
- **Part 8:** Governance hidden by default, via `governanceShown` in the Earn preferences (TIER 3, ADR-032 L2).
- **Finish:** the STATUS entry, CI green, out of Draft.

## Parts
| Part | What | State | Commits |
|---|---|---|---|
| 0 | Records (Alpha #48, AG Polish 2 merged and deployed, run 50 failed before building), ADR-032, this file, Draft PR ([#94](https://github.com/reyals1111-ux/ZIGoals/pull/94)) | done | `a5e7a7b2` |
| 1 | The phone river (ADR-032 L4–L9), first try | superseded by 1 v2 | `0aaebc83`, scratch spec removed `9761a2a8` |
| 1 v2 | River v2, owner amendment 6 (ADR-032 L10–L11) | done | this commit |
| 2 | No square behind planets | pending | |
| 3 | Progress bar removed | pending | |
| 4 | List view | pending | |
| 5 | Legend | pending | |
| 6 | Footer line | pending | |
| 7 | Earn dock off by default (TIER 3) | pending | |
| 8 | Governance hidden by default (TIER 3) | pending | |
| Finish | STATUS entry, CI, out of Draft | pending | |

## River v2, the visual gate (owner amendment 6; scratchpad captures, compared side by side with reference 05)
The three sample paths of `tests/checklist-phone-ag-polish-3.spec.ts`, as drawn on the page (dev server, Chromium). Each first screen shows nodes on the left and right with the line swinging across; none shows nodes on one side or a near-vertical line.
- **long** (13 items, four orbits):
  - 390 × 844: the first screen's line spans 69 % (62–314 px of 366).
    - Per stretch: planet→1 68 %, 1→2 51 %, 2→3 46 %, 3→4 43 %, 4→5 39 %, 5→planet 55 %, planet→6 62 %, 6→7 53 %, 7→8 46 %, 8→planet 61 %, planet→9 72 %, 9→10 60 %, 10→11 49 %, 11→planet 60 %, planet→12 68 %, 12→13 57 %, 13→finale 34 %.
  - 360 × 780: the first screen spans 70 % (54–288 of 336).
    - Per stretch: 68, 49, 42, 50, 44, 58, 63, 55, 48, 61, 64, 57, 51, 62, 63, 49, 36 %.
- **short** (6 short names, one orbit):
  - 390: the first screen spans 72 % (49–314). Per stretch: 65, 49, 39, 45, 39, 40, 35 %.
  - 360: 71 % (50–288). Per stretch: 63, 49, 43, 57, 47, 44, 35 %.
- **two** (3 + 2 items over two orbits):
  - 390: the first screen spans 72 % (49–314). Per stretch: 65, 49, 39, 59, 71, 57, 33 %.
  - 360: 71 % (51–288). Per stretch: 63, 49, 43, 65, 65, 51, 35 %.
- Every stretch is ≥ 30 % (the owner's floor). Each first screen shows three whole nodes (left, right, left) plus the planet at the right.

## Captures used (self-check, scratchpad only): Part 1 v1: 5; the river v2 gate (amendment 6 lifts the cap for Part 1 only): 15 · fix rounds used: 0 of 1

## Next step
Part 2: the square behind lit planets. Measure first (phone and computer, three themes), then fix the cause; add the asset alpha test and the halo spec.
