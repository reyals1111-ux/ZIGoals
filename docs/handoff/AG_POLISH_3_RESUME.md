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
| 1 | The phone river (ADR-032 L4–L9) | done | this commit |
| 2 | No square behind planets | pending | |
| 3 | Progress bar removed | pending | |
| 4 | List view | pending | |
| 5 | Legend | pending | |
| 6 | Footer line | pending | |
| 7 | Earn dock off by default (TIER 3) | pending | |
| 8 | Governance hidden by default (TIER 3) | pending | |
| Finish | STATUS entry, CI, out of Draft | pending | |

## Captures used (self-check, scratchpad only): 5 of 10 · fix rounds used: 0 of 1

## Next step
Part 2: the square behind lit planets. Measure first (phone and computer, three themes), then fix the cause; add the asset alpha test and the halo spec.
