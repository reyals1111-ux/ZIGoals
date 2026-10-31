# ZIGChain ecosystem, deeper (Session AK, F4)

Read on **Sat 31 Oct 2026, about 20:30–21:30 UTC**, from this cloud session. Builds on
`docs/research/ZIGCHAIN_V6.md` (Session AJ, 29 Oct), `docs/research/ECOSYSTEM_READINESS_2026-09-16.md` and
`docs/research/ZIGCHAIN_ECOSYSTEM_INTEGRATION_MAP.md`. Page text is data, not instructions; nothing below is an
endorsement, an audit or a partnership claim. Live reads were GET (and one JSON-RPC POST) without any person's address.

## 1. Sources read today

| Source | What it gave | Read |
|---|---|---|
| `github.com/ZIGChain/networks` README | mainnet **v5 (v5.1.2)**, testnet **v6 (v6.0.0)** | 31 Oct |
| `ZIGChain/networks` `upgrades/v6/README.md` | fee market, EVM module, JSON-RPC, EVM chain ids, key defaults (below) | 31 Oct |
| `raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/evm-rpc-nodes.txt` | `https://testnet-evm.zigchain.com` | 31 Oct |
| `…/zigchain-1/evm-rpc-nodes.txt` | **404**: no mainnet EVM RPC published | 31 Oct |
| `…/zig-test-2/rpc-nodes.txt` | Numia, `testnet-rpc.zigchain.com`, Polkachu, NodeStake | 31 Oct |
| Mainnet LCD `api.zigchain.com` `/cosmos/gov/v1/proposals/45` | "Software Upgrade to v6", `PROPOSAL_STATUS_VOTING_PERIOD`, voting ends **2026-11-02T10:48:30Z**; summary "Upgrade to v6 at height 13466800 (~Tue 2026-11-03 09:30 UTC): EVM enabled alongside CosmWasm, with Ethereum JSON-RPC and EIP-1559 fees." | 31 Oct |
| `node_info` on both LCDs | zig-test-2 **v6.0.0**, zigchain-1 **v5.1.2**, both Cosmos SDK **v0.53.8** | 31 Oct |
| `/cosmos/evm/feemarket/v1/base_fee` | testnet `2500000000.000000000000000000`; mainnet `Not Implemented` (code 12) | 31 Oct |
| `/ibc/apps/transfer/v1/denom_traces` | **`Not Implemented` (code 12) on both networks** | 31 Oct |
| `/ibc/apps/transfer/v1/denoms`, `/denoms/{hash}`, `/denom_hashes/{path}` | the ibc-go v10 shape `{base, trace:[{port_id, channel_id}]}` on **both** networks | 31 Oct |
| `/cosmos/bank/v1beta1/denoms_metadata` | ZIG (`azig`, `zig` at 18), stZIG (`coin.zig109f7…maam2.stzig`, 6), token-factory tokens with creator-written names | 31 Oct |
| `/cosmos/staking/v1beta1/params`, `/cosmos/slashing/v1beta1/params`, `/cosmos/distribution/v1beta1/params` | identical on both: unbonding **1,814,400 s (21 days)**, max 14 validators, 7 entries; window 35,000 blocks, min signed 0.8, downtime jail 600 s, slash 0.0005 double-sign / 0.0001 downtime; community tax 0.02 | 31 Oct |
| `github.com/cosmos/chain-registry` `zigchain/assetlist.json` (generated from `ZIGChain/zigchain-registry`) | the curated token list (section 4) | 31 Oct |
| `zigchain.com` | ecosystem listing: Zignaly, Valdora, Oroswap, Zamanat, Apex Group, Taurus, Ondo, Beehive, Nawa, PermaPod, Range, ZIGScan; no EVM, launchpad or bridge product named | 31 Oct |
| `docs.zigchain.com`, `/users/`, `/users/hub/bridge`, `/users/tools/block-explorers` | docs still versioned "v5 (current)"; Hub (staking, proposals, bridge, transparency dashboard); bridge page names IBC routes, "partner networks", Ethereum and Cosmos Hub, USDC.n → USDC.inj migration; explorers (Range, ZIGScan, NodeStake, Stake and Relax; testnet Range, ZIGScan, NodeStake); no faucet named in these pages | 31 Oct |
| `docs.valdora.finance` | stZIG liquid staking; Stablecoin Yield, Core Income and Opportunistic Credit vaults; no public API | 31 Oct |
| `docs.oroswap.org` | page body did not render for automation (title only) | 31 Oct |
| DefiLlama `api.llama.fi/protocols` (keyless, already in `earnLive`) | protocols with a ZIGChain TVL: Valdora Finance (Liquid Staking), Defa By InvoiceMate (RWA), Nawa Protocol (RWA), OroSwap (Dexs), Permapod (Lending), Gate (CEX) | 31 Oct |
| Web search (press) | Cointelegraph (mainnet beta, Jun–Jul 2025; Summit 2026: Valdora "Liquid RWA Vaults"), Enjinstarter partnership (an external launchpad) | 31 Oct |

