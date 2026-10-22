# Session AG Polish — resume file

Branch `feature/session-ag-polish` from `main` `98a29b4` (Alpha #46). One PR (Draft until the end). Decisions: `docs/architecture/ADR-030-session-ag-polish.md`. Hard deadline: PR out of Draft with CI green by **Sat 24 Oct 18:00 Brussels (16:00 UTC)**. Stop rule: Part 7 not pushed by Sat 24 Oct 10:00 Brussels (08:00 UTC) → skip Part 8, go to Part 9.

## Rules in force (short)
No new dependencies; one storage field only (`checklist.celebratedOn` in `zigoals:ui-prefs:v1`, its own `TIER 3 (storage)` commit); Earn's path, the phone app header (except the owner-approved Checklist pill, Part 2b) and `lib/ai/**` untouched; desktop composition kept; the Habits page unchanged (amendment 2); the flame stays orange (amendment 1); ≤ 2 helpers; builds and Playwright one at a time, ≤ 2 workers; ≤ 20 scratchpad captures in total, ≤ 2 fix rounds; 15-minute caps on waits; tests moved, never weakened, each listed in STATUS.

## Parts
| Part | What | State | Commits |
|---|---|---|---|
| 0 | Records (Alpha #46, verifier on #46, H62 correction), ADR-030, this file, Draft PR (#92) | done | `cc7e9a24` |
| 1 | Nebula glyphs, more glyphs, matte unreached, no gold, the arc | done | `fb19d01b` |
| 2b | Owner addition: the phone header's Checklist pill, the launcher's bold check | done | `f01bf5d6` |
| 2 | The phone layout | done | `c5104d1a`, fix `379f92d3` |
| 3 | The Habits banners | done | `a5de5fb8` |
| 4 | Orbit planets | done | `a5de5fb8` |
| 5 | Pointer 9 on phones, Orbit consistency | done | `b9fe44f2` |
| 6 | Celebration: always fires (Tier 3 storage) and rebuilt | done | `688d1dfa` (Tier 3), `17519c9c` |
| 7 | The List view | done | `5360c3fd` |
| 8 | Extras (camera follow, ZIGi's greeting on an orbit, the flame, replay) | done | `2fe53781` |
| 9 | Themes, checks, finish | done but the CI result and Draft | words `b6efd3e8`; Light self-check `6eebfcd0`; search `961f32de`; layout audit `7c30c7ac`; STATUS entry (final commit) |

## Captures used (self-check, scratchpad only): 13 of 20 · fix rounds used: 2 of 2 (plus the layout audit's fixes, ADR-030 J19)

## Next step
CI (Milestone quality) on the head with the STATUS entry: when green, the PR comes out of Draft and the owner gets the short report. Never merge, never deploy. The STATUS entry's draft is in the session scratchpad until then.
