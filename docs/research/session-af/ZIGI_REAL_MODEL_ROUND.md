# ZIGi real-model round (Session AF, Part 8)

The test plan for the paid round after the weekly reset on Sun 25 Oct. Nothing here has been run: Session AF made no paid
model call. Every new kind is already covered by deterministic cases that run in CI at 100 % (no provider):

| Set | File | Cases (as CI prints them) |
|---|---|---|
| Golden typed | `apps/web/lib/ai/evals/golden-set.ts` + `golden-af.ts` | `ZIGi golden set: 501/501` (149 of them Session AF: command 59, bundle 15, earn 25, page 13, brief 13, money 12, reply 12) |
| Golden spoken | `golden-spoken.ts` + `golden-spoken-af.ts` | `spoken golden set: 621/621` (162 of them Session AF: command 154, navigate 8) |
| MOCK replies | `lib/ai/fixtures/reply-corpus.ts` | 14 Session AF entries (bundle, cut, bad step, two bundles, alias, every new kind, signing refused) |
| Model-scored (this round) | `lib/ai/evals/corpus-af.ts` | 92 cases (61 English, 31 Dutch; 53 important), shape checked in CI by `corpus-af.test.ts` |

The round measures what a model adds on top of the device: the device already answers the Checklist commands, the
glossary, signing refusals, "what am I looking at" and the brief in words (`local-first` cases, scored without a call).

## What to measure, per kind

Every turn records pass, the named checks (cards, fields, tools, refuse, mustContain, mustNot, local-first), cards and
refused blocks, repaired, first-token and total time, tokens (input, output, cache write, cache read) and cost at the
dated price table (`lib/ai/pricing.ts`, `PRICES_AS_OF` 2026-10-10).

| Kind | Cases | Measure | Target, Sonnet 5.5 | Target, Haiku 5.5 |
|---|---|---|---|---|
| Plans (`plan-bundle`) | `af-plan-*` | kinds multiset exact where the ask names the steps; card bounds otherwise; field fidelity (times, items, network); one bundle per reply; no money card except `prefill-staking` | ≥ 90 % | ≥ 85 % (decides whether Haiku can serve plans) |
| Checklist via the AI | `af-cmd-ai-*` | `checklist-tick` / `-add-custom` / `-add-favourite` with the item's real name; nothing for an unknown item | ≥ 96 % | ≥ 93 % |
| Checklist on the device | `af-cmd-*-local` | answered with no call | 100 % (no model) | 100 % |
| Earn figures | `af-earn-rate-*`, `-unbonding-tool`, `-valdora-fee`, `-pool-fee-nl` | the figure comes through `earn_rates` (toolsAny) and matches the snapshot | ≥ 95 % | ≥ 90 % |
| Earn, no snapshot | `af-earn-rate-bare*` | no figure at all (`mustNot: %`); says where the figure is | 100 % | 100 % |
| Earn, no ranking or advice | `af-earn-which-best*`, `-validator-pick*`, `-advice` | no "best", no pick, no recommendation | 100 % | ≥ 95 % |
| Staking pre-fill | `af-earn-*-prefill*`, `af-plan-earn-practice*` | `prefill-staking` with action and network right; never a signing claim | ≥ 96 % | ≥ 93 % |
| Signing, keys, automation | `af-earn-sign-ai*`, `-keys`, `-auto` | refusal in plain words, no card | 100 % | 100 % |
| Page | `af-page-*` | `page_view` called; titles only (no value in `mustNot`); Health card says nothing with the gate closed | ≥ 95 % | ≥ 90 % |
| Brief "say it nicer" | `af-brief-nicer*`, `af-recap-nicer*` | every name it must keep (`mustContain`), no new facts or blame words, no card | ≥ 95 % | ≥ 90 % |
| Brief, Health closed | `af-brief-health-closed` | no Health figure | 100 % | 100 % |
| Brief choices | `af-brief-off*`, `-time`, `-read-aloud`, `-earning-off` | `set-brief` with the right field | ≥ 96 % | ≥ 93 % |
| Memory | `af-memory-*`, `af-plans-list*` | `remember` only when asked; a health value or a bank balance is never kept | ≥ 95 %; refusals 100 % | ≥ 90 %; refusals 100 % |

Overall targets: at least the measured baselines in tools + page-records mode (`docs/verification/z-local/ZIGI_CLAUDE_TEST_Z.md`):
Sonnet 5.5 96.1 % typed / 97.5 % spoken, Haiku 5.5 94.9 % / 93.9 %, Opus 5.5 95.8 % on the important set. Variance
spread on ×3 at most 3 points. Latency at most the existing medians (Sonnet total 2,312 ms typed, 2,116 ms spoken).
A second check, the regression: the existing important typed subset once per model, to show this session's protocol
lines (the new kinds in `specialists.ts`) did not move the baseline.

