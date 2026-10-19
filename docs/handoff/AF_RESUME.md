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
| L2a chain + signing + staking UI + governance + validator health | `af/signing` (an agent worktree) | helper | Part 2 done: merged `df19ef40` 01:25 Mon, wired; chunk 3 (governance UI, validator health, rewards sweep, Settings "Remove" for staking prefs) waits for a slot |
| L1 Earn hub + data routes + Academy + dock + Today card | chunk 1 `af/earn`; chunk 2 `af/earn2` (agent worktrees) | helper (port 3103) | chunk 1 merged `a444c5ae`, wired; chunk 2 (Start-here, every option in depth, measured APR H97, Academy, illustrations, Today EARN card, dock, stage 9, live-check) running since 01:42 Mon |
| L3 Checklist + shared path engine | `af/checklist` (an agent worktree) | helper | done: merged `206a26c4`, wired (stage 10, registries, Today card, Settings, game layer) |
| L2b wallets + tracking + multi-asset Add money + Goal Vaults | `af/wallet` (an agent worktree) | helper (port 3104) | running since 00:15 Mon |
| L5a UI changes + theme parity | `af/ui` (an agent worktree) | helper (port 3102) | running since 01:40 Mon: P10.1–P10.13 |
| L4 ZIGi | `af/zigi` → `../ZIGoals-af-zigi` | helper | waits for a slot |
| L5b My Universe, Day Timeline, Stories | `af/extras` → `../ZIGoals-af-extras` | helper | waits for a slot |

Each lane records its own state in `docs/handoff/af-lanes/<lane>.md` (one owner per file).

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records, setup | done except the reference captures + route/asset checks (the next free helper slot, H93) | `5e4f909d` `59e44be9` `5c015f2c`; captures `c438f25b` on `review/session-af-screens` |
| 1 Earn hub | core merged and wired; chunk 2 pending | merge `a444c5ae`; wiring `a3cbc5c3` `acd71be2` `8bb65419` `64942576` |
| 2 Native staking | done (merged, wired); owner's real-wallet checks after deploy | merge `df19ef40`; wiring `f2388078` `602f7bfb` `15f0d9af` `1518b802` |
| 3 Wallets | not started | — |
| 4 Add money (multi-asset) | not started | — |
| 5 Earn dock | not started | — |
| 6 Goal Vaults + governance | not started | — |
| 7 Checklist | done (merged, wired); critique round at Gate C | merge `206a26c4`; wiring as Part 1; stage 10 `8bb65419` |
| 8 ZIGi | not started | — |
| 9 My Universe, Day Timeline, Stories | not started | — |
| 10 UI changes + theme parity | not started | — |
| 11 Leftovers A2–A4, A10, verifier stages, live-check | A2/A3 `4f92d3ff`, A4 `569f3b63`, A10 `95bca53d` `fec6385c` done; the Earn/Checklist stages and live-check come with their lanes | see left |
| 12 Words and help | not started | — |
| Gate C | not started | — |

## Resume here (2026-10-19 01:50 Brussels — L2a and Part 0 merged; L5a and L1 chunk 2 started)
- Done since 00:45: nav fixes `59c61ea1` (phone tabs never take a navigation extra, H68; specs moved), `4df00252`;
  `8f09dc5f` (merge af/part0-research: routes onto ZIGChain, on-ramp codes, the 10-19 re-check); reference captures
  `bf342394` on `review/session-af-screens` (pushed); `df19ef40` (merge af/signing) + wiring `f2388078` (TIER 3 storage),
  `602f7bfb` (TIER 3 egress: server-only origins named + guard), `15f0d9af` (Earn ↔ validators wire contract; Staking
  empty preview mounted lazily; sanitizer route), `1518b802` (themes, PRIVACY); `b988e4a1` (lane scratch rule, H99).
  Unit 5529 passed; lint 0 errors. Pushed to `b988e4a1`.
- In progress (uncommitted when written): the TIER 3 public-safety labels of H100 (mode strip, Help answer, stZIG card,
  their specs); the integration spec set on 3101 (`$SP/logs/lead-integ.log`).
