ASTRA RUN #8 — ZIGOALS GOALS, POSITIONS, STAKING & HABITS BETA

You are implementing the largest ZIGoals product milestone so far.

THIS IS AN IMPLEMENTATION RUN, NOT A PLANNING-ONLY RUN.

This run intentionally EXCLUDES Health implementation to control scope and usage cost.

The primary objective is to make a major technical and product leap in:

- Goals
- Universal Position tracking
- Native ZIG staking tracking
- Goal allocations
- Goal projections
- Goal ↔ Habit integration
- Habits Beta
- Today/dashboard integration

The current deployed V2.1 UI/theme is explicitly FROZEN.

Work methodically, checkpoint frequently, test intelligently, and leave an exact resumable state if usage/credits interrupt the run.

Do not silently drop scope.

============================================================
0. CURRENT TRUE STATE — VERIFY BEFORE CHANGING ANYTHING
============================================================

Repository:
reyals1111-ux/ZIGoals

Start from fresh current main.

At the time this brief was prepared:

Current main after PR #14:
94df488cd98d2a1cdc15bd11011521d24fc8066e

Current deployed public Alpha application source:
69aa0260eaa6bde3294ba7a778086839246c030a

Alpha Worker:
zigoals-alpha

Live Alpha Worker version:
836e3ad7-af0a-46cd-8e32-e050d747e6f2

Verified rollback:
dd86bc45-0fcd-45e2-b8c4-5ec278d1cb80

Goal Manager:
NOT DEPLOYED

Code ID:
NOT DEPLOYED

Live Alpha financial execution:
DISABLED

------------------------------------------------------------
TESTNET FUNDING STATE
------------------------------------------------------------

The dedicated zig-test-2 wallet received 5,000 test ZIG.

Funding blocker is therefore SOLVED.

Wallet account number observed:
148458

A first owner-approved outbound testnet transaction succeeded.

Self-transfer:
0.01 ZIG

Transaction hash:
53216EEFF500DDD5D5A69B6EABF2E844ADC3988BE8D61CA277C1A979BCE5EA4C

Block:
7812205

Sequence used:
0

Sequence afterward:
1

Gas wanted:
109675

Gas used:
89869

Fee:
2741875000000000 azig

Post-transaction wallet balance:
4999997258125000000000 azig

ZIGScan independently showed:
SUCCESS
MsgSend

The live ZIGoals Alpha independently displayed the updated wallet balance.

Do not repeat unnecessary test transfers.

------------------------------------------------------------
CURRENT COSMWASM BLOCKER
------------------------------------------------------------

Fresh read-only wasm params showed:

code_upload_access.permission:
AnyOfAddresses

The dedicated ZIGoals wallet is NOT in the current address list.

instantiate_default_permission:
Everybody

ZIGChain support says CosmWasm whitelisting is currently paused while its larger EVM integration is implemented/tested.

No ETA exists.

Therefore:

Goal Manager upload remains BLOCKED.

Do not attempt to bypass this.

Do not submit an upload transaction expected to fail.

Do not contact support.

Do not request more funds.

The owner already thanked support for the successful funding.

------------------------------------------------------------
FEE OBSERVATION
------------------------------------------------------------

Repository/configured baseline:
2,500,000,000 azig/gas

Observed Keplr transaction effective gas price:
25,000,000,000 azig/gas

The support funding transaction also showed the higher observed effective gas price.

Do NOT blindly change application gas pricing by 10x.

Investigate current official ZIGChain guidance and observed behavior.

Record the finding.

Future contract execution must use current simulation/validator evidence before enabling financial execution.

============================================================
1. FIRST ACTION — PERSIST THE COMPLETE MASTER ROADMAP
============================================================

BEFORE touching product implementation, write the complete Run #8 product direction into the repository.

Create:

docs/roadmap/PRODUCT_PLATFORM_BETA_MASTER_PLAN.md
docs/RUN_8_ASTRA_MASTER_PROMPT.md
docs/RUN_8_BETA_BACKLOG.md

Update:

docs/RUN_8_PLAN.md
docs/roadmap/LONG_TERM_VISION.md
docs/STATUS.md
docs/research/ZIGCHAIN_CURRENT_STATE.md

Also create:

docs/roadmap/HEALTH_BETA_FUTURE_RUN.md

The Health document is important.

Health implementation is OUT OF SCOPE for Run #8, but its previously agreed future scope must not be forgotten.

Record it for a potential future Run #10.

That future Health scope includes:

