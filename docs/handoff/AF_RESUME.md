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
- **Never run Playwright WebKit (or any headed browser) on this Mac** (owner, 2026-10-19, ADR-028 H114): it crashes
  WindowServer while the displays sleep and ends the login session. Local runs, captures and audits: Chromium headless only
  (`--project=desktop --project=mobile`, default config). The WebKit set runs in CI's required WebKit job; a WebKit-only
  failure is read from CI's trace/artifacts (`gh run download <run> -n web-webkit-<sha>-shard-<n>`).
- Push at least every 60 minutes (owner, 2026-10-19), so an interruption never loses more than an hour.
  The full suite runs in the background (`nohup … > $SP/logs/full.log 2>&1 &`) and the log is polled (ADR-028 H86).
- Unit: `pnpm test` from the repo root (vitest; run `.tsx` tests from the root, memory note).
- Captures: `node $SP/bin/capture-af.mjs <base> <out>` (`THEMES=nebula,light,dark`, `ONLY=<regex>`), under the lock;
  results go to the orphan branch `review/session-af-screens`, never the feature branch.
- Theme sheets after any CSS change: `node scripts/themes/build-themes.mjs` (the unit test fails otherwise; only the lead regenerates).
- caffeinate: `$SP/caffeinate.pid` (started 2026-10-18 22:15 Brussels); stop at the end with `kill $(cat $SP/caffeinate.pid)`.
- Times: `TZ=Europe/Brussels date`. Gate C starts by Sat 24 Oct 08:00; code freeze Fri 23 Oct 22:00; PR out of Draft with CI
  green by Sun 25 Oct 11:00 Brussels.

## Gate C checklist (Sat 24 Oct from 08:00 Brussels; tick as done, with the evidence file)
- [ ] G1 full unit suite (`pnpm test`).
- [ ] G2 full browser suite once, Chromium headless only, 2 workers, nothing else running (`nohup … > $SP/logs/full.log`, polled; H86).
- [ ] G3 the WebKit set: **runs in CI's required WebKit job, never locally** (ADR-028 H114); read its result and artifacts there.
- [ ] G4 layout audits in Nebula, Light and Dark at 320/390/768/1024/1440/1920 + touch + stress, Chromium only → `docs/verification/af/`.
- [ ] G5 theme parity (`theme-parity-af.spec.ts` in Chromium; `webkit-theme-parity` in CI).
- [ ] G6 weights: existing budgets unchanged; the new lines (H96) and each lazy chunk's gzip size (H54); theme sheets' gzip sizes (H112).
- [ ] G7 revert gate: every commit newest-first with typecheck green, in a scratch worktree.
- [ ] G8 frozen readers #37–#44 (`node scripts/frozen-readers.mjs`), never beside a build or Playwright run.
- [ ] G9 key scans (check-secrets, the key sweep, no e-mail addresses in the diff).
- [ ] G10 `scripts/earn/live-check.mjs` on the real network (read-only).
- [ ] G11 hosted verifier against a local production build (`ZIGOALS_VERIFY_BASE`), Chromium.
- [ ] G12 the three fresh reviews one after another (security of every Tier 3 commit, design critique of the after captures, test audit for weakened assertions), one fix round each.
- [ ] G13 `build:alpha` + `check:alpha-artifact` + `check:alpha` on the final head; CI green on the final head (Milestone quality incl. the WebKit job).

## Pacing (owner amendment 4, ADR-028 H81)
At most three helpers at the same time beside the lead. Start order: L2a, L1, L3; then L2b, L5a, L4, L5b as slots free.
No research fan-out. Gate C reviews one after another. "pace down" from the owner → two helpers.

## Lanes (ADR-028 H3, H73)
| Lane | Branch / worktree | Owner | State |
|---|---|---|---|
| L6 lead (records, verifier, sync, security, words, merges, Gate C) | `feature/session-af-wealth-unlocked` (this checkout) | lead | Part 0 done; A2/A3/A4/A10 done |
| L2a chain + signing + staking UI + governance + validator health | `af/signing`, `af/signing3` | helper | done: Part 2 merged `df19ef40`; chunk 3 (Part 6) merged and wired (`8443a1e3`) |
| L1 Earn hub + data routes + Academy + dock + Today card | `af/earn`, `af/earn2` | helper | done: both chunks merged (`a444c5ae`, `b205460a`) and wired (stage 9, Today EARN card in For you H104, dock, Settings, game) |
| L3 Checklist + shared path engine | `af/checklist` (an agent worktree) | helper | done: merged `206a26c4`, wired (stage 10, registries, Today card, Settings, game layer) |
| L2b wallets + tracking + multi-asset Add money + Goal Vaults | `af/wallet` | helper | done: merged and wired; its links now in the registry (H103) |
| L5a UI changes + theme parity | `af/ui` | helper | done: merged `3d507e9a` (Part 10); wiring: themes, Help Light answers, ADR H109–H113 |
| L4 ZIGi | `af/zigi` (an agent worktree) | helper | done: merged `bf60a398`, wired (`8537487b`, Part 12 `be68a4f7`; the staking form re-reads a pre-fill while open) |
| L5b My Universe, Day Timeline, Stories | `af/extras` (an agent worktree) | helper | done: merged `35afad0e`, wired (`8537487b`, `133f8420`) |

