# Session AB-Cloud — status and resume point

Kept current after every finished part. The PR description carries the same "Resume here" block. Repository: the cloud
sandbox's `/home/user/ZIGoals`, branch `feature/session-ab-cloud` (push only there; never the harness branch). Node 24.19.0
installed outside the checkout (`/root/node-v24.19.0-linux-x64`, checksum verified against nodejs.org's SHASUMS256).
Plan: ADR-023 (owner decisions and C1…). Parallel lane: AB-Design (`feature/session-ab-design`, the owner's Mac).

## Resume here (2026-10-14, Gate A recorded, Part 5 pushed; Part 6 next)
Parts 0–5 pushed. Part 3: B3–B7 for the extras (C15–C19). Part 4: vitamins (C20). Gate A fixes: C21 (one status line,
synced announcements, extras edits travel with the next sync, lean finance merge) and C21b (the extras switch renders
with the panel; it moved "Sync now" while pressed). Part 5: Restore from a backup (C22) and image header sizes (C27).
Next: Part 6 (Point & tell), then Gate B (security read of every Tier 3 commit, WCAG, weights).

## Gate A (after Part 2; recorded 2026-10-14)
- Local: unit suite 4,855 passed (one environmental failure passed on re-run); touched browser specs 141 passed, 11
  skipped, the 2 found failures fixed; frozen readers #37/#38/#39 PASS (`frozen-readers-part1.txt`, `-part2.txt`);
  Miniflare `extras-keyspace` 4/4, `extras-two-device` 5/5; weights within budget (shell 389.7 of 406 kB).
- CI on `ccefd69` (run 38484168491): checks, contract, 3 browser shards green; integration failed 9 files (two
  `role="status"` in the sync panel → C21); WebKit cancelled at its 45-minute cap.
- CI on `f381c1e` (run 38490907596): checks, contract, all 3 browser shards green; integration 17 of 18 files green,
  `sync-lost-ack-browser` red (→ C21b; timelines in `lost-ack-race.txt`: main's own build fails it 4 of 4 in this
  sandbox); WebKit cancelled at its cap (advisory; Part 7 shards it). Verdict for C21b: CI on the Part 5 push.
- AB-Design's handoff: `feature/session-ab-design` is not on origin yet (checked at Gate A); main is still `6c1052b`.

## Done
- Part 0 (records, ADR-023, handoff, this file).
- Part 1 (`bdb4b5b` `ed33e2d` `c633814` `516cba9`), Part 2 (`aed011b` `69edf6d` and the provider commit), Gate A records
  `e587ca1` `05ad2bb`, Part 3 `5d91c08`, Part 4 `ccefd69`, Gate A fixes `f381c1e` `fe589e4`, Part 5 `ce750e0`.

## Open
- Parts 6–10, gates B–C, What's new + Help + search index, the STATUS entry; see ADR-023 and the PR description.

## Owner items (collected as they arise)
- The rollback floor rises to #32 (W) with Part 1's finance v5 writes (accepted at plan approval).
- PRIVACY.md E2 sentence + the extras clause: drafted in the PR's owner items, for approval.
- A private-sync Worker redeploy (`/v1/extras`) is needed before the app deploy that carries Part 2.
- CI's WebKit job cannot finish inside its 45-minute cap (cancelled on `ccefd69` and `f381c1e`); Part 7 shards it in two.
- `sync-lost-ack-browser` fails on main's own build in this sandbox (4 of 4); if it is ever red in CI again, the
  timelines in `docs/verification/ab-cloud/lost-ack-race.txt` show the race (an automatic sync one second after an edit
  against a delayed "Sync now" click).