- MyFitnessPal-class functional breadth with original ZIGoals UX
- food diary improvements
- Recent / Frequent / Favorites
- saved meals
- meal copying
- multi-day logging
- remote food provider abstraction
- Open Food Facts
- optional USDA FoodData Central
- barcode scanning
- custom foods
- recipe expansion
- broader nutrients
- per-meal macros
- water
- fasting
- cardio
- strength
- workouts
- steps
- body measurements
- weight/trend expansion
- progress overview
- CSV export
- meal planning
- grocery list architecture
- photo meal recognition architecture
- voice food logging architecture
- Apple Health
- wearables
- connected scales
- cloud sync/privacy considerations

DO NOT implement those Health features in Run #8.

Do not alter Health schemas merely to prepare for them.

Do not redesign Health.

Preserve Health V1 behavior completely.

The purpose of docs/roadmap/HEALTH_BETA_FUTURE_RUN.md is to guarantee none of this scope disappears.

Commit the master-plan checkpoint before major implementation.

============================================================
2. PRODUCT THESIS
============================================================

ZIGoals positioning:

"The Goal Layer for ZIGChain."

Consumer direction:

"Your goals. Onchain."

Product thesis:

"Goals, Habits & Health = Wealth."

Health remains part of the overall long-term product thesis even though Health implementation is deferred from this run.

New core interpretation:

ZIGoals connects the wealth users already have, and the habits that grow it, to the life goals they care about.

A Goal MUST NOT require ZIGoals custody.

Existing wealth should be trackable where it already exists.

The Goal Manager is one optional execution rail.

It is NOT the definition of a Goal.

Core architecture:

Goal
  -> Position
  -> Allocation
  -> Policy
  -> optional Execution Adapter

Habits represent behavior.

Positions represent actual financial state.

Goals connect the two.

============================================================
3. VISUAL SYSTEM — STRICTLY FROZEN
============================================================

The owner has explicitly frozen the current UI/theme.

Visual changes are allowed only where necessary to fit new functionality or improve usability, and must remain visually consistent with the deployed V2.1 Alpha.

DO NOT redesign the application.

DO NOT replace the current visual identity.

DO NOT introduce a new visual language.

DO NOT perform a "V3 redesign."

DO NOT substantially change:

- overall dark cosmic/nebula identity
- primary navigation style
- sidebar character
- typography hierarchy
- gradient language
- glow treatment
- card language
- border language
- icon style
- spacing philosophy
- page composition philosophy
- current logo treatment
- responsive philosophy
- current premium ZIGoals feel

Any new:

- staking card
- Position card
- Goal panel
- validator table
- projection widget
- Habit control
- allocation panel
- chart
- modal
- form
- tab
- status indicator

must look as though it always belonged to the existing V2.1 product.

Use the existing CSS/design tokens/components wherever possible.

Create new visual primitives only when the existing system cannot express the required functionality.

Do not rebuild working layouts merely for aesthetics.

This run is primarily a TECHNICAL / PRODUCT CAPABILITY EXPANSION inside the existing theme.

============================================================
4. UNIVERSAL POSITION LAYER — MUST SHIP
============================================================

Design and implement a typed universal Position model.

A Position represents an observable or manually tracked financial position.

Required provider/source categories should support architecture for at least:

- WALLET_LIQUID
- NATIVE_STAKING
- NATIVE_UNBONDING
- NATIVE_REWARDS
- GOAL_MANAGER
- MANUAL
- LIQUID_STAKING
- VAULT
- EXTERNAL_ACCOUNT
- IBC
- EVM
- RWA
- OTHER_VERIFIED_PROVIDER

Not every provider becomes live in Run #8.

The type system must explicitly distinguish:

- VERIFIED_READ_ONLY
- MANUAL
- RESEARCH_ONLY
- EXECUTION_READY
- EXECUTABLE

A provider becoming readable MUST NOT automatically make it executable.

A Position should be capable of carrying:

- stable ID
- provider ID
- provider/source type
- network
- wallet/account/source identifier
- asset/denom
- exact integer quantity
- decimals
- optional display valuation
- valuation source
- valuation timestamp
- principal
- unclaimed rewards
- liquidity state
- bonded state
- unbonding metadata
- expected exit date
- verification state
- sync state
- freshness
- observed-at timestamp
- source provenance
- risk metadata
- execution authority status

Never use floating point for chain financial quantities.

Use exact integer/base-unit arithmetic.

============================================================
5. MAINNET WATCH-ONLY / READ-ONLY MODE — MUST SHIP
============================================================

Users should be able to track real ZIGChain wealth WITHOUT allowing ZIGoals to transact with it.

Add a strong read-only mainnet/watch-only boundary.

Suggested environment semantics:

MAINNET_READ_ONLY
or
WATCH_ONLY

This mode may:

