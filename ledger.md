# API ledger — Session Z-Local (owner cap $130; hard stop)

Rebuilt by `scripts/zigi/ledger.mjs` from the run files on this branch (8 files), each call priced at the published table in `apps/web/lib/ai/pricing.ts` (as of 2026-10-10: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus and Sonnet, 0.1× on Haiku; the Batch API 0.5×). Thinking tokens are output tokens; tool rounds and the repair round are counted. "Unreported" requests answered without counts (priced at zero, listed so nothing hides). Never typed by hand.

| Stage | Model | Requests | Input | Cache write | Cache read | Output | USD |
|---|---|---:|---:|---:|---:|---:|---:|
| real-model/cache-after | claude-opus-5-5 | 43 | 166 | 91,264 | 469,934 | 10,801 | 0.7670 |
| real-model/cache-after | claude-sonnet-5-5 | 51 | 188 | 75,732 | 595,475 | 13,275 | 0.3820 |
| real-model/cache-before | claude-opus-5-5 | 47 | 616,187 | 0 | 0 | 11,041 | 2.6856 |
| real-model/cache-before | claude-sonnet-5-5 | 51 | 671,423 | 0 | 0 | 13,170 | 1.4745 |
| real-model/corpus | claude-sonnet-5-5 | 880 | 3,314 | 1,115,643 | 10,609,127 | 208,044 | 5.9371 |
| real-model/probe | claude-sonnet-5-5 | 22 | 86 | 59,205 | 232,990 | 5,985 | 0.2313 |
| real-model/variance | claude-sonnet-5-5 | 708 | 2,674 | 1,104,531 | 10,168,288 | 191,179 | 5.6953 |
| spoken/gen | claude-opus-5-5 (batch) | 188 | 133,035 | 0 | 0 | 103,574 | 1.3018 |

**Per model:** claude-opus-5-5 $4.75 · claude-sonnet-5-5 $13.72

**Total: $18.47 of $130.**