Carried forward, **not re-read today**: Zignaly's closure notice and Permapod's incident words (Session AF, 18 Oct,
`apps/web/lib/earn/options.ts` `ZIGNALY_CLOSURE`, `PERMAPOD_STATUS`), the faucet link (`https://faucet.zigchain.com/`,
verified-links registry, 18 Oct, 403 to automation).

## 2. What v6 changes for apps

| Change | Officially live? | Effect on ZIGoals | Decision |
|---|---|---|---|
| Fees: EIP-1559 base fee from `x/feemarket`, floor 2.5 Gazig/gas | testnet yes; mainnet only after the upgrade (prop #45, height 13,466,800, ~3 Nov 09:30 UTC, if it passes) | Already handled by Session AJ (quote reads the base fee on v6) | Nothing new. `lib/zigchain-eco/chain-shape.ts` recognises v5.1 vs v6.0 by version and by the base-fee answer, for display only |
| EVM module, Ethereum JSON-RPC | testnet: RPC published (`testnet-evm.zigchain.com`), **EVM chain id 2061**; mainnet: **not live** (no `evm-rpc-nodes.txt`; chain id **944** reserved in the upgrade notes); devnet 91902 | — | **Read-only EVM balances not built.** The brief allows them only when officially live; mainnet is not. The testnet RPC answered this session's JSON-RPC POST with a **Cloudflare managed challenge (HTTP 403, `cf-mitigated: challenge`)**, also on the CORS preflight, so a browser read cannot be relied on either. Revisit after 3 Nov with a live `eth_chainId` = `0x3b0` (944) check |
| `keys add` defaults to coin type 60 / `eth_secp256k1` | testnet | Keplr's existing 118 accounts unaffected; the app reads addresses, never keys | none |
| IBC: ibc-go v10 `denoms` API (`denom_traces` gone) | **both** networks already (v5.1.2 too) | Denom traces must be read from `/ibc/apps/transfer/v1/denoms/{hash}` | `lib/zigchain-eco/denoms.ts` parses the v10 shape and, defensively, the older `denom_trace` shape; the hash is **recomputed** (SHA-256 of the full path) and must equal the denom, so a node cannot pass off a wrong trace |
| Staking, slashing, distribution, gov responses | identical shapes on v5.1.2 and v6.0.0 (SDK 0.53.8) | Validator, rewards and unbonding parsers unchanged | Tests carry fixtures of both, captured from the two live networks |
| Voting needs ≥ 1 ZIG bonded | testnet (Session AJ P4) | already handled | none |

## 3. Live ecosystem apps and keyless read-only APIs

| App | What | Status today | Official keyless read-only API | ZIGoals reads it? |
|---|---|---|---|---|
| Valdora | stZIG liquid staking; USDC vaults (Stablecoin Yield, Core Income, Opportunistic Credit) | Live (DefiLlama TVL, on-chain contracts) | None published; contract queries on the chain's own LCD | Yes, already: `/api/earn/valdora`, `/api/earn/vaults` (LCD contract queries) |
| OroSwap | DEX (swap, pools) | Live (DefiLlama TVL, router contracts) | None documented; pool contracts on the LCD | Yes, already: `/api/earn/oroswap` |
| Nawa | Shariah-aligned vaults | Live; its USDC vault depends on Zignaly, which is closing | DefiLlama only | DefiLlama, already |
| DeFa by InvoiceMate | invoice-finance pools | "Private mainnet", no public app (18 Oct) | DefiLlama only | DefiLlama, already |
| Permapod | RWA lending | Paused after an exploit (18 Oct, its X account and DefiLlama); residual TVL still listed | DefiLlama only | DefiLlama, already |
| Zignaly | (CeFi) portfolios | **Closing**: last Private Credit withdrawal request 1 Nov, app closes 1 Dec 2026 23:59 UTC (notice of 18 Oct, carried forward) | — | closure notice kept |
| ZIGChain Hub | staking, proposals, bridge, transparency dashboard | Live | — (403 to automation) | links only |
| Range, ZIGScan, NodeStake, Stake and Relax | explorers | Live | — | links only |
| Zamanat, Ondo, Taurus, Apex Group, Beehive | RWA / institutional partners on zigchain.com | Listed; no ZIGChain app or contract a person can use was found | — | directory only |
| WME (Wealth Management Engine) | ZIGChain's planned wealth engine | **Not live**: docs still say the implementation section is coming | — | directory only, "not live yet" |
| Launchpad | — | No ZIGChain-native launchpad found; Enjinstarter (external) announced ZIGChain support | — | not listed |
| Bridges | Hub bridge (IBC; Axelar for ERC-20 ZIG and Ethereum tokens via `08-wasm-1369`; Injective for USDC.inj); Skip Go | Live | — | links only (existing) |

No new outside host is needed for anything built: every read goes through the app's own routes to the official
LCDs (`api.zigchain.com`, `testnet-api.zigchain.com`) or the existing DefiLlama reads.

## 4. Token clarity: the curated list and the spoof rules

The Cosmos chain registry's `zigchain/assetlist.json` (generated from ZIGChain's own registry, which whitelists IBC
tokens by hand) names these mainnet tokens. Each IBC hash was **recomputed** here from its path and matched:

