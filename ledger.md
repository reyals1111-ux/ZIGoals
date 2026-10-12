# API ledger — Session AA-Local (owner cap $50; hard stop)

Rebuilt by `scripts/zigi/ledger.mjs` from the run files on this branch (11 files), each call priced at the published table in `apps/web/lib/ai/pricing.ts` (as of 2026-10-10: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus and Sonnet, 0.1× on Haiku; the Batch API 0.5×). Thinking tokens are output tokens; tool rounds and the repair round are counted. "Unreported" requests answered without counts (priced at zero, listed so nothing hides). Never typed by hand.

| Stage | Model | Requests | Input | Cache write | Cache read | Output | USD |
|---|---|---:|---:|---:|---:|---:|---:|
| real-model/s1/haiku-aa | claude-haiku-5-5 | 45 | 168 | 30,435 | 743,722 | 12,397 | 0.0175 |
| real-model/s1/haiku-corpus | claude-haiku-5-5 | 866 | 3,242 | 1,196,929 | 13,994,688 | 273,159 | 0.4265 |
| real-model/s1/haiku-spoken | claude-haiku-5-5 | 732 | 2,856 | 671,034 | 11,999,403 | 203,600 | 0.3060 |
| real-model/s1/sonnet-aa | claude-sonnet-5-5 | 44 | 166 | 79,580 | 677,502 | 6,394 | 0.3310 |
| real-model/s1/sonnet-spoken | claude-sonnet-5-5 | 715 | 2,804 | 733,359 | 11,632,329 | 115,359 | 4.1558 |
| real-model/s2/haiku-aa | claude-haiku-5-5 | 45 | 168 | 79,773 | 695,311 | 11,218 | 0.0226 |
| real-model/s2/sonnet-aa | claude-sonnet-5-5 | 44 | 166 | 79,824 | 678,199 | 6,248 | 0.3302 |
| real-model/s3/ui-conv-1 | claude-sonnet-5-5 | 30 | 120 | 86,396 | 447,470 | 3,807 | 0.2990 |
| real-model/s3/ui-conv-2 | claude-sonnet-5-5 | 30 | 120 | 6,832 | 527,076 | 3,757 | 0.1076 |
| real-model/s3/ui-conv-3 | claude-sonnet-5-5 | 30 | 120 | 6,374 | 527,506 | 3,546 | 0.1044 |
| spoken/gen | claude-opus-5-5 (batch) | 44 | 31,023 | 0 | 0 | 23,321 | 0.2953 |

**Per model:** claude-haiku-5-5 $0.77 · claude-sonnet-5-5 $5.33 · claude-opus-5-5 $0.30

**Total: $6.40 of $50.**
