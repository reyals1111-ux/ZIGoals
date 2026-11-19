# Session AU — resume file ("FRIENDS DRESS REHEARSAL")

Read this first after a pause, a limit or a model switch; continue from "Next" without asking. Branch
`feature/session-au-dress-rehearsal` (from `main` `836534c3`), one Draft PR. Rules: CLAUDE.md, the owner's brief and
`docs/architecture/ADR-044-session-au.md` (the approved plan and the owner's two additions). Order: 0, 1, 2, 3, 4, end.

## Toolchain in the sandbox
- Pinned Node 24.19.0 into the scratchpad (`https://nodejs.org/dist/v24.19.0/node-v24.19.0-linux-x64.tar.xz`), its
  `bin` first on PATH; `corepack enable pnpm`; `pnpm install --frozen-lockfile --ignore-scripts`.
- Browser runs: Chromium at `/opt/google/chrome/chrome`, at most 2 workers, one run at a time; production build on 3101.

## Done
- Part 0: ADR-044, this file, STATUS stub, frozen readers #37–#57 PASS (#57 = `836534c3`).

## In progress
- Part 1: the walks.

## Next
- Part 1: persona walks (scratchpad scripts), a fresh reviewer per walk, REHEARSAL.md rows, fixes with `tests/au/` specs
  (phone part as `webkit-au-*` specs in the shortest WebKit list).
