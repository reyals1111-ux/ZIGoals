# Session AF — the owner's real signing checks (after the deploy)

Agents never type into, unlock or sign with a real wallet (N12): these checks are the owner's alone, in the owner's own
Keplr, after the Alpha is deployed. Record only what is already public — the transaction hash and what the app showed —
never a seed phrase, a password, an address or a screenshot of the wallet's own screens.

## 1. Practice network first (zig-test-2, faucet ZIG, no real value)
| # | Step in ZIGoals | What to check | Result (pass / fail · tx hash) |
|---|---|---|---|
| 1 | Staking → network "Practice" → Connect Keplr | Keplr asks to connect; the banner says Practice in big words | |
| 2 | Earn → Start here → "Practice first" → the faucet link | the faucet opens in a new tab with the verified-link mark | |
| 3 | Staking → choose an active validator → amount → Review → Sign in Keplr | the review lists action, validator (active · commission), amount, fee, unbonding meaning; Keplr shows the same message; the app goes pending → confirmed with the explorer link | |
| 4 | Claim rewards (one validator, then "claim all") | one signature each; the receipt matches; rewards drop to near zero | |
| 5 | Move stake (redelegate) to another active validator | the review names both validators; no unbonding | |
| 6 | Unstake a small amount | the review says 21 days; the unbonding entry and its end date appear on Staking, Portfolio, Today | |
| 7 | Governance → a practice proposal in its voting period (testnet periods are 600 s) → vote | eligible only with a delegation; "public forever" said before signing; the vote shows after | |
| 8 | (opt-in) the practice badge | the review says it is public; testnet only | |

## 2. Real network, a small amount (zigchain-1)
| # | Step | What to check | Result |
|---|---|---|---|
| 1 | Staking → "Switch to the real network" | the first-time confirm appears once, in plain words | |
| 2 | A small delegate to an active validator | as practice step 3, on the real network; the real-network banner is distinct | |
| 3 | Claim rewards | as practice step 4 | |

If anything differs from what the review screen showed, stop, keep the hash, and note what you saw here.
