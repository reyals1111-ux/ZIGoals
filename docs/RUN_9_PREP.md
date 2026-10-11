# Run #9 preparation — Goal Intelligence + Live Wealth

Status: DESIGN LOCK / PRE-IMPLEMENTATION
Date: 2026-09-20
Base main SHA: `6dfef318562a6abff7f32172bd437f6a29748cbd`
Branch: `codex/run9-goal-intelligence-live-wealth`

This is the architectural preparation for Run #9. It is not the final Astra
implementation prompt. The implementation prompt must preserve these decisions
unless later owner review explicitly changes them.

# 1. Product objective

Run #9 is a major ZIGoals system upgrade, not merely completion of leftover
Run #8 items.

The system should evolve from:

"what assets do I have and how much of my Goal do they currently cover?"

to:

"what is my wealth worth now, how did my Goal progress change, what part came
from contributions versus market movement or income, am I on pace, and what
should I contribute next?"

Run #9 combines:

- broad automatic market valuation;
- Goal contribution history;
- Goal timelines;
- planned-versus-actual contribution tracking;
- Funding Health improvements;
- reward/income history;
- wealth and Goal history charts;
- Today/Activity intelligence;
- selective visual improvements where the richer information warrants them.

Existing V2.1 visual identity remains the foundation rather than being replaced.

# 2. Hard accounting rule

These concepts MUST remain separate:

1. contribution;
2. withdrawal;
3. market valuation change;
4. reward/income;
5. observed quantity change;
6. allocation change;
7. projected/scenario return.

A higher asset price is never a contribution.

A larger externally observed Position is not automatically a contribution.

Completing a Habit is never a financial contribution.

An APR scenario is never observed income.

A tokenized RWA market reference is not silently represented as the underlying
traditional-market spot price.

# 3. CoinGecko-only Beta market-data policy

CoinGecko is the only automatic external market-data provider in Run #9.

Do not integrate Marketstack, Twelve Data, GoldAPI or another pricing provider
during Beta.

If CoinGecko cannot provide a trustworthy identity or quote for an asset,
preserve manual valuation and continue implementation. Do not burn the run
retrying another provider.

Provider credential:

`COINGECKO_DEMO_API_KEY`

Rules:

- server-only;
- never use a `NEXT_PUBLIC_` variable;
- never serialize the key into browser JavaScript;
- never log it;
- never place it in a query string;
- use the `x-cg-demo-api-key` request header;
- local `.env.local` remains gitignored;
- Alpha secret/configuration is a separate owner-controlled deployment step.

No wallet address, Goal ID/name, Position quantity, notes, contribution history,
Habit data, Health data or other private information may be sent to CoinGecko.

Only public provider identifiers, requested currencies and normal public API
parameters may leave ZIGoals.

# 4. Live Demo API evidence

Owner-verified with a CoinGecko Demo key:

- `/ping` authenticated successfully;
- 598 stock RWA identities;
- Gold and Silver commodity identities;
- 817 total RWA identities:
  - 598 stock;
  - 217 ETF;
  - 2 commodity;
- all 817 RWA IDs unique;
- 21,336 CoinGecko coin identities;
- 20,562 coin identities with platform mappings;
- `/simple/price` returned BTC, ETH, USDT, USDC and ZIG;
- `/rwas/markets` returned Apple, Nvidia, Gold and Silver market data.

Current tested ZIG CoinGecko ID remains `zignaly`.

The Demo `/key` usage endpoint returned HTTP 401 and is not required for Run #9.
Owner monitors Demo quota through CoinGecko's dashboard.

# 5. Provider asset identity

Never use display ticker alone as canonical identity.

Introduce a provider-market identity on Positions that need automatic valuation.

Conceptual shape:

```ts
type MarketAssetRef =
  | {
      provider: "coingecko";
      kind: "coin";
      id: string;
      platform?: string;
      contractAddress?: string;
    }
  | {
      provider: "coingecko";
      kind: "rwa";
      id: string;
      assetType: "stock" | "etf" | "commodity";
    };
```

Selection stores canonical provider ID.

Display symbol and name are metadata, never the authoritative lookup key.

For token Positions where network + contract address are known, contract identity
takes precedence over ambiguous ticker matching.

If several catalog entries share a symbol/name and identity cannot be resolved
without user choice, require explicit selection.

Existing native ZIG mapping must remain explicit and verified.

# 6. Asset discovery

