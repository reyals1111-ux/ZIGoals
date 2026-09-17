# Astra Run #8 — Goals, Positions, Staking & Habits Beta

**Review branch only. No merge or deployment.** This run adds private Goals backed by existing wealth and supporting Habits, within the V2.1 visual system. Exact status is in the [Beta backlog](RUN_8_BETA_BACKLOG.md), including every partial and deferred slice. The [complete master brief](RUN_8_ASTRA_MASTER_PROMPT.md) remains unchanged.

## Source and checkpoints

- Base: `94df488cd98d2a1cdc15bd11011521d24fc8066e` (fresh `origin/main`).
- Branch: `codex/run8-goals-positions-habits`.
- Tested product head, final review head, complete logical commit list and changed files: recorded in [validation.json](verification/run8/validation.json) and [resume state](verification/run8/RESUME_STATE.md) after final checks. The containing documentation commit cannot embed its own hash; obtain exact review head with `git rev-parse HEAD`.
- A persisted the full roadmap before implementation. B created Positions/storage, C added verified per-network native reads, D added allocation/scenarios, E expanded Goals/Positions/detail, F evolved Habits, G linked Today/backups/behavior, H collects independent review, local/hosted checks and evidence.

## Delivered architecture

**COMPLETE — Position layer and allocation.** `apps/web/lib/positions.ts` is a pure VM-independent domain module. It stores exact integer strings plus decimals, asset/network/account/provider identity, source, provenance, valuation evidence, liquidity, sync state, principal/rewards, validator/unbonding metadata and snapshots. All 13 requested source categories and all provider states exist, while active observations are native read-only or explicitly manual. Cosmos/EVM execution types are separate and grant no authority. Multiple Goals can allocate a Position without a transfer; allocation edits conserve units, closing releases them, and reduced external balances expose a deficit. Counted progress is conservatively proportional while original intended allocations remain visible.

**COMPLETE — watch-only native staking.** Mainnet `zigchain-1` currently uses `uzig`/6 decimals; testnet `zig-test-2` uses `azig`/18. An explicit public-address read queries only fixed official endpoints through a same-origin GET relay. Every financial/metadata page must attest the same selected block height; wrong network/denomination, duplicate or partial pagination, missing height, timeout or invalid response fails closed. Reads cover liquid ZIG, per-validator delegation, rewards and unbonding, validator commission/status/voting stake and exit dates. The relay is needed because browser CORS does not expose/allow block-height headers. It forwards no cookies, credentials, private Goal/Habit content or arbitrary URLs. Public tracking does not establish ownership. No wallet permission or signer is requested.

**COMPLETE — explicit reward scenarios.** Current canonical APR could not be proven, so only commission is verified and the user may enter a net APR assumption for simple 7/30/365-day estimates. Principal, unclaimed rewards and future estimates remain distinct. Estimates never count as current progress. No automatic APY/compounding is claimed; optional compounding is deferred.

**COMPLETE — Quantity, Value and Project Goals; PARTIAL — Reward/Income.** Quantity progress uses allocated units independent of price, with explicit native denomination normalization and network separation. Value progress requires explicit valuation and separates manual from verified evidence; no fabricated live market price. Project Goals use milestones. Reward Goals currently count unclaimed native rewards; cumulative income and annual reward-run-rate refinement are deferred.

**COMPLETE — contribution plans; PARTIAL — Funding Health V2.** Plans hold exact asset/currency amounts, cadence, dates, active state, price assumptions and optional supporting Habit. The scenario compares current allocation plus future planned contributions against the target, with completion/shortfall/surplus. Different currencies require explicit price evidence. This zero-return scenario does not attribute past balance changes or implement actual contribution pace, complete historical returns, or deadline-aware liquidation; those remain follow-up and liquidity is explicitly warned about.

**PARTIAL — expanded Goals/detail/Today.** New tracked Goals, Positions subview, filters/cards, source breakdown, allocation editing, milestone editing, staking estimates, plan controls, supporting Habits and quantity snapshots are available. Today adds observed mainnet totals, allocations, primary Goal and next contribution/milestone, retaining existing Habit/Health composition. Legacy simulation Goals are preserved alongside the new additive private model. Rich Goal timelines, contribution attribution/pace, additional charts and the full requested Today financial tile set are deferred.

**PARTIAL — Habits Beta.** V2 introduces build/quit/limit semantics; boolean, count, duration, quantity and custom units; prospective dated rules; daily/weekday/every-N/frequency/month-date recurrence; day/week/month/year targets; safe logging, skip/fail, page-open timer, notes/mood, calendar/trends/streaks, filters/templates and descriptive stacks. End dates and completion limits are implemented. Linked-Goal ending and automated stacks remain architecture-only, visibly limited; no reliable browser-closed/native/location reminders or history-rule editing UI is claimed. Independent review and subsequent semantic fixes are documented in the verification package.