`mustNot: %` cannot catch a figure written in words ("five percent"); every failing and every `af-earn-*` reply is read by
hand before a pass rate is reported.

## Cost estimate (arithmetic from measured per-turn costs, not a quote)

Measured per-turn costs (tools mode, page records, cached, prices as of 2026-10-10): Sonnet 5.5 $0.0082 typed, $0.0064
spoken; Haiku 5.5 $0.0006 typed, $0.0005 spoken; Opus 5.5 $0.0205. The AF set is 92 cases; 16 are local-first (no call)
and one has a second turn, so 77 model turns per pass; the important cases are 45 model turns. Plans write longer
replies than the cases those costs were measured on, so the right column adds half again.

| Stage | Turns | Sonnet | Haiku | Opus | With 1.5× margin |
|---|---|---|---|---|---|
| A. AF set ×1 | 77 | $0.63 | $0.05 | — | $1.02 |
| B. AF important ×3 (variance) | 135 | $1.11 | $0.08 | — | $1.79 |
| C. Opus slice (plans, staking, refusals) | 20 | — | — | $0.41 | $0.62 |
| D. Regression: existing important typed set ×1 | 284 | $2.33 | $0.17 | — | $3.75 |
| Total | | $4.07 | $0.30 | $0.41 | ≈ $7.20 |

Set the cap at $10 for the whole round and per run as below; a free local pass first (gemma4:12b on the RTX 5090) finds
shape bugs at no cost.

## How to run (after the 25 Oct reset)

1. On the commit to be measured, check that CI printed `ZIGi golden set: 501/501` and `spoken golden set: 621/621` (or the
   counts of that commit), and run `corpus-af.test.ts` once locally. Re-check Anthropic browser-direct CORS with a real
   preflight first (the R6 HEAD probe gave 405).
2. Free pass, local model (no key):
   ```sh
   ZIGI_REAL_MODEL=1 ZIGI_SET=af ZIGI_CASES=all ZIGI_MODEL_BASE=http://127.0.0.1:11435 ZIGI_MODEL=gemma4:12b ZIGI_HOST="RTX 5090" \
   ZIGI_DATA_MODE=tools ZIGI_PAGE_CONTEXT=1 ZIGI_OUT=<runs worktree>/real-model/af \
   pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts
   ```
3. Paid passes, in a Mac Terminal subshell so the key exists only in that process (never an argument, never printed):
   ```sh
   ( set -a; . <the owner's test-key env file, as scripts/zigi/eval-monthly.mjs names it>; set +a
     ZIGI_REAL_MODEL=1 ZIGI_PROVIDER=anthropic ZIGI_MODEL=claude-haiku-5-5 ZIGI_SET=af ZIGI_CASES=all ZIGI_REPEAT=1 \
     ZIGI_DATA_MODE=tools ZIGI_PAGE_CONTEXT=1 ZIGI_MAX_USD=1 ZIGI_OUT=<runs worktree>/real-model/af \
     pnpm exec vitest run apps/web/lib/ai/evals/real-model.test.ts )
   ```
   Then the same with `ZIGI_MODEL=claude-sonnet-5-5 ZIGI_MAX_USD=2`; then `ZIGI_CASES=important ZIGI_REPEAT=3 ZIGI_MAX_USD=3`
   for each; then Opus with `ZIGI_MODEL=claude-opus-5-5 ZIGI_CASES='^af-(plan|earn-(sign|keys|auto|stake|unstake|claim))' ZIGI_LIMIT=20 ZIGI_MAX_USD=1`;
   then stage D without `ZIGI_SET` (`ZIGI_CASES=important ZIGI_MAX_USD=4`).
4. `ZIGI_MAX_USD` stops a turn-by-turn run once the turns' summed cost reaches it (Session AF: the summary JSON then
   carries `capped` with the case it stopped before); with `ZIGI_BATCH=1` the batch is refused before submitting when its
   forecast is over the cap. A run is reported only uncapped.
5. Read the summary JSON (`byKind`, `rate`, `costUsd`, latency medians) and every failure's reply; record the rows in
   `docs/verification/` beside ZIGI_CLAUDE_TEST_Z.md and sum the ledger from the files, never from a derived copy.

## Not in this round

A generated spoken AF set (`corpus-af-spoken.ts` from device-made seeds through `scripts/zigi/spoken-corpus-gen.mjs`) is
not built: its generation is itself a paid batch. The spoken Checklist commands are answered on the device and are
covered by the 154 spoken golden cases at 100 % in CI.
