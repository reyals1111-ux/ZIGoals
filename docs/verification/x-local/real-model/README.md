# The real-model run files

The raw per-run files (every reply, every check, the latencies) live on the orphan branch
[`review/session-x-local-runs`](https://github.com/reyals1111-ux/ZIGoals/tree/review/session-x-local-runs) (`real-model/`,
with an `index.md` that lists each file and its summary line; Phase 2's runs under `real-model/phase2/`). This folder on
the feature branch keeps only `summaries/`: one small JSON per model and run (the harness's `summary` object, or the
panel runs' counts and medians), named after the raw file. The tables in `../ZIGI_REAL_MODEL_TEST.md` are built from the
raw files with the session's summariser scripts and pasted there. Fictional data only (the Showcase).

Naming: `<host>-<model>-<mode>[-think]-<cases>-<started>.json` for the harness (`tools` or `attach`; `all` is the full
corpus, `important` the variance set; `x3` three runs); `ui-<model>.json`, `conversations[-before]-<model>.json`,
`pages-<model>.json`, `day-in-the-life-<model>.json`, `photos-<model>.json` for the panel runs, each a list of runs with
the host inside (the Mac's runs sit in the same file as the PC's for the same model).
