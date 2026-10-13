# Session AB-Cloud — status and resume point

Kept current after every finished part. The PR description carries the same "Resume here" block. Repository: the cloud
sandbox's `/home/user/ZIGoals`, branch `feature/session-ab-cloud` (push only there; never the harness branch). Node 24.19.0
installed outside the checkout (`/root/node-v24.19.0-linux-x64`, checksum verified against nodejs.org's SHASUMS256).
Plan: ADR-023 (owner decisions and C1…). Parallel lane: AB-Design (`feature/session-ab-design`, the owner's Mac).

## Resume here (2026-10-13, Part 2 pushed; Gate A next)
Parts 0–2 pushed. Part 1: finance-homes switch (C6, C9, C10), cardArt (C7), AB-Design's keys (C8), the frozen-reader script.
Part 2: the extras keyspace (Worker + relay), the extras sync library (merge, sections, seal/open, bases), the provider and
Settings → Sync's switch (C1–C5, C11–C14). Frozen readers #37/#38/#39 PASS for finance v5 and every extras record.
Next: Gate A (unit suite, sync + frozen readers + Miniflare, the touched specs against a production build, CI fully
finished), then Part 3.

## Done
- Part 0 (records, ADR-023, handoff, this file).
- Part 1 (`bdb4b5b` `ed33e2d` `c633814` `516cba9`), Part 2 (`aed011b` `69edf6d` and the provider commit).

## Open
- Parts 1–10, gates A–C, the STATUS entry; see ADR-023 and the PR description.

## Owner items (collected as they arise)
- The rollback floor rises to #32 (W) with Part 1's finance v5 writes (accepted at plan approval).
- PRIVACY.md E2 sentence + the extras clause: drafted in the PR's owner items, for approval.
- A private-sync Worker redeploy (`/v1/extras`) is needed before the app deploy that carries Part 2.
