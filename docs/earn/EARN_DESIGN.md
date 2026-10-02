# Earn & staking: consumer design (Session N, 2026-10-02)

**Status: design only.** Nothing described here is built, available or promised. Every fact cited is in
[EVIDENCE_2026-10.md](EVIDENCE_2026-10.md) with its source and access date; anything not verified there is marked
UNVERIFIED and nothing is designed to depend on it. Not financial advice. Subject to legal review
([LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md), section 6). What the repository already knew, and what is now
outdated: [EXISTING_RESEARCH.md](EXISTING_RESEARCH.md). On-ramps and Zignaly, and why nothing is built for them:
[ONRAMPS_AND_ZIGNALY.md](ONRAMPS_AND_ZIGNALY.md).

## Principles
1. **Consumer first, chain invisible.** People see "your money", "keep it steady", "let it work"; denoms, contracts and
   channels stay behind the screen, but are always one tap away for anyone who wants to check.
2. **Non-custodial, always.** Funds stay in the person's own wallet or move only by a transaction that person signs.
   ZIGoals and its AI features never hold keys, hold or move funds, store exchange credentials or third-party API keys,
   or place trades.
3. **The person signs every financial step,** one at a time, after seeing what it does. No batching, no automation, no
   "set and forget".
4. **No promises.** No projected returns, no "earn X%". A provider's published fee or rate appears only as that
   provider's claim, with its source and the time it was read, and is never compared or ranked by ZIGoals.
5. **No paid placement, no affiliate or referral links.** Options are listed by what they are, not by who pays.
6. **Testnet first.** Nothing that can move value on mainnet until the gates in "Roadmap" are met.
7. **Honest about who runs what.** Each option names its operator, where the money sits, and what can go wrong.

## The journey in plain words
```
  1. Add money            2. Keep it steady              3. Let it work (optional)
  card or bank  ──────▶  a stablecoin in YOUR wallet ──▶  staking · liquid staking · vaults
  (a regulated on-ramp     (you hold it; ZIGoals only      (each run by someone else; you
   you choose; it does     reads it, never moves it)        sign every step yourself)
   identity checks)
```
What the evidence says about each step today:

| Step | What exists on ZIGChain today | Consequence for the design |
|---|---|---|
| 1. Add money | No on-ramp read today delivers ZIG on ZIGChain or any stablecoin on ZIGChain. Guardarian lists ZIG only as an ERC-20 on Ethereum; MoonPay lists USDC on Noble as suspended (EVIDENCE [§e](evidence/e-on-ramps.md)). Every provider needs a business agreement and keys before production use. | Step 1 cannot be offered as one smooth flow. A hand-off to another chain plus a bridge is too complex and risky for the people this product is for. **Blocked** until a provider delivers on ZIGChain, or the owner decides otherwise. |
| 2. Keep it steady | USDC from Noble is live (IBC channel-3), but Circle stops new Noble minting on 2026-10-13 and pauses Noble USDC and its CCTP routes on 2027-01-12 (EVIDENCE [§d](evidence/d-stablecoins-and-swaps.md)). USDT arrives via IBC Eureka; ESMA's register lists no Tether e-money token white paper. Circle's Injective USDC is on-chain but not in ZIGChain's registry. | **Never build on Noble.** No stablecoin route is designed in until an issuer-supported, registry-listed path exists and legal review answers the MiCA EMT questions. |
| 3. Let it work | Native staking (protocol, 21-day unbonding); Valdora liquid staking (stZIG) with a withdrawal queue; vaults described by Valdora and ZIG Markets; Zignaly's copy-trading-style services are off-chain and custodial (EVIDENCE [§a](evidence/a-native-staking.md), [§b](evidence/b-valdora.md), [§c](evidence/c-zignaly.md), [§f](evidence/f-zig-markets.md)). | Native staking and stZIG are the only candidates that fit the non-custodial rule. Zignaly is information only. Vault products wait for eligibility rules and legal review. |

## The options, side by side
Facts only, each with its section in the evidence. "Provider claim" means the provider says it; ZIGoals has not
verified it independently.

| | Native staking | Liquid staking: Valdora stZIG | Vaults (Valdora, ZIG Markets) | Copy trading (Zignaly) |
|---|---|---|---|---|
| **What it is** | Delegating ZIG to a validator on ZIGChain | Deposit ZIG, receive stZIG, a token whose ZIG value rises as rewards accrue (provider claim) | Pooled products described by the providers; some name ZIG Markets as curator | Professional managers trade pooled funds (PAMM) |
| **Who runs it** | The protocol and the validator you choose | Valdora's contracts; the staker's admin is one key (on-chain), although the docs say multi-signature | The vault operator and curator | Zignaly |
| **Where the money sits** | Your account, delegated; never leaves your control | A smart contract; you hold stZIG | A smart contract or the operator's structure | Binance sub-accounts under Zignaly (off-chain, custodial) |
| **Getting out** | 21 days unbonding (chain parameter 1,814,400 s); no rewards while unbonding | Redeem burns stZIG; a withdrawal queue, then 21 days, then a claim; a request cannot be cancelled (provider claim) | Product-specific; not reviewed for consumers | Manager releases within 7 days; Z-Index exits up to 90 days (provider claim) |
| **Fees** | Validator commission (chain minimum 0) | 10% performance fee on rewards (provider claim); the docs contradict each other on an unstake fee | Not reviewed | Success fee on profits, under a high-watermark rule (provider claim) |
| **Eligibility** | Anyone with ZIG | Minimum stake 50 ZIG (provider claim) | Not published for consumers | KYC for everyone; the United States, Canada and others excluded |
| **Main risks** | Slashing (double-sign 0.05%, downtime 0.01% on-chain); validator downtime | Contract risk (three OAK Security audits; every Critical finding is marked resolved); a single admin key can migrate the code (it did on 2026-09-17 testnet and 2026-09-30 mainnet); redemption delay | Credit, liquidity and operator risk; not assessed | Custody and counterparty risk; marketplace closed to new services since 31 Aug 2026 |
| **Fits "non-custodial, you sign"?** | Yes | Yes, if the messages are verified | Unknown | **No** |

