# API ledger — Session Z-Local (owner cap $130; hard stop)

Rebuilt by `scripts/zigi/ledger.mjs` from the run files on this branch (33 files), each call priced at the published table in `apps/web/lib/ai/pricing.ts` (as of 2026-10-10: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus and Sonnet, 0.1× on Haiku; the Batch API 0.5×). Thinking tokens are output tokens; tool rounds and the repair round are counted. "Unreported" requests answered without counts (priced at zero, listed so nothing hides). Never typed by hand.

| Stage | Model | Requests | Input | Cache write | Cache read | Output | USD |
|---|---|---:|---:|---:|---:|---:|---:|
| monthly/2026-10/haiku | claude-haiku-5-5 (batch) | 31 | 124 | 82,319 | 168,310 | 8,329 | 0.0081 |
| monthly/2026-10/sonnet | claude-sonnet-5-5 (batch) | 31 | 124 | 74,303 | 174,838 | 9,717 | 0.1503 |
| real-model/cache-after | claude-opus-5-5 | 43 | 166 | 91,264 | 469,934 | 10,801 | 0.7670 |
| real-model/cache-after | claude-sonnet-5-5 | 51 | 188 | 75,732 | 595,475 | 13,275 | 0.3820 |
| real-model/cache-after-2 | claude-opus-5-5 | 148 | 562 | 321,284 | 2,218,709 | 37,038 | 2.7932 |
| real-model/cache-after-2 | claude-sonnet-5-5 | 161 | 594 | 356,286 | 2,450,769 | 45,348 | 1.5905 |
| real-model/cache-before | claude-opus-5-5 | 47 | 616,187 | 0 | 0 | 11,041 | 2.6856 |
| real-model/cache-before | claude-sonnet-5-5 | 51 | 671,423 | 0 | 0 | 13,170 | 1.4745 |
| real-model/cache-before-2 | claude-opus-5-5 | 144 | 2,488,190 | 0 | 0 | 38,908 | 10.7309 |
| real-model/cache-before-2 | claude-sonnet-5-5 | 158 | 2,733,013 | 0 | 0 | 42,829 | 5.8943 |
| real-model/corpus | claude-haiku-5-5 | 2,938 | 11,006 | 2,318,478 | 42,610,246 | 931,779 | 1.1829 |
| real-model/corpus | claude-opus-5-5 | 778 | 2,916 | 1,049,421 | 11,059,244 | 195,151 | 11.3736 |
| real-model/corpus | claude-sonnet-5-5 | 880 | 3,314 | 1,115,643 | 10,609,127 | 208,044 | 5.9371 |
| real-model/part6-haiku-after | claude-haiku-5-5 | 748 | 2,910 | 1,063,880 | 11,449,692 | 245,045 | 0.3703 |
| real-model/part6-opus-important | claude-opus-5-5 | 278 | 1,082 | 565,385 | 4,235,570 | 76,145 | 5.2013 |
| real-model/part6-sonnet-page | claude-sonnet-5-5 | 727 | 2,826 | 1,025,706 | 11,196,727 | 166,927 | 5.3589 |
| real-model/part6-spoken-haiku | claude-haiku-5-5 | 576 | 2,370 | 609,622 | 8,910,045 | 176,415 | 0.2537 |
| real-model/part6-spoken-sonnet | claude-sonnet-5-5 | 549 | 2,208 | 628,283 | 8,376,789 | 96,876 | 3.3816 |
| real-model/probe | claude-sonnet-5-5 | 22 | 86 | 59,205 | 232,990 | 5,985 | 0.2313 |
| real-model/ui-conv-haiku | claude-haiku-5-5 | 31 | 122 | 77,129 | 412,017 | 4,375 | 0.0160 |
| real-model/ui-conv-opus | claude-opus-5-5 | 30 | 120 | 77,294 | 396,341 | 4,475 | 0.5557 |
| real-model/ui-conv-sonnet | claude-sonnet-5-5 | 30 | 120 | 77,299 | 396,341 | 3,286 | 0.2660 |
| real-model/ui-day-sonnet | claude-sonnet-5-5 | 30 | 120 | 140,645 | 339,955 | 6,181 | 0.4477 |
| real-model/ui-pages-haiku | claude-haiku-5-5 | 166 | 626 | 220,834 | 2,468,800 | 45,693 | 0.0752 |
| real-model/ui-pages-sonnet | claude-sonnet-5-5 | 362 | 1,306 | 353,960 | 5,566,075 | 87,982 | 2.3239 |
| real-model/ui-panel-haiku | claude-haiku-5-5 | 130 | 502 | 211,425 | 1,853,180 | 48,331 | 0.0692 |
| real-model/ui-panel-opus | claude-opus-5-5 | 43 | 172 | 121,164 | 559,467 | 12,599 | 0.9704 |
| real-model/ui-panel-sonnet | claude-sonnet-5-5 | 130 | 504 | 214,932 | 1,868,589 | 30,173 | 1.0269 |
| real-model/ui-panel-sonnet-2 | claude-sonnet-5-5 | 129 | 508 | 223,546 | 1,938,283 | 29,754 | 1.0512 |
| real-model/ui-webkit-conv-sonnet | claude-sonnet-5-5 | 10 | 40 | 37,788 | 123,698 | 1,287 | 0.1198 |
| real-model/ui-webkit-panel-sonnet | claude-sonnet-5-5 | 44 | 174 | 121,594 | 574,812 | 9,854 | 0.4604 |
| real-model/variance | claude-sonnet-5-5 | 708 | 2,674 | 1,104,531 | 10,168,288 | 191,179 | 5.6953 |
| spoken/gen | claude-opus-5-5 (batch) | 188 | 133,035 | 0 | 0 | 103,574 | 1.3018 |

**Per model:** claude-haiku-5-5 $1.98 · claude-sonnet-5-5 $35.79 · claude-opus-5-5 $36.38

**Total: $74.15 of $130.**
