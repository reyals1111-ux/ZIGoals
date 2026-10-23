# Session AG Polish 2 — resume file

Branch `feature/session-ag-polish-2` from `main` `b0fe242` (Alpha #47). One PR (Draft until the end). Decisions: `docs/architecture/ADR-031-session-ag-polish-2.md`. Hard deadline: PR out of Draft with CI green by **Sat 24 Oct 18:00 Brussels (16:00 UTC)**. References: `review/session-ag-polish-2-refs` (`owner-refs/`), loaded into the scratchpad with `git show`, never checked out; only the four celebration files ship.

## Rules in force (short)
No new dependencies; no storage key or format change (quick add uses the Habits page's own create and the Checklist's own favourites); Earn, other pages' layouts, the app shell (beyond the phone header pill AG Polish owns) and `lib/ai/**` untouched; phone changes only at 640 px and below; the ambient sky is the one looping motion (off under reduced motion and Motion Off); ≤ 2 helpers; builds and Playwright one at a time, ≤ 2 workers; ≤ 20 scratchpad captures in total, ≤ 2 fix rounds; 15-minute caps on waits; tests moved, never weakened, each listed in STATUS; `/app/checklist` ≤ 492 kB of scripts (AG Polish: 479.2 kB), the video never in the first load.

## Owner amendments (after approval)
1. Bounded obstacle retries in `flowSegments` (≤ 12 per stretch), best try then move the tab; unit-tested. (Superseded by 5.)
2. WebKit CI covers the celebration and its replay on a phone: video starts or still + UI within 1.5 s; Continue always works.
3. Quick-add Undo removes the habit only if unchanged; otherwise only the star, with "Removed from your orbit · the habit stays on Habits"; both tested.
4. (22 Oct, after Part 8) The phone banner is ONE row (compact chip "0/5" / "✓ Done", full words for screen readers), the planet beside it (≥ 1.3 × a node at 320 px); record in ADR-031 and STATUS.
5. (22 Oct, before Part 9) The phone line smooth like the computer's: one cubic per stretch, ≤ 1 S-turn, joins < 5°, radius ≥ 40 px, mean travel ≥ 30 %, no dodging bends (lanes do it); computer unchanged; record in ADR-031 (K16) and STATUS; one capture at 390 px.

## Plan summary
Part 0 records · 1 phone path (lanes v2 across the full width, DOM-measured tabs with no ellipsis, a flowing line with phone-only minimum bow and tab/banner obstacles, the compact stacked banner, the planet beside it at 88–100 px) · 2 the banner's short fade, planets lit when reached · 3 the progress bar in segments · 4 the ambient sky · 5 quick add "+" (the Habits page's create, the Checklist's favourites, Undo, a link to Habits) · 6 the List (Habits banners, path-size nodes with tabs) · 7 the celebration video (one constant, primed when one item is left, 1.5 s still fallback, no toast while open) · 8 the consistency colours (legend = cells) · 9 themes, checks, words, STATUS.

## Parts
| Part | What | State | Commits |
|---|---|---|---|
| 0 | Records (Alpha #47, AG Polish merged and deployed), ADR-031, this file, Draft PR ([#93](https://github.com/reyals1111-ux/ZIGoals/pull/93)) | done | `87f9a78e` |
| 1 | Phone path (lanes v2, tabs as drawn, the flowing line, compact banner, planet beside) | done | `0083619e` |
| 2 | Banner fade; planets lit when reached | done | `eb4272e2` |
| 3 | Progress bar segments | done | `35ad3f53` |
| 4 | Ambient sky | done | `92ce3825` |
| 5 | Quick add | done | `5527be1b` |
| 6 | List view | done | `a73cb962` |
| 7 | Celebration video | done | `e30840fe` (by a staging slip only the old ZIGi constant's removal) + `ff28406e` (its files) |
| 8 | Consistency colours | done | `5a2de36e` |
| 1b′ | Owner's change (22 Oct): the phone banner on one row (amendment 4, K15) | done | `c5014b60` |
| 1a′ | Owner's change (22 Oct): the phone line as one smooth ribbon (amendment 5, K16) | done | `56ca315b`, fix `a76d7772` |
| 7 fixes | Tests moved for the held toast; the verifier's stage 10 (TIER 3); the stalled-clip watchdog | done | `26b0dccc`, `e2e65e72`, `2c0155be` |
| 9 | Words, themes, audit states and fixes, K17; the STATUS entry | done | `9e7da376` `c42ffea3` `e8ecea4c` `3308804e` `b0904004` `5e5a9e81`, STATUS last |

## Captures used (self-check, scratchpad only): 16 of 20 · fix rounds used: 1 of 2 (the layout audit's three fixes)

## Next step
Every part is done and the STATUS entry is in. The browser suite runs in six shards (`00fb6fe5`, TIER 3 (CI), K18): this session's specs took shard 1 past its 60 min. The owner approved the toolchain upgrade (K19): `next` 16.4.2 (`0259e79b`), wrangler 4.148.0 (`69532d2c`) and `@opennextjs/cloudflare` 1.20.12 (`5a8d1e83`), one `TIER 3 (dependency)` commit each, after 16.4.1 on the old OpenNext and wrangler failed the same way (every packaged route 500 on `preview-props.json`). Milestone quality green on `5a8d1e83` (run 39913890539). Last: the STATUS entry, CI green on it, then the PR out of Draft. Never merge or deploy. Scratch files: deleted.
