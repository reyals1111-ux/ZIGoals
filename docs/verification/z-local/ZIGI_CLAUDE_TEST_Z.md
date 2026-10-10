# ZIGi on real Claude models — Session Z-Local, Part 2

The first round of ZIGi's brain on Anthropic's own models (Claude Haiku 5.5, Claude Sonnet 5.5, Claude Opus 5.5), on the
owner's test key, with the API's own usage fields as the only source of cost. Every run is the same harness and the same
scorer as the local-model rounds (`lib/ai/evals/real-model.test.ts`, `score.ts`; X-Local's numbers for gemma4, qwen3.8,
qwen3.6 and phi4-mini stand beside these for comparison). Fictional Showcase records only. Raw run files live on the
orphan branch `review/session-z-local-runs`; the summary files on this branch under `real-model/summaries/` are what the
tables below are rendered from (`scripts/zigi/render-claude-doc.mjs`), never typed. The ledger (`ledger.md` on the runs
branch) is the spend against the $130 cap; prices as in `lib/ai/pricing.ts` (as of 2026-10-10).

## How a run is made
- **The pipeline:** the page's specialist system prompt, the question-aware context (the records the question names),
  the read-only tool loop (tools mode) or the records attached (attach mode), the whitelist parser, the app's one bounded
  repair round, the day and quantity cues; the same code the app runs.
- **Prompt caching (Part 3, ADR-020 L3):** the stable prefix of the system prompt and the page's records carry cache
  markers; the quick reply runs at `effort: low`, "Think deeper" at `high`; thinking is never disabled. The before/after
  measurement below is the proof.
- **Counting:** input, cache-write and cache-read tokens and output tokens (thinking tokens are output) per request,
  summed per turn with the tool rounds and the repair round; cost from the dated price table; latency as time to first
  token and total time per turn.
- **Two pass counts per row:** "then" is the count the run wrote with the scorer and corpus of that moment; "re-scored
  now" is the same stored replies under the scorer and corpus as they are at the end of the session
  (`lib/ai/evals/rescore.test.ts`: the oracle corrections and scorer fixes of Part 6, listed in ADR-020, over the turns
  still in the corpus after French went). A fix round is judged on the re-scored column before anything is re-run.
- **Page records:** this round's corpus stages sent the question's records only (as every round before); the Part 6 runs
  send the page's own records with stable handles on every turn as the app does (`ZIGI_PAGE_CONTEXT=1`, ADR-020 L23),
  and say so in the Mode column.
- **The corpus during this round:** the typed corpus was 626 cases (773 turns) when the Sonnet corpus run started; Part 5
  added 60 cases during the round, so later stages ran on the grown corpus (the row says the count it saw). The important
  set grew from 172 to 198 the same way.

## The before/after caching measurement (Part 3, ADR-020 L11)
Every multi-turn case of the corpus, first half (17 cases, 37 turns), in corpus order, cache markers off then on, on
Sonnet and Opus; the second half (16 cases, 143 turns) follows the corpus stages, the ledger permitting.
`scripts/zigi/cache-compare.mjs` renders these rows from the two run files of each pair.

| Model | Turns | Cache markers | Pass | Requests | Input + cache write + cache read tokens | Input cost | Total cost | Input cost lower by |
|---|---:|---|---:|---:|---|---:|---:|---:|
| `claude-sonnet-5-5` | 37 | off | 32/37 | 51 | 671,423 + 0 + 0 | $1.3428 | $1.4745 | — |
| `claude-sonnet-5-5` | 37 | on | 31/37 | 51 | 188 + 75,732 + 595,475 | $0.2493 | $0.3820 | **81.4 %** |
| `claude-opus-5-5` | 37 | off | 30/37 | 47 | 616,187 + 0 + 0 | $2.4647 | $2.6856 | — |
| `claude-opus-5-5` | 37 | on | 33/37 | 43 | 166 + 91,264 + 469,934 | $0.5510 | $0.7670 | **77.6 %** |

The bar was 40 % lower input cost with identical scores: the input cost fell by 81 % on Sonnet and 78 % on Opus, and the
scores moved by one to three turns of 37 in either direction, inside the run-to-run spread the variance stages show.
After the first request on a page, every later request read about 12,000 to 17,000 tokens of stable prefix from the
cache and wrote only the question's own records; the uncached remainder was 4 to 12 tokens per request.

## The runs
<!-- tables:start -->
_Rendered by `scripts/zigi/render-claude-doc.mjs` from 16 summary file(s) on 2026-10-10; the figures are the API's own usage fields at the dated price table._