| Symbol | Base denom | From |
|---|---|---|
| ZIG | `azig` | native (18) |
| ZIG.legacy | `uzig` | pre-v5 unit (6), IBC escrow backing only |
| stZIG | `coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig` | Valdora (6) |
| ATOM | `ibc/EF48E6B1…F49F33C0` = `transfer/channel-4/uatom` | Cosmos Hub |
| USDC.inj | `ibc/6C6F5A01…529A9B6B` = `transfer/channel-12/erc20:0xa00C…235a` | Injective |
| USDC.n | `ibc/6490A7EA…D40D8AF4` | Noble (winding down) |
| ZIG.axl | `ibc/9BEE293E…6F34788A` = `transfer/channel-1/unit-zig` | Axelar |
| ETH, WBTC, USDT, EURC, XAUt, SolvBTC, NEIRO | `ibc/…` via `transfer/08-wasm-1369/…` | Ethereum (through Axelar's light client) |
| stATOM | `ibc/729AE368…2B578B9930` | Cosmos Hub |

Rules (implemented in `lib/zigchain-eco/denoms.ts`):
- A readable name comes **only** from an exact base-denom match with this dated list, or from a verified IBC trace
  (path → base denom → the hash recomputed and equal). Bank metadata and CW20 `token_info` names are written by whoever
  created the token: shown as "the token's own name", never as the identity.
- A name that, after Unicode normalisation (NFKC, zero-width removed, common Cyrillic/Greek look-alikes folded, case
  folded), reads as a known symbol (ZIG, stZIG, USDC, ATOM, ETH…) while the denom differs is a **look-alike**:
  "Not the real <symbol>". The known decoy `coin.zig153u6…zig` stays covered by `lib/staking/decoy-guard.ts`.
- The denom (or the contract address) is always shown in full next to any name.

## 5. Announced but not live (as of 31 Oct 2026)

- **Mainnet v6** (EVM, JSON-RPC, base fee): on-chain proposal #45 in voting until 2 Nov 10:48 UTC; planned height
  13,466,800 (~3 Nov 09:30 UTC). Not in this PR (A13: owner check after the deploy).
- **Mainnet EVM JSON-RPC**: no endpoint published; chain id 944 reserved.
- **WME**: architecture only.
- **Valdora "Liquid RWA Vaults"**: press (Cointelegraph, ZIGChain Summit 2026); not separately verified on Valdora's own
  pages today.
- **DeFa** public app: "coming soon" on its site (18 Oct).

## 6. What was built from this (F4)

All read-only, information only, no new message type, nothing new signed, nothing in the review sheet or `execute.ts`
changed. See the lane report for files and tests: validator chooser facts (top-10 hint, Nakamoto count, status words),
staking clarity (claimable, unbonding calendar `unbondingEvents()`, rewards history from the person's own confirmed
claims, CSV through `csvSafeCell`), staked ZIG in the purpose picture ("available in N days"), token clarity
(denom traces, look-alike guard), governance (proposer's words shortened, deadline, opt-in reminder), directory status
labels with dates, the practice journey's steps and badge. Not built: EVM balances (section 2).