- read public wallet balance
- read delegations
- read validator data
- read rewards
- read unbonding state
- read public chain metadata
- create private local Goals
- allocate observed Positions conceptually to Goals
- track progress

It MUST NOT:

- obtain a mainnet signer
- request mainnet Keplr transaction approval
- broadcast any transaction
- call an execution adapter
- stake
- unstake
- redelegate
- claim rewards
- execute Goal Manager actions
- infer ownership simply from a public address

Tracking a public address is not custody.

UI must clearly distinguish:

Local Demo
Testnet Wallet
Mainnet Read-Only / Watch-Only

Do not weaken PUBLIC_ALPHA_UNDEPLOYED protections.

============================================================
6. NATIVE ZIG STAKING TRACKER — MUST SHIP
============================================================

Native ZIG staking becomes a first-class PositionProvider.

Use current official ZIGChain documentation and verified public chain interfaces.

Implement read-only support for:

- liquid wallet ZIG
- total delegated ZIG
- total unclaimed staking rewards
- total unbonding ZIG
- total observed ZIG
- per-validator stake
- validator identity
- validator status
- validator commission
- validator voting power if useful
- validator link/explorer reference when available
- delegation list
- rewards per validator
- unbonding entries
- unbonding completion date/time
- freshness timestamp

Support wallets delegated across multiple validators.

------------------------------------------------------------
APR / APY
------------------------------------------------------------

Use APR terminology for native ZIG staking by default.

Do not label APR as APY.

Where safely derivable from current official information:

- network staking APR
- validator commission
- final delegator APR

should be shown.

If a canonical current APR cannot be proven safely:
show only the level of evidence that can actually be verified.

Reward projections:

- 7 days
- 30 days
- 365 days

Default calculation:

simple APR

Required disclaimer:

"Estimate assumes current stake and APR remain unchanged."

Separate:

- principal
- currently unclaimed rewards
- future projected rewards

Do NOT count projected future rewards as current Goal progress.

If a user explicitly selects a compounding assumption:

- claim/restake weekly
- monthly
- custom supported period

then a separate estimated APY/compounded projection may be calculated.

Never imply automatic compounding when it does not exist.

Never imply guaranteed yield.

------------------------------------------------------------
NO STAKING TRANSACTIONS
------------------------------------------------------------

Run #8 native staking functionality is READ-ONLY.

Do NOT add live buttons for:

- Delegate
- Undelegate
- Redelegate
- Claim Rewards

unless the owner separately authorizes such execution later.

The purpose of this milestone is tracking and Goal integration.

============================================================
7. GOAL TYPES — GOAL ENGINE V2
============================================================

Goals require a major functional expansion.

At minimum implement:

------------------------------------------------------------
A. QUANTITY GOAL
------------------------------------------------------------

Example:

Current:
263,000 ZIG

Target:
300,000 ZIG

Progress:
87.666...%

Price changes MUST NOT alter quantity progress.

Useful for:
- accumulate ZIG
- grow staked ZIG
- token accumulation
- asset quantity targets

------------------------------------------------------------
B. VALUE GOAL
------------------------------------------------------------

Example:

Current valued assets:
$40,000

Target:
$50,000

Market valuation can change progress.

Clearly distinguish:

- contributions
- market movement
- rewards
- manual adjustments

A verified price source is required for automatic valuation.

If no verified provider exists:
support explicit/manual valuation rather than fabricating a price.

------------------------------------------------------------
C. REWARD / INCOME GOAL
------------------------------------------------------------

Examples:
- accumulate X ZIG staking rewards
- reach X annual reward run-rate
- accumulate X distributed income

Use evidence-backed observed/reward projections only.

------------------------------------------------------------
D. PROJECT / MILESTONE GOAL
------------------------------------------------------------

Support multi-stage/non-financial Goals with milestones/checklists.

Useful ideas can be inspired by tracker applications such as Strides:

- Habit
- Target
- Average
- Project

but use original ZIGoals terminology and UX.

Do not copy branded UI or proprietary assets.

============================================================
8. GOAL POSITION ALLOCATION — MUST SHIP
============================================================

A Position may support one or more Goals WITHOUT moving funds.

Implement GoalAllocation.

Conceptual example:

Observed Position:
100,000 ZIG

Goal A:
40,000 allocated

Goal B:
30,000 allocated

Unallocated:
30,000

Allocation is private Goal accounting.

It is NOT an onchain transfer.

------------------------------------------------------------
DOUBLE COUNT PREVENTION
------------------------------------------------------------

The same units MUST NOT silently count multiple times.

Rules:

sum(goal allocations for position)
<=
allocatable observed position units

Expose:

