# Run #9.1 implementation plan

> Use subagent-driven-development for the independent market subsystem and review; implement integrated private accounting and product surfaces in this session.

Goal: turn the Run #9 canonical asset and contribution architecture into a coherent consumer Wealth and Goals experience.
Architecture: keep one Position store, migrate platform v1/v2 to v3 with watchlist and asset lifecycle evidence, use existing private locks, and reuse one visual asset picker throughout. Public CoinGecko data stays separate. Fund Goal is an atomic private record update; surplus remains available, while Record history only does not touch balances.
Stack: Next 16.3.5, React 19, TypeScript, Zod, exact BigInt units, Vitest and Playwright.
Spec: .superpowers/run9-1/request.txt (owner request, preserved verbatim locally).

## Constraints
- Existing worktree and codex/run9-goal-intelligence-live-wealth only; starting f5d04a01fc7a6b97a574b5ca900f3e2b251dcd9b verified clean.
- No deployment, merge, push, PR, financial execution or new market provider.
- Funding Wealth everywhere in visible copy. Goals, Habits & Health = Wealth is the primary slogan.
- Preserve private locks, exact decimals, immutable historical financial evidence, original recovery bytes, and import validation.
- CoinGecko receives public identifiers/currencies only; server key never enters client or evidence artifacts.

## Tasks
- [x] Preflight, read all four Run #9 docs and owner request, visually inspect 13 supplied screenshots and running Wealth, baseline focused tests (72 passed).
- [x] Shared presentation: financial-ui.tsx/css (AssetIcon, freshness/source, metrics, smooth progress); global readable typography; no extra dependency.
- [x] Canonical management: asset-management.ts, asset-picker.tsx, asset-editor.tsx; all Wealth CRUD, safe archive with allocation release confirmation, historical retention; Positions filtered via isCryptoPosition.
- [x] Private v3: positions.ts migration includes bounded watchlist and asset events; accept v1/v2, preserve bytes on first explicit write; round-trip backups and reject future state.
- [x] Market subsystem: public market history adapter/route/client, bounded cache and provider admission, one documented Demo history attempt then local observations fallback; PriceChart with exact table and valid ranges, no RWA spot fiction.
- [x] Wealth and asset detail: owned cards, compact class summaries, favourites above history, live batched prices, sources, allocation management, attention; Today compact favourites.
- [x] Contribution funding: contribution-funding.ts pure preview/apply, tests before implementation; Fund Goal quantity/value/allocation/record in one mutation, idempotency key, explicit schedule reference, fresh quote at confirmation; cap allocation at remaining target and preserve remainder in owned wealth. Record only unchanged.
- [x] Funding Wealth and Today: hierarchy with goal progress, pace, next action, projection and quality; no-plan explicit. Goal creation and allocation use shared picker.
- [x] Activity: dated linked event cards and All/Goal/Wealth/Habit/Health filters; distinct financial/asset/habit/health presentation.
- [x] Branding/readability/Health: exact slogan, flowing rings, 3/2/1 goal cards, practical Health opening and clearly planned barcode/wearables cards; quick add reuses existing routes.
- [x] Verification: financial invariants, migration/backup/conflicts, provider failures/privacy, ten browser flows with isolated data, all main surfaces 1440/1024/390/320 screenshots; inspect then refine.
- [x] Full gates: lint/typecheck/test/build, production browser, Alpha build/dry-run/security checks, credential scans and dependency audit. Document results and limitations, commit local final state.

## Interface boundaries and review
Market worker owns only market-history files, PriceChart and associated tests. Root owns private schemas and UI integration; no shared implementation files. PriceChart accepts public MarketAssetRef and currency plus optional local public points. The market subsystem never reads private Positions. AssetPicker emits either an existing Position or a draft Position; callers decide save/allocation atomically. All mutations consume the latest Platform under usePlatform.update.

## Decisions
- Allocation caps at the remaining Goal value; extra contribution wealth remains available. This preserves the owner's 20,000 into 2,000 expectation without over-allocation.
- RWA holdings use tokenized reference units with visible provenance; physical grams remain manual.
- Existing owner data is never used for browser write tests; fixtures run in disposable contexts.

## Final review
The independent accounting review approved 36 focused regressions after fixes for exact cap precision, durable archive membership and ISO-instant comparisons. Full gates and screenshots are recorded in docs/verification/run9-1/README.md.