Do NOT call CoinGecko search on every keystroke.

Use cached provider catalogs and perform search/ranking locally.

Crypto catalog:

`GET /coins/list?include_platform=true`

RWA catalog:

`GET /rwas/list`

Catalog cache target: 24 hours.

Search ranking should prefer:

1. exact symbol;
2. exact name;
3. exact provider ID;
4. prefix match;
5. substring match.

Ambiguous results remain separate entries.

UI should display enough identity information for the user to distinguish them.

RWA results must visibly include asset type:
Stock / ETF / Commodity.

# 7. Quote batching and quota discipline

No background minute-by-minute polling in Beta.

Automatic quote refresh happens when a relevant Wealth/Goal surface needs market
data and cached evidence is stale, plus an explicit user Refresh control.

Crypto/stablecoins:

Use one `/simple/price` request for as many selected CoinGecko coin IDs as
possible. Chunk only when provider limits require it.

RWA:

Use `/rwas/markets?ids=...` and batch selected RWA IDs. Chunk only when provider
limits require it.

Never make one network request per Position when IDs can be batched.

Deduplicate identical provider IDs across Positions and Goals before requesting
quotes.

Suggested Beta freshness:

- quote freshness window: 15 minutes;
- minimum retry interval after an attempt: 60 seconds;
- provider catalog freshness: 24 hours;
- no hidden background polling;
- user Refresh obeys the same anti-spam retry gate.

The implementation should make these constants explicit and testable.

# 8. Quote schema

Generalize the current native-ZIG-only market quote model.

Every automatic quote must retain:

- provider;
- provider asset ID;
- market kind: coin or rwa;
- quote currency;
- exact decimal price representation;
- provider observation timestamp when supplied;
- local fetched-at timestamp;
- freshness state;
- verification/provenance type.

Do not convert provider numeric data to floating point before exact parsing if
doing so can lose meaningful decimal precision.

For CoinGecko crypto `/simple/price`, use `include_last_updated_at=true`.

For RWA quotes, store the strongest provider timestamp the endpoint actually
supplies. If no reliable observation timestamp exists, distinguish `fetchedAt`
from `observedAt` rather than inventing one.

# 9. RWA valuation semantics

CoinGecko RWA values are aggregated tokenized/onchain RWA market references.

UI copy must not claim:

- NASDAQ real-time price;
- NYSE real-time price;
- authoritative physical gold spot;
- authoritative physical silver spot;
- broker execution price.

Suggested provenance label:

`CoinGecko tokenized RWA reference`

For Gold/Silver, the Wealth UI may display familiar Gold/Silver names, but
details/freshness must expose the tokenized-market reference provenance.

Manual valuation remains available for users who need a different reference.

# 10. Public quote cache

Current `zigoals:public-market-quotes:v1` supports only native ZIG.

Run #9 should evolve this to a bounded multi-asset public cache.

Public market cache remains strictly separate from private platform data.

It may contain:

- CoinGecko provider IDs;
- public asset metadata;
- prices;
- quote currencies;
- timestamps;
- freshness metadata.

It must never contain:

- quantities owned;
- allocation quantities;
- wallet addresses;
- private Goal metadata;
- contribution records;
- private notes.

Last-good verified quote remains available when refresh fails.

Provider failure should result in:

fresh -> stale -> unavailable-with-last-good

rather than:

fresh -> portfolio value disappears.

Malformed provider data is rejected and never replaces a valid previous quote.

# 11. Platform schema v2

Run #9 should introduce an additive platform schema version 2.

Keep the existing storage key unless implementation evidence proves changing the
key is necessary:

`zigoals:platform:v1`

The value's `schemaVersion` becomes 2.

Version 1 must migrate deterministically to version 2 in memory.

Do not destroy or overwrite original v1 bytes merely by reading them.

On the first explicit write that persists v2, preserve the original v1 bytes
using the repository's existing recovery-copy mechanism.

Imports:

- accept valid v1 and migrate;
- accept valid v2;
- reject malformed input;
- reject unsupported future versions;
- never silently reset damaged stores.

Health and legacy Goal stores remain independent and unchanged.

# 12. Contribution events

Add explicit actual contribution records.

Conceptual shape:

