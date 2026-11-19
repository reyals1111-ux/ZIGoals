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
- Every part (0, 1, 6, 2, 4, 5, 3), ADR-043 with its closing table, the STATUS entry with CI: run 1893 on the final code
  head green on the first attempt. Session complete; nothing in progress.

## Next (for the next session)
- docs/STATUS.md (Session AT), "For the next session" and "Carried".
