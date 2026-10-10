# API ledger — Session Z-Local (owner cap $130; hard stop)

Rebuilt by `scripts/zigi/ledger.mjs` from the run files on this branch (22 files), each call priced at the published table in `apps/web/lib/ai/pricing.ts` (as of 2026-10-10: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus and Sonnet, 0.1× on Haiku; the Batch API 0.5×). Thinking tokens are output tokens; tool rounds and the repair round are counted. "Unreported" requests answered without counts (priced at zero, listed so nothing hides). Never typed by hand.

| Stage | Model | Requests | Input | Cache write | Cache read | Output | USD |
|---|---|---:|---:|---:|---:|---:|---:|
| monthly/2026-10/haiku | claude-haiku-5-5 (batch) | 31 | 124 | 82,319 | 168,310 | 8,329 | 0.0081 |
| monthly/2026-10/sonnet | claude-sonnet-5-5 (batch) | 31 | 124 | 74,303 | 174,838 | 9,717 | 0.1503 |
| real-model/cache-after | claude-opus-5-5 | 86 | 332 | 182,528 | 939,868 | 21,602 | 1.5340 |
| real-model/cache-after | claude-sonnet-5-5 | 102 | 376 | 151,464 | 1,190,950 | 26,550 | 0.7640 |
| real-model/cache-before | claude-opus-5-5 | 94 | 1,232,374 | 0 | 0 | 22,082 | 5.3711 |
| real-model/cache-before | claude-sonnet-5-5 | 102 | 1,342,846 | 0 | 0 | 26,340 | 2.9491 |
| real-model/corpus | claude-haiku-5-5 | 5,876 | 22,012 | 4,636,956 | 85,220,492 | 1,863,558 | 2.3658 |
| real-model/corpus | claude-sonnet-5-5 | 1,760 | 6,628 | 2,231,286 | 21,218,254 | 416,088 | 11.8742 |
| real-model/probe | claude-sonnet-5-5 | 44 | 172 | 118,410 | 465,980 | 11,970 | 0.4627 |
| real-model/ui-panel-haiku | claude-haiku-5-5 | 130 | 502 | 211,425 | 1,853,180 | 48,331 | 0.0692 |
| real-model/ui-panel-opus | claude-opus-5-5 | 43 | 172 | 121,164 | 559,467 | 12,599 | 0.9704 |
| real-model/ui-panel-sonnet | claude-sonnet-5-5 | 130 | 504 | 214,932 | 1,868,589 | 30,173 | 1.0269 |
| real-model/variance | claude-sonnet-5-5 | 1,416 | 5,348 | 2,209,062 | 20,336,576 | 382,358 | 11.3906 |
| spoken/gen | claude-opus-5-5 (batch) | 188 | 133,035 | 0 | 0 | 103,574 | 1.3018 |

**Per model:** claude-haiku-5-5 $2.44 · claude-sonnet-5-5 $28.62 · claude-opus-5-5 $9.18

**Total: $40.24 of $130.**
