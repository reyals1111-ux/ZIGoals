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
Sonnet and Opus; the second half (19 cases, 130 turns) follows the corpus stages, the ledger permitting.
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

**The second half (19 cases, 130 turns), run after the corpus stages (the ledger permitted it):**

| Model | Turns | Cache markers | Pass | Requests | Input + cache write + cache read tokens | Input cost | Total cost | Input cost lower by |
|---|---:|---|---:|---:|---|---:|---:|---:|
| `claude-sonnet-5-5` | 130 | off | 117/130 | 158 | 2,733,013 + 0 + 0 | $5.4660 | $5.8943 | — |
| `claude-sonnet-5-5` | 130 | on | 118/130 | 161 | 594 + 356,286 + 2,450,769 | $1.1370 | $1.5905 | **79.2 %** |
| `claude-opus-5-5` | 130 | off | 122/130 | 144 | 2,488,190 + 0 + 0 | $9.9528 | $10.7309 | — |
| `claude-opus-5-5` | 130 | on | 121/130 | 148 | 562 + 321,284 + 2,218,709 | $2.0524 | $2.7932 | **79.4 %** |

On the longer conversations the saving holds: 79 % lower input cost on Sonnet and on Opus at the same score (one turn of 130
apart on each). Over both halves (167 turns a model) the input cost fell by about 80 % on Sonnet and 79 % on Opus.

## The runs
<!-- tables:start -->
_Rendered by `scripts/zigi/render-claude-doc.mjs` from 53 summary file(s) on 2026-10-11; the figures are the API's own usage fields at the dated price table._