Each lane records its own state in `docs/handoff/af-lanes/<lane>.md` (one owner per file).

## Parts
| Part | State | Commits |
|---|---|---|
| 0 Records, setup | done except the reference captures + route/asset checks (the next free helper slot, H93) | `5e4f909d` `59e44be9` `5c015f2c`; captures `c438f25b` on `review/session-af-screens` |
| 1 Earn hub | done (merged, wired); critique round at Gate C | `a444c5ae` `b205460a` + wiring |
| 2 Native staking | done (merged, wired); owner's real-wallet checks after deploy | merge `df19ef40`; wiring `f2388078` `602f7bfb` `15f0d9af` `1518b802` |
| 3 Wallets | done (merged, wired) | merge of af/wallet; `68aa69b0` (no e-mail addresses, H101) |
| 4 Add money (multi-asset) | done (merged, wired); owner IDs pending | merge of af/wallet; `c0f424d8` |
| 5 Earn dock | done (merged, wired) | in `b205460a`; islands asked of L5a |
| 6 Goal Vaults + governance | done (merged, wired) | af/wallet merge; af/signing3 merge; `8443a1e3` |
| 7 Checklist | done (merged, wired); critique round at Gate C | merge `206a26c4`; wiring as Part 1; stage 10 `8bb65419` |
| 8 ZIGi | done (merged, wired); the real-model round after 25 Oct (owner) | merge `bf60a398`; `8537487b` |
| 9 My Universe, Day Timeline, Stories | done (merged, wired); critique round at Gate C | merge `35afad0e`; `8537487b` `133f8420` |
| 10 UI changes + theme parity | done (merged, wired); parity Chrome 51/51, WebKit 6/6; Gate C audits in three themes still to run | `3d507e9a` |
| 11 Leftovers A2–A4, A10, verifier stages, live-check | A2/A3 `4f92d3ff`, A4 `569f3b63`, A10 `95bca53d` `fec6385c` done; the Earn/Checklist stages and live-check come with their lanes | see left |
| 12 Words and help | done: What's new, Help (26 AF answers, search), Known limitations, PRIVACY, OWNER_ACCOUNTS; budgets `33193870` | `be68a4f7` `33193870` |
| Gate C | not started | — |

## Resume here (2026-10-19 13:45 Brussels — CI's WebKit findings fixed; design critique round 1 done; full Chromium suite running)
- Pushed `5fdad4ac`: `c1a273c3` (staking form re-reads a pre-fill, H120), `eec7c6e3` (CI run 39237963419's WebKit
  failures: uncaught chunk import H122, parity collected at rest H123, Settings rows; zigi-oneline-z's diagnostic now names
  the element), `546bbd24` (TIER 3 labels, H124: "PUBLIC ALPHA · NOTHING MOVES UNLESS YOU SIGN"), `5fdad4ac` (crit1 fixes,
  H125). Record: `docs/verification/session-af/design-critique-round-1.md`.
- Running: the full Chromium suite on `5fdad4ac` (3101; `$SP/logs/full-1.log`, `FULL_EXIT=` at the end; ≈ 2.5 h, holds the
  lock). Read it, fix, then push. CI on `5fdad4ac`: read its WebKit job (zigi-oneline-z at 320/768 with the sharper
  diagnostic; webkit-earn; webkit-theme-parity).
- Owner items found today: Light's gradient words' tails stay pastel by H111 (2.05–2.4:1 by day; "deepen the Light flow" is
  one hand-layer rule plus a parity class if the owner wants it); Today's market watch breaks words at 1440 and repeats
  figures (pre-existing, protected baseline).