- observed units
- allocated units
- unallocated units

Closed Goals release allocations.

If an external balance falls:

Example:
Position was 100,000
Allocated was 90,000
Observed balance becomes 70,000

Do NOT fabricate a valid state.

Show allocation deficit / over-allocation requiring review.

Add property tests for:

- allocation conservation
- no double counting
- closed Goal release
- external balance reduction
- allocation edits
- multiple Goals
- multiple Positions

============================================================
9. GOAL ↔ MULTIPLE POSITIONS
============================================================

A Goal can use several Position sources.

Example:

Goal:
300,000 ZIG

Current allocation:

200,000 native staked ZIG
40,000 liquid wallet ZIG
20,000 future verified stZIG Position
5,000 manual external Position

Total current verified/manual allocation must be transparently separated.

Never treat MANUAL as VERIFIED.

Goal progress UI should show source breakdown.

============================================================
10. CONTRIBUTION PLANS — MUST SHIP
============================================================

Goals should have recurring planned contributions independent of actual financial state.

Examples:

- Buy $500 ZIG each month
- Add 1,000 ZIG monthly
- Save weekly
- Invest every payday
- manual irregular contributions

Fields may include:

- amount
- currency/asset
- cadence
- next expected date
- start/end
- linked Habit
- active/paused
- projection assumption

A fiat contribution plan linked to a ZIG quantity Goal needs:

either:
- explicit price assumption

or:
- verified price provider

Never invent a market price.

Changing the price assumption may alter projections.

It MUST NOT alter observed quantity progress.

============================================================
11. GOAL ↔ POSITION ↔ HABIT — CENTRAL PRODUCT FEATURE
============================================================

This must become one of the defining ZIGoals experiences.

Example:

GOAL:
Reach 300,000 staked ZIG

CURRENT POSITION:
263,000 staked ZIG

SUPPORTING HABIT:
Buy $500 of ZIG every month

Habit completion means:

the user completed the behavior.

Habit completion DOES NOT automatically create financial progress.

Financial Goal progress changes only from:

- observed wallet Position
- observed staking Position
- verified provider Position
- explicitly updated manual Position
- eventual Goal Manager Position

Show both dimensions together:

Behavior consistency:
5 / 6 monthly buy Habits completed

Financial progress:
263,000 / 300,000 ZIG

Do not confuse behavior with financial state.

Support:

- several Habits per Goal
- several Positions per Goal
- one Habit linked to a Goal
- Goal-linked contribution Habit templates

Future detected Position changes may suggest:
"Your linked ZIG Position increased."

But must not fabricate the cause.

============================================================
12. GOALS BETA — MAJOR FEATURE EXPANSION
============================================================

Upgrade the Goals page substantially while preserving the existing V2.1 visual style.

Goal cards should be capable of showing:

- Goal type
- target
- current observed/allocated position
- progress %
- remaining amount
- pace
- Funding Health
- contribution plan
- projected completion
- Position source summary
- staking/reward contribution where relevant
- liquidity state
- linked Habit count
- milestone status
- data freshness
- sync/verification state

Add useful filters/views such as:

- Active
- Completed
- Closed
- Quantity
- Value
- Staking
- Projects

Avoid clutter.

Use the existing component language.

============================================================
13. GOAL DETAIL V3 FUNCTIONAL EXPANSION
============================================================

This is NOT a visual redesign.

It is a richer Goal dashboard using the existing V2.1 visual system.

Goal detail should include:

OVERVIEW
- current
- target
- remaining
- progress %
- Goal type
- status
- pace

POSITION BREAKDOWN
- source
- allocated amount
- liquid
- staked
- rewards
- unbonding
- manual
- verification state

STAKING
where relevant:
- validator(s)
- delegated principal
- commission
- APR
- unclaimed rewards
- unbonding
- 7-day projection
- 30-day projection
- 365-day projection

CONTRIBUTION PLAN
- recurring amount
- cadence
- next expected contribution
- completion projection

HABITS
- linked Habits
- due today
- consistency
- contribution Habit

MILESTONES
- intermediate target markers

PROJECTIONS
- observed state
- planned contribution scenario
- optional reward assumption
- projected completion

HISTORY
- Position snapshots where available
- Goal progress timeline
- contribution observations

LIQUIDITY / RISK
- bonded
- unbonding
- liquid
- provider risks
- data freshness

Facts, plans and projections MUST be visually distinguishable.

============================================================
14. FUNDING HEALTH V2
============================================================

Expand Goal Engine Funding Health.

Funding Health should consider:

- current observed allocation
- target
- time remaining
- planned contributions
- actual contribution history
- optional verified reward assumption
- current pace
- shortfall
- surplus
- liquidity constraints when relevant

