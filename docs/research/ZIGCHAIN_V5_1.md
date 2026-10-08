# ZIGChain v5.1 on zig-test-2 and zigchain-1 (Session X Part 1, 2026-10-07)

Research only: nothing was uploaded, signed or sent. Every chain read below is a public, read-only GET; the address used
for the account paths is fictional (bech32 of twenty `0x07` bytes) and holds nothing. Raw reads:
[LIVE_CHAIN_READS.json](../verification/x-cloud/part1/LIVE_CHAIN_READS.json).

## What changed, and where it is published
| Fact | Evidence |
|---|---|
| v5 redenominated ZIG from `uzig` (6 decimals) to `azig` (18 decimals); "1 ZIG is still 1 ZIG"; `uzig` stays only as IBC escrow backing | ZIGChain/networks `upgrades/v5/README.md` (source, read 2026-10-07) |
| Testnet `zig-test-2`: v5 ran at height 7,669,200; the v5.1.0 binary swap at halt height 7,930,000 on 2026-09-25 (no governance proposal, no upgrade handler) | cosmos/chain-registry [PR #7990](https://github.com/cosmos/chain-registry/pull/7990), merged 2026-09-25; `upgrades/v5/README.md` (source, read 2026-10-07) |
| v5.1.0 = the patched CosmWasm runtime (wasmd v0.60.9-rc.3, wasmvm v2.3.5-rc.3) on the v5 state machine; ibc-go 10.5.0 | PR #7990 description (source, read 2026-10-07) |
| Mainnet `zigchain-1`: v4.3.0 → v5 (tag v5.1.0) at height 12,549,000 by governance proposal #41 (about 2026-09-30); CometBFT 0.38.25, Cosmos SDK 0.53.8; fee and staking denom `azig` with gas prices scaled to 18 decimals | cosmos/chain-registry [PR #7999](https://github.com/cosmos/chain-registry/pull/7999), merged 2026-09-30 (source, read 2026-10-07) |
| v5.1.2: required on mainnet to recover from the halt at 12,549,000 (an oversized upgrade-block response crashed goleveldb nodes; adds `repair-state-db`) | `upgrades/v5/README.md` (source, read 2026-10-07) |
| Recommended binaries today: testnet v5.1.1 (`zig-test-2/version.txt`), mainnet v5.1.2 (`zigchain-1/version.txt`); README table "testnet v5 (v5.1.1)", "mainnet v5 (v5.1.2)" | ZIGChain/networks (source, read 2026-10-07) |
| Breaking API changes for this app: none found. The REST paths the app reads (node_info, staking params, `denoms_metadata/azig`, balances `by_denom`, delegations, unbonding delegations, rewards, validators, `blocks/latest` with `x-cosmos-block-height`) all answer 200 at a pinned height on both networks; the wasm params REST route, which answered 501 on v5.0.0-patch-1 (TESTNET.md), now answers 200 | LIVE_CHAIN_READS.json (local, read 2026-10-07 21:38 UTC) |
| No EVM, denomination path or fee change affects the app: the denomination was already `azig`/18 in code (ADR-004, Session P); both networks' node minimum gas price is `2500000000azig`, the app's configured gas price | `/cosmos/base/node/v1beta1/config` (local read, 2026-10-07) |

## What the live nodes report (local reads, 2026-10-07)
- **Testnet REST `https://testnet-api.zigchain.com`** answers from two nodes behind one name: `znode04-testnet` on
  **v5.1.0** (git `3dd8a7e`) and `znode05-testnet` on **v5.1.2** (git `2de3c0f`): 12 reads gave 5 and 7. The other public
  testnet REST endpoints (Numia, Polkachu, NodeStake) report v5.1.0. The owner's evidence on 2026-10-07 (network
  `zig-test-2`, app `zigchaind`, v5.1.0, RPC height 8,119,380, denom `azig` with 18 decimals) matches.
- **Mainnet REST `https://api.zigchain.com`**: v5.1.2; `azig`, 18 decimals, bond denom `azig` (read-only).
- **Why Connection diagnostics said "Unavailable or changed":** the app required exactly `v5.0.0-patch-1`
  (`apps/web/lib/diagnostics.ts`), so every v5.1 node failed the check.

## What Session X changed (`[TIER 3] (chain config)`)
- `@zigoals/chain-config` names the reviewed versions, `REVIEWED_TESTNET_VERSIONS = ["v5.1.0", "v5.1.1", "v5.1.2"]`:
  every v5.1 patch release of the v5 state machine that ZIGChain publishes, including both the one the public testnet
  nodes run and the one `version.txt` recommends. `verifyNetwork` accepts one exact version or a list and returns the
  version it read; anything else (older, newer, malformed) still fails closed.
- Connection diagnostics verify against that list and name the version read ("Verified zig-test-2 · azig · 18 decimals ·
  v5.1.0").
- The deployment manifest schema accepts the repository's prepared manifest (made on v5.0.0-patch-1 on 2026-09-13; it is
  evidence and is not rewritten) and the reviewed v5.1 versions. A new preparation records the version the node reported.
- The financial preflight is unchanged: the live node must report exactly the deployed manifest's version. **Owner note
  for a later deployment:** while the official endpoint answers from nodes on two versions, an exact-version preflight
  would block signing on roughly every other request; at deployment time either the nodes agree, or the rule becomes the
  reviewed list (a separate reviewed change). Nothing is deployed today, so nothing signs.
- `scripts/verify-hosted-alpha.mjs` accepts any reviewed version and no longer pins M5's build commit `3645b48` (it now
  reads the build commit Settings shows: `EXPECTED_COMMIT` when given, else any full commit).
- Keplr's chain suggestion was checked against the live values (chain id, RPC/REST, coin type 118, `zig` prefixes,
  `azig`/18, gas steps 2.5e9/2.5e9/4e9 against the node minimum 2.5e9): unchanged, and now pinned by a unit test.

## Is the Goal Manager upload still blocked? Yes.
- `GET /cosmwasm/wasm/v1/codes/params` answers `code_upload_access.permission: "AnyOfAddresses"` on both networks (34
  addresses on testnet, 15 on mainnet) and `instantiate_default_permission: "Everybody"` (local read, 2026-10-07). An
  instantiate permission does not allow an upload.
- ZIGChain's documentation (docs.zigchain.com/builders/cosmwasm-whitelisting, updated 2026-09-23, read 2026-10-07):
  "Contract uploads are restricted to whitelisted addresses"; on testnet by a request to ZIGChain support, on mainnet by a
  governance proposal; verification with `zigchaind query wasm params`.
- The dedicated wallet's address is not in the repository (the request draft leaves it for the owner), so this session
  could not check the list for it. **Owner action:** compare the wallet's `zig1…` address with the list
  (`curl -s https://testnet-api.zigchain.com/cosmwasm/wasm/v1/codes/params`, read-only) before any upload work; the
  request draft (TESTNET_WHITELIST_REQUEST.md) is still unsent.