| Stage | Model | Mode | Cases · turns | Pass (then) | Pass re-scored now (turns still in the corpus) | By kind | Per turn: input + cache write + cache read → output tokens | Per turn | Total | First token / total median ms |
|---|---|---|---:|---:|---:|---|---|---:|---:|---:|
| Part 2 · the 20-case probe | `claude-sonnet-5-5` | tools | 20 · 22 | **19/22 · 86.4 %** | 19/22 | lookup 7/7 · propose 6/6 · brief 2/2 · unknown 1/1 · refuse 3/3 · multi 0/3 | 5 + 3,289 + 12,944 → 333 | $0.0129 | $0.23 | 810 / 2,900 |
| Part 3 · cache markers off | `claude-sonnet-5-5` | tools, no cache | 17 · 37 | **32/37 · 86.5 %** | 29/34 | chat 1/1 · propose 2/3 · multi 2/3 · followup 27/30 | 18,147 + 0 + 0 → 356 | $0.0399 | $1.47 | 1,485 / 3,250 |
| Part 3 · cache markers on | `claude-sonnet-5-5` | tools | 17 · 37 | **31/37 · 83.8 %** | 28/34 | chat 1/1 · propose 2/3 · multi 1/3 · followup 27/30 | 5 + 2,047 + 16,094 → 359 | $0.0103 | $0.38 | 1,411 / 3,346 |
| Part 3 · cache markers off | `claude-opus-5-5` | tools, no cache | 17 · 37 | **30/37 · 81.1 %** | 27/34 | chat 1/1 · propose 2/3 · multi 1/3 · followup 26/30 | 16,654 + 0 + 0 → 298 | $0.0726 | $2.69 | 2,086 / 4,078 |
| Part 3 · cache markers on | `claude-opus-5-5` | tools | 17 · 37 | **33/37 · 89.2 %** | 30/34 | chat 1/1 · propose 2/3 · multi 2/3 · followup 28/30 | 4 + 2,467 + 12,701 → 292 | $0.0207 | $0.77 | 1,673 / 3,161 |
| Part 2 · corpus ×1 | `claude-sonnet-5-5` | tools | 626 · 773 | **693/773 · 89.7 %** | 594/667 | lookup 117/120 · propose 210/232 · chat 40/46 · brief 27/29 · unknown 12/15 · refuse 53/57 · advice 9/13 · multi 153/183 · followup 41/45 · privacy 12/13 · injection 19/20 | 5 + 1,543 + 14,674 → 288 | $0.0082 | $5.94 | 812 / 2,650 |
| Part 2 · important ×2 | `claude-sonnet-5-5` | tools | 198 · 608 | **526/608 · 86.5 %** | 501/568 | lookup 50/52 · propose 147/162 · brief 17/18 · unknown 2/2 · refuse 40/46 · multi 215/264 · advice 2/8 · privacy 16/16 · chat 16/18 · injection 17/18 · local-first 4/4 | 5 + 1,951 + 17,965 → 338 | $0.0101 | $5.70 | 930 / 3,045 |
| Part 2 · corpus ×3 | `claude-haiku-5-5` | tools | 684 · 2,493 | **2182/2493 · 87.5 %** | 1928/2175 | lookup 352/360 · propose 756/867 · chat 124/138 · brief 82/87 · unknown 38/45 · refuse 140/162 · advice 26/39 · multi 432/549 · followup 127/135 · privacy 36/39 · injection 57/60 · local-first 12/12 | 5 + 995 + 18,280 → 400 | $0.0005 | $1.18 | 1,640 / 2,321 |
| Part 6 · local, qwen36-mac | `qwen3.6:35b-a3b` | tools | 595 · 725 | **578/725 · 79.7 %** | — | lookup 92/93 · propose 188/246 · chat 35/42 · brief 25/27 · unknown 12/14 · refuse 44/52 · advice 8/11 · multi 108/162 · followup 34/43 · privacy 11/12 · injection 17/19 · local-first 4/4 | 11,559 + 0 + 0 → 88 | — | — | 2,690 / 5,932 |
| Part 2 · corpus ×1 | `claude-opus-5-5` | tools | 595 · 725 | **665/725 · 91.7 %** | 666/725 | lookup 92/93 · propose 226/246 · chat 38/42 · brief 27/27 · unknown 13/14 · refuse 45/52 · advice 11/11 · multi 138/162 · followup 41/43 · privacy 12/12 · injection 18/19 · local-first 4/4 | 4 + 1,564 + 16,482 → 291 | $0.0170 | $11.37 | 2,033 / 3,750 |