Scenarios must be explicitly labelled.

Projected future rewards do not become current principal.

A change in projection must not silently rewrite historical progress.

============================================================
15. POSITIONS / "YOUR ZIG" VIEW — MUST SHIP
============================================================

Add a user-facing Position view without cluttering the top-level product pillars.

Possible placement:

Goals -> Positions

or:

Today -> Your ZIG

Choose the cleaner fit within existing navigation.

Do NOT make unnecessary new global navigation if a sub-view is sufficient.

The view should show:

- liquid ZIG
- staked ZIG
- unclaimed rewards
- unbonding ZIG
- total observed ZIG
- allocated to Goals
- unallocated
- validators
- providers
- APR
- freshness
- sync state
- verification state

Future provider categories may appear only if truthful:

- Valdora
- vault
- manual
- external account
- EVM
- IBC

Do not make unavailable providers look active.

Think:

ZIGChain-focused portfolio tracker

but Goal-centric, not generic portfolio management.

============================================================
16. HABITS BETA — COMPLETE PRODUCT EXPANSION
============================================================

Habits should become a complete, polished product module comparable in functional breadth to strong habit-tracking applications.

Preserve all Habits V1 data/history.

Current V1 already has:

- CRUD
- daily schedule
- selected weekdays
- count targets
- pause
- archive
- resume
- notes
- history
- calendar
- current streak
- best streak
- weekly consistency
- Goal links
- private browser persistence

Extend toward Habitify/Streaks-class functional breadth.

Do not copy their branding or UI.

------------------------------------------------------------
RECURRENCE
------------------------------------------------------------

Implement as much as correctly supportable:

- daily
- selected weekdays
- every N days
- X times per week
- X times per month
- specific dates in month
- yearly target where useful

Preserve historical schedule rules.

Changes must apply prospectively unless the user explicitly edits history.

------------------------------------------------------------
HABIT TYPES
------------------------------------------------------------

Support:

BUILD
QUIT
LIMIT

BUILD:
positive action to complete.

QUIT:
avoid an undesired behavior.

LIMIT:
stay below a defined maximum.

Do not force all three into identical completion semantics.

------------------------------------------------------------
MEASUREMENT TYPES
------------------------------------------------------------

Support:

- boolean
- count
- duration
- quantity
- custom unit

Examples:

Read:
30 minutes

Walk:
8,000 steps

Buy ZIG:
500 USD

Drink water:
2 liters

Study:
1 hour

No-spend:
boolean/limit-style

------------------------------------------------------------
TARGET PERIODS
------------------------------------------------------------

Support:

- per day
- per week
- per month
- per year

when compatible with the Habit type.

------------------------------------------------------------
LOGGING CONTROLS
------------------------------------------------------------

Depending on Habit measurement:

- Smart Done
- +1
- -1 when safe
- manual value
- set value
- add value
- timer for duration Habits

Do not add meaningless controls to incompatible Habit types.

------------------------------------------------------------
STATUS
------------------------------------------------------------

Represent:

- complete
- partial
- due
- skipped
- failed
- paused
- archived
- not scheduled
- future

Skip is not the same as success.

Fail is not the same as skip.

------------------------------------------------------------
STREAKS / CONSISTENCY
------------------------------------------------------------

Support correct semantics for:

- scheduled-day streaks
- weekly targets
- monthly targets
- best streak
- current streak
- success count
- fail count
- skip count
- completion %
- consistency

Do not penalize non-scheduled days.

------------------------------------------------------------
ORGANIZATION
------------------------------------------------------------

Support:

- Morning
- Afternoon
- Evening
- custom category/area
- Goal-linked grouping

Keep Today interaction fast.

------------------------------------------------------------
INSIGHTS
------------------------------------------------------------

Add:

- day trend
- week trend
- month trend
- year trend
- calendar visualization
- streak board
- consistency statistics
- success/fail/skip distribution

Keep charts visually consistent with V2.1.

------------------------------------------------------------
REFLECTION
------------------------------------------------------------

Enhance notes/reflection.

Optional:

- short daily reflection
- optional mood tag
- private notes

Do not treat mood data as medical information.

------------------------------------------------------------
TEMPLATES
------------------------------------------------------------

Add useful Habit templates.

Examples:

Finance:
- Buy ZIG monthly
- Review budget weekly
- Add to savings

Health:
- Walk
- Exercise
- Drink water

Learning:
- Read
- Study

Goals:
- contribution Habit
- weekly Goal review

Templates are starting points only.

------------------------------------------------------------
END CONDITIONS
------------------------------------------------------------

Support architecture for:

