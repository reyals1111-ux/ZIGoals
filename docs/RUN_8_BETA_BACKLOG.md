# Run #8 Beta backlog

Complete scope and acceptance criteria remain in the [unaltered master prompt](RUN_8_ASTRA_MASTER_PROMPT.md). This status table records delivered behavior and remaining work; tests do not make partial product scope complete.

| Scope | Status | Delivered / remaining |
|---|---|---|
| A: master roadmap, complete brief, frozen boundaries | COMPLETE | Full brief persisted before implementation; Health future scope retained. |
| B: universal Positions and exact accounting | COMPLETE | All 13 source categories, provider/authority states, exact integer units, principal/rewards, provenance, liquidity, risk, snapshots, typed future Cosmos/EVM adapters. Live support is intentionally narrower than the type model. |
| B: versioned storage and migrations | COMPLETE | Additive private Goals store; strict Habits V1→V2 migration; original bytes retained before migration; malformed/future data fails closed. Legacy Goals, simulation, journal, metadata and Health namespaces preserved. |
| C: mainnet and testnet watch-only | COMPLETE | Explicit public address, fixed official GET-only relay, no wallet/signing path; chain/denom/decimals and coherent block evidence verified. |
| C: native staking tracker | COMPLETE | Liquid, delegated, unclaimed rewards, unbonding and total; multi-validator stake, commission/status and public validator addresses, exit times, freshness/errors. Decimal reward fractions below one base unit are conservatively floored. |
| C: APR and reward projections | COMPLETE | Optional explicit net APR assumption; 7/30/365-day simple estimates separate from principal/current rewards. Current canonical APR could not be proven; no fabricated automatic rate or APY. |
| D: allocations | COMPLETE | Multiple Positions/Goals; conservation, edits, closed release, explicit deficit and proportional counted availability after balance reductions. |
| D: Quantity and Value Goals | COMPLETE | Asset/network-specific quantity unaffected by price; explicit manual valuation with source/date; manual and verified portions separate. Automatic market valuation awaits a verified provider. |
| D: Reward/Income Goals | PARTIAL | Currently unclaimed native rewards supported. Cumulative claimed/distributed income and annual reward run-rate remain follow-up. |
| D: Project Goals | COMPLETE | Multi-stage checklist, explicit progress, milestones and status. Rich milestone dependency/weighting remains optional follow-up. |
| D: contribution plans | COMPLETE | Exact amounts, asset/currency, weekly/monthly/yearly/irregular, next/end dates, pause, explicit price assumptions and linked Habit. Plans never change observed state. |
| D: Funding Health V2 | PARTIAL | Current allocation, target, horizon, scheduled contributions, completion estimate, shortfall/surplus and liquidity warning. Actual contribution attribution/history and pace-aware integrated yield/liquidity forecasting remain follow-up. |
| E: Goals Beta / Goal Detail | PARTIAL | Cards, type/status filters, progress, manual/verified breakdown, allocation controls, staking scenarios, plans, linked Habits, milestones, observation history and editing delivered. Rich progress timeline, actual contribution history, pace and additional charts remain follow-up. Legacy simulation Goals remain available alongside tracked Goals. |
| E: Your ZIG / Positions | COMPLETE | Goals subview; observed source totals, allocated/unallocated, deficits, manual Positions, validators, provenance, freshness, read errors and gated future providers. |
| F: Habits Beta data/UI | PARTIAL | Build/quit/limit, boolean/count/duration/quantity/custom units, prospective rules, recurrence/periods, logging/timer/reflection, insights/templates/filters and stack metadata. Natural-period completion limits, neutral pauses and cadence-specific streaks corrected after independent review; see validation package. |
| F: end conditions | PARTIAL | Date and completed-period limits; linked-Goal condition is architecture-only and must be visibly unavailable, never presented as automatic. Historical rule editing UI deferred. |
| F: stacking/reminders | PARTIAL | Descriptive stack data and UI; no automation. Page-open timer only. Reliable browser-closed/native/location reminders are absent and never promised. |
| G: Goal ↔ Position ↔ Habit | COMPLETE | Several Habits/Positions per Goal, linked contribution/review Habits, behavior consistency alongside financial state; completion never increases wealth. |
| G: Today | PARTIAL | Observed mainnet total, allocated intentions, primary tracked Goal, next contribution/milestone; existing Habit and Health Today preserved. Rich liquid/staked/reward/unallocated overview and integrated future-reward tile remain follow-up. |
| G: private backup/import/export | COMPLETE | Goals/Positions/allocations/plans/snapshots plus Habits V2; Health V1 contract and filename preserved. Explicit restore confirmation, original recovery copies, newer-version refusal. |
| H: chain/fee/security evidence | COMPLETE | Live denom verification, existing transfer fee reconciliation, gated EVM metadata, unchanged live Alpha smoke; no transaction submitted. |
| H: full validation/review/CI | PARTIAL | Focused checks pass; final full checks and hosted CI still pending. See validation.json for exact results, never infer a pass from this table. |

| Remaining scope | Status | Gate |
|---|---|---|
| Rich contribution attribution, Goal timelines/charts, reward-income refinements, richer Funding Health | DEFERRED — BETA FOLLOW-UP | Verified data and explicit accounting semantics before claims. |
| Optional compounding scenario | DEFERRED — BETA FOLLOW-UP | No automatic compounding implied by current simple APR. |
| Historical Habit rule editing, automatic linked-Goal ending, automated stacks | DEFERRED — BETA FOLLOW-UP | Preserve dated history and explicit user intent. |
| Reliable browser-closed reminders | DEFERRED — BETA FOLLOW-UP | Real browser capability and permission model required. |
| Verified prices, Valdora, Zignaly, WME, EVM, IBC, RWA and broader providers | DEFERRED — EXTERNAL DEPENDENCY | Verified interfaces, decimals, provenance, freshness and separate execution authority. No exchange trading keys. |
| Health Beta, all items in HEALTH_BETA_FUTURE_RUN.md | DEFERRED — BETA FOLLOW-UP | Potential Run #10; Health V1 remains frozen. |
| Staking transactions, mainnet execution, native/location reminders | NOT AUTHORIZED | Separate future scope/approval. |
| Goal Manager upload/instantiate | BLOCKED | Funding solved; upload whitelist and fresh exact-artifact approval still required. |
| Merge, production deployment, DNS/email changes | NOT AUTHORIZED | Owner review and separate explicit authorization. |
