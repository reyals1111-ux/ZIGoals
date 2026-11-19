# Session AT — resume file ("READY FOR FRIENDS")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-at-ready-for-friends` (from `main` `3d510124`), one Draft PR. Rules: CLAUDE.md, the owner's brief, and
`docs/architecture/ADR-043-session-at.md` (the approved plan and the owner's two changes). Order: 0, 1, 6, 2, 3, 4, 5, end.

## Toolchain in the sandbox
- `pnpm install --frozen-lockfile --ignore-scripts`.
- Pinned Node 24.19.0 is not preinstalled: download it into the scratchpad
  (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`) and put its `bin` first on PATH for unit runs.
- Browser specs: Chromium at `/opt/google/chrome/chrome`, at most 2 workers, one run at a time.

## Done
- Parts 0, 1, 6, 2, 4, 5, 3 (ADR-043 D1–D20, closing table); STATUS entry written.

## In progress
- Reading CI on the final code head (`ad8a7c40`, run 1889) and theme parity on the last build; then the STATUS entry
  (final commit) with both results, and the report.

## Next (if resumed)
- Fill "CI on the final head" in docs/STATUS.md (Session AT) from the newest Milestone quality run; a red job gets at most
  two fix attempts or its explanation. Then the report (≤ 12 lines) from STATUS's "Owner list".
