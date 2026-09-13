# ADR-004 — Network-aware integer accounting

Accepted. Live testnet on 2026-09-13 reports zig-test-2, v5.0.0-patch-1, staking bond denom azig and bank display exponent 18. Fresh official version.txt agrees. Cached browser results still showed v4.1.0; they are not execution-time evidence. See ../research/ZIGCHAIN_CURRENT_STATE.md and captured live JSON.

One displayed ZIG remains one ZIG across redenomination. Native asset denomination and decimals belong in packages/chain-config. parseUnits/formatUnits support configurable decimal counts; tests cover both 6 and 18. Canonical values are decimal integer strings and BigInt, never JS floating-point token balances.

Every signing preparation verifies REST chain ID, staking denom and bank metadata, plus RPC chain ID. Mainnet is rejected unconditionally in this alpha even if an endpoint is changed. There is no runtime mainnet toggle. Mainnet needs a future separately reviewed build/configuration and explicit operator authorization.

Contract denomination is injected at instantiate. Do not change a live contract's denom in place or multiply user balances blindly across v5. A migration would require reconciled chain state, code/asset versions, exhaustive tests, and explicit deployment approval. Demo price values never influence deposited/withdrawn base units.