### Cost per 100 messages
| Model | Stage | Cost per 100 messages (one request each, cached prefix, quick reply) |
|---|---|---:|
| `claude-sonnet-5-5` | Part 2 · the 20-case probe | $1.29 |
| `claude-sonnet-5-5` | Part 3 · cache markers on | $1.03 |
| `claude-opus-5-5` | Part 3 · cache markers on | $2.07 |
| `claude-sonnet-5-5` | Part 2 · corpus ×1 | $0.82 |
| `claude-sonnet-5-5` | Part 2 · important ×2 | $1.01 |
| `claude-haiku-5-5` | Part 2 · corpus ×3 | $0.05 |
| `qwen3.6:35b-a3b` | Part 6 · local, qwen36-mac | $0.00 |
| `claude-opus-5-5` | Part 2 · corpus ×1 | $1.70 |

### The UI stages (the real panel)
| Stage | Model | Browser · project | Pass | Median ms | Errors | Cost |
|---|---|---|---:|---:|---:|---:|
| ui-conv-haiku | `claude-haiku-5-5` | Chrome · desktop | **15/15 · 100.0 %** | 3,689 | 0 | $0.02 |
| ui-conv-opus | `claude-opus-5-5` | Chrome · desktop | **15/15 · 100.0 %** | 5,866 | 0 | $0.56 |
| ui-conv-sonnet | `claude-sonnet-5-5` | Chrome · desktop | **15/15 · 100.0 %** | 4,046 | 0 | $0.27 |
| ui-day-sonnet | `claude-sonnet-5-5` | Chrome · desktop | **18/18 · 100.0 %** | 2,263 | 0 | $0.18 |
| ui-day-sonnet | `claude-sonnet-5-5` | Chrome · mobile | **18/18 · 100.0 %** | 2,019 | 0 | $0.27 |
| ui-panel-haiku | `claude-haiku-5-5` | Chrome · desktop | **125/150 · 83.3 %** | 2,287 | 0 | $0.07 |
| ui-panel-sonnet | `claude-sonnet-5-5` | Chrome · desktop | **121/150 · 80.7 %** | 2,766 | 0 | $1.03 |
<!-- tables:end -->

## Stages still to run in this round
UI panel (150 Sonnet, 150 Haiku, 60 Opus), the 15 conversations ×3, the day on desktop and phone (Sonnet), the pages
(17 × 10, Sonnet desktop and phone, Haiku desktop), the four photo plates ×3, the WebKit subset (60 Sonnet + 5
conversations), and the second half of the caching measurement. Each lands here as a rendered row when its summary is in.