- Next: the daily PR comment ~18:00; Gate C round 2 captures in clips ≤ 16,000 px (Earn's lower half was not reviewed);
  frozen readers and the revert gate when no build or browser runs.

## Resume here (2026-10-19 13:00 Brussels — every lane merged and wired; no helper running)
- Done since 12:15: L4 merged `bf60a398` and L5b merged `35afad0e`, wired (`8537487b` TIER 3 storage, `133f8420`);
  Part 12 `be68a4f7` (pushed 12:37); the owner-approved budget lines `33193870` (H96: eight routes measured on `be68a4f7`
  + 10 %; a unit guard pins AE's thirteen budgets as never raised); the staking form re-reads ZIGi's pre-fill when already
  open (L4's optional item; event name in `lib/af-signing-keys.ts`, spec in `zigi-earn-coach-af`); OWNER_ACCOUNTS says the
  WalletConnect ID also needs one CSP commit.
- Local Chromium integration run on `be68a4f7` (`$SP/logs/lead-integ5.log`, 244 cases): only `whats-new` failed (AE's
  links now under "Earlier updates"; moved at equal strength by nine positions).
- CI: `be68a4f7`'s Milestone quality queued behind `bf72baa0`'s; read its WebKit job (zigi-oneline-z diagnostic at 320 px,
  webkit-earn, webkit-smoke timing) before pushing over it, and push by 13:37 at the latest (hourly rule).
- Next: rebuild 3101, rerun the moved specs, push; the daily PR comment ~18:00; then the full Chromium suite in the
  background (H86) and the Gate C preparation (captures in three themes for the critique round; frozen readers; live-check).

## Resume here (2026-10-19 12:15 Brussels — after a session restart; L5a merged; L4 and L5b resumed)
- The Claude Code process exited at about 06:10 Brussels; L4 and L5b were stopped mid-task and resumed at 12:15 from their
  transcripts (their worktrees kept every change). If this happens again: `git -C .claude/worktrees/<agent> status`, then
  SendMessage to the agent id in `$SP/lanes.txt` to resume it; never spawn a duplicate.
- CI run 39188085528 on `8443a1e3` failed on: page-titles (5 new pages without rows), persona-x (a stale fold list),
  zigi-a11y-pass (a hidden Today card's aria-labelledby), webkit-earn (a lazy CSS chunk cancelled by navigation → unhandled
  ChunkLoadError + Trusted Types in Linux WebKit; the CI trace shows "Load request cancelled"), zigi-oneline-z in WebKit
  (Settings at 320 px: "Forget my staking choices" did not wrap with Linux fonts), webkit-smoke (a 45 s timeout in the
  Chrome shard). Fixed in `e30e49d0` `5fc84a33` and the uncommitted signing-section CSS; webkit-smoke timing to check.
- Merged L5a (`3d507e9a`); uncommitted until the spec run passes: Help's Light/Dark/sidebar answers, ADR H109–H113,
  regenerated theme sheets (Light 506,803 B / 64,122 B gzip; Dark 437,912 B / 61,263 B gzip).
- Next: commit and push once green; merge L4 and L5b as they report; Part 12; budgets; the daily PR comment ~18:00 today.

## Resume here (2026-10-19 04:00 Brussels — L1 and L2a finished; L5a, L4, L5b running)
- Done since 02:20: social card + metadata labels; L1 chunk 2 merged `b205460a` and wired (stage 9 `15a5a83b`; registry
  move H103 `288e037b`; Earn wiring + Today EARN card in For you H104 `20572134`); CI run 39180668121 (on `cb40492a`)
  failures fixed: Checklist "viewing writes nothing" `cbc8ce4f`, goal card menu under the sidebar `85f33940`, Staking reads
  no Valdora `eae1043e`, pinned counts/hash `e8b982f8`; L2a chunk 3 merged and wired (`8443a1e3`: storage, egress,
  Governance nav H108, Help, PRIVACY, ADR H105–H108). Unit 5707; lint 0 errors / 19 warnings; integration specs green.
  Pushed `8443a1e3`; CI running on it. The WebKit Earn ChunkLoadError/TrustedHTML from that CI run did not reproduce
  locally (3/3) on the newer page: if it recurs on `8443a1e3`, investigate (not a known intermittent).
- Running helpers (3, the cap): L5a (3102, also asked to add the Earn dock to ISLANDS), L4 ZIGi (3103), L5b extras (3104).
  No lane waits for a slot any more.
- Next: merge each as it reports (L5a: theme regeneration + parity; L4: zigi-plans key rows, Help; L5b: Today cards —
  keep Today ≤ 5.8 screens on a phone, nav/search for Timeline and Stories, keys, budgets). Then Part 12 (What's new,
  remaining Help, Known limitations), the budgets commit (H96), the daily PR comment ~18:00 Mon, freeze Fri 22:00, Gate C
  Sat 08:00.

## Resume here (2026-10-19 02:20 Brussels — L2b merged and wired; L2a chunk 3 started)
- Done since 01:50: Help's first AF answers `7ed163bc`; the L2b merge, then `68aa69b0` (WalletConnect notices without
  e-mail addresses, H101), `d19e8188` (TIER 3 storage), `c0f424d8` (TIER 3 egress: Ramp's API server-only; sanitizer;
  search Add money; About panel notice; PRIVACY; themes), `043946f7` (TIER 3 labels: "Contract execution is disabled",
  H100; H102 verifier origins unchanged). Unit 5611 + the guard fix; lint 0 errors / 19 warnings (the baseline; `.claude/**`
  ignored since `9497a70a`).
- Running helpers (3): L5a (3102), L1 chunk 2 (3103), L2a chunk 3 (3104). Next slots: L4 (ZIGi), then L5b (extras).
- Open lead items: move L2b's wallet link rows (`lib/wallets/links.ts`) into the verified registry after L1 chunk 2
  merges; mount L1's Today EARN card and the Earn/Checklist/Signing Settings sections as they arrive; budgets commit
  (H96: add-money 465,189 B and /back 462,270 B measured by L2b; earn; checklist; governance later); Part 12 list above.
- When the owner sets `reownProjectId`: one commit with the five WalletConnect hosts (L2b.md "What the lead must wire").

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
