# Session AG Polish 2 — resume file

Branch `feature/session-ag-polish-2` from `main` `b0fe242` (Alpha #47). One PR (Draft until the end). Decisions: `docs/architecture/ADR-031-session-ag-polish-2.md`. Hard deadline: PR out of Draft with CI green by **Sat 24 Oct 18:00 Brussels (16:00 UTC)**. References: `review/session-ag-polish-2-refs` (`owner-refs/`), loaded into the scratchpad with `git show`, never checked out; only the four celebration files ship.

## Rules in force (short)
No new dependencies; no storage key or format change (quick add uses the Habits page's own create and the Checklist's own favourites); Earn, other pages' layouts, the app shell (beyond the phone header pill AG Polish owns) and `lib/ai/**` untouched; phone changes only at 640 px and below; the ambient sky is the one looping motion (off under reduced motion and Motion Off); ≤ 2 helpers; builds and Playwright one at a time, ≤ 2 workers; ≤ 20 scratchpad captures in total, ≤ 2 fix rounds; 15-minute caps on waits; tests moved, never weakened, each listed in STATUS; `/app/checklist` ≤ 492 kB of scripts (AG Polish: 479.2 kB), the video never in the first load.

## Owner amendments (after approval)
1. Bounded obstacle retries in `flowSegments` (≤ 12 per stretch), best try then move the tab; unit-tested.
2. WebKit CI covers the celebration and its replay on a phone: video starts or still + UI within 1.5 s; Continue always works.
3. Quick-add Undo removes the habit only if unchanged; otherwise only the star, with "Removed from your orbit · the habit stays on Habits"; both tested.

## Plan summary
Part 0 records · 1 phone path (lanes v2 across the full width, DOM-measured tabs with no ellipsis, a flowing line with phone-only minimum bow and tab/banner obstacles, the compact stacked banner, the planet beside it at 88–100 px) · 2 the banner's short fade, planets lit when reached · 3 the progress bar in segments · 4 the ambient sky · 5 quick add "+" (the Habits page's create, the Checklist's favourites, Undo, a link to Habits) · 6 the List (Habits banners, path-size nodes with tabs) · 7 the celebration video (one constant, primed when one item is left, 1.5 s still fallback, no toast while open) · 8 the consistency colours (legend = cells) · 9 themes, checks, words, STATUS.

## Parts
| Part | What | State | Commits |
|---|---|---|---|
| 0 | Records (Alpha #47, AG Polish merged and deployed), ADR-031, this file, Draft PR ([#93](https://github.com/reyals1111-ux/ZIGoals/pull/93)) | done | `87f9a78e` |
| 1 | Phone path (lanes v2, tabs as drawn, the flowing line, compact banner, planet beside) | done | `0083619e` |
| 2 | Banner fade; planets lit when reached | done | `eb4272e2` |
| 3 | Progress bar segments | done | `35ad3f53` |
| 4 | Ambient sky | done | this commit |
| 5 | Quick add | — | — |
| 6 | List view | — | — |
| 7 | Celebration video | — | — |
| 8 | Consistency colours | — | — |
| 9 | Themes, checks, finish | — | — |

## Captures used (self-check, scratchpad only): 1 of 20 · fix rounds used: 0 of 2

## Next step
Part 5 (quick add).