| Stage | Model | Mode | Cases · turns | Pass (then) | Pass re-scored now (turns still in the corpus) | By kind | Per turn: input + cache write + cache read → output tokens | Per turn | Total | First token / total median ms |
|---|---|---|---:|---:|---:|---|---|---:|---:|---:|
| run | `claude-sonnet-5-5` | undefined | — · — | **undefined/undefined · —** | — |  | 0 + 0 + 0 → 0 | — | — | — / — |
| Part 2 · the 20-case probe | `claude-sonnet-5-5` | tools | 20 · 22 | **19/22 · 86.4 %** | 19/22 | lookup 7/7 · propose 6/6 · brief 2/2 · unknown 1/1 · refuse 3/3 · multi 0/3 | 5 + 3,289 + 12,944 → 333 | $0.0129 | $0.23 | 810 / 2,900 |
| Part 3 · cache markers off | `claude-sonnet-5-5` | tools, no cache | 17 · 37 | **32/37 · 86.5 %** | 29/34 | chat 1/1 · propose 2/3 · multi 2/3 · followup 27/30 | 18,147 + 0 + 0 → 356 | $0.0399 | $1.47 | 1,485 / 3,250 |
| Part 3 · cache markers on | `claude-sonnet-5-5` | tools | 17 · 37 | **31/37 · 83.8 %** | 28/34 | chat 1/1 · propose 2/3 · multi 1/3 · followup 27/30 | 5 + 2,047 + 16,094 → 359 | $0.0103 | $0.38 | 1,411 / 3,346 |
| Part 3 · cache markers off | `claude-opus-5-5` | tools, no cache | 17 · 37 | **30/37 · 81.1 %** | 27/34 | chat 1/1 · propose 2/3 · multi 1/3 · followup 26/30 | 16,654 + 0 + 0 → 298 | $0.0726 | $2.69 | 2,086 / 4,078 |
| Part 3 · cache markers on | `claude-opus-5-5` | tools | 17 · 37 | **33/37 · 89.2 %** | 30/34 | chat 1/1 · propose 2/3 · multi 2/3 · followup 28/30 | 4 + 2,467 + 12,701 → 292 | $0.0207 | $0.77 | 1,673 / 3,161 |
| Part 2 · corpus ×1 | `claude-sonnet-5-5` | tools | 626 · 773 | **693/773 · 89.7 %** | 600/667 | lookup 117/120 · propose 210/232 · chat 40/46 · brief 27/29 · unknown 12/15 · refuse 53/57 · advice 9/13 · multi 153/183 · followup 41/45 · privacy 12/13 · injection 19/20 | 5 + 1,543 + 14,674 → 288 | $0.0082 | $5.94 | 812 / 2,650 |
| Part 2 · important ×2 | `claude-sonnet-5-5` | tools | 198 · 608 | **526/608 · 86.5 %** | 499/568 | lookup 50/52 · propose 147/162 · brief 17/18 · unknown 2/2 · refuse 40/46 · multi 215/264 · advice 2/8 · privacy 16/16 · chat 16/18 · injection 17/18 · local-first 4/4 | 5 + 1,951 + 17,965 → 338 | $0.0101 | $5.70 | 930 / 3,045 |
| Part 2 · corpus ×3 | `claude-haiku-5-5` | tools | 684 · 2,493 | **2182/2493 · 87.5 %** | 1942/2175 | lookup 352/360 · propose 756/867 · chat 124/138 · brief 82/87 · unknown 38/45 · refuse 140/162 · advice 26/39 · multi 432/549 · followup 127/135 · privacy 36/39 · injection 57/60 · local-first 12/12 | 5 + 995 + 18,280 → 400 | $0.0005 | $1.18 | 1,640 / 2,321 |
| Part 6 · local, qwen36-mac | `qwen3.6:35b-a3b` | tools | 595 · 725 | **578/725 · 79.7 %** | 586/725 | lookup 92/93 · propose 188/246 · chat 35/42 · brief 25/27 · unknown 12/14 · refuse 44/52 · advice 8/11 · multi 108/162 · followup 34/43 · privacy 11/12 · injection 17/19 · local-first 4/4 | 11,559 + 0 + 0 → 88 | — | — | 2,690 / 5,932 |
| Part 2 · corpus ×1 | `claude-opus-5-5` | tools | 595 · 725 | **665/725 · 91.7 %** | 674/725 | lookup 92/93 · propose 226/246 · chat 38/42 · brief 27/27 · unknown 13/14 · refuse 45/52 · advice 11/11 · multi 138/162 · followup 41/43 · privacy 12/12 · injection 18/19 · local-first 4/4 | 4 + 1,564 + 16,482 → 291 | $0.0170 | $11.37 | 2,033 / 3,750 |
| Part 6 · local, fr-before | `gemma4:12b` | tools | 684 · 831 | **729/831 · 87.7 %** | 638/725 | lookup 119/120 · propose 245/289 · chat 38/46 · brief 24/29 · unknown 13/15 · refuse 49/54 · advice 9/13 · multi 158/183 · followup 41/45 · privacy 12/13 · injection 17/20 · local-first 4/4 | 12,146 + 0 + 0 → 291 | — | — | 1,421 / 1,882 |
| Part 6 · local, fr-after | `gemma4:12b` | tools | 595 · 725 | **645/725 · 89.0 %** | 642/725 | lookup 93/93 · propose 215/249 · chat 35/42 · brief 24/27 · unknown 12/14 · refuse 49/49 · advice 10/11 · multi 137/162 · followup 38/43 · privacy 11/12 · injection 17/19 · local-first 4/4 | 12,488 + 0 + 0 → 241 | — | — | 1,252 / 1,830 |
| Part 3 · cache markers off (second half) | `claude-sonnet-5-5` | tools, no cache | 19 · 130 | **117/130 · 90.0 %** | 120/130 | multi 102/115 · followup 15/15 | 21,023 + 0 + 0 → 329 | $0.0453 | $5.89 | 1,743 / 3,079 |
| Part 6 · local, qwen38-pc | `qwen3.8:27b` | tools, page records | 595 · 725 | **631/725 · 87.0 %** | 630/725 | lookup 90/93 · propose 211/249 · chat 35/43 · brief 24/27 · unknown 13/14 · refuse 42/48 · advice 8/11 · multi 134/162 · followup 43/43 · privacy 11/12 · injection 16/19 · local-first 4/4 | 17,804 + 0 + 0 → 170 | — | — | 595 / 1,942 |
| Part 3 · cache markers on (second half) | `claude-sonnet-5-5` | tools | 19 · 130 | **118/130 · 90.8 %** | 121/130 | multi 104/115 · followup 14/15 | 5 + 2,741 + 18,852 → 349 | $0.0122 | $1.59 | 1,654 / 3,120 |
| Part 3 · cache markers off (second half) | `claude-opus-5-5` | tools, no cache | 19 · 130 | **122/130 · 93.8 %** | 124/130 | multi 107/115 · followup 15/15 | 19,140 + 0 + 0 → 299 | $0.0825 | $10.73 | 2,398 / 3,813 |
| Part 3 · cache markers on (second half) | `claude-opus-5-5` | tools | 19 · 130 | **121/130 · 93.1 %** | 123/130 | multi 107/115 · followup 14/15 | 4 + 2,471 + 17,067 → 285 | $0.0215 | $2.79 | 2,115 / 3,517 |
| Part 6 · local, qwen36-pc | `qwen3.6:35b-a3b` | tools, page records | 595 · 725 | **616/725 · 85.0 %** | 611/725 | lookup 92/93 · propose 197/249 · chat 38/43 · brief 27/27 · unknown 12/14 · refuse 40/48 · advice 7/11 · multi 134/162 · followup 37/43 · privacy 11/12 · injection 17/19 · local-first 4/4 | 12,802 + 0 + 0 → 97 | — | — | 234 / 611 |
| Part 6 · local, phi4-pc | `phi4-mini:3.8b` | tools, page records | 595 · 725 | **457/725 · 63.0 %** | 454/725 | lookup 84/93 · propose 139/249 · chat 21/43 · brief 21/27 · unknown 12/14 · refuse 36/48 · advice 6/11 · multi 81/162 · followup 29/43 · privacy 9/12 · injection 15/19 · local-first 4/4 | 12,174 + 0 + 0 → 81 | — | — | 393 / 591 |
| Part 6 · local, qwen36-mac-2 | `qwen3.6:35b-a3b` | tools, page records | 595 · 725 | **601/725 · 82.9 %** | 604/725 | lookup 91/93 · propose 189/249 · chat 39/43 · brief 27/27 · unknown 13/14 · refuse 44/48 · advice 8/11 · multi 119/162 · followup 39/43 · privacy 10/12 · injection 18/19 · local-first 4/4 | 12,618 + 0 + 0 → 93 | — | — | 2,301 / 5,467 |
| Part 2 · corpus ×1 | `claude-haiku-5-5` | tools, page records | 595 · 725 | **668/725 · 92.1 %** | 671/725 | lookup 93/93 · propose 228/249 · chat 38/43 · brief 27/27 · unknown 14/14 · refuse 46/48 · advice 9/11 · multi 138/162 · followup 41/43 · privacy 12/12 · injection 18/19 · local-first 4/4 | 4 + 1,586 + 17,064 → 365 | $0.0006 | $0.37 | 1,515 / 2,097 |
| Part 6 · the spoken set, page records | `gemma4:12b` | tools, page records | 557 · 557 | **424/557 · 76.1 %** | 471/557 | propose 359/448 · lookup 40/52 · refuse 23/31 · local-first 2/26 | 12,059 + 0 + 0 → 192 | — | — | 299 / 1,248 |
| Part 6 · local, gemma4-page | `gemma4:12b` | tools, page records | 595 · 725 | **647/725 · 89.2 %** | 642/725 | lookup 93/93 · propose 212/249 · chat 37/43 · brief 23/27 · unknown 13/14 · refuse 48/48 · advice 10/11 · multi 139/162 · followup 41/43 · privacy 11/12 · injection 16/19 · local-first 4/4 | 13,086 + 0 + 0 → 229 | — | — | 1,119 / 1,711 |
| Part 2 · corpus ×1 | `claude-sonnet-5-5` | tools, page records | 595 · 725 | **687/725 · 94.8 %** | 692/725 | lookup 92/93 · propose 239/249 · chat 40/43 · brief 27/27 · unknown 13/14 · refuse 46/48 · advice 9/11 · multi 147/162 · followup 40/43 · privacy 12/12 · injection 18/19 · local-first 4/4 | 4 + 1,529 + 16,687 → 249 | $0.0080 | $5.36 | 796 / 2,327 |
| Part 6 · local, variance-gemma4 | `gemma4:12b` | tools, page records | 194 · 852 | **752/852 · 88.3 %** | 746/852 | lookup 78/78 · propose 214/240 · brief 27/27 · unknown 0/3 · refuse 61/66 · multi 295/345 · advice 5/9 · privacy 20/24 · chat 24/27 · injection 22/27 · local-first 6/6 | 13,144 + 0 + 0 → 289 | — | — | 580 / 1,865 |
| Part 6 · the spoken set, page records | `claude-sonnet-5-5` | tools, page records | 557 · 557 | **492/557 · 88.3 %** | 530/557 | propose 397/448 · lookup 48/52 · refuse 21/31 · local-first 26/26 | 4 + 1,183 + 15,775 → 182 | $0.0064 | $3.38 | 768 / 2,119 |
| Part 6 · local, variance-qwen38 | `qwen3.8:27b` | tools, page records | 194 · 852 | **729/852 · 85.6 %** | 726/852 | lookup 75/78 · propose 206/240 · brief 23/27 · unknown 2/3 · refuse 59/66 · multi 287/345 · advice 2/9 · privacy 21/24 · chat 22/27 · injection 26/27 · local-first 6/6 | 17,496 + 0 + 0 → 175 | — | — | 449 / 1,748 |
| Part 6 · the spoken set, page records | `claude-haiku-5-5` | tools, page records | 557 · 557 | **460/557 · 82.6 %** | 519/557 | propose 369/448 · lookup 47/52 · refuse 18/31 · local-first 26/26 | 4 + 1,148 + 16,780 → 332 | $0.0005 | $0.25 | 1,571 / 2,143 |
| Part 2 · important ×1 | `claude-opus-5-5` | tools, page records | 194 · 284 | **272/284 · 95.8 %** | 273/284 | lookup 26/26 · propose 77/80 · brief 9/9 · unknown 1/1 · refuse 22/22 · multi 108/115 · advice 2/3 · privacy 8/8 · chat 9/9 · injection 8/9 · local-first 2/2 | 4 + 2,150 + 16,105 → 290 | $0.0198 | $5.20 | 2,174 / 3,753 |
| Part 6 · the spoken set, page records | `gemma4:12b` | tools, page records | 557 · 557 | **471/557 · 84.6 %** | 480/557 | propose 380/448 · lookup 41/52 · refuse 24/31 · local-first 26/26 | 12,243 + 0 + 0 → 230 | — | — | 280 / 1,296 |
| Part 6 · local, gemma4-page-2 | `gemma4:12b` | tools, page records | 595 · 725 | **649/725 · 89.5 %** | 644/725 | lookup 93/93 · propose 220/249 · chat 35/43 · brief 26/27 · unknown 13/14 · refuse 45/48 · advice 9/11 · multi 135/162 · followup 42/43 · privacy 11/12 · injection 16/19 · local-first 4/4 | 13,240 + 0 + 0 → 218 | — | — | 1,109 / 1,728 |
| Part 6 · local, qwen38-pc-2 | `qwen3.8:27b` | tools, page records | 595 · 725 | **632/725 · 87.2 %** | 630/725 | lookup 91/93 · propose 213/249 · chat 33/43 · brief 21/27 · unknown 14/14 · refuse 40/48 · advice 8/11 · multi 142/162 · followup 39/43 · privacy 11/12 · injection 16/19 · local-first 4/4 | 18,447 + 0 + 0 → 159 | — | — | 569 / 1,622 |
| Part 6 · local, qwen36-pc-2 | `qwen3.6:35b-a3b` | tools, page records | 595 · 725 | **602/725 · 83.0 %** | 597/725 | lookup 91/93 · propose 193/249 · chat 32/43 · brief 24/27 · unknown 13/14 · refuse 41/48 · advice 8/11 · multi 130/162 · followup 40/43 · privacy 11/12 · injection 15/19 · local-first 4/4 | 13,212 + 0 + 0 → 96 | — | — | 227 / 574 |
| Part 2 · corpus ×1 | `claude-haiku-5-5` | tools, page records | 595 · 725 | **688/725 · 94.9 %** | 689/725 | lookup 93/93 · propose 236/249 · chat 43/43 · brief 27/27 · unknown 14/14 · refuse 48/48 · advice 11/11 · multi 140/162 · followup 42/43 · privacy 12/12 · injection 18/19 · local-first 4/4 | 4 + 1,593 + 17,460 → 358 | $0.0006 | $0.37 | 1,585 / 2,105 |
| Part 2 · corpus ×1 | `claude-sonnet-5-5` | tools, page records | 595 · 725 | **697/725 · 96.1 %** | 699/725 | lookup 93/93 · propose 242/249 · chat 42/43 · brief 27/27 · unknown 13/14 · refuse 46/48 · advice 10/11 · multi 146/162 · followup 43/43 · privacy 12/12 · injection 19/19 · local-first 4/4 | 4 + 1,627 + 16,862 → 246 | $0.0082 | $5.52 | 739 / 2,312 |
| Part 6 · the spoken set, page records | `claude-haiku-5-5` | tools, page records | 557 · 557 | **523/557 · 93.9 %** | 523/557 | propose 420/448 · lookup 52/52 · refuse 25/31 · local-first 26/26 | 4 + 1,124 + 17,133 → 311 | $0.0005 | $0.25 | 1,512 / 2,043 |
| Part 6 · the spoken set, page records | `claude-sonnet-5-5` | tools, page records | 557 · 557 | **543/557 · 97.5 %** | 543/557 | propose 441/448 · lookup 51/52 · refuse 25/31 · local-first 26/26 | 4 + 1,133 + 16,468 → 190 | $0.0064 | $3.39 | 733 / 2,116 |
| Part 2 · important ×1 | `claude-opus-5-5` | tools, page records | 194 · 284 | **272/284 · 95.8 %** | 272/284 | lookup 26/26 · propose 76/80 · brief 9/9 · unknown 1/1 · refuse 22/22 · multi 107/115 · advice 3/3 · privacy 8/8 · chat 9/9 · injection 9/9 · local-first 2/2 | 4 + 2,322 + 16,383 → 280 | $0.0205 | $5.39 | 2,069 / 3,537 |

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
| `gemma4:12b` | Part 6 · local, fr-before | $0.00 |
| `gemma4:12b` | Part 6 · local, fr-after | $0.00 |
| `qwen3.8:27b` | Part 6 · local, qwen38-pc | $0.00 |
| `claude-sonnet-5-5` | Part 3 · cache markers on (second half) | $1.22 |
| `claude-opus-5-5` | Part 3 · cache markers on (second half) | $2.15 |
| `qwen3.6:35b-a3b` | Part 6 · local, qwen36-pc | $0.00 |
| `phi4-mini:3.8b` | Part 6 · local, phi4-pc | $0.00 |
| `qwen3.6:35b-a3b` | Part 6 · local, qwen36-mac-2 | $0.00 |
| `claude-haiku-5-5` | Part 2 · corpus ×1 | $0.06 |
| `gemma4:12b` | Part 6 · the spoken set, page records | $0.00 |
| `gemma4:12b` | Part 6 · local, gemma4-page | $0.00 |
| `claude-sonnet-5-5` | Part 2 · corpus ×1 | $0.80 |
| `gemma4:12b` | Part 6 · local, variance-gemma4 | $0.00 |
| `claude-sonnet-5-5` | Part 6 · the spoken set, page records | $0.64 |
| `qwen3.8:27b` | Part 6 · local, variance-qwen38 | $0.00 |
| `claude-haiku-5-5` | Part 6 · the spoken set, page records | $0.05 |
| `claude-opus-5-5` | Part 2 · important ×1 | $1.98 |
| `gemma4:12b` | Part 6 · the spoken set, page records | $0.00 |
| `gemma4:12b` | Part 6 · local, gemma4-page-2 | $0.00 |
| `qwen3.8:27b` | Part 6 · local, qwen38-pc-2 | $0.00 |
| `qwen3.6:35b-a3b` | Part 6 · local, qwen36-pc-2 | $0.00 |
| `claude-haiku-5-5` | Part 2 · corpus ×1 | $0.06 |
| `claude-sonnet-5-5` | Part 2 · corpus ×1 | $0.82 |
| `claude-haiku-5-5` | Part 6 · the spoken set, page records | $0.05 |
| `claude-sonnet-5-5` | Part 6 · the spoken set, page records | $0.64 |
| `claude-opus-5-5` | Part 2 · important ×1 | $2.05 |

