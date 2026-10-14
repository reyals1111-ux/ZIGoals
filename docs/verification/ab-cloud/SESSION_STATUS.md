# Session AB-Cloud — status and resume point

Kept current after every finished part. The PR description carries the same "Resume here" block. Repository: the cloud
sandbox's `/home/user/ZIGoals`, branch `feature/session-ab-cloud` (push only there; never the harness branch). Node 24.19.0
installed outside the checkout (`/root/node-v24.19.0-linux-x64`, checksum verified against nodejs.org's SHASUMS256).
Plan: ADR-023 (owner decisions and C1…). Parallel lane: AB-Design (`feature/session-ab-design`, the owner's Mac).

## Resume here (2026-10-14, finished: lean finish per the owner's note; PR #85 ready for review)
Every part is pushed and Gates A–C are recorded; the docs/STATUS.md entry is the final commit. Stretch items skipped
(owner's lean-finish note). Nothing is merged or deployed; the owner does both, after the private-sync Worker redeploy.

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

## Gate B (after Part 6; recorded 2026-10-14)
- Independent security read of every Tier 3 commit and Point & tell: six findings, each reproduced first, fixed and
  revert-gated (ADR-023 C28; `b586c963` workers/sync, `02677e45` data formats, `97e14af1` finding 5); THREAT_MODEL rows.
- WCAG for the new UI: `tests/a11y-ab-cloud.spec.ts` (Restore, Point & tell, vitamins). Weights: CI's budget step green
  on `e3ac500` (no budget raised).
- CI on `097f19e`: `sync-lost-ack-browser` still 2 of 3 red → root cause found (C21c: "Sync now" under Settings' sticky
  index) → integration green on `e3ac500`.

## Gate C (recorded 2026-10-14)
- Unit suite: 555 files / 4,888 tests passed, 44 skipped by design.
- Test audit (one agent, 34 test files): every finding acted on or recorded (ADR-023 "Gate C test audit"; `1f8f1cb8`).
- Frozen readers 17/17 at #37, #38 and #39 with every extras record in the fixture (`frozen-readers-gate-c.txt`).
- Key scan passed. Revert gate: typecheck green at all 26 commits; reverting them newest-first ends at `6c1052b`'s tree
  (`revert-gate-gate-c.txt`).
- CI on `e3ac500` (run 38501294859): checks, contract, integration green; three browser rows red, each reproduced and
  fixed in `732a205` (the banner sentence wrapped and moved every page 13 px: `motion-arrival:18`; the Point & tell switch
  was 324×28 on phones: `phone-touch-targets:40`) or passing 6 of 6 here (`coherence:7`).
- CI on `870c392` (run 38510173374): `web`, the three browser shards, checks, integration, contract and reproducibility
  green; WebKit (advisory) red on the known classes (C29). `send-feedback:75` (Help's Known limitations: 13 since Part 10)
  was the last failure, fixed in `870c392`.
- Full browser suite locally, lean: 1,482 of 2,688 run before the owner's lean-finish note stopped it; 9 failed, each
  explained: the brand film ×2 (this Chromium plays no video, as CLAUDE.md says), `send-feedback:75` (the run had loaded
  the old file; 10/10 after), `zigi-history-undo:43` (this session's spec, a 100 ms clock margin; 30/30 after the fix),
  and five that pass alone here and passed in CI's shards (`brand-nav-polish:137`, `ui-evidence:65`, `webkit-smoke:35`,
  `zigi-alive:190`, `zigi-simulated-day:44`). The rest of the suite is covered by CI's three shards on `870c392`.
- WebKit (advisory): both shards finish inside their cap since Part 7 (C29).
- AB-Design's handoff: `feature/session-ab-design` still not on origin (checked at Gate C); main is still `6c1052b`.

## Done
- Part 0 `9435afec`; Part 1 `bdb4b5b7` `ed33e2d5` `c633814c` `516cba9e`; Part 2 `aed011b3` `69edf6d2` `0e26879a` `e587ca16`;
  Gate A `05ad2bb3` `f381c1e9` `fe589e42` `097f19e1`; Part 3 `5d91c083`; Part 4 `ccefd69d`; Part 5 `ce750e0b`; Part 6
  `97e14af1`; Gate B `b586c963` `02677e45` `e3ac5003`; Part 8 `2c3fd6db`; Part 7 `ac973b74`; Part 9 `fe784693`; Part 10
  `f86985cb`; Gate C `1f8f1cb8` `e57ab538` `732a2055`.

## Owner items (collected as they arise)
- The rollback floor rises to #32 (W) with Part 1's finance v5 writes (accepted at plan approval).
- PRIVACY.md E2 sentence + the extras clause: drafted in the PR's owner items, for approval.
- A private-sync Worker redeploy (`/v1/extras`) is needed before the app deploy that carries Part 2.
- `sync-lost-ack-browser`: root cause fixed (C21c); main's own build still fails it in this sandbox (4 of 4), so a red
  run on main is that race (timelines in `lost-ack-race.txt`).
- CI's WebKit job (advisory) now reports: three known classes remain (C29), traces per shard; fixing them needs a
  local WebKit or a next session.
- Extras travel with the next account sync (C21); after a key rotation a device whose base is not at the copy's
  revision reports "waiting" until the device that is re-uploads it (C28).
- `persona-z:278` failed once on shard 2 (3 of 3 locally); `coherence:7` once on `e3ac500` (6 of 6 locally): one re-run
  each if they come back, a second failure means investigate.
