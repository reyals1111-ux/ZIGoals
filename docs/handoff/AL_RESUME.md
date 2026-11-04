# Session AL: resume file (kept current at every push)

**Branch:** `feature/session-al-fix-everything` (base `main` `17069c7d`). **Draft PR:** opened in Part 0 (link in STATUS once open).

## How to resume in a fresh workspace
1. `git fetch origin feature/session-al-fix-everything review/session-al-scope review/session-ah-scope review/session-ai-scope`, then `git checkout feature/session-al-fix-everything`.
2. Install Node 24.19.0 into `/opt/node24` (the nodejs.org tarball, checked against SHASUMS256). Run `export PATH=/opt/node24/bin:$PATH`, then `corepack enable --install-directory /opt/node24/bin`, then `pnpm install --frozen-lockfile --ignore-scripts`.
3. Extract the scope into the scratchpad with `git show origin/review/session-al-scope:owner-scope/<file>`. Never commit it.
4. Read ADR-037, this file and `docs/review/session-al/GROK53_LEDGER.md`, then continue from "Exact next step".

## Done
- Part 0 has started:
  - the branch;
  - frozen reader #53;
  - STATUS Part 0 records;
  - the ADR-037 skeleton;
  - `ROOT_CAUSE_KEYS.md`;
  - `docs/dependencies/AL_REVIEW.md` (Waits on owner).

## Lanes in flight
- Ledger helpers (8):
  - tokyo
  - moscow
  - nairobi
  - denver
  - denver-recheck + competitor gaps
  - lisbon + lisbon-ai
  - berlin
  - professor + §3 + §4 + setup log
- L9: release and CI.
- L10b: primitives.

## Exact next step
Merge the ledger files into `GROK53_LEDGER.md`: counts in vs rows out, the history map, the keep-list. Then start the pillar lanes on reproduction specs (A4) and L10a (shell).

## Open readings
Q1–Q5 are in ADR-037.

## Live counts
| Ledger findings in | AL rows out | Reproduced | Already fixed | Reopened | Fixed | STILL OPEN |
|---|---|---|---|---|---|---|
| (pending) | — | — | — | — | — | — |
