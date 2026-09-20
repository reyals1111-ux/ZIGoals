# Run #9 Implementation Plan

**Goal:** Implement the approved Goal Intelligence + Live Wealth architecture in RUN_9_PREP.md.
**Architecture:** Server-only CoinGecko public catalog/quote boundary; separate private schema v2 accounting and history; shared deterministic selectors powering Wealth, Goal Detail, Today and Activity.
**Stack:** Next.js / React / TypeScript / Zod / exact BigInt accounting / Vitest / Playwright.
**Spec:** docs/RUN_9_PREP.md and the owner's Run #9 implementation request.

## Constraints
- Work only in this existing branch/worktree. No deployment, PR, merge, financial execution or other provider.
- CoinGecko key stays server-only, header authentication only. Public request identities never include private data.
- Private key remains zigoals:platform:v1. Read migration is in-memory; first write preserves v1 recovery bytes.
- Append-only contributions/reversals; observations, allocations, prices and income remain distinct.
- 15 minute quotes, 60 second retry gate, 24 hour catalogs. Last-good retention. Manual precedence.
- Exact units, bounded history, no fabricated backfill, no stale-write/lock bypass.

## Tasks and verification
- [x] Mandatory preflight and full architecture-contract read.
- [x] Baseline unit verification and current UI/storage inspection.
- [x] Accounting foundation: positions.ts schema v2 plus goal-intelligence.ts/history helpers. Tests first for migrations, contributions, reversals, duplicate transactions, plan comparisons, zero-return health, reward separation, retention, locked edits. Preserve old imports and recovery through private-storage.ts.
- [x] Market foundation: market-assets.ts identity/catalog parser; server CoinGecko adapter; multi-asset public cache and routes; use-market-quotes.ts. Tests first for exact prices, malformed payloads, batching, privacy, absent key, retry and retention. Keep native-ZIG compatibility.
- [x] Integrate manual asset selection and Wealth: new asset selector, manual-source cards, wealth selector and responsive composition/history surface. Explicit automatic/manual choice and separate currency totals.
- [x] Integrate Goal intelligence: confirmed Local Demo receipt bridge, manual contribution/income/reversal form, zero-return Funding Health, timeline and accessible charts. Existing plans/allocation/Goal edits remain guarded.
- [x] Integrate compact Today intelligence and Activity provenance using canonical records.
- [x] Review and fix foundation/integration defects; add focused browser tests for desktop/mobile and provider-disabled/failure flows.
- [x] Run lint, typecheck, unit suite, production build, browser suite and existing Alpha build/check/security gates. Inspect desktop/mobile screenshots and full diff. Scan secret presence without printing secrets.
- [x] Update STATUS, Run #9 report, environment documentation and Beta backlog with exact verification and limitations. Leave reviewable local branch; nothing deployed or merged.

## Interface boundaries
| Producer | Consumer | Contract |
|---|---|---|
| market-assets.ts | positions/schema + quote adapter | marketAssetRefSchema / MarketAssetRef; provider + kind + canonical id, optional coin platform/contract, required RWA assetType |
| market quotes/cache | goalProgress / wealth / UI | existing MarketQuote and useMarketQuotes shape retained; optional canonical marketRef and fetchedAt; quoteMatchesPosition handles explicit identity |
| schema v2 | private store / UI | Platform includes contributions, valuationSnapshots, goalHistory; platformSchema accepts v1 and returns v2 |
| goal-intelligence.ts | Goal Detail / Today / Activity | appendContribution, reverseContribution, contributionTotals, fundingHealth, goalTimeline, captureValuations; independently tested pure helpers |

## Execution notes
The owner has approved the architecture and autonomous implementation; no new design approval is needed. Existing worktree verified, so no worktree creation. Foundations can proceed independently; UI integration waits for concrete exported interfaces. Original files are backed up to /tmp before edits. Progress and review findings are recorded below.

## Completion evidence
- Baseline: 810 unit tests. Final: 885 unit tests in 55 files; 166 production browser checks.
- Lint, TypeScript, production build, Alpha build/dry run, 12 Workers security checks and dependency audit passed.
- Review fixes preserve automatic Position identity, deduplicate large portfolios before transport bounds, and protect Habit links when immutable-history deletion is rejected.
- Final artifact scan caught OpenNext embedding local server env; a tested build sanitizer removes the runtime key and fails on residual copies. Credential scan then found zero matches.
- Live CoinGecko catalog and 14 representative quote pairs verified; RWA EUR, distributed quotas, historical plan matching and income annualization remain explicit Beta limits.
- No deployment, merge, push or financial execution.