**COMPLETE — behavior integration and private preservation.** Several Habits can support one Goal; contribution/review Habit creation and consistency sit beside observed progress. Completing behavior never increases Position quantity or financial Goal progress. Platform backups include Goals, Positions, allocations, plans and snapshots. Habits V1 migrates deterministically to V2 with original-byte recovery. Existing legacy Goals, metadata, simulations, journal and Health V1 are preserved. Malformed/future versions fail closed. Health data/schema/UI and shared V2.1 theme files are unchanged.

## Evidence and boundaries

The [chain and fee findings](verification/run8/CHAIN_FEE_FINDINGS.md) reconcile the approved successful testnet send: `2741875000000000 / 109675 = 25000000000 azig/gas`, versus configured `2500000000`. This proves the selected fee for that transaction, not all validator minimums or why Keplr chose it. Official setup guidance still names the lower value; no fee policy was changed. Future financial execution requires fresh simulation and confirmed reserve/fee. Funding is solved; upload permission remains blocked, and no Goal Manager/code ID is deployed.

The existing public Alpha was independently read and still reported source `69aa0260eaa6bde3294ba7a778086839246c030a`; nine route/security checks passed. Owner-provided Worker version/rollback identities remain historical owner evidence. This run submitted no transfer, claim, stake, contract upload, deployment, DNS/email change or merge.

EVM registry metadata now names chains 944/2061 but marks both incubating with no RPC entries. EVM, Valdora, Zignaly, WME, IBC, RWA and verified automatic prices remain **DEFERRED — EXTERNAL DEPENDENCY**. Health Beta remains **DEFERRED — BETA FOLLOW-UP**, with its entire potential Run #10 scope preserved. Staking/mainnet execution and production changes remain **NOT AUTHORIZED**.

## Verification and review

**COMPLETE — validation and review package.** Local: 751 JavaScript tests, 25 Rust tests, 104 production desktop/mobile browser checks and 28 Workers checks pass, with no skipped or flaky browser tests. Lint, typecheck, Next/OpenNext builds, clean Alpha identity, Wrangler dry run, dependency audit, limited secret scan and config checks pass. Hosted web, contract, both canonical builds and byte comparison pass on draft PR #15. Exact CI head: `61e6081e9c7490f4182c12d5537f111b5cf97c53`; tested product head: `ae973ee04ff0162fb9f25eb012dcb373fc622c16`.

Aggregate emitted JavaScript grew 37,524 gzip bytes (+5.454%); CSS grew 912 gzip bytes (+3.851%) against the same-lockfile base archive. These are all-route file sums, not initial-page transfer or production CPU. The local Worker dry-run bundle is about 1,937 KiB gzipped. Seventeen fictional-fixture screenshots cover tracked Goals/detail/Positions, staking, Today, Habits and unchanged Health.

Final command outcomes, source identity, test totals, browser coverage, build sizes, screenshots and hosted CI are recorded in [the verification index](verification/run8/README.md). Initial review findings are retained with their fix evidence; no initial failed run is presented as a pass. Live provider evidence uses a synthetic public account with zero balance; nonzero multi-validator, reward and unbonding paths are fixture-tested. Limited secret pattern scanning is not a comprehensive secret audit. No post-deployment production CPU claim is possible because nothing was deployed.

## Owner actions

Review the draft PR, visual evidence, tests and explicitly partial backlog. Merge/deployment requires separate authorization. A future deployment should use the existing owner-controlled workflow with exact source and rollback verification, then owner acceptance of real browser persistence/watch-only reads. Future contract work still requires whitelisting, a fresh canonical exact-current-main artifact and explicit artifact/fee approval; successful funding and a simple send do not satisfy those gates.

## Run #8.1 — owner preview follow-up

- Goal creation opens setup directly; a four-step strip exposes allocation → plan → supporting Habit → progress. Explicit quick stake allocation conserves units across validators and caps at the exact remaining target, including mixed precision. Stale stake requires refresh; manual controls remain available.
- Tracked Goal cards reuse SceneArt/destination styling, nebula progress and a clear management CTA. Positions gives staked principal a white-to-nebula hero metric; the sidebar adds Stake / Positions.
- Today places a compact snapshot staking card between Wallet and Destination; the main tracked Goal section focuses on progress, next contribution and milestone.
- Optional net APR assumptions persist privately per observed account/network. Missing assumptions remain Not set; no rate is invented. Positions supports explicit snapshot-account selection.
- Recurring USD/EUR purchase plans can create Buy ZIG with amount/unit/frequency; safe explicit reconciliation preserves prior dated Habit history. Completion never changes financial progress.
- Validation: 43 targeted unit tests, 28 production desktop/mobile browser checks; lint, typecheck, production build and diff whitespace check pass. Widths 1440/768/390/320; shared Health navigation checked, Health code unchanged. No server changes; no extra local Workers run. Focused review caught and fixed a mixed-precision target cap defect.
- Evidence and eight requested preview images: [Run #8.1 captures](verification/run8-1/README.md). Images use fictional fixture data, never the owner's private state.
- Same Run #8 branch/draft PR #15; no merge, deployment or blockchain action.