- no end date
- end date
- number of completions
- "until linked Goal reaches target"

Do not auto-archive unpredictably.

------------------------------------------------------------
HABIT STACKING
------------------------------------------------------------

Design a simple dependency/stacking relationship.

Example:
After Morning Coffee -> Read 10 minutes

If full behavior automation is too expensive for this run:
implement the data model and basic UI without fake automation.

------------------------------------------------------------
REMINDERS
------------------------------------------------------------

Browser/local reminders may be added only where truthful.

Do not fake reliable reminders if browser limitations prevent them while the browser is closed.

Explain limitations.

Do not implement native/location reminders in this web milestone.

============================================================
17. TODAY DASHBOARD — INTEGRATE, DO NOT REDESIGN
============================================================

The Today page should make the new product architecture understandable.

Keep the existing V2.1 composition and theme.

Extend its content.

Financial/Goal areas may show:

- total observed ZIG
- liquid ZIG
- staked ZIG
- unclaimed rewards
- allocated to Goals
- unallocated ZIG
- primary Goal progress
- next contribution
- expected staking rewards
- next Goal milestone

Habits area should show:

- Habits due today
- Goal-linked Habits
- contribution Habit
- fast completion/logging

Health area:
PRESERVE CURRENT HEALTH V1 ONLY.

Do not expand Health functionality in Run #8.

Do not redesign it.

The phrase:

"Goals, Habits & Health = Wealth."

may be integrated where it improves comprehension.

Do not turn it into repetitive marketing decoration.

============================================================
18. POSITION PROVIDER ARCHITECTURE
============================================================

Extend the ecosystem architecture into PositionProvider concepts.

Potential providers:

- native ZIG wallet
- native staking
- native rewards
- native unbonding
- Goal Manager
- Valdora stZIG
- Valdora vaults
- OroSwap LP
- PermaPod
- WME
- Zignaly external account
- Nawa
- IBC
- EVM
- RWA
- manual

No provider becomes executable simply because it is listed.

------------------------------------------------------------
ZIGNALY
------------------------------------------------------------

Do NOT request exchange trading API keys.

Do NOT implement trading.

Until a suitable verified read-only/public integration surface exists:

support:
- manual tracking architecture
or
- verified read-only provider only

------------------------------------------------------------
VALDORA
------------------------------------------------------------

Do not implement execution until:

- canonical message schema
- deployed source/code provenance
- valuation semantics
- redemption lifecycle
- fee semantics
- testnet evidence

are proven.

------------------------------------------------------------
WME
------------------------------------------------------------

Architecture only until official executable interface exists.

------------------------------------------------------------
MANUAL POSITION
------------------------------------------------------------

Implement or strongly support MANUAL Positions.

This allows a user to track unsupported wealth without pretending it is synchronized.

Manual Position UI must clearly say MANUAL.

Allow:

- provider/name
- asset
- quantity
- optional value
- notes
- observed/updated date

Manual values must never be presented as chain-verified.

============================================================
19. EVM-READY ARCHITECTURE
============================================================

Keep Goal Engine VM-independent.

Future:

Goal Engine
  -> Goal Policy
  -> PositionProvider
  -> optional ExecutionAdapter

Separate:

CosmosExecutionAdapter
EvmExecutionAdapter

Never allow Cosmos wallet authority to imply EVM authority.

Refresh official ZIGChain EVM documentation at run start.

Do not invent:

- EVM chain ID
- JSON-RPC
- MetaMask configuration
- account mapping
- deployed contract
- gas model

If unavailable:
leave EVM RESEARCH_ONLY / FUTURE_GATED.

Do not spend a large portion of Run #8 hunting unpublished EVM interfaces.

This is architecture/future-proofing, not the primary implementation focus.

============================================================
20. HEALTH — STRICT RUN #8 FREEZE
============================================================

Health V1 must continue working.

DO NOT:

- change Health schema
- change Health storage key
- change Health diary logic
- add food APIs
- add barcode
- add fasting
- add water
- add nutrients
- add meal planning
- add grocery lists
- add photo scan
- add voice
- add wearables
- add Apple Health
- add Health redesign

Only change shared application code touching Health if technically unavoidable for compatibility with the new shell/data architecture.

If shared changes touch Health:
run regression tests and preserve exact functionality.

All future Health Beta ideas belong in:

docs/roadmap/HEALTH_BETA_FUTURE_RUN.md

Potential future milestone:
Astra Run #10.

============================================================
21. DATA MIGRATIONS / BACKWARDS COMPATIBILITY
============================================================

This milestone changes major Goal/Habit data structures.

Design explicit versioned migration paths.

Do not destroy or silently reset:

