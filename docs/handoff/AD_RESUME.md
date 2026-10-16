# Session AD — Resume here

Kept current after every part (owner rule). On any resume, pause or model switch: `git pull`, read this file and
`git log --oneline -15`, then continue at the next unfinished step. Never redo finished work; never re-plan; never enter
plan mode again (the plan was approved once: ADR-026 and the PR description).

## Commands
- Node 24.19.0 outside the checkout: `export PATH=/root/node-v24.19.0-linux-x64/bin:$PATH` (download from nodejs.org,
  checked against SHASUMS256, if the container is new). Install: `pnpm install --frozen-lockfile --ignore-scripts`.
- Chrome channel locally: `mkdir -p /opt/google/chrome && ln -sf /opt/pw-browsers/chromium-1194/chrome-linux/chrome /opt/google/chrome/chrome`.
- Build: `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`; serve: `cd apps/web && pnpm exec next start --hostname 127.0.0.1 --port 3101`.
- Browser tests: `cd apps/web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:3101 pnpm exec playwright test <spec> --workers=2`.
- Captures: `capture.mjs` on `review/session-ad-screens` (`node capture.mjs <base> <out>`; `THEMES=nebula,light,dark`).
- Times: `TZ=Europe/Brussels date`. Gate C starts by Sat 17 Oct 19:00 Brussels; PR out of Draft before Sun 01:00.

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records | in progress | merge `c0a985c0` |
| 1 Footer banner | next | |
| 2 Hero bleed | | |
| 3 Themes | | |
| 4 Items 8–13 | | |
| 5 Carried checks | | |
| Gate C, finish | | |

## Resume here (2026-10-17 01:10 Brussels — Part 0)
- Done: branch, wordmark merge, STATUS #42 entry + Release identity, ADR-026 F1–F6, this file; before captures running.
- Next: push, Draft PR, before captures to `review/session-ad-screens`, then Part 1.
- Open decisions: none.