```ts
type ContributionEvent = {
  id: string;
  goalId: string;
  positionId?: string;
  direction: "IN" | "OUT";
  quantity: string;
  asset: string;
  decimals: number;
  valueAtEvent?: {
    value: string;
    decimals: number;
    currency: string;
    source: "COINGECKO" | "MANUAL" | "CONFIRMED_TRANSACTION";
    observedAt?: string;
  };
  occurredAt: string;
  provenance:
    | "LOCAL_CONFIRMED"
    | "CHAIN_CONFIRMED"
    | "MANUAL_ATTRIBUTION"
    | "REWARD_INCOME";
  transactionRef?: string;
  reversesId?: string;
  note?: string;
};
```

Local Demo confirmed Add Funds may create a system-confirmed contribution event.

Future confirmed onchain deposits may create chain-confirmed events only when the
transaction is actually proven.

External/manual Positions NEVER generate contributions merely because their
quantity changed.

A user may explicitly attribute a manual contribution to an external Position.

# 13. Contribution corrections

Historical financial events should be append-only in normal operation.

Do not mutate an older contribution into a different historical fact.

Correction uses an explicit reversal/correction event that references the
original record.

Derived contribution totals net valid contribution/reversal records.

UI should make a correction understandable rather than silently rewriting
history.

# 14. Reward/income events

Reward/Income Goals must distinguish:

- currently unclaimed observed reward balance;
- cumulative recorded reward/income events;
- future projected reward scenarios.

Claimed/distributed reward may become an income event when explicitly recorded
or supported by confirmed evidence.

Never treat current unclaimed rewards and cumulative historical income as the
same number.

Annualized/trailing run-rate may be shown only when sufficient dated historical
events exist.

No invented APY.

# 15. Goal timeline

Goal Detail receives a chronological timeline.

Timeline may include:

- contribution;
- withdrawal;
- contribution reversal/correction;
- reward/income;
- allocation increase/decrease;
- plan created/edited/paused/resumed;
- milestone completion/change;
- Goal completion/reactivation;
- valuation snapshot;
- Position observation snapshot.

Avoid duplicate event presentation.

Where possible derive events from their canonical records instead of storing the
same fact twice.

Stored timeline-only records must have explicit provenance.

# 16. Quantity snapshots versus valuation snapshots

Existing Position snapshots are quantity observations.

Do not redefine them into prices.

Add a separate valuation-history model.

A valuation snapshot should preserve enough evidence to reconstruct what was
known at that point:

- Position ID;
- quantity used;
- provider asset ID or manual source;
- price/value;
- decimals;
- currency;
- quote provenance;
- quote observed/fetched time;
- snapshot captured time.

Do not embed private portfolio state inside the public quote cache.

Valuation snapshots belong to private platform history.

# 17. Snapshot retention

Private platform storage has a 2 MB hard safety limit.

Therefore Run #9 history MUST be bounded.

Beta strategy:

- do not write a history snapshot on every render;
- do not write one on every quote-cache hit;
- automatic valuation snapshot at most once per Position per UTC day unless a
  material financial event requires another snapshot;
- contribution/reward/allocation events may capture an event-time valuation;
- avoid duplicate snapshots when quantity + provider quote evidence are
  unchanged;
- apply deterministic bounded retention/compaction;
- never discard contribution/reversal records merely to save snapshot space.

Astra should calculate/test realistic serialized sizes and choose conservative
caps under the existing 2 MB store limit.

# 18. Planned versus actual

Contribution plans remain forecasts.

Actual contribution events remain facts.

For each Goal derive:

- planned amount through today;
- actual contributed through today;
- variance;
- most recent actual contribution;
- next scheduled contribution;
- overdue scheduled contribution state;
- required remaining pace;
- completion projection.

Do not mark a planned payment as completed merely because portfolio value rose.

If an exact scheduled payment cannot be matched automatically to an actual
event, keep the distinction visible rather than guessing.

# 19. Funding Health

Funding Health becomes richer while remaining deterministic.

Canonical zero-return view should include:

- current counted Goal wealth;
- target;
- amount remaining;
- cumulative actual contributions;
- planned future contributions;
- actual versus planned pace;
- required recurring contribution;
- projected completion date;
- shortfall or surplus;
- liquidity warning;
- stale/missing valuation warning.

Optional APR remains a scenario, not canonical observed progress.

Market appreciation may change current wealth and projected completion but must
not rewrite actual-contribution history.

# 20. Goal progress history

Charts should answer at least:

- How has counted Goal value/quantity changed?
- How much did I actually contribute?
- Am I ahead/behind my contribution plan?
- How much reward/income has been recorded?
- What changed because of valuation rather than contribution?

