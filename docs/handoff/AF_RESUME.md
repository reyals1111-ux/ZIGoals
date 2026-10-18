# Session AF — Resume here

Kept current after every part and every lane merge (owner rule). On any resume, usage pause or model switch: read this
file, `git status`, `git log --oneline -15` and the lock file, then continue at "Next action". Never redo finished work;
never re-plan; never enter plan mode again (the plan was approved once, with the owner's eleven amendments: ADR-028
"Owner decisions"; the approved plan is `~/.claude/plans/pasted-content-id-d264-owner-approved-s-swift-hippo.md`).

## Commands (this Mac)
- Node 24.19.0 first, in every shell and every helper (the shell's default is 22.23.1):
  `export PATH=$HOME/.local/share/fnm/node-versions/v24.19.0/installation/bin:$PATH`
- Scratch dir outside the checkout: `SP=$HOME/zigoals-af` (`bin/`, `logs/`, `captures/`). Install:
  `pnpm install --frozen-lockfile --ignore-scripts`; check: `pnpm run doctor`.
- The machine lock (ADR-028 H91): every build, Playwright run and Chromium screenshot runs as
  `$SP/bin/with-lock.sh <cmd…>` (`/usr/bin/shlock` on `/tmp/af-browser.lock`); a long-running `next start` never holds it.
- Timeouts: `$SP/bin/tmo.sh <seconds> <cmd…>` (Perl alarm; exit 124 on timeout). Every long command gets one and a log in `$SP/logs/`.
- Build + serve: `$SP/bin/rebuild.sh <checkout> <port> <log>` (kills the port's listener, builds
  `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED` under the lock, starts `TZ=UTC next start` on 127.0.0.1:<port>,
  curls `/app` until up). Ports: 3102 (lane builds), 3103 (before captures / main), 3104 (Gate C).
- Browser tests: `cd apps/web && PLAYWRIGHT_BASE_URL=http://127.0.0.1:<port> $SP/bin/with-lock.sh $SP/bin/tmo.sh 3600 pnpm exec playwright test <spec> --workers=2`.
  The full suite runs in the background (`nohup … > $SP/logs/full.log 2>&1 &`) and the log is polled (ADR-028 H86).
- Unit: `pnpm test` from the repo root (vitest; run `.tsx` tests from the root, memory note).
- Captures: `node $SP/bin/capture-af.mjs <base> <out>` (`THEMES=nebula,light,dark`, `ONLY=<regex>`), under the lock;
  results go to the orphan branch `review/session-af-screens`, never the feature branch.
- Theme sheets after any CSS change: `node scripts/themes/build-themes.mjs` (the unit test fails otherwise; only the lead regenerates).
- caffeinate: `$SP/caffeinate.pid` (started 2026-10-18 22:15 Brussels); stop at the end with `kill $(cat $SP/caffeinate.pid)`.
- Times: `TZ=Europe/Brussels date`. Gate C starts by Sat 24 Oct 08:00; code freeze Fri 23 Oct 22:00; PR out of Draft with CI
  green by Sun 25 Oct 11:00 Brussels.

## Pacing (owner amendment 4, ADR-028 H81)
At most three helpers at the same time beside the lead. Start order: L2a, L1, L3; then L2b, L5a, L4, L5b as slots free.
No research fan-out. Gate C reviews one after another. "pace down" from the owner → two helpers.

## Lanes (ADR-028 H3, H73)
| Lane | Branch / worktree | Owner | State |
|---|---|---|---|
| L6 lead (records, verifier, sync, security, words, merges, Gate C) | `feature/session-af-wealth-unlocked` (this checkout) | lead | Part 0 done; A2/A3/A4/A10 done |
| L2a chain + signing + staking UI + governance + validator health | `af/signing` (an agent worktree) | helper (port 3102) | running since 22:30 Sun: Part 2 steps 1–10 |
| L1 Earn hub + data routes + Academy + dock + Today card | `af/earn` (an agent worktree) | helper (port 3104) | running since 22:30 Sun: Part 1 core steps 1–7 |
| L3 Checklist + shared path engine | `af/checklist` (an agent worktree) | helper (port 3103) | running since 22:30 Sun: Part 7 steps 1–11 (path model first) |
| L2b wallets + tracking + multi-asset Add money + Goal Vaults | `af/wallet` → `../ZIGoals-af-wallet` | helper | waits for a slot |
| L5a UI changes + theme parity | `af/ui` → `../ZIGoals-af-ui` | helper | waits for a slot |
| L4 ZIGi | `af/zigi` → `../ZIGoals-af-zigi` | helper | waits for a slot |
| L5b My Universe, Day Timeline, Stories | `af/extras` → `../ZIGoals-af-extras` | helper | waits for a slot |

Each lane records its own state in `docs/handoff/af-lanes/<lane>.md` (one owner per file).

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records, setup | done except the reference captures + route/asset checks (the next free helper slot, H93) | `5e4f909d` `59e44be9` `5c015f2c`; captures `c438f25b` on `review/session-af-screens` |
| 1 Earn hub | not started | — |
| 2 Native staking | not started | — |
| 3 Wallets | not started | — |
| 4 Add money (multi-asset) | not started | — |
| 5 Earn dock | not started | — |
| 6 Goal Vaults + governance | not started | — |
| 7 Checklist | not started | — |
| 8 ZIGi | not started | — |
| 9 My Universe, Day Timeline, Stories | not started | — |
| 10 UI changes + theme parity | not started | — |
| 11 Leftovers A2–A4, A10, verifier stages, live-check | A2/A3 `4f92d3ff`, A4 `569f3b63`, A10 `95bca53d` `fec6385c` done; the Earn/Checklist stages and live-check come with their lanes | see left |
| 12 Words and help | not started | — |
| Gate C | not started | — |

## Resume here (2026-10-18 22:45 Brussels — Part 0 done, three lanes running)
- Done: Part 0 records (`5e4f909d`), the lane rules (`59e44be9`), the frozen-reader releases #37–#44 (`5c015f2c`); the
  before captures on `review/session-af-screens` (`c438f25b`, 107 views); Draft PR #90; Part 11 A2/A3 (`4f92d3ff`),
  A4 (`569f3b63`), A10 (`95bca53d`, `fec6385c`).
- Running: L2a (signing), L1 (Earn core), L3 (Checklist) — three helpers, the owner's cap. Lane ids in `$SP/lanes.txt`.
- Next: when a lane reports, merge its branch (`git merge --no-ff af/<lane>`), wire its registry rows from its lane file,
  regenerate the theme sheets if CSS changed, run lint/typecheck/its focused specs, push; then start the next helper in
  the order: Part 0 reference/route helper (H93), L2b, L5a, L4, L5b. The lead adds the server-only egress notes
  (`cloudflare-dns.com`, the Earn hosts) to `egress-policy.json` after L2a's CSP commit merges (H94).
- Daily PR comment ~18:00 Brussels from Mon 19.

## Resume here (2026-10-18 22:30 Brussels — Part 0)
- Done: preflight (clean checkout, nothing stashed), `main` = `4f92495`, branch created; toolchain; `caffeinate`; STATUS
  Alpha #44 record + AE heading; ADR-028 (owner decisions + amendments 1–11, H1–H91); this file; the build of `main` on
  :3103; before captures running (`$SP/logs/capture-before.log`).
- Next: the research docs from the Phase R journal (`~/.claude/projects/-Users-AIUSER-Documents-ZIGoals-Claude/1f1a37d0-095e-4785-8558-ce3b8df11086/subagents/workflows/wf_645c1bda-1e6/journal.jsonl`)
  → `docs/earn/af/`, `docs/research/session-af/`; PRIVACY.md design paragraph per H16; commit + push; the Draft PR; the
  orphan branch with the before captures; one helper for the reference captures and the new route/asset checks; then lanes L2a, L1, L3.
- Open decisions: none (amendments settle D1–D10).
