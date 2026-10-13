# Session AB-Cloud — status and resume point

Kept current after every finished part. The PR description carries the same "Resume here" block. Repository: the cloud
sandbox's `/home/user/ZIGoals`, branch `feature/session-ab-cloud` (push only there; never the harness branch). Node 24.19.0
installed outside the checkout (`/root/node-v24.19.0-linux-x64`, checksum verified against nodejs.org's SHASUMS256).
Plan: ADR-023 (owner decisions and C1…). Parallel lane: AB-Design (`feature/session-ab-design`, the owner's Mac).

## Resume here (2026-10-13, Part 0)
Part 0 in progress: Alpha #39 recorded in STATUS (run 38365446959, run number 41; versions read from the deploy job's
CI log), ADR-023, the handoff. Next: Part 1 (finance v5 switch, `cardArt`, AB-Design's keys), then the draft PR.

## Done
- Part 0 (records, ADR-023, handoff, this file).

## Open
- Parts 1–10, gates A–C, the STATUS entry; see ADR-023 and the PR description.

## Owner items (collected as they arise)
- The rollback floor rises to #32 (W) with Part 1's finance v5 writes (accepted at plan approval).
- PRIVACY.md E2 sentence + the extras clause: drafted in the PR's owner items, for approval.
- A private-sync Worker redeploy (`/v1/extras`) is needed before the app deploy that carries Part 2.
