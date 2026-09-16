# Current ZIGChain evidence

Retrieved 2026-09-13 UTC. Live JSON snapshots in this directory record retrieval time; node-info/staking/bank/status were read from official endpoints. Confidence refers to the cited observation, not future stability.

| Capability | Status / evidence | Source | Confidence |
|---|---|---|---|
| Testnet | CONFIRMED: zig-test-2, v5.0.0-patch-1 | https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info ; https://raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/version.txt | High, live + fresh source |
| Native asset | CONFIRMED: bond_denom azig; ZIG display exponent18 | https://testnet-api.zigchain.com/cosmos/staking/v1beta1/params ; https://testnet-api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/azig | High, live |
| RPC | CONFIRMED: zig-test-2, synced; captured height7739907 | https://testnet-rpc.zigchain.com/status | High, live snapshot |
| REST | CONFIRMED for bank, staking, node and contract-info queries | https://testnet-api.zigchain.com | High for tested routes only |
| gRPC | CONFIRMED live GetNodeInfo over HTTP/2 at grpc-t.zigchain.nodestake.org:443: gRPC status0, zig-test-2, v5.0.0-patch-1. Listed Polkachu alternative not exercised. | https://raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/grpc-nodes.txt ; live-grpc.json | High for tested service |
| Mainnet ID | CONFIRMED config zigchain-1 | https://raw.githubusercontent.com/ZIGChain/networks/main/zigchain-1/chain-id.txt | High config; no transactions |
| Explorer | CONFIRMED published ZIGScan Testnet link | https://docs.zigchain.com/users/tools/block-explorers | High for published link and HTTP200 homepage/account route; transaction path remains unverified (public tx search timed out) |
| Wasm runtime | CONFIRMED reported wasmd0.55.1, wasmvm/v2 2.2.4 | live node_info build dependencies | High for node report |
| Upload whitelist | CONFIRMED official requirement; operator membership UNCONFIRMED | https://docs.zigchain.com/builders/cosmwasm-whitelisting | High documentation; address not supplied |
| Wasm params REST | UNCONFIRMED: HTTP501 code12 Not Implemented on both official and Numia LCD | /cosmwasm/wasm/v1/params at both LCD hosts | High observation; not evidence of upload permission |
| Faucet | CONFIRMED official route only: https://faucet.zigchain.com | https://docs.zigchain.com/integration-guides/chain-information | High published route. Owner reports zero funds and failed 50000000uzig request; no repeated request sent. No alternative verified funding route found. |

## Documentation contradictions and resolution

The browser cache returned v4.1.0 from version.txt, whereas a direct network fetch returned v5.0.0-patch-1, matching the live node. Do not describe that cache as the current repository. Current v5 docs and older examples coexist; sample uzig/6 values are unsuitable for this live testnet. Actual repo Worker config is landing/wrangler.jsonc (not root); preserve it without relocating or fixing deployment assumptions.

Official source hierarchy: https://docs.zigchain.com/integration-guides/chain-information → https://github.com/ZIGChain/networks → live endpoints. Primary native registry tree currently has assets/native/zig.mainnet.json but no native zig.testnet.json; generated testnet chain.json path tried returned404. A missing file is not proof of absent chain functionality.

## SDK and wallet evidence

https://docs.zigchain.com/builders/react-sdk/introduction and https://docs.zigchain.com/builders/js-sdk/introduction describe @zigchain/zigchain-sdk/@zigchain/zigchainjs on authenticated GitHub Packages. Public npm returned no package metadata. Exact current private SDK versions/config cannot be verified here; do not fabricate or install unverified substitutes. Access must be provisioned by owner/team later, without committing tokens.

Public npm metadata checked before install: @cosmos-kit/react2.24.1, @cosmos-kit/keplr2.17.1, @cosmjs/cosmwasm-stargate0.38.1, @keplr-wallet/types0.13.41. Cosmos Kit is compatible with React18/19 but adds multi-wallet/UI dependencies unnecessary for Keplr-only alpha. Chosen direct Keplr documented API + CosmJS0.38.1; the installed cosmwasm-stargate package re-exports renamed @cosmjs/cosmwasm. No private ZIGChain SDK imported. This is a deliberate minimal adapter, with SDK migration pending evidence.

Keplr chain suggestion/enable/getKey/getOfflineSignerAuto and keplr_keystorechange are the connection boundary: https://docs.keplr.app/api/guide/suggest-chain ; https://docs.keplr.app/api/guide/custom-event ; https://docs.keplr.app/api/use-with/cosmjs . BIP44 coin type118 confirmed at https://docs.zigchain.com/about-zigchain/accounts . Existing Keplr chain definitions may not update through suggestChain: verify that wallet displays azig/18 before testnet signing; application accounting independently checks live metadata.

Gas price2500000000azig comes from current official deployment examples: https://docs.zigchain.com/builders/cosmwasm-module . Estimate actual gas per message and add30%; fee is integer base units, not a fixed token reserve. Recheck pricing with the network before deployment.

Installed compatibility check: CosmJS0.38.1 defaults Bech32 decoding to Infinity, rejected by scure-base2.4.0. The app passes the standard finite90-character bound explicitly for both20-byte wallet and32-byte contract addresses; direct tests verify valid addresses and reject malformed prefix/checksum/length. Remaining upstream unbounded helpers are not used by the implemented flow.

## 2026-09-17 EVM/support addendum

**EVM execution status: RESEARCH_ONLY / FUTURE_GATED / NOT_EXECUTION_READY.**

Primary-source facts:
- ZIGChain v5 changes native ZIG to 18-decimal `azig`; the official rationale explicitly cites alignment across Cosmos, EVM and IBC ecosystems: https://docs.zigchain.com/about-zigchain/redenomination
- Token Wrapper documentation describes ERC-20 ZIG moving from Ethereum through Axelar/IBC to native ZIG on ZIGChain and references failed EVM-origin recovery: https://docs.zigchain.com/builders/token-wrapper-module
- Current official Chain Information publishes Tendermint RPC, REST/LCD and gRPC resources. No canonical ZIGChain EVM JSON-RPC, EVM chain ID, MetaMask configuration, Solidity deployment guide or public EVM testnet workflow was established in the reviewed official documentation: https://docs.zigchain.com/integration-guides/chain-information

Owner-reported support communication says the broad EVM integration is under active implementation/testing and CosmWasm whitelisting is paused with no ETA. The separate testnet-funding request remains pending.

Architecture consequence: keep the deterministic Goal Engine VM-independent. Future Cosmos/CosmWasm and EVM execution adapters must remain separate authority boundaries. No EVM execution may be enabled until official RPC/chain/wallet/address/gas/finality/receipt specifications, contract provenance and testnet receipts are verified.
