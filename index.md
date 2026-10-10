# Session Z-Local — the raw run files

Every per-run JSON of Session Z-Local's model runs (real Claude on the owner's test key; the local models on the RTX
5090 PC and the Mac), the spoken corpus and the API ledger, kept on this orphan branch so the feature branch
`feature/session-z-local` carries only the summaries (`docs/verification/z-local/`). Fictional data only (the Showcase).
No key, no address of the PC, no personal record is ever written here; `scripts/zigi/key-sweep.mjs` scans this tree
before every push.

- `real-model/<stage>/…` — harness files `{summary, runs}` and panel files (lists of UI runs), named as X-Local's.
- `spoken/` — the spoken-corpus generation (seeds, the batch's results, train/holdout splits).
- `ledger.md`, `ledger.json` — the running API ledger (every call's usage at the dated price table; no key).
- `hours.log` — START/END lines of every stage (the shell's clock, UTC).

| File | Summary |
|---|---|
_(appended as the runs complete)_
