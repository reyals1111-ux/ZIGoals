# API ledger — Session Z-Local (owner cap $50; hard stop)

Rebuilt by `scripts/zigi/ledger.mjs` from the run files on this branch (1 files), each call priced at the published table in `apps/web/lib/ai/pricing.ts` (as of 2026-10-10: Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 5.5 $0.10/$0.50 per MTok; cache writes 1.25×; cache hits 0.05× on Opus and Sonnet, 0.1× on Haiku; the Batch API 0.5×). Thinking tokens are output tokens; tool rounds and the repair round are counted. "Unreported" requests answered without counts (priced at zero, listed so nothing hides). Never typed by hand.

| Stage | Model | Requests | Input | Cache write | Cache read | Output | USD |
|---|---|---:|---:|---:|---:|---:|---:|
| spoken/gen | claude-opus-5-5 (batch) | 44 | 31,023 | 0 | 0 | 23,321 | 0.2953 |

**Per model:** claude-opus-5-5 $0.30

**Total: $0.30 of $50.**
