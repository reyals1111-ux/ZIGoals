# ZIGChain v6.0 ("Whirlpool"): what the app needed (Session AJ, ADR-035 P2–P5)

Read on 29 Oct 2026 (about 19:00–20:00 UTC) from this cloud session. The chain's own source repository is not public; the release binaries and the networks repository are ZIGChain's published record.

## Sources read
- `ZIGChain/networks` `README.md`: mainnet v5 (v5.1.2), testnet v6 (v6.0.0).
- `ZIGChain/networks` `upgrades/v6/README.md`: upgrade name `v6`, binary `v6.0.0` built from commit `81af3b281338487d1c6e17993754f45f9fd974db`; zig-test-2 upgraded at height 8,423,210 (proposal #122, passed 26 Oct 21:18 UTC, about 27 Oct 09:30 UTC); mainnet "binaries published, not scheduled" at the time it was written.
- The release page `ZIGChain/networks` `releases/tag/v6.0.0` (read through WebFetch: summarised, not copied).
- Live reads (GET only, no address of a person): testnet `https://testnet-api.zigchain.com` and `https://testnet-rpc.zigchain.com`; mainnet `https://public-zigchain-lcd.numia.xyz`, `https://api.zigchain.com` and `https://rpc.zigchain.com`.

## Live state
| | zig-test-2 | zigchain-1 |
|---|---|---|
| node_info / abci_info version | `v6.0.0` (both) | `v5.1.2` (both) |
| bond_denom, bank metadata | `azig`, display `zig` at 18 | `azig`, display `zig` at 18 |
| `/cosmos/evm/feemarket/v1/base_fee` | `2500000000.000000000000000000` | `Not Implemented` (code 12) |
| feemarket params | `min_gas_price` 2.5 Gazig, `base_fee_change_denominator` 8, `elasticity_multiplier` 2, `no_base_fee` false | — |
| RPC `abci_query /cosmos.evm.feemarket.v1.Query/BaseFee` | value `ChwyNTAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw` = field 1, `"2500000000000000000000000000"` (LegacyDec × 10¹⁸) | — |
| Upgrade | applied at 8,423,210 | **proposal #45 "Software Upgrade to v6"** (authors "ZIGChain Core Team"), voting 29 Oct 10:48 → 2 Nov 10:48 UTC, plan `v6` at height **13,466,800** ("~Tue 2026-11-03 09:30 UTC"), binaries `ZIGChain/networks/binaries/v6.0.0` with SHA-256 checksums |

## What changes for ZIGoals
| Change in v6 (notes) | Effect on the app | Decision |
|---|---|---|
| Cosmos fees are an EIP-1559 base fee from `x/feemarket`, floor 2.5 Gazig per gas, up to +1/8 per block; "clients with a fixed floor price will see rejections when blocks are busy" | The staking quote priced at the fixed 2.5 Gazig | P3: on v6 read the base fee at quote time and price at max(2.5 Gazig, ⌈base fee × 1.5⌉); v5 unchanged. TIER 3 (wallet) |
| `minimum-gas-prices` no longer decides acceptance | none (the app never relied on a node's setting beyond the floor) | — |
| Voting needs ≥ 1 ZIG staked with bonded validators, summed; else `no voting power` | Governance (hidden by default) treated any stake as enough | P4: eligibility at 1 ZIG; plain words for the chain's refusal |
| `keys add` defaults to coin type 60 / `eth_secp256k1`; existing coin-type-118 accounts unaffected | Keplr's chain suggestion uses 118 / secp256k1 | Unchanged: existing addresses keep working; no key or account-type change |
| OpenAPI regenerated: 448 paths, 52 added, none dropped; `/store/<name>/subspace` refused | No path the app reads was dropped | — |
| Native ZIG is the EVM coin at 18 decimals; Cosmos fees in `azig` | Already `azig` at 18 since the v5 redenomination | — |
| EIP-712 signing of Cosmos transactions, EVM JSON-RPC, `CREATE` allow-list, vesting via top-level messages only, gov/factory module accounts refuse sends, IBC callbacks | Not used by the app | — |
| Factory/DEX binding messages through the router (gas and error strings change) | The app does not call them | — |

## Version rule (D1, P5)
`packages/chain-config/src/reviewed-versions.ts`: reviewed minor lines per chain, each with its fee model. zig-test-2 and zigchain-1: v5.1 (fixed) and v6.0 (base fee). Any `vMAJOR.MINOR.PATCH` of a reviewed line passes; a newer line fails closed with "The network was upgraded; checks are pending." and keeps the version for the detail line; anything else fails closed as before.
