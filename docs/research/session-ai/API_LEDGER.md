# Session AI — API ledger (Track A)

Real-model testing of ZIGi on the owner's Anthropic API credits. Prices from `apps/web/lib/ai/pricing.ts` (dated table); the Batch API halves input and output. Real cost comes from each response's own usage fields, summed from the run files in the runs folder (never from a derived copy).

**Budget (owner, 28 Oct):** Console $102.06 = $83.74 promotional (expires 2026-10-31 12:00 UTC, spent first) + $18.30 purchased. Hard cap $95; reserve at least $7; at most $11.30 after the deadline (ADR-034 N5).

Rebuilt by `scripts/zigi/ledger.mjs` from the run files on this branch (450 files), each call priced at the published table in `apps/web/lib/ai/pricing.ts` (as of 2026-10-10: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus and Sonnet, 0.1× on Haiku; the Batch API 0.5×). Thinking tokens are output tokens; tool rounds and the repair round are counted. "Unreported" requests answered without counts (priced at zero, listed so nothing hides). Never typed by hand.

| Stage | Model | Requests | Input | Cache write | Cache read | Output | USD |
|---|---|---:|---:|---:|---:|---:|---:|
| real-model/a1 | claude-haiku-5-5 (batch) | 10 | 40 | 41,843 | 155,088 | 5,158 | 0.0047 |
| real-model/a2-baseline/batches | claude-haiku-5-5 (batch) | 2,073 | 8,018 | 2,597,096 | 38,751,129 | 685,314 | 0.5278 |
| real-model/a2-baseline/batches | claude-sonnet-5-5 (batch) | 2,014 | 7,852 | 2,816,629 | 37,591,947 | 413,890 | 7.4777 |
| real-model/a2-photos/batches | claude-haiku-5-5 (batch) | 30 | 120 | 376,167 | 0 | 25,163 | 0.0298 |
| real-model/a2-photos/batches | claude-opus-5-5 (batch) | 30 | 120 | 376,167 | 0 | 19,735 | 1.1380 |
| real-model/a2-photos/batches | claude-sonnet-5-5 (batch) | 30 | 120 | 376,167 | 0 | 12,778 | 0.5342 |
| real-model/a3-conv | claude-haiku-5-5 | 94 | 368 | 183,107 | 1,821,699 | 14,401 | 0.0483 |
| real-model/a3-conv | claude-sonnet-5-5 | 90 | 360 | 137,297 | 1,782,950 | 10,545 | 0.6277 |
| real-model/a3-r1/batches | claude-haiku-5-5 (batch) | 2,030 | 7,844 | 2,528,224 | 38,784,061 | 668,524 | 0.5195 |
| real-model/a3-r1/batches | claude-haiku-5-5 | 99 | 370 | 281,456 | 1,906,390 | 32,208 | 0.0704 |
| real-model/a3-r1/batches | claude-sonnet-5-5 (batch) | 1,966 | 7,686 | 2,589,238 | 37,522,312 | 403,406 | 7.1374 |
| real-model/a3-r1/batches | claude-sonnet-5-5 | 102 | 374 | 332,946 | 2,009,849 | 27,884 | 1.3129 |
| real-model/a3-r2/batches | claude-haiku-5-5 (batch) | 2,036 | 7,862 | 2,549,734 | 40,451,970 | 664,154 | 0.5280 |
| real-model/a3-r2/batches | claude-haiku-5-5 | 104 | 384 | 381,394 | 1,976,196 | 28,153 | 0.0816 |
| real-model/a3-r2/batches | claude-sonnet-5-5 (batch) | 1,968 | 7,698 | 2,178,585 | 39,475,160 | 399,478 | 6.7021 |
| real-model/a3-r2/batches | claude-sonnet-5-5 | 97 | 366 | 307,711 | 1,958,435 | 24,281 | 1.2087 |
| real-model/a3-r3/batches | claude-haiku-5-5 (batch) | 2,041 | 7,864 | 2,491,704 | 40,932,124 | 666,507 | 0.5274 |
| real-model/a3-r3/batches | claude-haiku-5-5 | 106 | 386 | 288,005 | 2,141,543 | 32,434 | 0.0737 |
| real-model/a3-r3/batches | claude-sonnet-5-5 (batch) | 1,962 | 7,676 | 2,320,449 | 39,490,389 | 397,753 | 6.8715 |
| real-model/a3-r3/batches | claude-sonnet-5-5 | 95 | 362 | 303,766 | 1,915,585 | 21,938 | 1.1711 |
| real-model/a4-final/batches | claude-haiku-5-5 (batch) | 2,075 | 7,990 | 2,397,150 | 42,203,666 | 676,043 | 0.5303 |
| real-model/a4-final/batches | claude-haiku-5-5 | 98 | 368 | 283,693 | 1,985,885 | 26,720 | 0.0687 |
| real-model/a4-final/batches | claude-sonnet-5-5 (batch) | 1,978 | 7,502 | 4,265,476 | 36,559,891 | 377,735 | 9.0560 |
| real-model/a4-final/batches | claude-sonnet-5-5 | 121 (1 unreported) | 444 | 421,302 | 2,392,187 | 28,288 | 1.5762 |
| real-model/a4-fix/batches | claude-haiku-5-5 (batch) | 286 | 1,016 | 595,055 | 5,558,836 | 103,958 | 0.0910 |
| real-model/a4-fix/batches | claude-haiku-5-5 | 82 | 308 | 244,616 | 1,629,943 | 29,827 | 0.0618 |
| real-model/a4-fix/batches | claude-opus-5-5 (batch) | 34 | 136 | 206,150 | 520,096 | 6,550 | 0.6332 |
| real-model/a4-fix/batches | claude-opus-5-5 | 18 | 36 | 238,755 | 167,312 | 6,041 | 1.3482 |
| real-model/a4-fix/batches | claude-sonnet-5-5 (batch) | 272 | 978 | 442,443 | 5,470,264 | 62,722 | 1.1412 |
| real-model/a4-fix/batches | claude-sonnet-5-5 | 79 | 300 | 250,032 | 1,602,194 | 24,415 | 1.0300 |
| real-model/a4-photos-r2/batches | claude-opus-5-5 (batch) | 30 | 120 | 399,837 | 0 | 20,617 | 1.2060 |
| real-model/a4-photos/batches | claude-haiku-5-5 (batch) | 30 | 120 | 399,837 | 0 | 24,586 | 0.0311 |
| real-model/a4-photos/batches | claude-opus-5-5 (batch) | 30 | 120 | 399,837 | 0 | 20,157 | 1.2014 |
| real-model/a4-photos/batches | claude-sonnet-5-5 (batch) | 30 | 120 | 399,837 | 0 | 15,592 | 0.5779 |
| real-model/a4/batches | claude-haiku-5-5 (batch) | 2,082 | 8,016 | 2,436,614 | 41,863,548 | 687,704 | 0.5339 |
| real-model/a4/batches | claude-haiku-5-5 | 100 | 372 | 381,479 | 1,912,640 | 25,687 | 0.0797 |
| real-model/a4/batches | claude-opus-5-5 (batch) | 1,996 | 7,762 | 3,885,821 | 38,705,329 | 469,129 | 18.2919 |
| real-model/a4/batches | claude-opus-5-5 | 127 | 464 | 502,931 | 2,405,441 | 28,906 | 3.5757 |
| real-model/a4/batches | claude-sonnet-5-5 (batch) | 2,019 | 7,860 | 2,596,780 | 40,450,994 | 412,518 | 7.3390 |
| real-model/a4/batches | claude-sonnet-5-5 | 97 | 364 | 314,675 | 1,981,581 | 24,237 | 1.2279 |

**Per model:** claude-haiku-5-5 $3.81 · claude-sonnet-5-5 $54.99 · claude-opus-5-5 $27.39

**Total: $86.19 of $95.**

**The API's own limit (28 Oct, 07:13 UTC):** 77 requests of the last batch were refused ("specified workspace API usage limits … regain access on 2026-11-01") with the ledger at $86.19; no run after that. See `REAL_MODEL_ROUND_AI.md`.