Do not fabricate historical market data before the date ZIGoals begins recording
snapshots.

For a new user, history starts when ZIGoals starts recording evidence.

Paid CoinGecko historical RWA endpoints are not required for Beta.

# 21. Wealth history

Wealth should gradually become a real portfolio tracker.

At minimum show:

- total automatically/manual-valued wealth;
- asset-class composition;
- allocated versus unallocated wealth;
- quote freshness;
- source/provenance;
- change since available local snapshot periods.

Do not imply a historical percentage change for a period where ZIGoals lacks a
valid beginning snapshot.

# 22. Today

Today should remain compact but gain useful financial intelligence:

- primary Goal progress;
- Funding Health status;
- next planned contribution;
- most recent actual contribution;
- amount remaining;
- short pace signal;
- compact live wealth/staking context.

Today must not become a dense trading dashboard.

# 23. Activity

Goal timeline events should integrate coherently with Activity.

Do not merge or mutate the transaction journal into the Goal timeline store.

Transaction receipts remain their own evidence source.

Activity may display both sources with clear provenance.

# 24. Manual valuation fallback

Manual valuation remains first-class.

Automatic CoinGecko support is an enhancement, never a requirement for a
Position to exist.

If:

- API key is absent;
- provider is down;
- quota is exhausted;
- asset cannot be identified;
- endpoint is unavailable on Demo;
- RWA mapping is ambiguous;
- returned evidence is invalid;

then:

- retain last-good quote if one exists;
- mark it stale/error truthfully;
- allow manual valuation;
- keep Wealth/Goals functional;
- continue the implementation.

# 25. Failure policy for Astra

Do not get stuck trying the same provider integration repeatedly.

If a CoinGecko capability proves unavailable, unreliable or unexpectedly
paywalled on Demo after reasonable verification:

1. record the limitation;
2. retain the adapter boundary;
3. keep manual fallback;
4. continue the rest of Run #9.

No second automatic pricing provider is added in this run.

# 26. Visual upgrade authority

Run #9 may improve visual design where the new functionality creates a clear
need.

Astra may refine:

- Wealth hierarchy;
- quote/provenance chips;
- asset search;
- charts;
- Goal intelligence panels;
- timeline;
- Funding Health;
- Today financial card;
- empty/loading/stale states;
- responsive layouts.

Preserve the approved cosmic/nebula V2.1 identity.

Do not redesign Health merely for consistency.

Do not remove useful existing controls.

Desktop and mobile remain first-class.

# 27. Privacy

CoinGecko requests are public-market-data requests only.

Never include private Position quantities or user identities in provider calls.

Provider catalogs/quotes may be stored in public cache.

Portfolio history, contributions, Goal links, quantities and valuation snapshots
remain private browser data.

No analytics/telemetry is introduced.

# 28. Execution boundary

Run #9 remains read-only from a financial execution perspective.

Not authorized:

- staking transactions;
- exchange trading;
- exchange API keys;
- mainnet signing;
- arbitrary wallet signing;
- Goal Manager upload;
- Goal Manager instantiation;
- live contract deposits;
- DNS/email changes;
- automated investment execution.

Existing connection/watch-only behavior remains unchanged.

# 29. Validation requirements

Run #9 implementation must add focused tests for:

- asset identity ambiguity;
- CoinGecko coin batching;
- CoinGecko RWA batching;
- exact price parsing;
- server-only credential handling;
- cache freshness;
- last-good quote retention;
- rate/retry gates;
- malformed provider payloads;
- absent key behavior;
- quota/provider failure behavior;
- v1 -> v2 migration;
- future-version refusal;
- contribution versus valuation separation;
- reversal/correction accounting;
- planned versus actual;
- Funding Health;
- reward/income separation;
- bounded history retention;
- backup/import/export;
- cross-tab mutation safety;
- Goal completion reconciliation;
- responsive desktop/mobile UX;
- no private-data provider leakage.

Full lint, typecheck, unit tests, production build and relevant production browser
tests remain required.

# 30. Tomorrow's Astra objective

Tomorrow's Astra run should spend its tokens implementing this already-decided
architecture, not repeatedly researching alternative providers or redesigning
fundamental accounting semantics.

The final Astra master prompt will add detailed acceptance criteria, UI
requirements, verification tasks and execution sequencing.

This preparation document is authoritative input to that prompt.
