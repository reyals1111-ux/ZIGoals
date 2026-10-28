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
- A2 baseline: running from the worktree `/Users/AIUSER/Documents/ZIGoals-Claude-ai-baseline` (detached at `2382bb72`, packages symlinked), `stage.sh` in the runs folder; logs in `logs/a2-baseline-*.log`.

## Track A ledger total
$0.005 of $95 after A1 (A2 running: forecasts $0.90 Haiku, ≤ $15.68 Sonnet).

## Next step
B1 group 1 (numbers and answer-vs-change: ZI1/G1, ZI3/G7, ZI12, G11) in the main checkout while A2 runs; then the photo baseline on three models (`photo-model.test.ts`, ZIGI_PHOTOS=<runs>/photos).

## How to run a stage
`<runs>/scripts/stage.sh <checkout> <stage> <model> <sets> <cases> <cap>` (background with nohup; the harness reads the key file itself). Sets: `corpus` = typed, af, aa, spoken, ai. Check the ledger first: `node scripts/zigi/ledger.mjs --runs <runs> --cap 95 --check <forecast> --title 'Session AI'`.

## Open decisions
None.
