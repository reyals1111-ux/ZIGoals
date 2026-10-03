# ADR-009 — Earn architecture: read-only adapters first, user-signed builders later

Accepted by the owner on 2026-10-03 (proposed in Session N, 2026-10-02). Step E1 (testnet stZIG in Staking) waits for
Valdora's answers ([EARN_DESIGN.md](../earn/EARN_DESIGN.md), roadmap). Builds on [ADR-003](ADR-003-strategy-adapters.md) (idle first, verified adapters
later) and [ADR-004](ADR-004-network-denomination.md) (network-aware integer accounting). Design:
[docs/earn/EARN_DESIGN.md](../earn/EARN_DESIGN.md); evidence: [docs/earn/EVIDENCE_2026-10.md](../earn/EVIDENCE_2026-10.md).
ADR-008 stays free.

## Context
- People want their money to work towards their Goals. The providers on ZIGChain that could do that (native staking,
  Valdora's stZIG, vaults) publish addresses and prose, but no message schemas. On-chain answers show the read
  interface; nothing shows the execute interface, the units of the price queries, or which audited commit the deployed
  code is.
- The project's rules are non-custodial and consumer first: the person signs every financial step, no ZIGoals component
  or AI holds keys or moves funds, no rates are promised, no paid placement or referral links.
- Since the v5 upgrade, both networks use `azig` with 18 decimals; stZIG kept 6 decimals. ADR-004 already requires
  integer strings and BigInt, and never assuming one share equals one ZIG.

## Decision
1. **Per-provider adapters, read-only first.** An adapter lives in `apps/web/lib/earn/<provider>/`. Its first form only
   reads: it builds query paths, parses answers with strict schemas, and returns `{ ok: true, value }` or
   `{ ok: false, reason }`. The Valdora testnet reader (`apps/web/lib/earn/valdora/testnet.ts`) is the first one. No page
   imports an adapter until an owner decision does (a test enforces this today).
2. **Pins, checked on every read.** An adapter pins network, chain ID, contract address, code ID, code checksum,
   contract version, denoms and decimals to what the chain reported at a recorded block height. Every read happens at
   one block height (`x-cosmos-block-height`) and fails closed on any difference, on an unknown field, on a pause flag,
   on an oversized body or on a missing height. A migration of the provider's contract therefore stops the adapter
   instead of misreading it.
3. **Units only from a definition.** Amounts are decimal integer strings; arithmetic is BigInt. A unit counts as known
   only when the chain's own metadata defines it (for example bank `denoms_metadata`) or the provider documents it. A
   query answer whose units are undocumented is returned as the contract states it, under a name that says so, and is
   never converted into a ZIG or currency value.
4. **The `EarnOption` record.** What the app may one day show about an option is data, not code:
   `{ id, name, operator, kind: native-staking | liquid-staking | vault, custody, exit: { steps, minimumDays, cancellable },
   fees: ProviderClaim[], eligibility, risks, audits, pins, sources, lastVerified }`, where every
   `ProviderClaim = { text, sourceUrl, readAt }` is shown as the provider's claim and never ranked, summed or projected.
   No field holds a rate of return, and none is required to.
5. **Eligibility gates the display.** An option without published consumer eligibility (jurisdiction, KYC) is shown as
   "not available" with the reason, never as an action.
6. **A build-time flag, like `FINANCIAL_EXECUTION_ALLOWED`.** User-signed earn steps, when they exist, are compiled in
   only when a dedicated flag is true, and the flag can only be true for `TESTNET_DEPLOYED`. There is no runtime toggle
   and no flag system to add.
7. **Preconditions for any execution authority** (a message builder that a wallet will sign):
   - the execute schema comes from the provider or a public tagged source, never from inference;
   - the deployed checksum is mapped to an audited commit by a published source;
   - every step has a testnet receipt (deposit, queue, unbonding, claim) recorded in the evidence;
   - the exact message was simulated on the pinned code just before the person signs;
   - legal review answered the questions in `docs/business/LEGAL_CHECKLIST.md` §6 for the markets concerned;
   - an owner decision recorded in STATUS.
8. **How it stays non-custodial.** Builders, once allowed, return an unsigned message for the person's own wallet.
   ZIGoals never signs, never broadcasts on its own, never stores a key, seed, exchange credential or third-party API
   key, and never batches steps. Custodial or off-chain products (for example Zignaly's) are information only.

## Consequences
- Each provider costs a pinned adapter and a fixture set from real responses; a provider's contract migration needs a
  new evidence entry and new pins before the adapter answers again. This is deliberate.
- Showing a ZIG value for stZIG waits for a documented value query. Until then stZIG is shown as stZIG.
- The registry (`packages/ecosystem-registry`) stays research data; it never grants an adapter or execution
  (`canExecuteProvider` remains `false`).
- Mainnet adapters are out of scope until the preconditions above hold for mainnet as well.

## Alternatives considered
- **Infer the execute messages from audits and on-chain errors.** Rejected: the audits describe messages in prose and
  code excerpts only, and a guessed field could move funds wrongly.
- **Use the staker's price query as the stZIG value.** Rejected while the units are undocumented: after the 18-decimal
  migration the fields still say `uzig_amount` and `stzig_amount`, and OAK's 2026-09-21 report says the migration
  multiplies stored base amounts by 10¹² while deliberately leaving the stZIG supply unscaled.
- **A generic "earn" provider interface first.** Deferred: with one provider verified, a generic interface would encode
  guesses about the others.