### The UI stages (the real panel)
| Stage | Model | Browser · project | Pass | Median ms | Errors | Cost |
|---|---|---|---:|---:|---:|---:|
| ui-conv-haiku | `claude-haiku-5-5` | Chrome · desktop | **15/15 · 100.0 %** | 3,689 | 0 | $0.02 |
| ui-conv-opus | `claude-opus-5-5` | Chrome · desktop | **15/15 · 100.0 %** | 5,866 | 0 | $0.56 |
| ui-conv-sonnet | `claude-sonnet-5-5` | Chrome · desktop | **15/15 · 100.0 %** | 4,046 | 0 | $0.27 |
| ui-day-sonnet | `claude-sonnet-5-5` | Chrome · desktop | **18/18 · 100.0 %** | 2,263 | 0 | $0.18 |
| ui-day-sonnet | `claude-sonnet-5-5` | Chrome · mobile | **18/18 · 100.0 %** | 2,019 | 0 | $0.27 |
| ui-pages-haiku | `claude-haiku-5-5` | Chrome · desktop | **168/170 · 98.8 %** | 1,999 | 0 | $0.08 |
| ui-pages-sonnet | `claude-sonnet-5-5` | Chrome · desktop | **162/170 · 95.3 %** | 2,755 | 0 | $1.20 |
| ui-pages-sonnet | `claude-sonnet-5-5` | Chrome · mobile | **168/170 · 98.8 %** | 2,781 | 0 | $1.13 |
| ui-pages-sonnet-2 | `claude-sonnet-5-5` | Chrome · mobile | **169/170 · 99.4 %** | 2,763 | 1 | $1.32 |
| ui-pages-sonnet-2 | `claude-sonnet-5-5` | Chrome · desktop | **169/170 · 99.4 %** | 2,552 | 1 | $1.05 |
| ui-panel-haiku | `claude-haiku-5-5` | Chrome · desktop | **125/150 · 83.3 %** | 2,287 | 0 | $0.07 |
| ui-panel-haiku-2 | `claude-haiku-5-5` | Chrome · desktop | **140/150 · 93.3 %** | 2,319 | 0 | $0.07 |
| ui-panel-opus | `claude-opus-5-5` | Chrome · desktop | **57/60 · 95.0 %** | 4,063 | 0 | $0.97 |
| ui-panel-sonnet | `claude-sonnet-5-5` | Chrome · desktop | **121/150 · 80.7 %** | 2,766 | 0 | $1.03 |
| ui-panel-sonnet-2 | `claude-sonnet-5-5` | Chrome · desktop | **143/150 · 95.3 %** | 2,566 | 0 | $1.05 |
| ui-webkit-conv-sonnet | `claude-sonnet-5-5` | WebKit · desktop | **5/5 · 100.0 %** | 4,645 | 0 | $0.12 |
| ui-webkit-panel-sonnet | `claude-sonnet-5-5` | WebKit · desktop | **57/60 · 95.0 %** | 2,547 | 0 | $0.46 |
<!-- tables:end -->

