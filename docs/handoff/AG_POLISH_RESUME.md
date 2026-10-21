# Session AG Polish — resume file

Branch `feature/session-ag-polish` from `main` `98a29b4` (Alpha #46). One PR (Draft until the end). Decisions: `docs/architecture/ADR-030-session-ag-polish.md`. Hard deadline: PR out of Draft with CI green by **Sat 24 Oct 18:00 Brussels (16:00 UTC)**. Stop rule: Part 7 not pushed by Sat 24 Oct 10:00 Brussels (08:00 UTC) → skip Part 8, go to Part 9.

## Rules in force (short)
No new dependencies; one storage field only (`checklist.celebratedOn` in `zigoals:ui-prefs:v1`, its own `TIER 3 (storage)` commit); Earn's path, the phone app header (except the owner-approved Checklist pill, Part 2b) and `lib/ai/**` untouched; desktop composition kept; the Habits page unchanged (amendment 2); the flame stays orange (amendment 1); ≤ 2 helpers; builds and Playwright one at a time, ≤ 2 workers; ≤ 20 scratchpad captures in total, ≤ 2 fix rounds; 15-minute caps on waits; tests moved, never weakened, each listed in STATUS.

## Parts
| Part | What | State | Commits |
|---|---|---|---|
| 0 | Records (Alpha #46, verifier on #46, H62 correction), ADR-030, this file, Draft PR (#92) | done | `cc7e9a24` |
| 1 | Nebula glyphs, more glyphs, matte unreached, no gold, the arc | done | this commit |
| 2b | Owner addition: the phone header's Checklist pill, the launcher's bold check | to do (after 2) | — |
| 2 | The phone layout | to do | — |
| 3 | The Habits banners | to do | — |
| 4 | Orbit planets | to do | — |
| 5 | Pointer 9 on phones, Orbit consistency | to do | — |
| 6 | Celebration: always fires (Tier 3 storage) and rebuilt | to do | — |
| 7 | The List view | to do | — |
| 8 | Extras | to do | — |
| 9 | Themes, checks, finish | to do | — |

## Captures used (self-check, scratchpad only): 0 of 20

## Next step
Part 2 (phone lanes: `lib/path/phone-lanes.ts` is written and unit-tested, not yet wired into `components/path/path.tsx`). Part 2b's files are in `git stash` (`part2b`). Part 3's shared banner parts (`components/habits/habit-section-banner.tsx`) are written, uncommitted. Helper 2 (planet assets) is running.
