> Current Run10 reconciliation: the expanded authoritative scope supersedes former scheduling exclusions. See [the full requirements ledger](run10/REQUIREMENTS.json) and current evidence. The dated list below is preserved as historical scope, not a claim that newly implemented or remaining items are unchanged.

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
| G: Today | PARTIAL | Primary tracked Goal, next contribution/milestone and compact read-only staked ZIG / optional net APR card (Run #8.1); existing Habit and Health Today preserved. Richer financial overview remains follow-up. |
| G: private backup/import/export | COMPLETE | Goals/Positions/allocations/plans/snapshots plus Habits V2; Health V1 contract and filename preserved. Explicit restore confirmation, original recovery copies, newer-version refusal. |
| H: chain/fee/security evidence | COMPLETE | Live denom verification, existing transfer fee reconciliation, gated EVM metadata, unchanged live Alpha smoke; no transaction submitted. |
| H: full validation/review/CI | COMPLETE | All required local checks pass: 751 JS, 25 Rust, 104 production browser, 28 Workers checks; all five hosted web/contract/reproducibility checks pass. See validation.json for exact results, never infer a pass from this table. |

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
| Run #8/#8.1 merge and existing Alpha Worker deployment | COMPLETE — OWNER VERIFIED | PR #15 merged and exact-source Alpha release completed; see `verification/run8-1-release/README.md`. |
| DNS/email changes | NOT AUTHORIZED | Separate explicit authorization remains required. |

## Run #8.1 — owner preview follow-up

Delivered: direct Goal setup, exact quick multi-validator allocation, clear plan/Habit actions, premium tracked Goal cards, Stake / Positions sidebar shortcut, hierarchical Position metrics, Today staking card and account/network-scoped APR persistence. Existing manual controls and Habit history remain intact. Validated with 43 targeted unit tests and 28 production browser checks at 1440/768/390/320, lint/typecheck/build and diff checks; [evidence](verification/run8-1/README.md). No additional roadmap scope, Health changes, merge or deployment.

## Run #8.1 — unified Goals polish

- COMPLETE: one Goals collection and creator over intentionally separate legacy/private stores, backwards-compatible detail links, explicit Position allocation and contribution/Habit setup.
- COMPLETE: counted-progress completion reconciliation, allocation ownership rows and inline available-unit/error feedback; original histories retained.
- Validation: [production checks and screenshots](verification/run8-1-unified/README.md). Existing deferred contract/provider/Health scope remains unchanged.