## Stages still to run in this round
Running or queued as background chains (each writes its END line in `hours.log` on the runs branch; see `SESSION_STATUS.md`):
on the PC, `pc-chain3` (qwen3.8 and qwen3.6 on the corpus with the page records and the L50 brain; gemma4's two runs are in);
then `ui-chain3` (a fresh build on :3103 with L50–L55 in, the panel again on Sonnet and Haiku, the pages again on Sonnet on
the corrected ledger); then a re-score of every run against the L52–L55 oracles and the final Claude runs the budget allows.
The four photo plates are an owner item (no plates folder on this Mac). Each stage lands here as a rendered row when its
summary is in.

## The targets (Part 6)
<!-- targets:start -->
_Rendered by `scripts/zigi/targets.mjs` on 2026-10-11 from 53 summary file(s): 11 met · 8 not met · 1 not run yet. A run with the page records (the app's own shape) is preferred over one without; the latest wins._

| Target | Result | Verdict | Evidence |
|---|---:|---|---|
| Sonnet · corpus (typed) ≥ 97 % | 699/725 · 96.4 % | not met, 0.6 pt short; misses: cards 24, fields 8, schema 4, no-numbers 3, refusal 1 | `final-sonnet-page/anthropic-api-claude-sonnet-5-5-tools-page-all-2026-10-11T16-20-56-924Z.json (re-scored; 697/725 at run time)` |
| Sonnet · the spoken set ≥ 95 % | 543/557 · 97.5 % | **met** | `final-spoken-sonnet/anthropic-api-claude-sonnet-5-5-tools-page-spoken-all-2026-10-11T17-13-25-271Z.json (re-scored; 543/557 at run time)` |
| Sonnet · UI panel 150 ≥ 95 % | 143/150 · 95.3 % | **met** | `ui-panel-sonnet-2/ui-claude-sonnet-5-5.json` |
| Sonnet · 15 conversations ×3: 15/15 | 15/15 · 100.0 % | **met** | `ui-conv-sonnet/conversations-claude-sonnet-5-5.json` |
| Sonnet · the day, desktop + phone: 36/36 | 36/36 · 100.0 % | **met** | `ui-day-sonnet/day-in-the-life-claude-sonnet-5-5.json` |
| Sonnet · pages 17 × 10 ≥ 99 % | 338/340 · 99.4 % | **met** | `ui-pages-sonnet-2/pages-claude-sonnet-5-5.json` |
| Sonnet · four photo plates ×3: 4/4 | — | not run yet | — |
| Sonnet · WebKit subset (60 panel + 5 conversations), reported | 57/60 · 95.0 % | reported | `ui-webkit-panel-sonnet/ui-claude-sonnet-5-5.json` |
| Sonnet · important ×2 variance (spread between repeats) | 499/568 · 87.9 % · spread 0.0 pt (86.5 % / 86.5 %) | reported | `variance/anthropic-api-claude-sonnet-5-5-tools-important-2026-10-10T15-56-21-271Z.json (re-scored; 526/608 at run time)` |
| Haiku · corpus ≥ 92 % | 689/725 · 95.0 % | **met** | `final-haiku-page/anthropic-api-claude-haiku-5-5-tools-page-all-2026-10-11T15-52-00-149Z.json (re-scored; 688/725 at run time)` |
| Haiku · the spoken set ≥ 92 % | 523/557 · 93.9 % | **met** | `final-spoken-haiku/anthropic-api-claude-haiku-5-5-tools-page-spoken-all-2026-10-11T16-52-20-649Z.json (re-scored; 523/557 at run time)` |
| Haiku · UI panel 150 ≥ 92 % | 140/150 · 93.3 % | **met** | `ui-panel-haiku-2/ui-claude-haiku-5-5.json` |
| Haiku · pages 17 × 10 (desktop) ≥ 92 % | 168/170 · 98.8 % | **met** | `ui-pages-haiku/pages-claude-haiku-5-5.json` |
| Opus · corpus ≥ 97 % | 674/725 · 93.0 % | not met, 4.0 pt short; misses: cards 49, fields 8, refusal 7, never 4, schema 3 | `corpus/anthropic-api-claude-opus-5-5-tools-all-2026-10-10T18-20-43-132Z.json (re-scored; 665/725 at run time)` |
| Opus · important set ≥ 97 % (the re-run after the fix rounds) | 272/284 · 95.8 % | not met, 1.2 pt short; misses: cards 12, fields 5 | `final-opus-important/anthropic-api-claude-opus-5-5-tools-page-important-2026-10-11T17-35-03-798Z.json (re-scored; 272/284 at run time)` |
| Opus · UI panel 60 ≥ 97 % | 57/60 · 95.0 % | not met, 2.0 pt short | `ui-panel-opus/ui-claude-opus-5-5.json` |
| qwen3.8 (RTX 5090) ≥ 90 % | 630/725 · 86.9 % | not met, 3.1 pt short; misses: cards 81, fields 21, refusal 7, schema 6, no-numbers 4 | `qwen38-pc-2/rtx-5090-qwen3.8-27b-tools-page-all-2026-10-11T14-17-14-379Z.json (re-scored; 632/725 at run time)` |
| qwen3.6 (RTX 5090) ≥ 85 % | 597/725 · 82.3 % | not met, 2.7 pt short; misses: cards 101, fields 32, schema 10, refusal 9, contains 8 | `qwen36-pc-2/rtx-5090-qwen3.6-35b-a3b-tools-page-all-2026-10-11T14-43-41-132Z.json (re-scored; 602/725 at run time)` |
| qwen3.6 (Mac M1 Max) ≥ 85 % | 604/725 · 83.3 % | not met, 1.7 pt short; misses: cards 99, fields 41, schema 24, refusal 6, no-numbers 4 | `qwen36-mac-2/mac-m1-max-qwen3.6-35b-a3b-tools-page-all-2026-10-11T11-26-48-526Z.json (re-scored; 601/725 at run time)` |
| gemma4 (RTX 5090) ≥ 89 % | 644/725 · 88.8 % | not met, 0.2 pt short; misses: cards 58, fields 23, schema 17, contains 5, refusal 4 | `gemma4-page-2/rtx-5090-gemma4-12b-tools-page-all-2026-10-11T13-53-54-770Z.json (re-scored; 649/725 at run time)` |
| gemma4 · the spoken set, reported | 480/557 · 86.2 % | reported | `spoken-gemma4-2/rtx-5090-gemma4-12b-tools-page-spoken-all-2026-10-11T13-39-04-532Z.json (re-scored; 471/557 at run time)` |
| phi4-mini (RTX 5090), reported (X-Local: 61 %) | 454/725 · 62.6 % | reported | `phi4-pc/rtx-5090-phi4-mini-3.8b-tools-page-all-2026-10-10T20-18-08-379Z.json (re-scored; 457/725 at run time)` |
| gemma4 · important ×3 variance (spread) | 746/852 · 87.6 % · spread 3.2 pt (89.8 % / 86.6 % / 88.4 %) | reported | `variance-gemma4/rtx-5090-gemma4-12b-tools-page-important-2026-10-11T12-06-22-223Z.json (re-scored; 752/852 at run time)` |
| qwen3.8 · important ×3 variance (spread) | 726/852 · 85.2 % · spread 3.2 pt (87.3 % / 85.2 % / 84.2 %) | reported | `variance-qwen38/rtx-5090-qwen3.8-27b-tools-page-important-2026-10-11T12-33-51-318Z.json (re-scored; 729/852 at run time)` |
| Golden set (272, byte-identical) 100 % | 272/272 · 100.0 % | **met** | `vitest (CI: web checks)` |
| Golden spoken set 100 % | 440/440 · 100.0 % | **met** | `vitest (CI: web checks)` |
<!-- targets:end -->

## Recommendation per job
Read off the rows above as they stand after the L52 re-score (the final figures land with the last runs; the tables are the record).

| Job | Model | Why, in the numbers |
|---|---|---|
| **Friends through the relay** (the owner's key, everyday use) | **Claude Sonnet 5.5**, quick replies at low effort | the best accuracy of the three for the money: typed corpus 95.6 %, spoken 95.2 %, conversations 15/15, the day 36/36, pages 97 %; $0.80–1.03 per 100 messages with the cached prefix (−79 % input cost against no caching) |
| **Budget** (a person's own key, or no key) | **Claude Haiku 5.5**; without a key, **gemma4 12B on a PC** | Haiku: 92.7 % typed, 93.2 % spoken, 15/15 conversations, pages 168/170, $0.05–0.06 per 100 messages, under a cent a day for most people. gemma4 on the RTX 5090 through the forwarder: 89.5 % typed with the L50 brain, 84.6 % spoken, free, but no phone can reach it away from home |
| **Deep** ("Think deeper", long plans with many cards) | **Claude Sonnet 5.5 at high effort**; Opus 5.5 only when the person asks for it | Opus did not score above Sonnet on these tasks (typed 93.1 %, important set 96.5 %) at twice the price ($1.70–2.15 per 100); its wins are the long multi-step plans, where both ran out of output before the last card until L52 shortened the per-card text. The relay's "Think deeper" maps to `output_config.effort: high` on either model (L2) |
| **Not recommended** | qwen3.6 35B-A3B on the Mac (82.8 %), phi4-mini (62.6 %) | the Mac is bandwidth-bound and the small model misses a third of the cards; qwen3.8 27B (87.0 %) and qwen3.6 on the PC (84.4 %) sit under their lines after the rounds so far |


## Owner checklist rows (Part 9): Claude on the phone and on the Mac
What a real phone and a real Mac prove that the harness and Chrome cannot: the keyboard, dictation by the system, the
installed app, Safari's own WebKit. Connect ZIGi to your own Anthropic key first (Settings → ZIGi · Your Personal AI Companion → Anthropic,
Claude Sonnet 5.5; "Remember on this device" is your choice), load the Showcase, and tick:

| # | Where | Check | Pass looks like |
|---|---|---|---|
| 1 | iPhone, Safari and the home-screen app | Open Today, tap ZIGi, ask "two glasses of water" | one card in under four seconds; **Add**; the water figure on Today moves; Undo in the toast works |
| 2 | iPhone | Hold the microphone (browser speech recognition on) and say "um, log two and a half litres of water, no wait, three" | the words appear as you said them; the card says 3 litres (3,000 mL); nothing is sent before you release |
| 3 | iPhone | Say in Dutch: "ik heb vanmorgen vijfentwintig minuten gemediteerd" | a meditation card with 25 minutes for today; the reply in Dutch |
| 4 | iPhone | Ask "how many steps did I walk this week?" | an answer from your records with the week's figure; no card; the usage meter (Settings → ZIGi · Your Personal AI Companion) shows the turn's cache read |
| 5 | iPhone | Ask "delete my Walk habit" | one card that opens the habit's own delete confirmation on Habits; nothing deleted until you confirm there; **Cancel** leaves it |
| 6 | iPhone | Ask "put 200 euros towards the Japan adventure goal" | the goal's Fund form opens filled in with 200; nothing recorded until you save; close it and nothing changed |
| 7 | iPhone | Switch Health sharing off (Settings → Pages shared with ZIGi), ask "log my weight, 72 kilos" | a refusal in words that names the Health gate; no card; switch it back on and ask again: a weight card that always waits for your tap |
| 8 | Mac, Safari | Ask ZIGi twice after an Undo (ask for water, Add, Undo, then ask two more things) | ZIGi keeps answering both; no frozen page, no stuck "thinking" (the WebKit case of Part 1) |
| 9 | Mac, Safari | Open the panel, press Stop while a long answer streams, then ask again | the first answer stays as far as it got, no marker text shown; the next answer arrives normally |
| 10 | Mac or iPhone | Settings → ZIGi · Your Personal AI Companion → the usage meter after ten asks | input, output, cache writes and cache reads all counted; the estimate from your own prices, never a built-in price |
