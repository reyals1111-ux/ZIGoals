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
- A3-r1 fixes `3a264734` (question rule clause by clause, decline/refusal/prompt/router/tool-loop/scorer fixes, 70 case corrections; ADR N20). Feature 3 memory page `84b9f9a4` (TIER 3: `paused` on a note). Feature 1 HE17 ranges `d30033a0` (TIER 3: `zigoals:meal-estimates:v1`, ADR N21).
- A3-r2 running from `/Users/AIUSER/Documents/ZIGoals-Claude-ai-a3` at `3a264734` (Haiku cap $2, Sonnet cap $17; logs `<runs>/logs/a3-r2-*.log`). A2 baseline still running from the baseline worktree.

## Track A ledger total
$22.62 of $95 by ledger.mjs before A3-r2 (A2 baseline and A3-r2 still adding; rebuild with ledger.mjs before every run).

## Next step
Analyse A3-r2 when it ends; then features 2 (voice → J10), 4 (insights), 7–9, the mascot, G9/G10/G13/G14, then B3's list; Opus full-corpus pass and conversations 15/15×3 on Sonnet and Haiku before 31 Oct 12:00 UTC. Gaps kept: plan-meal pointing at a new recipe, the time zone in the today line, the meal-plan fixture.

## How to run a stage
`<runs>/scripts/stage.sh <checkout> <stage> <model> <sets> <cases> <cap>` (background with nohup; the harness reads the key file itself). Sets: `corpus` = typed, af, aa, spoken, ai. Check the ledger first: `node scripts/zigi/ledger.mjs --runs <runs> --cap 95 --check <forecast> --title 'Session AI'`.

## Open decisions
None.