- existing Goal data
- Goal metadata
- local simulation data
- transaction journal
- Habits V1 history
- Health V1 data

All migrations require deterministic tests.

Position/allocation state must be versioned.

Fail closed on malformed/newer unsupported versions.

Backups/import/export should support:

- expanded Goal model
- Position links
- allocations
- contribution plans
- Habits Beta

Do not modify Health backup format unless strictly necessary.

============================================================
22. PRIVACY
============================================================

Private data remains browser-local by default.

Separate public chain data:

- wallet address
- balance
- delegation
- validator
- reward
- public transaction

from private data:

- Goal names
- Goal notes
- Goal allocation intentions
- contribution plans
- Habit names/notes
- Habit history
- Health data

Public address lookup is allowed in watch-only mode.

Do not send private Goal/Habit/Health content to RPC endpoints.

Do not send owner personal financial details to third-party providers.

Do not put private text into URLs.

============================================================
23. SECURITY / FINANCIAL AUTHORITY
============================================================

Do not weaken:

PUBLIC_ALPHA_UNDEPLOYED
assertFinancialExecutionAllowed
contract-evidence validation
receipt verification
transaction journal
signer checks
network validation
nonce/CSP architecture
testnet/mainnet separation

Mainnet watch-only code MUST NOT contain a transaction execution path.

Do not add:

- arbitrary contract execute target
- arbitrary transaction composer
- arbitrary destination signer
- AI signer
- automated investment decisions
- provider custody
- unverified strategy execution
- automatic staking
- automatic reward claim
- automatic rebalancing

============================================================
24. TESTNET FEE INVESTIGATION
============================================================

Investigate the current discrepancy:

configured:
2,500,000,000 azig/gas

observed Keplr:
25,000,000,000 azig/gas

Determine using current official evidence:

- documented gas-price guidance
- validator minimum gas behavior
- Keplr selection behavior where observable
- whether current Goal Manager simulation/fee reserve logic remains safe

Do not change fee policy without evidence.

Record findings.

Add tests if code changes.

This investigation should be bounded.

Do not let it dominate the milestone.

============================================================
25. TESTING STRATEGY — CREDIT EFFICIENT
============================================================

This run has a usage budget.

Do not repeatedly run the entire slow suite after every small edit.

During implementation:

POSITION PHASE:
run Position/allocation/chain targeted tests.

STAKING PHASE:
run staking/provider/projection tests.

GOALS PHASE:
run Goal Engine/Goal UI targeted tests.

HABITS PHASE:
run Habit unit/browser tests.

INTEGRATION PHASE:
run dashboard/Goals/Habits/Position integration tests.

Use typecheck/lint intelligently.

Only run the entire browser/reproducibility suite after the major implementation is coherent.

============================================================
26. REQUIRED FINAL VALIDATION
============================================================

At final milestone completion run:

- git diff --check
- pnpm lint
- pnpm typecheck
- full JS/Vitest suite
- Rust fmt
- Rust clippy
- Rust tests
- production Next build
- full Playwright desktop
- full Playwright mobile
- 320px tests
- reduced-motion checks
- privacy/egress tests
- allocation/double-counting property tests
- migration tests
- staking projection tests
- mainnet watch-only safety tests
- Alpha OpenNext build
- Wrangler dry run
- Cloudflare/OpenNext public Alpha security gate
- secret scan
- deployment-config validation

If protected contract/build paths changed:
run canonical reproducibility.

No flaky or skipped failure should be silently ignored.

============================================================
27. CHECKPOINT STRATEGY — CRITICAL FOR CREDIT BUDGET
============================================================

This run may hit usage/credit limits.

Protect progress.

Create coherent commits after at least:

A. master roadmap / docs
B. Position model + migrations
C. mainnet watch-only + native staking
D. Goal allocations + Goal Engine V2
E. Goals Beta / Goal Detail expansion
F. Habits Beta
G. Today / integration
H. final validation / evidence

Push each coherent checkpoint when possible.

Never leave multiple hours of work uncommitted.

If usage appears close to exhaustion:

1. finish current coherent feature;
2. targeted test it;
3. commit it;
4. push;
5. update RUN_8_BETA_BACKLOG.md;
6. write exact RESUME_STATE;
7. STOP.

Do not waste final credits on optional cosmetic polish.

============================================================
28. PRIORITY ORDER IF EVERYTHING CANNOT FIT
============================================================

Do not remove lower-priority scope from roadmap/backlog.

P0 — MUST DO FIRST

