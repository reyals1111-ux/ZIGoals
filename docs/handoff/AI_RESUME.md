# Session AI — resume file
Read this first when resuming in a fresh workspace; then ADR-034 and the approved plan's summary below.

## How to resume in a fresh workspace
1. `cd /Users/AIUSER/Documents/ZIGoals-Claude && git fetch origin && git checkout feature/session-ai-zigi && git pull --ff-only origin feature/session-ai-zigi`.
2. Check `caffeinate` is alive (`pgrep -fl caffeinate`); if not: `nohup caffeinate -dims >/dev/null 2>&1 &`.
3. Runs folder: `/Users/AIUSER/Documents/ZIGoals-Claude-ai-runs` (mode 700, outside the repo). The owner's scope file is there as `AI_SCOPE.md` (read-only, never commit).
4. Ledger: `node scripts/zigi/ledger.mjs --runs /Users/AIUSER/Documents/ZIGoals-Claude-ai-runs --cap 95` (rebuilt from run files; never typed by hand). Any Batch still running: its id is in the runs folder's `batches/` notes.
5. Servers: `nohup` on :3102–3104 with logs in the scratchpad; Chromium headless only, at most 2 workers, one run at a time. No `timeout` binary: `perl -e 'alarm 900; exec @ARGV' <cmd>`.

## The plan (approved 28 Oct, with owner amendments 1–4)
- Part 0 records → A1 harness → A2 baseline (Haiku + Sonnet, full corpus, batch) → B1 ZIGi fixes in 7 commit groups, a full re-run on Sonnet + Haiku after each → B2 research, nine features, mascot → B3 upgrade list and competitor gaps → A4 final round → B4 sweep → reports, STATUS, CI green, PR out of Draft.
- Promotional credit ($83.74) must be spent by 31 Oct 12:00 UTC (aim $70–80, usefully); after it at most $11.30 (cap $95, reserve $7).

## Rules while working
- Key: only the harness reads `~/.config/zigoals/anthropic-test.env`; never in a shell, a log, a file or a commit. Key sweep before every push.
- One builder; helpers (≤ 3) for research, eval cases, failure analysis and tests only.
- Every stored-format change: additive, TIER 3 (stored format), frozen readers #37–#50.
- Push at least every 45 minutes; update this file after every push.

## Done
- Part 0: STATUS records (AH, AH-FIX, Alpha #50), ADR-034, this file, the ledger file, Draft PR #97 (`215d3b11`).
- A1: the harness (`7966bc23`), the WebKit install cache, TIER 3 (CI) (`2931755a`), the 298 depth cases (`2382bb72`). Research: COMPETITORS.md, EXCHANGES.md. 15 real photos in the runs folder (`photos/`, licences in SOURCES.md).
- A2 baseline: from the worktree `/Users/AIUSER/Documents/ZIGoals-Claude-ai-baseline` (detached at `2382bb72`); photos done on 3 models (Sonnet 30/30, Opus 28/30, Haiku 26/30; the not-food check was then widened).
- B1 all seven groups: `83055397` (numbers, answer vs change, device answers), group 2 (fallbacks, G6 set, chip gate script, exact names, typos, follow-ups, 15k input), `cef4c63e` (groups 3–4: setup, settings, guardrails, tone, G12), `4b8d0e41` (zigi-knock), `b0ecc8db` (J10 one line).
- A3-r1 (from the worktree `/Users/AIUSER/Documents/ZIGoals-Claude-ai-a3` at `cef4c63e`): Sonnet 1947/2089 (93.2 %), Haiku 1907/2089 (91.3 %). Failure analysis by a helper: `<runs>/analysis/a3-r1-failures.md`.
- B3/feature 5: the expense log, TIER 3 (stored format) `7f9bedb7` (Wealth → Spending, ZIGi cards and spending tool, money recap). Feature 6 journal + daily energy `f45597e6`.
- A3-r1 fixes `3a264734`; memory page `84b9f9a4`; HE17 ranges `d30033a0`; voice `2ad899bc`; insights `1b4f69fa`; G9 + daily check-in `d7c6404e`; Life review values + G13 `68011a64`; linked plans `1a410b29`; mascot (personality, celebrate once) `1a161a3d`.
- A3-r2: Sonnet 96.8 %, Haiku 95.3 % (analysis `<runs>/analysis/a3-r2-failures.md`); fixes `7e751764`, case corrections `562627ea`, chip gate + G10 `95253fa2`, UI key file `f46cab1c`.
- Conversations 15/15 × 3 on both models through the UI (45/45 each; `<runs>/real-model/a3-conv`).
- B3: MO4 `12f444dd` (TIER 3 deploy config), sick/rest days `e75317e2`, tasks + J15 + WE20 + SE5 `b0e44cb2` (TIER 3 stored), WE21 + CO6 + share card + focus `c87be1d3`.
- A3-r3 done (Sonnet 97.4 %, Haiku 96.2 %) from `/Users/AIUSER/Documents/ZIGoals-Claude-ai-a3` at `c87be1d3`.
- B3 rest: J14 exchanges `9fb4812f` (TIER 3), SE3 + week grid `966cd39c`, G14 `d46e7b9d`, CI fixes `a3e3cb2b`, feature cases + fixes `7e44d275`.
- A4 (from the a3 worktree at `6f81275b`): Sonnet 2080/2126 (97.8 %), Haiku 2052/2126 (96.5 %), Opus typed 771/787 (98.0 %); Opus af+spoken and ai+g6 running; photos Opus 28/30 after the parser fix (`a4-photos-r2`).
- Harness/ledger: unique direct-record names `6f81275b`; ledger prices a batch per request `f7db1e10` (Haiku had been overstated ~5×); ZI6 Enter + short window, ZI3 tied streaks `1d9cc60d`; expense currency rule `5326355e`.

## Track A ledger total
$57.74 of $95 by ledger.mjs at the A4 Opus launch (rebuild with ledger.mjs before every run).

## Next step
Opus A4 pieces to finish; re-run the ai-f cases ×3 on Haiku and Sonnet after `5326355e`; failure analysis; REAL_MODEL_ROUND_AI.md and API_LEDGER.md (from `<runs>/ledger.md`); ADR closing table (draft in the scratchpad from a helper) and N39+; full local suite on the prod build (running); CI green; STATUS; PR out of Draft. Never `pnpm install` inside a run worktree: they share the main checkout's node_modules.

## How to run a stage
`<runs>/scripts/stage.sh <checkout> <stage> <model> <sets> <cases> <cap>` (background with nohup; the harness reads the key file itself). Sets: `corpus` = typed, af, aa, spoken, ai. Check the ledger first: `node scripts/zigi/ledger.mjs --runs <runs> --cap 95 --check <forecast> --title 'Session AI'`.

## Open decisions
None.