- Running helpers (3): L2b (port 3104, told about the codes and L2a), L5a (3102), L1 chunk 2 (3103). Ids in `$SP/lanes.txt`.
- Known local-only failure: `hosted-verifier-order` throws React #418 on `/app/review` between 00:00 and 02:00 Brussels
  (Life review's `useLocalToday` starts from the server's UTC date; CI is all-UTC); rerun it after 02:00. Pre-existing on
  `main`; recorded for STATUS, not fixed here.
- Next slots, in order: L2a chunk 3 (governance UI, validator health, rewards sweep, staking-prefs Remove), L4 (ZIGi),
  L5b (extras). Still before Gate C: the social card re-render (Part 12), the owner's landing wording (owner item).
- Deploy gates proven on this branch (amendment 7), 2026-10-19 02:05 Brussels, tree `9497a70a`, under the lock:
  `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build:alpha` exit 0 ("OpenNext build complete.");
  `pnpm check:alpha-artifact` exit 0 ("empty compiled environment, no env file copies, no secret markers, no configured
  names"); `pnpm check:alpha` (wrangler dry-run) exit 0 (21,864.64 KiB / gzip 4,814.56 KiB). Log `$SP/logs/lead-build-alpha.log`.
  Repeat at Gate C on the final head.
- The verifier order spec (stages 2–6 + 10) passed after 00:00 UTC on `9497a70a`'s build: the #418 earlier was the
  midnight case above.
- Part 12 list (lead, after the lanes merge): What's new `2026-10-session-af-wealth-unlocked` + links; Help section `af`
  (Earn hub, Start-here, each option, Academy, dock, native staking practice/real and the review screen, wallets, Add
  money, Goal Vaults, governance, validator health, the Checklist's six answers from docs/product/CHECKLIST.md, ZIGi,
  My Universe, Timeline, Stories, the UI changes; update `ae-themes` for the Light redo) mirrored in search; Known
  limitations (phones before the Reown ID, on-ramp coverage, Checklist not synced, nothing framed, …); the social card;
  OWNER_ACCOUNTS.md (L2b); the budgets commit (H96).

## Resume here (2026-10-19 00:45 Brussels — L1 chunk 1 and L3 merged and wired)
- Done since 22:45: merges `a444c5ae` (af/earn) and `206a26c4` (af/checklist); wiring commits `a3cbc5c3` (TIER 3 storage:
  the five keys in every registry + `lib/af-lead-registries.test.ts`), `acd71be2` (TIER 3 shell navigation: Earn first in the
  money group following Wealth's switch H98, icons, More notes, search, Settings section, Today's Checklist card H95, game
  layer), `8bb65419` (TIER 3 verifier/CI: stage 10 appended, sentinel, order spec, workflow doc, sanitizer routes),
  `64942576` (theme sheets), `cc5d9d79` (PRIVACY Checklist paragraph; ADR H95–H98), `16d69ce9` (research verdict tables
  re-attributed). Unit suite: 5333 passed before the visibility fix, the 4 failures fixed in `acd71be2`. Lint 0 errors.
- Running: L2a (signing, port 3102), the Part 0 helper (reference captures + route/code checks), L2b (wallets, port 3104).
  The lead's build serves on 3101; the focused browser set's log is `$SP/logs/lead-focused.log`.
- Next: when the focused set is green, push. When a helper reports: merge, wire from its lane file, regenerate themes,
  lint/typecheck/unit/focused, push. Slot order after these: L1 chunk 2, L5a, L4, L5b, then L2a chunk 3. At L2a's merge:
  align the Earn page's `/api/chain/validators?network=mainnet` to `zigchain-1`, mount `StakingEmptyPreview` in
  `positions-view.tsx`, add the serverOnly `earnLive` and `recipeResolver` notes to `egress-policy.json`, prove
  `build:alpha` + `check:alpha-artifact` (amendment 7). Daily PR comment ~18:00 Brussels.

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