## How a person would use it (text wireframes; SVG versions in [mockups/](mockups/))
### A. "Ways to let it work" (inside Staking)
```
┌──────────────────────────────────────────────────────────────┐
│ Let your ZIG work                         Testnet · no value │
│ Choose an option to read about it. Nothing happens until you │
│ sign a step yourself.                                        │
│                                                              │
│ ◇ Stake with a validator          Run by ZIGChain validators │
│   Out in 21 days · you keep control                    ›     │
│ ◇ Liquid staking (stZIG)                   Run by Valdora    │
│   Out after a queue + 21 days · contract risk          ›     │
│ ◇ Vaults                     Not available · needs review    │
│                                                              │
│ Not financial advice. Rates are never shown as promises.     │
└──────────────────────────────────────────────────────────────┘
```
### B. An option, explained
```
┌──────────────────────────────────────────────────────────────┐
│ ‹ Liquid staking (stZIG)                     Run by Valdora  │
│ What it is   You deposit ZIG and receive stZIG ...           │
│ Getting out  Redeem → queue → 21 days → claim. Can't cancel. │
│ Fees         "10% performance fee on rewards"                │
│              Valdora's own claim · read 2026-10-02 · source ↗│
│ Risks        Smart-contract risk · one admin key · delays    │
│ Checked by   OAK Security audits (3) · findings ↗            │
│ On testnet   Your stZIG: 12.5 (read from the chain just now) │
│                                                              │
│ [ Open Valdora ↗ ]   ZIGoals never moves your money.         │
└──────────────────────────────────────────────────────────────┘
```
### C. A user-signed step (later phase, testnet only)
```
┌──────────────────────────────────────────────────────────────┐
│ Stake 50 ZIG with Valdora                   zig-test-2 only  │
│ You send   50 ZIG          You receive  stZIG (amount set by │
│                                          the contract)       │
│ Contract   Valdora staker · code 2532 · checked just now ✓   │
│ Simulated  ✓ the network accepted this exact message         │
│ This is permanent once signed. Getting out takes 21+ days.   │
│ [ Review in your wallet ]   [ Cancel ]                       │
└──────────────────────────────────────────────────────────────┘
```

## Consent and signing
- A step is offered only when all of these hold: the message schema comes from the provider or a public tagged source
  (not inferred), the contract's code ID and checksum match the pins, the network is testnet, a simulation of that exact
  message succeeded, and the person confirmed the human-readable summary.
- The wallet shows the real transaction; ZIGoals never signs, never broadcasts on its own and never retries a signed
  message silently.
- One step at a time. A queue or claim is a separate, later step the person starts.
- The person can always see the raw message, the contract and the source of every number before signing.

## Wallet onboarding that stays honest
- Say plainly: "Your wallet holds your money. ZIGoals can't see your recovery phrase and can't move anything."
- Recommend a password manager or offline note for the recovery phrase, never a screenshot.
- Start on testnet, where tokens have no value, so the first steps are safe to get wrong.
- Never ask for a recovery phrase, private key or exchange credentials. The app has no field for them.

## How it fits Staking, Wealth and Goals
- **Staking** shows what the chain says a public address holds (read-only today). stZIG would join it as a position with
  its own states: held, redemption pending and claimable are different (ADR-003).
- **Wealth** counts stZIG as stZIG. Its ZIG value appears only when a documented value query exists: a stZIG is never
  assumed to be one ZIG, and the staker's price answers are not used while their units are undocumented.
- **Goals** can be allocated a share of a position, as accounting only. Allocating never moves money (ADR-003).

## What has to happen first
| Gate | Why | Who |
|---|---|---|
| Legal review of the questions in LEGAL_CHECKLIST §6 | Promotion of staking and stablecoins, MiCA CASP and EMT rules, consumer disclosures | Owner with counsel |
| Valdora's execute schema, from Valdora or a public tagged source | Messages must never be guessed (N5) | Valdora |
| Deployed checksum ↔ audited commit, published | The audits name commits; no build attestation maps them to code 179/2532 | Valdora, OAK |
| Testnet receipts for every step | Prove deposit, queue, unbonding and claim on zig-test-2 | ZIGoals, on testnet |
| A stablecoin route that is issuer-supported and registry-listed | Noble is being wound down | Issuers, ZIGChain |
| The app's mainnet denomination updated to azig/18 | Mainnet reads fail closed since v5; confirmed with the app's own reader ([EVIDENCE](EVIDENCE_2026-10.md#what-this-means-for-the-app-today)) | Session M's lane |

## Roadmap
| Phase | What | Preconditions |
|---|---|---|
| E0 (this PR) | Evidence, this design, ADR-009, sourced registry data, a read-only Valdora testnet reader that no page uses | none |
| E1 | Show a public address's stZIG on testnet in Staking, read-only, as stZIG | Owner decision; E0 merged |
| E2 | "Learn more" hand-off to providers' own apps, no execution, no tracking parameters | Legal review of promotion rules |
| E3 | User-signed steps on testnet (native staking first, then stZIG) | Published schema, checksum ↔ audit mapping, testnet receipts, ADR-009 accepted |
| E4 | Mainnet | Legal sign-off, a reviewed release, explicit owner approval; never before |