## The targets (Part 6)
<!-- targets:start -->
_Rendered by `scripts/zigi/targets.mjs` on 2026-10-10 from 16 summary file(s): 4 met · 6 not met · 15 not run yet. A run with the page records (the app's own shape) is preferred over one without; the latest wins._

| Target | Result | Verdict | Evidence |
|---|---:|---|---|
| Sonnet · corpus (typed) ≥ 97 % | 693/773 · 89.7 % | not met, 7.3 pt short; misses: cards 51, never 10, fields 9, contains 6, no-numbers 5 | `corpus/anthropic-api-claude-sonnet-5-5-tools-all-2026-10-10T15-17-18-583Z.json` |
| Sonnet · the spoken set ≥ 95 % | — | not run yet | — |
| Sonnet · UI panel 150 ≥ 95 % | 121/150 · 80.7 % | not met, 14.3 pt short | `ui-panel-sonnet/ui-claude-sonnet-5-5.json` |
| Sonnet · 15 conversations ×3: 15/15 | 15/15 · 100.0 % | **met** | `ui-conv-sonnet/conversations-claude-sonnet-5-5.json` |
| Sonnet · the day, desktop + phone: 36/36 | 36/36 · 100.0 % | **met** | `ui-day-sonnet/day-in-the-life-claude-sonnet-5-5.json` |
| Sonnet · pages 17 × 10 ≥ 99 % | — | not run yet | — |
| Sonnet · four photo plates ×3: 4/4 | — | not run yet | — |
| Sonnet · WebKit subset (60 panel + 5 conversations), reported | — | not run yet | — |
| Sonnet · important ×2 variance (spread between repeats) | 526/608 · 86.5 % · spread 0.0 pt (86.5 % / 86.5 %) | reported | `variance/anthropic-api-claude-sonnet-5-5-tools-important-2026-10-10T15-56-21-271Z.json` |
| Haiku · corpus ≥ 92 % | 2182/2493 · 87.5 % | not met, 4.5 pt short; misses: cards 238, fields 62, never 26, refusal 18, schema 18 | `corpus/anthropic-api-claude-haiku-5-5-tools-all-2026-10-10T16-30-17-356Z.json` |
| Haiku · the spoken set ≥ 92 % | — | not run yet | — |
| Haiku · UI panel 150 ≥ 92 % | 125/150 · 83.3 % | not met, 8.7 pt short | `ui-panel-haiku/ui-claude-haiku-5-5.json` |
| Haiku · pages 17 × 10 (desktop) ≥ 92 % | — | not run yet | — |
| Opus · corpus ≥ 97 % | 665/725 · 91.7 % | not met, 5.3 pt short; misses: cards 49, fields 8, refusal 7, never 4, schema 3 | `corpus/anthropic-api-claude-opus-5-5-tools-all-2026-10-10T18-20-43-132Z.json` |
| Opus · important set ≥ 97 % (the re-run after the fix rounds) | — | not run yet | — |
| Opus · UI panel 60 ≥ 97 % | — | not run yet | — |
| qwen3.8 (RTX 5090) ≥ 90 % | — | not run yet | — |
| qwen3.6 (RTX 5090) ≥ 85 % | — | not run yet | — |
| qwen3.6 (Mac M1 Max) ≥ 85 % | 578/725 · 79.7 % | not met, 5.3 pt short; misses: cards 114, fields 43, schema 31, refusal 8, tool 6 | `qwen36-mac/mac-m1-max-qwen3.6-35b-a3b-tools-all-2026-10-10T17-21-51-599Z.json` |
| gemma4 (RTX 5090) ≥ 89 % | — | not run yet | — |
| gemma4 · the spoken set, reported | — | not run yet | — |
| phi4-mini (RTX 5090), reported (X-Local: 61 %) | — | not run yet | — |
| gemma4 · important ×3 variance (spread) | — | not run yet | — |
| qwen3.8 · important ×3 variance (spread) | — | not run yet | — |
| Golden set (272, byte-identical) 100 % | 272/272 · 100.0 % | **met** | `vitest (CI: web checks)` |
| Golden spoken set 100 % | 397/397 · 100.0 % | **met** | `vitest (CI: web checks)` |
<!-- targets:end -->

## Recommendation per job
Filled when the round is complete (friends through the relay, budget, deep).

## Owner checklist rows (Part 9): Claude on the phone and on the Mac
What a real phone and a real Mac prove that the harness and Chrome cannot: the keyboard, dictation by the system, the
installed app, Safari's own WebKit. Connect ZIGi to your own Anthropic key first (Settings → ZIGi · your AI → Anthropic,
Claude Sonnet 5.5; "Remember on this device" is your choice), load the Showcase, and tick:

| # | Where | Check | Pass looks like |
|---|---|---|---|
| 1 | iPhone, Safari and the home-screen app | Open Today, tap ZIGi, ask "two glasses of water" | one card in under four seconds; **Add**; the water figure on Today moves; Undo in the toast works |
| 2 | iPhone | Hold the microphone (browser speech recognition on) and say "um, log two and a half litres of water, no wait, three" | the words appear as you said them; the card says 3 litres (3,000 mL); nothing is sent before you release |
| 3 | iPhone | Say in Dutch: "ik heb vanmorgen vijfentwintig minuten gemediteerd" | a meditation card with 25 minutes for today; the reply in Dutch |
| 4 | iPhone | Ask "how many steps did I walk this week?" | an answer from your records with the week's figure; no card; the usage meter (Settings → ZIGi · your AI) shows the turn's cache read |
| 5 | iPhone | Ask "delete my Walk habit" | one card that opens the habit's own delete confirmation on Habits; nothing deleted until you confirm there; **Cancel** leaves it |
| 6 | iPhone | Ask "put 200 euros towards the Japan adventure goal" | the goal's Fund form opens filled in with 200; nothing recorded until you save; close it and nothing changed |
| 7 | iPhone | Switch Health sharing off (Settings → Pages shared with ZIGi), ask "log my weight, 72 kilos" | a refusal in words that names the Health gate; no card; switch it back on and ask again: a weight card that always waits for your tap |
| 8 | Mac, Safari | Ask ZIGi twice after an Undo (ask for water, Add, Undo, then ask two more things) | ZIGi keeps answering both; no frozen page, no stuck "thinking" (the WebKit case of Part 1) |
| 9 | Mac, Safari | Open the panel, press Stop while a long answer streams, then ask again | the first answer stays as far as it got, no marker text shown; the next answer arrives normally |
| 10 | Mac or iPhone | Settings → ZIGi · your AI → the usage meter after ten asks | input, output, cache writes and cache reads all counted; the estimate from your own prices, never a built-in price |
