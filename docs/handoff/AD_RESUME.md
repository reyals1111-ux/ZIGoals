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
| 1 Footer banner | done | `76949675`, CI fixes `ce9b3545` |
| 2 Hero bleed | done | `a0e01369`, `ce9b3545` |
| 3 Themes | done; per-theme audits running | `c360ba01` (TIER 3 storage), `b917d802` (TIER 3 CSP), `cfe0f1e1`, weights `389bb3f6` `c2ca3697` `d5fd2ddf`, contrast fix |
| 4 Items 8–13 | done (9: green in runs 988, 990, 991, 992; 10: `item10-webkit.md`) | merges `b1117cd4` (13), `a34eb012` (11), `ab11cf47` (12), `50ab05c6` (8) |
| 5 Carried checks | What's new + 7 Help answers merged (`ab511c07`), two older answers made true (`402d1935`), hero 768 measured (unchanged) | |
| Gate C, finish | done: full suite, audits ×3, weights, scans, revert gate, frozen readers, two reviews, captures; STATUS final | see docs/STATUS.md |

## Resume here (2026-10-17 09:00 Brussels — Gate C done; finishing)
- Everything is pushed. Left: the STATUS entry (the final commit), CI green on it, the PR out of Draft with its full
  description, the short report. Nothing else is open in this session's scope.

## Resume here (2026-10-17 05:00 Brussels — CI 987 fixes pushed; Light audit fixes in progress)
- Pushed `34dad87c`+: run 987 fixes (unit test for the lazy market search, two item-8 dates), restore Keep, Light pillar
  names, Part 5 Help/What's new, item 10 table (`docs/verification/session-ad/item10-webkit.md`).
- Light audit (main pages, 390/1440; `bash $SP/audit.sh light 390,1440`): pillar/area/tone/activity labels and the theme
  note fixed in `apps/web/themes/light.extra.css` WITH the `:not(#\-)` boost (extra rules lose to the generated ones
  without it). Public theme files are served live: regenerate, no rebuild needed to re-audit.
- Next: re-audit Light failures, Dark audit, then Gate C (by 19:00): full browser suite once, audits, captures, reviews.

## Resume here (2026-10-17 03:45 Brussels — Part 3 and Part 4 merges pushed; audits next)
- Weights: every page within budget, none raised (Today 514.9/515.0, Habits 457.7/458.0); thin margins, so check
  `node scripts/check-weight-budget.mjs http://127.0.0.1:3101` after any shell or Today change.
- CI run 984 (cfe0f1e1) failures fixed locally: send-feedback, a11y-wcag-x contrast (theme bar words), guide:124,
  run11-food-widgets; reflow/logo-fold/run10-widgets passed locally. Item 9 test change green locally.
- The theme sheets MUST be regenerated after any CSS change: `node scripts/themes/build-themes.mjs` (unit test fails otherwise).
- Rebuild without killing your own shell: `bash $SP/rebuild.sh` as its own command (it stops only the 3101 server).
- Next: Light/Dark audits (`--theme=`), fixes; item 10 WebKit table; Part 5; Gate C by 19:00.

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
