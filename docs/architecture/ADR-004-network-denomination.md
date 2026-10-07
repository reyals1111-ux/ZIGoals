# ADR-004 — Network-aware integer accounting

Accepted. Live testnet on 2026-09-13 reports zig-test-2, v5.0.0-patch-1, staking bond denom azig and bank display exponent 18. Fresh official version.txt agrees. Cached browser results still showed v4.1.0; they are not execution-time evidence. See ../research/ZIGCHAIN_CURRENT_STATE.md and captured live JSON.

One displayed ZIG remains one ZIG across redenomination. Native asset denomination and decimals belong in packages/chain-config. parseUnits/formatUnits support configurable decimal counts; tests cover both 6 and 18. Canonical values are decimal integer strings and BigInt, never JS floating-point token balances.

Every signing preparation verifies REST chain ID, staking denom and bank metadata, plus RPC chain ID. Mainnet is rejected unconditionally in this alpha even if an endpoint is changed. There is no runtime mainnet toggle. Mainnet needs a future separately reviewed build/configuration and explicit operator authorization.

Contract denomination is injected at instantiate. Do not change a live contract's denom in place or multiply user balances blindly across v5. A migration would require reconciled chain state, code/asset versions, exhaustive tests, and explicit deployment approval. Demo price values never influence deposited/withdrawn base units.

## Addendum 2026-10-03 (Session P): mainnet is azig with 18 decimals

Both networks use `azig` with 18 decimals since the v5 upgrade (testnet at height 7669200 on 2026-09-08; mainnet at height 12549000 on 2026-09-30). On 2026-10-03 the official LCD `https://api.zigchain.com` answered `bond_denom "azig"` and bank metadata for `azig` with the display unit `zig` at exponent 18, and described `uzig` as "Legacy 6-decimal ZIGChain base denom, retained only as IBC escrow backing after the v5 redenomination" (the same answers as the testnet LCD; the quotes, URLs and times are in [docs/earn/EVIDENCE_2026-10.md](../earn/EVIDENCE_2026-10.md), F03, and [docs/earn/evidence/a-native-staking.md](../earn/evidence/a-native-staking.md)). The redenomination page, <https://docs.zigchain.com/about-zigchain/redenomination>, says "1 uzig = 10¹² azig. One ZIG remains one ZIG."

- `apps/web/lib/position-reader.ts` configures `MAINNET_READ_ONLY` as `azig`/18. The reader still checks the chain's own evidence (node network, bond denom, bank metadata) before reading anything and fails closed on any difference; the old uzig/6 assumption is a regression test (`native-positions.test.ts`).
- The CoinGecko ZIG price identity (`market-quotes.ts` `nativeZigIdentity`) is `zigchain-1 / azig / 18`. The legacy identity `zigchain-1 / uzig / 6` is still recognised as the same ZIG for stored records and cached quotes; a mixed pair (uzig/18, azig/6) never is.
- **Stored data:** a record saved from a read before the upgrade carries `uzig`/6 and stays valid, readable, allocatable and valued (the price is per ZIG). Nothing is rewritten on read. On that record's next observation, `replaceObservation` (`positions.ts`) rescales its allocations and quantity history to the new unit once, so Goal progress and charts keep their ZIG amounts. No schema version changes. Reads refused since 2026-09-30 stored nothing: the reader throws before building records, and a failed refresh only marks the existing records `ERROR`.
- The canonical rules above are unchanged: integer strings and BigInt, decimals per network from configuration, no float, mainnet signing rejected.

## Addendum 2026-10-07 (Session X Part 1): zigchaind v5.1
The testnet runs zigchaind v5.1 since 2026-09-25 (v5.1.0 and v5.1.2 nodes behind the official REST endpoint) and mainnet v5.1.2 since its v5 upgrade (about 2026-09-30); `azig`, 18 decimals, on both. The app verifies the node version against a reviewed list (`REVIEWED_TESTNET_VERSIONS`, v5.1.0–v5.1.2) instead of exactly v5.0.0-patch-1; the rest of this decision is unchanged. Evidence: [ZIGCHAIN_V5_1.md](../research/ZIGCHAIN_V5_1.md).