1. master roadmap persistence
2. migrations
3. Universal Position Layer
4. mainnet watch-only
5. native staking tracker
6. staking APR/reward projections
7. Goal allocations
8. double-count protection
9. Goal Engine V2
10. Quantity Goals
11. Value Goals architecture/implementation
12. contribution plans
13. Goal ↔ Position ↔ Habit integration
14. Goals Beta
15. Goal Detail functional expansion
16. Your ZIG / Positions view
17. core Habits Beta data model
18. core Habits Beta UI
19. Today integration
20. privacy/security/tests

P1 — DO NEXT

- advanced Habit recurrence
- custom Habit units
- timers
- build/quit/limit completion details
- advanced Habit insights
- Habit templates
- Habit stacking
- browser reminders
- manual external Positions
- reward/income Goal refinements
- project/milestone Goal refinements
- richer Position history
- additional charts
- contribution history

P2 — PRESERVE IN ROADMAP IF NOT COMPLETED

- verified Valdora Position sync
- Zignaly live integration
- WME Position sync
- EVM Position sync
- broader ecosystem PositionProviders
- staking transaction execution
- mainnet execution
- mobile-native reminders

Do not forget P2.

============================================================
29. CONDITIONAL GOAL MANAGER TAIL
============================================================

Goal Manager deployment is NOT the primary objective.

Current funding prerequisite:
SOLVED

Current whitelist prerequisite:
NOT SOLVED

Only consider upload if DURING THIS RUN:

1. a fresh read-only wasm params query shows the dedicated wallet is allowlisted;
2. a fresh exact-current-main canonical Wasm candidate is generated;
3. independent reproducibility/checksum/attestation passes;
4. exact checksum/config is presented to owner;
5. owner separately approves the exact transaction.

Otherwise:

DO NOT upload.

DO NOT instantiate.

DO NOT waste credits preparing a deployment that cannot happen.

Keep:

Goal Manager = NOT DEPLOYED

============================================================
30. EXPLICITLY DO NOT DO
============================================================

- no UI redesign
- no theme replacement
- no major visual identity change
- no Health Beta implementation
- no mainnet transaction
- no mainnet signing
- no CosmWasm upload without whitelist
- no DNS changes
- no email changes
- no automatic production deployment
- no ZIGoals token
- no DAO
- no fabricated integrations
- no fabricated partnerships
- no guaranteed-return claims
- no unverified APY
- no financial advice
- no medical advice
- no real owner financial values in fixtures
- no owner private data in screenshots
- no seed phrase/private key handling
- no exchange trading keys
- no arbitrary execution surface

============================================================
31. FINAL REVIEW PACKAGE
============================================================

Produce:

docs/RUN_8_REPORT.md

docs/verification/run8/README.md

docs/verification/run8/validation.json

docs/verification/run8/ci.json
if hosted CI is available

docs/verification/run8/RESUME_STATE.md

docs/RUN_8_BETA_BACKLOG.md

Update the master roadmap with actual completion status.

Report:

- exact base
- exact head
- branch
- all logical commits
- all checkpoints
- files changed
- Position architecture delivered
- native staking features delivered
- watch-only mainnet features delivered
- Goal Engine V2 delivered
- Goal types delivered
- Goal allocation delivered
- Goals Beta delivered
- Goal Detail delivered
- contribution plans delivered
- Habits Beta delivered
- Today integration delivered
- migrations
- privacy changes
- security boundaries
- fee finding
- tests
- browser results
- screenshots
- bundle/performance effect
- blockers
- deferred provider work
- deferred Health work
- exact next owner actions

Every major scope item must be marked:

COMPLETE

PARTIAL

DEFERRED — BETA FOLLOW-UP

DEFERRED — EXTERNAL DEPENDENCY

BLOCKED

NOT AUTHORIZED

Never label PARTIAL work complete.

============================================================
32. PRODUCTION BOUNDARY
============================================================

Do not deploy production as part of Run #8.

Do not replace the current owner-verified Alpha automatically.

Complete implementation, tests, review package and hosted CI.

Then STOP.

The owner will separately review and authorize merge/deployment.

============================================================
33. END STATE
============================================================

The desired Run #8 result is that ZIGoals is no longer primarily understood as:

"put ZIG in a Goal contract."

It should instead be clearly experienced as:

"Connect the wealth you already have, track where it is working, allocate it toward the goals that matter, and build the habits that help you reach them."

The app should support meaningful Goal tracking even when:

- Goal Manager is not deployed
- funds remain staked
- funds remain in the user's wallet
- wealth exists across several Positions
- the user only wants read-only tracking

Native ZIG staking should feel like a first-class ZIGoals capability.

Goals should be substantially more capable.

Habits should feel like a complete application integrated into Goals.

All of this must live inside the existing frozen V2.1 ZIGoals UI/theme.