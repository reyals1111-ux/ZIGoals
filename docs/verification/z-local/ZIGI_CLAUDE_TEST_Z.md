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
_Rendered by `scripts/zigi/render-claude-doc.mjs` from 7 summary file(s) on 2026-10-10; the figures are the API's own usage fields at the dated price table._

| Stage | Model | Mode | Cases · turns | Pass | By kind | Per turn: input + cache write + cache read → output tokens | Per turn | Total | First token / total median ms |
|---|---|---|---:|---:|---|---|---:|---:|---:|
| Part 2 · the 20-case probe | `claude-sonnet-5-5` | tools | 20 · 22 | **19/22 · 86.4 %** | lookup [object Object] · propose [object Object] · brief [object Object] · unknown [object Object] · refuse [object Object] · multi [object Object] | 5 + 3,289 + 12,944 → 333 | $0.0129 | $0.23 | 810 / 2,900 |
| Part 3 · cache markers off | `claude-sonnet-5-5` | tools, no cache | 17 · 37 | **32/37 · 86.5 %** | chat [object Object] · propose [object Object] · multi [object Object] · followup [object Object] | 18,147 + 0 + 0 → 356 | $0.0399 | $1.47 | 1,485 / 3,250 |
| Part 3 · cache markers on | `claude-sonnet-5-5` | tools | 17 · 37 | **31/37 · 83.8 %** | chat [object Object] · propose [object Object] · multi [object Object] · followup [object Object] | 5 + 2,047 + 16,094 → 359 | $0.0103 | $0.38 | 1,411 / 3,346 |
| Part 3 · cache markers off | `claude-opus-5-5` | tools, no cache | 17 · 37 | **30/37 · 81.1 %** | chat [object Object] · propose [object Object] · multi [object Object] · followup [object Object] | 16,654 + 0 + 0 → 298 | $0.0726 | $2.69 | 2,086 / 4,078 |
| Part 3 · cache markers on | `claude-opus-5-5` | tools | 17 · 37 | **33/37 · 89.2 %** | chat [object Object] · propose [object Object] · multi [object Object] · followup [object Object] | 4 + 2,467 + 12,701 → 292 | $0.0207 | $0.77 | 1,673 / 3,161 |
| Part 2 · corpus ×1 | `claude-sonnet-5-5` | tools | 626 · 773 | **693/773 · 89.7 %** | lookup [object Object] · propose [object Object] · chat [object Object] · brief [object Object] · unknown [object Object] · refuse [object Object] · advice [object Object] · multi [object Object] · followup [object Object] · privacy [object Object] · injection [object Object] | 5 + 1,543 + 14,674 → 288 | $0.0082 | $5.94 | 812 / 2,650 |
| Part 2 · important ×2 | `claude-sonnet-5-5` | tools | 198 · 608 | **526/608 · 86.5 %** | lookup [object Object] · propose [object Object] · brief [object Object] · unknown [object Object] · refuse [object Object] · multi [object Object] · advice [object Object] · privacy [object Object] · chat [object Object] · injection [object Object] · local-first [object Object] | 5 + 1,951 + 17,965 → 338 | $0.0101 | $5.70 | 930 / 3,045 |

### Cost per 100 messages
| Model | Stage | Cost per 100 messages (one request each, cached prefix, quick reply) |
|---|---|---:|
| `claude-sonnet-5-5` | Part 2 · the 20-case probe | $1.29 |
| `claude-sonnet-5-5` | Part 3 · cache markers on | $1.03 |
| `claude-opus-5-5` | Part 3 · cache markers on | $2.07 |
| `claude-sonnet-5-5` | Part 2 · corpus ×1 | $0.82 |
| `claude-sonnet-5-5` | Part 2 · important ×2 | $1.01 |
<!-- tables:end -->

## Stages still to run in this round
UI panel (150 Sonnet, 150 Haiku, 60 Opus), the 15 conversations ×3, the day on desktop and phone (Sonnet), the pages
(17 × 10, Sonnet desktop and phone, Haiku desktop), the four photo plates ×3, the WebKit subset (60 Sonnet + 5
conversations), and the second half of the caching measurement. Each lands here as a rendered row when its summary is in.

## Recommendation per job
Filled when the round is complete (friends through the relay, budget, deep).

## Owner checklist rows (Part 9)
Filled with the owner material.
