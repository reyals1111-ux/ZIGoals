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
| 0 Records | done | merge `c0a985c0`, `5c041573`; before captures on `review/session-ad-screens` `e0c9e45b`; Draft PR #88 |
| 1 Footer banner | done (CI pending) | `76949675` |
| 2 Hero bleed | done (CI pending) | `a0e01369` |
| 3 Themes | | |
| 4 Items 8–13 | | |
| 5 Carried checks | | |
| Gate C, finish | | |

## Resume here (2026-10-17 01:30 Brussels — Parts 1–2 pushed; Part 3 next)
- Done: footer banner (`76949675`), hero bleed (`a0e01369`); focused specs green locally (footer-motion, footer-links-moved,
  today-hero-bleed, ui-design-pass, session-ac, persona-z, music, brand-nav-polish, dashboard-visual, help-page).
- In parallel (helper worktrees, branches merged by merge commit when they report): item 8 dates, item 11 sync status +
  restore, item 12 Q-SYNC-05 + §2, item 13 ZIGi gallery + Showcase sleep/habit days. Items 9, 10 and Part 3 are mine.
- Next: Part 3 themes (F4 storage field `theme`, F5 nonced bootstrap, generated Light/Dark override sheets).

## Resume here (2026-10-17 01:10 Brussels — Part 0)
- Done: branch, wordmark merge, STATUS #42 entry + Release identity, ADR-026 F1–F6, this file; before captures running.
- Next: push, Draft PR, before captures to `review/session-ad-screens`, then Part 1.
- Open decisions: none.
