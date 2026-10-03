# Evidence register (d) Stablecoins and swaps on ZIGChain

Part of [EVIDENCE_2026-10.md](../EVIDENCE_2026-10.md), which explains the labels, lists the pages that could not be read and gives the second check (F01–F24). Read on 2026-10-02 (UTC). What is live on chain, what the issuers say (Noble is recorded as a warning, never as something to build on), and OroSwap.

## A-zig-ibc-channels
**VERIFIED** · chain/ibc

The docs IBC channel list gives mainnet channel-3 ↔ Noble (noble-1) and channel-4 ↔ Cosmos Hub (cosmoshub-4), and testnet channel-44 ↔ Noble (grand-1), channel-43 ↔ Cosmos Hub (provider), channel-0 ↔ Axelar. LCD client states agree: mainnet channel-3 chain_id noble-1, channel-4 cosmoshub-4, testnet channel-44 grand-1. Testnet channel-35, which is not in the docs table, also resolves to grand-1 (client 07-tendermint-72).

*How:* Docs read via WebFetch today (two reads); LCD /ibc/core/channel/v1/channels/&lt;ch>/ports/transfer/client_state GET today.

- <https://docs.zigchain.com/integration-guides/ibc-channel-list> · read 2026-10-02T20:59:14Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Noble | noble-1 | channel-3 | channel-175 ... Cosmos Hub | cosmoshub-4 | channel-4 | channel-1555 ... Noble | grand-1 | channel-44 | channel-704`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-3/ports/transfer/client_state> · read 2026-10-02T20:51:38Z · height 12610511 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/mainnet_channel-3_client_state`
  `"client_id":"07-tendermint-3" ... "chain_id":"noble-1"`
- <https://testnet-api.zigchain.com/ibc/core/channel/v1/channels/channel-35/ports/transfer/client_state> · read 2026-10-02T20:51:37Z · height 8045444 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/testnet_channel-35_client_state`
  `"client_id":"07-tendermint-72" ... "chain_id":"grand-1"`
- <https://testnet-api.zigchain.com/ibc/core/channel/v1/channels/channel-44/ports/transfer/client_state> · read 2026-10-02T20:51:37Z · height 8045444 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/testnet_channel-44_client_state`
  `"client_id":"07-tendermint-84" ... "chain_id":"grand-1"`

## A-zig-usdc-denoms
**VERIFIED** · chain/ibc

IBC USDC denoms: on mainnet, ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4 = base 'uusdc' via transfer/channel-3 (the LCD denom_hashes endpoint returns this hash for transfer/channel-3/uusdc). On testnet, ibc/5260516290F7883EC893AADA09A6B8CEC790F2EEF3196F440037908749785BE8 = uusdc via transfer/channel-44, and ibc/8E452E728A6598EEF051E63FFE49AF19004F5D2AA3F690413C2985660AAFD38F = uusdc via transfer/channel-35.

*How:* Official LCD /ibc/apps/transfer/v1/denoms/&lt;hash> and /denom_hashes/&lt;trace> GET today.

- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4> · read 2026-10-02T20:46:11Z · height 12610409 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/mainnet_denoms_6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4`
  `{"denom":{"base":"uusdc","trace":[{"port_id":"transfer","channel_id":"channel-3"}]}}`
- <https://api.zigchain.com/ibc/apps/transfer/v1/denom_hashes/transfer%2Fchannel-3%2Fuusdc> · read 2026-10-02T20:47:33Z · height 12610435 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/mainnet_denom_hash_channel-3_uusdc`
  `{"hash":"6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4"}`
- <https://testnet-api.zigchain.com/ibc/apps/transfer/v1/denoms/5260516290F7883EC893AADA09A6B8CEC790F2EEF3196F440037908749785BE8> · read 2026-10-02T20:51:21Z · height 8045441 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/testnet_denoms_5260516290F7883EC893AADA09A6B8CEC790F2EEF3196F440037908749785BE8`
  `{"denom":{"base":"uusdc","trace":[{"port_id":"transfer","channel_id":"channel-44"}]}}`
- <https://testnet-api.zigchain.com/ibc/apps/transfer/v1/denoms/8E452E728A6598EEF051E63FFE49AF19004F5D2AA3F690413C2985660AAFD38F> · read 2026-10-02T20:51:23Z · height 8045441 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/testnet_denoms_8E452E728A6598EEF051E63FFE49AF19004F5D2AA3F690413C2985660AAFD38F`
  `{"denom":{"base":"uusdc","trace":[{"port_id":"transfer","channel_id":"channel-35"}]}}`

## A-oroswap-docs-fees
**VERIFIED** · checked again in [F17](../EVIDENCE_2026-10.md#f17) (CONFIRMED) · oroswap/fees

Provider-published claim (OroSwap docs swap guide): 'Fees: 1% default fee, redistributed to liquidity providers.' The FAQ says OroSwap 'charges standard swap fees and a percentage of farming rewards.'

*How:* curl GET today; exact strings checked in the raw HTML.

> Second check (F17): the plain xyk type is 1 bps (0.01%); only concentrated, xyk_100 and xyk_97 are 100 bps (1%). Every type has maker_fee_bps 2000; by the main-branch code that sends 20% of each swap fee to the Maker fee address, not to liquidity providers.

- <https://docs.oroswap.org/docs/getting-started/swap> · read 2026-10-02T20:38:06Z · SHA-256 of the page as received `f31b670342dda4dfb56297cb17e515474194cc30572a378645424e72856b5f3c`
  `Fees: 1% default fee, redistributed to liquidity providers.`
- <https://docs.oroswap.org/docs/oroswap_faq> · read 2026-10-02T20:38:07Z · SHA-256 of the page as received `5d600bcc2bed5769cf1746f034aa233ca5ff52908d42a9124cebb288a5939536`
  `A: OroSwap charges standard swap fees and a percentage of farming rewards. The AI-powered swap routing optimizes for minimal fees.`

## A-oroswap-docs-addresses
**VERIFIED** · oroswap/addresses

The OroSwap docs page 'Mainnet Deployment Addresses' publishes:
- Factory zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85
- Native Coin Registry zig1lstuws59hjswletwmskefdajhq76pz9tlfq84perndemrzztda0qqmjlc0
- Router zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy
- Incentives zig10v0hrjvwwlqwvk2yhwagm9m9h385spxa4s54f4aekhap0lxyekysf2ekwz
- Maker zig1hyja4uyjktpeh0fxzuw2fmjudr85rk2qu98fa6nuh6d4qru9l0ss0j233h
- Pool Initializer zig1fxkx7wd4q7z5zgm8qh0vaxptx4gp0ppgjm0ke56jr55azpzecpcspexyqq

*How:* curl GET today. The page URL was found via docs.oroswap.org/sitemap.xml; the docs root is a client-side shell.

- <https://docs.oroswap.org/docs/contracts-faucet/creating_constant_product_pools> · read 2026-10-02T20:38:10Z · SHA-256 of the page as received `6426f802b108e790f55c97d0c0e6493b0b49181f293c649216d1ad5e8312ab3e`
  `export OROSWAP_FACTORY_ADDRESS="zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85" ... export OROSWAP_ROUTER_ADDRESS="zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy"`

## A-oroswap-docs-pools
**VERIFIED** · oroswap/pools

OroSwap docs: standard pools use the x\*y=k invariant, with the swap fee 'typically deducted from the input'. Pools are created via the factory's create_pair message, and the quote token must be ZIG or ORO (the doc frames its prerequisites around testnet). ACL concentrated pools are based on Astroport's PCL.

*How:* curl GET of the pool_overview, creating_standard_pools and pcl pages today.

- <https://docs.oroswap.org/docs/standard-pool/creating_standard_pools> · read 2026-10-02T20:38:08Z · SHA-256 of the page as received `c2a3b2d492498bd89c622f854c4723592b9557d45051bf9b3b30605ed6856f64`
  `Pools are created via the create_pair message on the OroSwap Factory contract.`
- <https://docs.oroswap.org/docs/standard-pool/creating_standard_pools> · read 2026-10-02T20:38:08Z · SHA-256 of the page as received `c2a3b2d492498bd89c622f854c4723592b9557d45051bf9b3b30605ed6856f64`
  `Quote Token: Must be one of the supported quote assets (ZIG or ORO)—these are set by the protocol for stability.`

## A-oroswap-docs-usdc-entry
**VERIFIED** · oroswap/tokens

The OroSwap IBC-tokens doc gives a token-list entry labelling ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4 as symbol 'USDC', exponent 6, originDenom 'uusdc', originChainId 'noble-1'. This is consistent with the LCD trace (uusdc via channel-3, whose client chain_id is noble-1).

*How:* curl GET today; quote whitespace collapsed from a code block.

- <https://docs.oroswap.org/docs/tokens/ibc-tokens> · read 2026-10-02T20:38:11Z · SHA-256 of the page as received `15dcee2000ec203acd8d99a54785f1e1c951d71d420484d09c9f7bf14d635a6d`
  `"protocol": "noble", "denom": "ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4", "symbol": "USDC", "exponent": 6, ... "originDenom": "uusdc", "originChainId": "noble-1"`

## A-oroswap-deployment-manifests
**VERIFIED** · oroswap/deployments

oroswap-deployments publishes zigchain/mainnet.json and zigchain/testnet.json; there are no root-level mainnet.json/testnet.json. The manifests list addresses only, with no code IDs or checksums.
- Mainnet: factory, router, incentives, coin_registry, maker and pool_initializer, identical to the docs addresses. Its chain_id field reads 'zig-mainnet-1', which differs from the LCD network 'zigchain-1'.
- Testnet (chain_id 'zig-test-2'): factory zig17a7mlm84taqmd3enrpcxhrwzclj9pga8efz83vrswnnywr8tv26s7mpq30, router zig1g00t6pxg3xn7vk0vt29zu9vztm3wsq5t5wegutlg94uddju0yr5sye3r3a, incentives zig1sq7mu45and7htxdjwe9htl0q3y33qlnt6cded6z299303pya5d0qda8sg7, coin_registry zig1knyre4stvestyn032u9edf9w0fxhgv4szlwdvy2f69jludmunknswaxdsr.

*How:* raw.githubusercontent.com GET today (sha256 6b97c4b0…2727 mainnet, 73394830…d3c3 testnet).

- <https://raw.githubusercontent.com/oroswap/oroswap-deployments/main/zigchain/mainnet.json> · read 2026-10-02T20:39:16Z · SHA-256 of the file as read `6b97c4b092d490a5e01ca15ef61ed7aedc6161d78be8236a04c999370de12727`
  `"network": "mainnet", "chain_id": "zig-mainnet-1", ... "factory": "zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85", "router": "zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy"`
- <https://raw.githubusercontent.com/oroswap/oroswap-deployments/main/zigchain/testnet.json> · read 2026-10-02T20:39:16Z · SHA-256 of the file as read `7339483063301b2785460315c72ccba87b7690ac6ec86856e8f0d6d29712d3c3`
  `"chain_id": "zig-test-2", ... "factory": "zig17a7mlm84taqmd3enrpcxhrwzclj9pga8efz83vrswnnywr8tv26s7mpq30", "router": "zig1g00t6pxg3xn7vk0vt29zu9vztm3wsq5t5wegutlg94uddju0yr5sye3r3a"`

## A-oroswap-core-router-msgs
**VERIFIED** · oroswap/interface

oroswap-core router messages (packages/oroswap-core/src/router.rs; there is no contracts/router/src/msg.rs):
- ExecuteMsg: Receive(Cw20ReceiveMsg); ExecuteSwapOperations {operations, minimum_receive?, to?, max_spread?}; internal ExecuteSwapOperation
- QueryMsg: Config {}, SimulateSwapOperations {offer_amount, operations}, ReverseSimulateSwapOperations {ask_amount, operations}
- SwapOperation: NativeSwap {offer_denom, ask_denom} | OroSwap {offer_asset_info, ask_asset_info, pair_type}
- MAX_SWAP_OPERATIONS = 50
- SimulateSwapOperationsResponse {amount, router_stages[]}

*How:* raw.githubusercontent.com GET of the main branch today; the README states it is forked from Astroport.

- <https://raw.githubusercontent.com/oroswap/oroswap-core/main/packages/oroswap-core/src/router.rs> · read 2026-10-02T20:39:45Z · SHA-256 of the file as received `703cb0271a048b3c3a5c920507d850530f9606f27ca36bd68765888363bd1750`
  ```text
  SimulateSwapOperations {
          /// The amount of tokens to swap
          offer_amount: Uint128,
          /// The swap operations to perform, each swap involving a specific pool
          operations: Vec<SwapOperation>,
      },
  ```

## A-oroswap-core-factory-pair-msgs
**VERIFIED** · oroswap/interface

oroswap-core factory and pair messages:
- Factory QueryMsg: Config, Pair {asset_infos, pair_type}, Pairs {start_after?: {asset_infos, pair_type}, limit?}, FeeInfo {pair_type}, BlacklistedPairTypes, TrackerConfig, PairsByAssets {asset_infos}, IsPairPaused, PauseAuthorities, PausedPairsCount. Pairs uses DEFAULT_LIMIT 10 and MAX_LIMIT 30.
- Factory ExecuteMsg includes CreatePair {pair_type, asset_infos, init_params?}.
- Pair ExecuteMsg includes Swap {offer_asset, ask_asset_info?, belief_price?, max_spread?, to?} and ProvideLiquidity/WithdrawLiquidity.
- Pair QueryMsg includes Pair, Pool, Config, Simulation {offer_asset, ask_asset_info?}, ReverseSimulation.
- AssetInfo = Token {contract_addr} | NativeToken {denom}.

*How:* raw.githubusercontent.com GET of factory.rs, pair.rs, asset.rs and contracts/factory/src/state.rs today.

- <https://raw.githubusercontent.com/oroswap/oroswap-core/main/contracts/factory/src/state.rs> · read 2026-10-02T20:40:05Z · SHA-256 of the file as received `31858b503c1d758d88ac9bd88e7d2c250d9174d399189075ed5f646c103d4222`
  ```text
  const MAX_LIMIT: u32 = 30;
  /// The default limit for reading pairs from [`PAIRS`]
  const DEFAULT_LIMIT: u32 = 10;
  ```
- <https://raw.githubusercontent.com/oroswap/oroswap-core/main/packages/oroswap-core/src/factory.rs> · read 2026-10-02T20:39:45Z · SHA-256 of the file as received `faff78468716218212bd8b785c16ea3c8698d1d2ac0250cfb7bada09bd860e4f`
  ```text
  Pairs {
          /// The pair item to start reading from. It is an [`Option`] type that contains both asset infos and pair type.
          start_after: Option<StartAfter>,
  ```

## A-oroswap-halborn
**VERIFIED** · checked again in [F16](../EVIDENCE_2026-10.md#f16) (CONFIRMED) · audits/halborn

Halborn audit 'Oroswap / CosmWasm Contracts': engagement June 30th–July 30th, 2025 on oroswap-core. Assessed commits 59f095b04ffb1c1bf8b38ee256b4cbb9a88d1dd3 (pool_initializer, 5 files) and 9042989f8fd00b6524b470a5850ec03f8e5a2e4e (162 files incl. factory, pair, pair_concentrated, pair_stable, router, tokenomics). Severity breakdown: Critical 0, High 0, Medium 1, Low 5, Informational 13; 17 Solved, 2 Acknowledged (HAL-07, HAL-14); '100% of all REPORTED Findings have been addressed'. Several remediation commit IDs are listed (e.g., f7566310fd7a…, 2fa02f9e30c3…).

*How:* curl GET of the official Halborn audit page today (HTTP 200, server-rendered).

- <https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648> · read 2026-10-02T20:40:16Z · SHA-256 of the page as received `300668b91314f1599d4c13bdc5fcbe063f1899353768e842a58a0340f66f2b9a`
  `` `Oroswap` engaged Halborn to conduct a security assessment on their smart contracts beginning on June 30th, 2025 and ending on July 30th, 2025. ``
- <https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648> · read 2026-10-02T20:40:16Z · SHA-256 of the page as received `300668b91314f1599d4c13bdc5fcbe063f1899353768e842a58a0340f66f2b9a`
  `(b) Assessed Commit ID:9042989f8fd00b6524b470a5850ec03f8e5a2e4e ... (c) Items in scope: 162 files`

## A-oroswap-mainnet-lcd
**VERIFIED** · oroswap/onchain

Mainnet OroSwap contracts (creator and admin zig1kctvwjfqg6fmx3s2n7y297ut5304kfzy4x7ted):
- factory: code 172, label 'oroswap-factory-mainnet', data_hash CE8659ADAA17927B21FCE2E8F3F9DFEB44802734EE95055FE0A4F937EB5FAB01. History INIT code 13 @2472838, then MIGRATE 172 @12549363 (2026-09-30T14:38:10Z) with msg {"redenom":{"from":"uzig","to":"azig"},"tracker_config":null}.
- router: code 14, 'oroswap-router-mainnet', BC17F0DD2EFCD7D8BEBB082352CD41BD621C07A388D575138719602A413DC410, never migrated, init {oroswap_factory: factory}.
- incentives: code 15, DAF91B13….
- maker: code 16, 4B036A6C….
- pool_initializer: code 17, A97AF7C4….
- coin_registry: code 18, D11A4A20….

*How:* LCD contract, history, code-info and code listing GET today (20:41:00–20:41:10Z).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/history> · read 2026-10-02T20:41:00Z · height 12610311 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/mainnet_factory_history`
  `"code_id":"172","updated":{"block_height":"12549363","tx_index":"0"},"msg":{"redenom":{"from":"uzig","to":"azig"},"tracker_config":null}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy> · read 2026-10-02T20:41:02Z · height 12610311 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/mainnet_router_contract`
  `"code_id":"14","creator":"zig1kctvwjfqg6fmx3s2n7y297ut5304kfzy4x7ted","admin":"zig1kctvwjfqg6fmx3s2n7y297ut5304kfzy4x7ted","label":"oroswap-router-mainnet"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/code-info/14> · read 2026-10-02T20:41:03Z · height 12610312 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/mainnet_code_14_codeinfo`
  `"checksum":"BC17F0DD2EFCD7D8BEBB082352CD41BD621C07A388D575138719602A413DC410"`

## A-oroswap-testnet-lcd
**VERIFIED** · oroswap/onchain

Testnet OroSwap contracts (creator and admin zig13cu9679ax3vxkq2n6aqeunfzzknmkjd0fnu5he):
- factory: code 2535, label 'oroswap-factory', data_hash A9FC60CCCFA663D4551869F4CE7CB91A968C833B09477D5621E4FBF2727EAE44. History INIT 37 → 335 → 558 → 2535 @7901528 (2026-09-23T12:36:35Z), with redenom msg.
- router: code 562, 'Oroswap Router', 48DA3C70F107E6A0B42A04194544BA56C09C1948C2B9D0C6175A4C8271571B30, INIT 336 → 562.
- incentives: code 559, 61A996CE….
- coin_registry: code 563, 7D4785DE….
Mainnet and testnet factory/router hashes differ.

*How:* LCD contract, history, code-info and code listing GET today (20:41:24–20:41:31Z).

- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig17a7mlm84taqmd3enrpcxhrwzclj9pga8efz83vrswnnywr8tv26s7mpq30/history> · read 2026-10-02T20:41:24Z · height 8045335 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/testnet_factory_history`
  `"code_id":"2535","updated":{"block_height":"7901528","tx_index":"0"},"msg":{"redenom":{"from":"uzig","to":"azig"},"tracker_config":null}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/code-info/562> · read 2026-10-02T20:41:27Z · height 8045335 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/testnet_code_562_codeinfo`
  `"checksum":"48DA3C70F107E6A0B42A04194544BA56C09C1948C2B9D0C6175A4C8271571B30"`

## A-oroswap-manifest-vs-lcd
**VERIFIED** · oroswap/deployments

Every manifest and docs address resolves on the official LCD to a contract whose label names the expected OroSwap role. The mainnet factory config points fee_address to the maker, generator_address to incentives and coin_registry_address to the registry, all as in the manifest. The manifests publish no code IDs or checksums, so deployed code cannot be compared with the manifests or with the Halborn-audited commits.

*How:* Compared literal manifest addresses with LCD contract_info labels and factory config today.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJjb25maWciOnt9fQ==> · read 2026-10-02T20:41:51Z · height 12610327 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/mainnet_factory_config`
  `"fee_address":"zig1hyja4uyjktpeh0fxzuw2fmjudr85rk2qu98fa6nuh6d4qru9l0ss0j233h","generator_address":"zig10v0hrjvwwlqwvk2yhwagm9m9h385spxa4s54f4aekhap0lxyekysf2ekwz","whitelist_code_id":0,"coin_registry_address":"zig1lstuws59hjswletwmskefdajhq76pz9tlfq84perndemrzztda0qqmjlc0"`

## A-oroswap-onchain-variants
**VERIFIED** · oroswap/interface

The live factory and router serde errors match the oroswap-core source (both networks):
- factory QueryMsg: config, pair, pairs, fee_info, blacklisted_pair_types, tracker_config, pairs_by_assets, is_pair_paused, pause_authorities, paused_pairs_count
- router QueryMsg: config, simulate_swap_operations, reverse_simulate_swap_operations
- SwapOperation variants: native_swap, oro_swap

*How:* Smart query {"zz_unknown":{}} and a nested-variant probe today.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy/smart/eyJ6el91bmtub3duIjp7fX0=> · read 2026-10-02T20:41:41Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/mainnet_router_zz_unknown`
  ``Error parsing into type oroswap_core::router::QueryMsg: unknown variant `zz_unknown`, expected one of `config`, `simulate_swap_operations`, `reverse_simulate_swap_operations`: query wasm contract failed``
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJ6el91bmtub3duIjp7fX0=> · read 2026-10-02T20:41:41Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/mainnet_factory_zz_unknown`
  `` Error parsing into type oroswap_core::factory::QueryMsg: unknown variant `zz_unknown`, expected one of `config`, `pair`, `pairs`, `fee_info`, `blacklisted_pair_types`, `tracker_config`, `pairs_by_assets`, `is_pair_paused`, `pause_authorities`, `paused_pairs_count` ``

## A-oroswap-factory-config-mainnet
**VERIFIED** · checked again in [F17](../EVIDENCE_2026-10.md#f17) (CONFIRMED) · oroswap/fees

Mainnet factory config pair_configs (all with maker_fee_bps 2000, pool_creation_fee '100000000000000000000' and is_disabled true):
- concentrated: code 174, total_fee_bps 100
- xyk: code 173, 1
- xyk_10: 10
- xyk_25: 25
- xyk_100: 100
- xyk_200: 200
- xyk_97: 100
- xyk_98: 25
- xyk_99: 25
paused_pairs_count is 0.

*How:* Smart queries {"config":{}} and {"paused_pairs_count":{}} today (block 12610327 / 12610351). Literal values only.

> Second check (F17): the same body came back from a second listed node (public-zigchain-lcd.numia.xyz) at block 12612875. By the PairConfig doc comment and the main-branch code, is_disabled blocks only the creation of new pairs; trading is halted by a separate per-pair paused flag, and paused_pairs_count is 0. The deployed factory (code 172) reports cw2 version 1.2.0 while the main branch says 1.1.0, so the deployed build is not the current main branch.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJjb25maWciOnt9fQ==> · read 2026-10-02T20:41:51Z · height 12610327 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/mainnet_factory_config`
  `{"code_id":173,"pair_type":{"xyk":{}},"total_fee_bps":1,"maker_fee_bps":2000,"is_disabled":true,"is_generator_disabled":false,"permissioned":false,"pool_creation_fee":"100000000000000000000"}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJwYXVzZWRfcGFpcnNfY291bnQiOnt9fQ==> · read 2026-10-02T20:43:09Z · height 12610352 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/mainnet_factory_paused_pairs_count`
  `{"data":0}`

## A-oroswap-factory-config-testnet
**VERIFIED** · oroswap/fees

Testnet factory pair_configs, all with is_disabled false and pool_creation_fee '1000000000000000000':
- concentrated: code 2537, total_fee_bps 10
- xyk / xyk_10 / xyk_25 / xyk_100 / xyk_200: code 2536, total_fee_bps 1 / 10 / 25 / 100 / 200, maker 2000
- stable: code 2538, total_fee_bps 100, maker_fee_bps 1000

*How:* Smart query {"config":{}} on the testnet factory today (block 8045340).

- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig17a7mlm84taqmd3enrpcxhrwzclj9pga8efz83vrswnnywr8tv26s7mpq30/smart/eyJjb25maWciOnt9fQ==> · read 2026-10-02T20:41:52Z · height 8045340 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/testnet_factory_config`
  `{"code_id":2538,"pair_type":{"stable":{}},"total_fee_bps":100,"maker_fee_bps":1000,"is_disabled":false,"is_generator_disabled":false,"permissioned":false,"pool_creation_fee":"1000000000000000000"}`

## A-oroswap-pairs-listing-incomplete
**VERIFIED** · oroswap/pairs

Paginating factory {"pairs":{"limit":30,"start_after":…}} returned only 31 pairs on mainnet and 42 on testnet. Enumerating /cosmwasm/wasm/v1/code/&lt;id>/contracts found 165 mainnet contracts on pair codes 19/20/173 and 379 testnet contracts on codes 38/333/334/560/561/1693/2536, all answering {"pair":{}}. The 'pairs' listing is therefore not exhaustive. The 4 mainnet ZIG/USDC pairs are missing from it, but pairs_by_assets returns them.
Denoms reported by the pair contracts themselves:
- Mainnet: 58 code-173 pairs report 'azig'; 101 code-19 and 2 code-20 pairs report 'uzig'.
- Testnet: 3 code-2536 pairs report 'azig'; 324 older pairs report 'uzig'.

*How:* All responses saved (pairs pages, code listings, 544 per-contract pair{} responses).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJwYWlycyI6eyJsaW1pdCI6MzB9fQ==> · read 2026-10-02T20:42:11Z · combined from the paged reads of this endpoint
  Observed (a summary of the response, not a quote): page 0: 30 pairs; page 1 with start_after = last pair: 1 pair; total 31
- <https://api.zigchain.com/cosmwasm/wasm/v1/code/19/contracts?pagination.limit=100> · read 2026-10-02T20:44:25Z · combined from the paged reads of this endpoint
  Observed (a summary of the response, not a quote): code 19: 105 contracts over 2 pages; code 20: 2; code 173: 58; code 174: 0

## A-oroswap-mainnet-zig-usdc-pairs
**VERIFIED** · oroswap/pairs

Mainnet OroSwap pairs between ZIG and Noble USDC (ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4). All were created by the factory and have admin zig1kctvw…. Asset infos as returned:
- zig1kt33w2ztud5duv0e6sc05y2xk046dtv4n8tfg38h4x2ryj5td9kq804928: xyk, [ibc/6490…, 'uzig'], code 19, label 'Oroswap pair xyk'
- zig1jusndv49thn5flmz6ejmmal5ch0j2fdvs5474m974zlsvn55lfjq923aul: custom xyk_10, [ibc/6490…, 'uzig'], code 19
- zig1y9m8ftqnjdf9ttvlfmz8kzey8d9hyn7acahq2ajepr74fft3duyqhzpwxe: custom xyk_100, [ibc/6490…, 'uzig'], code 19
- zig186ucx5mtdq6ams8rsvvcu7yfw5lhtxue8ykdkyqvlnk3gpc77lasw8373h: custom xyk_25, [ibc/6490…, 'azig'], code 173 (migrated @12549672)
LP tokens are coin.&lt;pair>.oroswaplptoken. factory pairs_by_assets [azig, ibc/6490…] returns these 4; with [uzig, ibc/6490…] it returns none.

*How:* pair{} on every pair contract, pairs_by_assets and contract_info queried today.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJwYWlyc19ieV9hc3NldHMiOnsiYXNzZXRfaW5mb3MiOlt7Im5hdGl2ZV90b2tlbiI6eyJkZW5vbSI6ImF6aWcifX0seyJuYXRpdmVfdG9rZW4iOnsiZGVub20iOiJpYmMvNjQ5MEE3RUFCNjEwNTlCRkMxQ0RERUIwNTkxN0RENzBCREYzQTYxMTY1NDE2MkExQTQ3REI5MzBENDBEOEFGNCJ9fV19fQ==> · read 2026-10-02T20:43:08Z · height 12610351 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/mainnet_factory_pairs_by_assets_azig_usdc`
  `{"asset_infos":[{"native_token":{"denom":"ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4"}},{"native_token":{"denom":"azig"}}],"contract_addr":"zig186ucx5mtdq6ams8rsvvcu7yfw5lhtxue8ykdkyqvlnk3gpc77lasw8373h"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1kt33w2ztud5duv0e6sc05y2xk046dtv4n8tfg38h4x2ryj5td9kq804928> · read 2026-10-02T20:47:12Z · height 12610428 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/pairs/mainnet_zig_usdc_xyk_contract`
  `"code_id":"19","creator":"zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85","admin":"zig1kctvwjfqg6fmx3s2n7y297ut5304kfzy4x7ted","label":"Oroswap pair xyk"`

## A-oroswap-mainnet-stzig-pairs
**VERIFIED** · oroswap/pairs

Mainnet pairs involving Valdora stZIG (coin.zig109f7…maam2.stzig):
- stZIG/ZIG xyk zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq, [stzig, 'azig'], code 173
- USDC/stZIG xyk zig1f2jt3f9gzajp5uupeq6xm20h90uzy6l8klvrx52ujaznc8xu8d7sfnrd87, code 19
- ztech/stZIG xyk zig1mhtvdvl8dffdcr0rk777swa8ll9gdra4v4pn2a6g8xwtshc398eqyznhur, code 19
- stZIG/zigmorning xyk_100 zig1jv7v8an78vwyfx409nvrguktz8dl97hg7v0qs59pnc9krlf4en8szqsq8h, code 19
All were created by the factory.

*How:* pair{} enumeration and contract_info queried today.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1h72z8ptvcdqvuvy2lqanupwtextjmjmktj2ejgne2padxk0z8zds48shzq> · read 2026-10-02T20:47:19Z · height 12610430 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/pairs/mainnet_stzig_zig_xyk_contract`
  `"code_id":"173","creator":"zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85","admin":"zig1kctvwjfqg6fmx3s2n7y297ut5304kfzy4x7ted","label":"Oroswap pair xyk"`

## A-oroswap-mainnet-zig-other-ibc-pairs
**VERIFIED** · oroswap/pairs

Other mainnet ZIG pairs with IBC assets (all code 173, reporting 'azig'):
- zig1ucwnlul7t97fx4xr83kzxt76pdgk86gmz36adl8mzk890frduwuslq09t6, xyk_10, with ibc/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9 (LCD base '0xdac17f958d2ee523a2206206994597c13d831ec7' via transfer/channel-4/transfer/08-wasm-1369)
- zig12uxfwsdsl7jrjrmuunflz4avqc34myaqtv8s84mcfryl49kc6qeqtdz5me, xyk, with ibc/7B02D9C0… (base 0x2260fac5…)
- zig1sgpyrs5farvhae68u3eevuuw2knxd6uqagptw968ys26zvgjvrvq685sxn, xyk_25, with ibc/E5EE3EF1… (base 0x812ba41e…)
- zig147ssatunm8wuukmzer8jc7nw2hqmrgawwmc9gu6hgqtm24c8x29qhjtl58, xyk_10, with ibc/5E970F9F… (base 0xc02aaa39…)
- zig1wvqk2tm38dn3yp9ry7h5zzjqv3tytzpwpkkg55w3j58cdhvqrnfq78fe45, xyk, with ibc/EF48E6B1… (base 'uatom' via channel-4)

*How:* pair{} enumeration and /ibc/apps/transfer/v1/denoms/&lt;hash> GET today. Bank metadata for these IBC denoms carries only exponent-0 auto-generated names.

- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9> · read 2026-10-02T20:46:16Z · height 12610410 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/mainnet_denoms_630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9`
  `{"denom":{"base":"0xdac17f958d2ee523a2206206994597c13d831ec7","trace":[{"port_id":"transfer","channel_id":"channel-4"},{"port_id":"transfer","channel_id":"08-wasm-1369"}]}}`

## A-oroswap-testnet-zig-usdc-pairs
**VERIFIED** · oroswap/pairs

Testnet OroSwap ZIG/USDC pairs (both created by the factory zig17a7m…, admin zig13cu96…, code 560, data_hash 99D1DE1D…):
- zig18eep456306l3n6s8x72gvmu0m5fqw8u759e9w3tmzjp86fw5wfjs7705r5: custom xyk_200, ['uzig', ibc/5260516290F7883EC893AADA09A6B8CEC790F2EEF3196F440037908749785BE8 (uusdc via channel-44)]
- zig16p8fxfncdyxssntfra6tn6lvun20dnhxrw6vq5u560m002utapmq8seu3p: xyk, ['uzig', ibc/8E452E728A6598EEF051E63FFE49AF19004F5D2AA3F690413C2985660AAFD38F (uusdc via channel-35)]
factory pairs_by_assets returns each when queried with 'azig' and none with 'uzig'. The axelar 'uausdc' denom (ibc/5BDD47E9…) has no pairs.

*How:* pair{} enumeration of 379 testnet pair contracts, pairs_by_assets and contract_info today.

- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig18eep456306l3n6s8x72gvmu0m5fqw8u759e9w3tmzjp86fw5wfjs7705r5/smart/eyJwYWlyIjp7fX0=> · read 2026-10-02T20:50:07Z · height 8045428 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/pairinfo/testnet_pairinfo_zig18eep456306l3n6s8x72gvmu0m5fqw8u759e9w3tmzjp86fw5wfjs7705r5`
  `"asset_infos":[{"native_token":{"denom":"uzig"}},{"native_token":{"denom":"ibc/5260516290F7883EC893AADA09A6B8CEC790F2EEF3196F440037908749785BE8"}}],"contract_addr":"zig18eep456306l3n6s8x72gvmu0m5fqw8u759e9w3tmzjp86fw5wfjs7705r5"`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig16p8fxfncdyxssntfra6tn6lvun20dnhxrw6vq5u560m002utapmq8seu3p> · read 2026-10-02T20:51:56Z · height 8045447 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_lcd/pairs/testnet_zig_usdc35_xyk_contract`
  `"code_id":"560","creator":"zig17a7mlm84taqmd3enrpcxhrwzclj9pga8efz83vrswnnywr8tv26s7mpq30","admin":"zig13cu9679ax3vxkq2n6aqeunfzzknmkjd0fnu5he","label":"Oroswap pair xyk"`

## A-oroswap-router-simulate
**VERIFIED** · oroswap/interface

The live mainnet router accepted {"simulate_swap_operations":{"offer_amount":"1000000000000000000","operations":[{"oro_swap":{"offer_asset_info":{"native_token":{"denom":"azig"}},"ask_asset_info":{"native_token":{"denom":"ibc/6490…"}},"pair_type":{"custom":"xyk_25"}}}]}}. The response keys were amount and router_stages[{stage, pair_address, offer_asset, ask_asset, return_amount, commission_amount, spread_amount}]. Quote values are not recorded as a price claim.

*How:* Read-only smart query today (block 12610524). The response shape matches the source's SimulateSwapOperationsResponse.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy> · read 2026-10-02T20:52:16Z · height 12610524 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/oroswap_q/mainnet_router_simulate_zig_to_usdc_xyk25`
  Observed (a summary of the response, not a quote): HTTP 200; data keys [amount, router_stages]; stage keys [ask_asset, commission_amount, offer_asset, pair_address, return_amount, spread_amount, stage]

## A-oroswap-ibc630F-identity
**UNVERIFIED** · oroswap/tokens

Whether ibc/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9 (base 0xdac17f958d2ee523a2206206994597c13d831ec7) or the other 0x… IBC denoms are stablecoins, and what they are named.

*How:* No official source read today names these denoms. Bank metadata only repeats the trace, and the OroSwap token list files could not be located (404 on guessed tokenLists/\* paths; directory listing gated).

- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata_by_query_string?denom=ibc%2F630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9> · read 2026-10-02T20:46:16Z · height 12610411 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/a/ibc/mainnet_bankmeta_630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9`
  `"name":"transfer/channel-4/transfer/08-wasm-1369/0xdac17f958d2ee523a2206206994597c13d831ec7 IBC token"`

## A-oroswap-code-provenance
**UNVERIFIED** · oroswap/deployments

Whether the deployed OroSwap codes (factory 172, router 14, pair 19/173 on mainnet) correspond to the Halborn-audited commits or to the public main branch.

*How:* Neither the manifests nor the docs publish code IDs or checksums. The on-chain factory migrate msg contains a 'redenom' field, but the public main-branch factory MigrateMsg only defines 'tracker_config', so the deployed source cannot be matched from what was read.

- <https://raw.githubusercontent.com/oroswap/oroswap-core/main/packages/oroswap-core/src/factory.rs> · read 2026-10-02T20:39:45Z · SHA-256 of the file as received `faff78468716218212bd8b785c16ea3c8698d1d2ac0250cfb7bada09bd860e4f`
  ```text
  pub struct MigrateMsg {
      pub tracker_config: Option<TrackerConfig>,
  }
  ```

## B-noble-usdc-on-zigchain
**VERIFIED** · checked again in [F09](../EVIDENCE_2026-10.md#f09) (CONFIRMED) · Stablecoins on ZIGChain

Noble USDC exists on ZIGChain as ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4: base uusdc, trace transfer/channel-3. The client on ZIGChain channel-3 points to chain_id noble-1, and ZIGChain docs list channel-3 to Noble channel-175. Bank supply for this denom is non-zero (the amount is in the recorded response in evidence/ibc-and-swaps.json).

*How:* Official LCD api.zigchain.com at blocks 12610430–12610431 (/ibc/apps/transfer/v1/denoms/{hash}, /cosmos/bank/v1beta1/supply/by_denom, /ibc/core/channel/v1/channels/channel-3/ports/transfer/client_state). Also the ZIGChain registry assets/ibc/usdc.mainnet.json and the docs IBC channel list (WebFetch).

- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4> · read 2026-10-02T20:47:19Z · height 12610430 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/b/lcd_ibc_denoms_usdc`
  `{"denom": {"base": "uusdc", "trace": [{"port_id": "transfer", "channel_id": "channel-3"}]}}`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-3/ports/transfer/client_state> · read 2026-10-02T20:47:20Z · height 12610431 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/b/lcd_channel3`
  `"chain_id": "noble-1"`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/usdc.mainnet.json> · read 2026-10-02T20:46:36Z · SHA-256 of the response body as received `6c15b2398a9a01070c0f7df59cb4f72eb45a35f383aebd767eed77bf72a86ceb`
  `"name": "Noble USDC", "description": "Noble USDC on ZIGChain"`
- <https://docs.zigchain.com/integration-guides/ibc-channel-list> · read 2026-10-02T20:31:55Z · read through WebFetch, a processed view of the page (not a byte copy)
  `| zigchain-1 | channel-3 | Noble | noble-1 | channel-175 |`

## B-valdora-usdc
**VERIFIED** · Stablecoins on ZIGChain / Valdora guide

Valdora's guide at /how-to-guides/get-usdc-into-zigchain ('How to Bridge USDC to ZIG Chain') tells users to bridge USDC from 'any supported network' to ZIG Chain through the bridge at hub.zigchain.com. No fiat on-ramp is mentioned.

*How:* Fetched today with curl (GitBook HTML).

- <https://docs.valdora.finance/how-to-guides/get-usdc-into-zigchain> · read 2026-10-02T20:34:27Z · SHA-256 of the response body as received `7d1a360c4c9b3ce00b5d9f00134b8298531123350df14ea20608415fa6a471ba`
  `You will need: a wallet compatible with ZIG Chain, USDC on any supported network, and access to the ZIG Chain bridge at hub.zigchain.com.`

## C-zig-registry-listing
**VERIFIED** · ZIGChain asset registry: listing policy and stablecoin entries

ZIGChain registry whitelists IBC tokens manually. Its generated mainnet assetlist (197 assets) has exactly two stablecoin entries: USDC 'Noble USDC' (ibc/6490A7EA...) and USDT 'Tether USD' (ibc/630F2841...); no EURC, axlUSDC or USDY. The generated testnet assetlist (2817 assets) has zero ibc/ assets. No assets/ibc/\*.testnet.json exists for usdc/usdt (HTTP 404).

*How:* Read README and both generated assetlists via raw.githubusercontent.com; counted entries locally.

- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/README.md> · read 2026-10-02T21:07:24Z · SHA-256 of the file as received `fb4cb94abdca46abab2fc192aa09785530c531e83946312b1bd0eb7be316c3ae`
  ``**IBC tokens** (`ibc/{hash}`) — manual whitelist; only verified, accepted assets are listed.``
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/generated/chain-registry/zigchain/assetlist.json> · read 2026-10-02T21:07:36Z · SHA-256 of the file as read `b1e379449865d2ecacc7b35a42cf26ff336bce7337f4a0bc31e937c2c2c270e2`
  `"name": "Noble USDC"`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/generated/chain-registry/testnets/zigchaintestnet/assetlist.json> · read 2026-10-02T21:07:36Z · SHA-256 of the file as read `05031f5b4452b86e9b940a84381d1e127bfc23bdc6886c32a3570fabd1890cfc`
  `"chain_name": "zigchaintestnet"`

## C-zig-registry-protected-symbols
**VERIFIED** · ZIGChain registry protected stablecoin symbols

config/protected_assets.json allows USDC only as an ibc asset with expected origin chain noble, and USDT only as ibc from ethereum or kava. The check is not enforced on testnet (enforce_on_testnet false).

*How:* Read the config file and the README section on protected assets.

- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/config/protected_assets.json> · read 2026-10-02T21:07:57Z · SHA-256 of the file as read `4b92df52c289ea2f08b39a307b094ed92cb5d93a7ac1a8dccff7421c09e5aac9`
  `"enforce_on_testnet": false`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/README.md> · read 2026-10-02T21:07:24Z · SHA-256 of the file as received `fb4cb94abdca46abab2fc192aa09785530c531e83946312b1bd0eb7be316c3ae`
  `Factory tokens with a protected symbol fail validation outright. IBC tokens with a protected symbol must originate from an expected chain, or they fail.`

## C-zig-main-usdc-noble
**VERIFIED** · checked again in [F09](../EVIDENCE_2026-10.md#f09) (CONFIRMED) · Mainnet stablecoin LIVE: USDC via Noble (IBC)

LIVE on zigchain-1. Denom ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4 = transfer/channel-3/uusdc (LCD denom_hash confirms). Registry: 'Noble USDC', decimals 6, origin_chain noble, origin_denom uusdc, ZIGChain channel-3 to Noble channel-175. Channel-3 client 07-tendermint-3: chain_id noble-1, status Active. Supply 259465404300 base units (259,465.4043 USDC at 6 decimals) at block 12610879 (Date: Fri, 02 Oct 2026 21:11:09 GMT); unchanged at block 12611006. Issuer statement: Circle lists Noble USDC as 'uusdc' and says USDC moved off Noble via IBC becomes IBC-transferred USDC.

*How:* Registry file plus LCD denom_hash, client_state, client_status and supply_by_denom read today; Circle's own pages quoted.

> Second check (F09): at 22:53Z the voucher supply on zigchain-1 and the uusdc in Noble's channel-175 escrow were both 259314404300 in two rounds read 1 to 2 seconds apart (earlier today: 259465404300). The supply moves; the equality is a point-in-time result.

- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/usdc.mainnet.json> · read 2026-10-02T21:07:24Z · SHA-256 of the file as read `6c15b2398a9a01070c0f7df59cb4f72eb45a35f383aebd767eed77bf72a86ceb`
  `"zigchain_channel": "channel-3", "counterparty_chain": "noble", "counterparty_channel": "channel-175"`
- <https://api.zigchain.com/ibc/apps/transfer/v1/denom_hashes/transfer%2Fchannel-3%2Fuusdc> · read 2026-10-02T21:11:30Z · height 12610885 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_denom_hash_ch3_uusdc`
  `{"hash":"6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4"}`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-3/ports/transfer/client_state> · read 2026-10-02T21:10:11Z · height 12610861 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_clientstate_channel-3`
  `"chain_id":"noble-1"`
- <https://api.zigchain.com/ibc/core/client/v1/client_status/07-tendermint-3> · read 2026-10-02T21:10:45Z · height 12610871 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_clientstatus_07-tendermint-3`
  `{"status":"Active"}`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4> · read 2026-10-02T21:11:08Z · height 12610879 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_supply_by_denom_6490A7EA`
  `"amount":"259465404300"`
- <https://help.circle.com/api/sn_km_api/knowledge/articles/KB0010590> · read 2026-10-02T21:15:36Z · SHA-256 of the response (compact JSON) `ce9a3835237a6e63025d45af70132cf1bb3f1fd6f844ed6d56abc1c0b0f62688`
  `This means when USDC is transferred from Noble to other appchains via IBC, it will become IBC-transferred USDC.`
- <https://developers.circle.com/stablecoins/usdc-contract-addresses> · read 2026-10-02T21:15:56Z · SHA-256 of the page as received `429d18007d36b6b885c2937cc881602fd126e7993edf4445fc2b0e0b38ad2d1a`
  `Noble | uusdc |`

## C-noble-escrow-crosscheck
**VERIFIED** · checked again in [F09](../EVIDENCE_2026-10.md#f09) (CONFIRMED) · Noble-side cross-check of the ZIGChain USDC channel

Noble's official LCD (api.noble.xyz, listed in Noble docs) shows channel-175 STATE_OPEN with counterparty transfer/channel-3 and a light client for chain_id zigchain-1. The channel-175 escrow noble1e4quceq0nhvfalpkct2yecpu56ss3erltz8yku held 259465404300 uusdc at 2026-10-02T21:17:53Z, equal to ZIGChain's voucher supply at block 12611006 (21:17:54Z). Noble's API sent no block-height header; Noble's latest block at 21:17:52Z was 60656685.

*How:* Read Noble docs endpoint page and Noble LCD channel, client_state and escrow balance.

- <https://docs.noble.xyz/build/endpoints/mainnet> · read 2026-10-02T21:16:56Z · SHA-256 of the page as received `817126a73f81573552d0fb4369e4120af53487819d83ab586ab1d134666ce7ec`
  `https://api.noble.xyz`
- <https://api.noble.xyz/ibc/core/channel/v1/channels/channel-175/ports/transfer> · read 2026-10-02T21:17:39Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/noble_channel-175`
  `"counterparty":{"port_id":"transfer","channel_id":"channel-3"}`
- <https://api.noble.xyz/ibc/core/channel/v1/channels/channel-175/ports/transfer/client_state> · read 2026-10-02T21:17:38Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/noble_clientstate_channel-175`
  `"chain_id":"zigchain-1"`
- <https://api.noble.xyz/cosmos/bank/v1beta1/balances/noble1e4quceq0nhvfalpkct2yecpu56ss3erltz8yku/by_denom?denom=uusdc> · read 2026-10-02T21:17:53Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/noble_escrow_balance_uusdc`
  `{"balance":{"denom":"uusdc","amount":"259465404300"}}`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4> · read 2026-10-02T21:17:54Z · height 12611006 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_supply_by_denom_6490A7EA_recheck`
  `"amount":"259465404300"`

## C-zig-main-usdt-eureka
**VERIFIED** · Mainnet stablecoin LIVE: USDT via IBC Eureka (Ethereum to Cosmos Hub to ZIGChain)

LIVE on zigchain-1. Denom ibc/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9 = transfer/channel-4/transfer/08-wasm-1369/0xdac17f958d2ee523a2206206994597c13d831ec7. Registry: 'Tether USD', decimals 6, origin_chain ethereum, provider eureka; ZIGChain channel-4 to cosmoshub channel-1555, and 08-wasm-1369 to ethereum channel-0. LCD: channel-4 client 07-tendermint-4, chain_id cosmoshub-4, Active. Supply 29107467433 base units (29,107.467433 USDT at 6 decimals) at block 12610879. Issuer: Tether's official page gives the USD₮ ERC20 contract 0xdac17f958d2ee523a2206206994597c13d831ec7, names Cosmos support only as 'Cosmos Blockchain (via Kava)', and does not mention ZIGChain, Eureka or Noble (0 matches).

*How:* Registry file, LCD denom_hash, client_state, client_status and supply read today; Tether page read and searched.

- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/usdt.mainnet.json> · read 2026-10-02T21:08:06Z · SHA-256 of the file as read `bfb5f7cfd5060850f410752e729bb34bf3342b14a1ce88a1f9989a72083477e0`
  `"path": "transfer/channel-4/transfer/08-wasm-1369/0xdac17f958d2ee523a2206206994597c13d831ec7"`
- <https://api.zigchain.com/ibc/apps/transfer/v1/denom_hashes/transfer%2Fchannel-4%2Ftransfer%2F08-wasm-1369%2F0xdac17f958d2ee523a2206206994597c13d831ec7> · read 2026-10-02T21:11:31Z · height 12610886 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_denom_hash_ch4_usdt`
  `{"hash":"630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9"}`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-4/ports/transfer/client_state> · read 2026-10-02T21:10:12Z · height 12610861 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_clientstate_channel-4`
  `"chain_id":"cosmoshub-4"`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/630F28419AFD118B9EA8B96AE9D280CFDA4EB9FAB3108F1CA9E7DC00F396B4F9> · read 2026-10-02T21:11:09Z · height 12610879 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_supply_by_denom_630F2841`
  `"amount":"29107467433"`
- <https://tether.to/en/supported-protocols/> · read 2026-10-02T21:18:13Z · SHA-256 of the page as received `4ec61b34b3146a3aa26d33934f753854869a5f8422ac824ede988edb56524292`
  `USD₮ contract address: https://etherscan.io/token/0xdac17f958d2ee523a2206206994597c13d831ec7`

## C-eureka-08wasm
**VERIFIED** · IBC Eureka transport description (official Cosmos source)

The official Cosmos blog says Eureka's Ethereum connection uses an Ethereum light client deployed on the Cosmos Hub via the 08-wasm client. Only the ZIGChain registry ('provider': 'eureka') ties the specific client id 08-wasm-1369 in ZIGChain's USDT/EURC paths to Eureka.

*How:* Architecture sentence read on cosmos.network. The 08-wasm-1369 / Ethereum channel-0 leg was not checked on a Cosmos Hub endpoint because no official Cosmos Hub LCD was identified.

- <https://cosmos.network/blog/ibc-eureka-technical-walkthrough> · read 2026-10-02T21:36:01Z · SHA-256 of the page as received `d25d09b744cdd375b91ddcac61717682fa90c366a978312b4db21f1ea014c639`
  `An Ethereum light client as a CosmWasm contract is deployed on the Cosmos Hub using the 08-wasm client`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/usdt.mainnet.json> · read 2026-10-02T21:08:06Z · SHA-256 of the file as read `bfb5f7cfd5060850f410752e729bb34bf3342b14a1ce88a1f9989a72083477e0`
  `"provider": "eureka"`

## C-zig-main-eurc-unlisted
**VERIFIED** · Mainnet: EURC-address denom present on-chain, not in registry

On zigchain-1, ibc/CC5268F89C752A4BDCBDAA574AF0A381786FCC839104E077DA9A9145176BF8ED has base 0x1abaea1f7c830bd89acc67ec4af516284b1bc33c via transfer/channel-4/transfer/08-wasm-1369. Supply 2753330 base units at block 12610879. Its on-chain metadata has only an exponent-0 unit (no decimals stated). It is not in the ZIGChain registry. Circle's official EURC list gives Ethereum EURC as 0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c (same address, different letter case). Circle does not mention ZIGChain (0 matches).

*How:* LCD denom trace and supply plus Circle EURC address page read today. Decimals on ZIGChain are not stated, so no human-unit amount is given.

- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms/CC5268F89C752A4BDCBDAA574AF0A381786FCC839104E077DA9A9145176BF8ED> · read 2026-10-02T21:11:31Z · height 12610886 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_denom_CC5268`
  `{"denom":{"base":"0x1abaea1f7c830bd89acc67ec4af516284b1bc33c","trace":[{"port_id":"transfer","channel_id":"channel-4"},{"port_id":"transfer","channel_id":"08-wasm-1369"}]}}`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/CC5268F89C752A4BDCBDAA574AF0A381786FCC839104E077DA9A9145176BF8ED> · read 2026-10-02T21:11:09Z · height 12610879 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_supply_by_denom_CC5268F8`
  `"amount":"2753330"`
- <https://developers.circle.com/stablecoins/eurc-contract-addresses> · read 2026-10-02T21:15:56Z · SHA-256 of the page as received `85086bd0fc727b7a51e1da07e7639fb08a2da356eb82f246166e11c25d0f88a0`
  `Ethereum | 0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c |`

## C-zig-main-usdc-injective-unlisted
**VERIFIED** · Mainnet: Circle's Injective USDC present via IBC channel-12, not in registry

On zigchain-1, ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B = transfer/channel-12/erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a. Channel-12 client 07-tendermint-5: chain_id injective-1, Active. Supply 513039339 base units at block 12611332 (same at 12611340). Injective's official LCD: channel-456 counterparty is ZIGChain channel-12 (client chain_id zigchain-1); metadata for that base gives symbol USDC, decimals 6; escrow inj1h88uztevss8ys8k9pqq73s590d27xunxntsggk holds 513039339. Circle lists 'Injective | 0xa00C59fF5a080D2b954d0c75e46E22a0c371235a'. Not in the ZIGChain registry. A second denom with the same base via channel-4/channel-220 (ibc/ADC71E62...) has metadata but supply 0.

*How:* ZIGChain LCD denoms, client and supply; Injective LCD (endpoint listed in Injective docs) channel, metadata and escrow; Circle address page. All read today.

- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms?pagination.limit=500&pagination.count_total=true> · read 2026-10-02T21:09:39Z · combined from the paged reads of this endpoint
  `{"base":"erc20:0xa00C59fF5a080D2b954d0c75e46E22a0c371235a","trace":[{"port_id":"transfer","channel_id":"channel-12"}]}`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-12/ports/transfer/client_state> · read 2026-10-02T21:10:12Z · height 12610861 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_clientstate_channel-12`
  `"chain_id":"injective-1"`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/6C6F5A015608CF3951DFE6A117390210AB825BF0CC1AD33B2B100B05529A9B6B> · read 2026-10-02T21:35:11Z · height 12611332 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_supply_by_denom_6C6F5A01`
  `"amount":"513039339"`
- <https://docs.injective.network/infra/public-endpoints> · read 2026-10-02T21:35:14Z · SHA-256 of the page as received `bb6ddd0f43135a69231925f12d129cb7cc02782fa529c9f083e50c79ab1b77fd`
  `https://sentry.lcd.injective.network:443`
- <https://sentry.lcd.injective.network:443/cosmos/bank/v1beta1/denoms_metadata/erc20%3A0xa00C59fF5a080D2b954d0c75e46E22a0c371235a> · read 2026-10-02T21:35:25Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/inj_denom_metadata_usdc_erc20`
  `"display":"USDC","name":"USDC","symbol":"USDC","uri":"","uri_hash":"","decimals":6`
- <https://sentry.lcd.injective.network:443/ibc/core/channel/v1/channels/channel-456/ports/transfer/client_state> · read 2026-10-02T21:35:23Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/inj_clientstate_channel-456`
  `"chain_id":"zigchain-1"`
- <https://sentry.lcd.injective.network:443/cosmos/bank/v1beta1/balances/inj1h88uztevss8ys8k9pqq73s590d27xunxntsggk/by_denom?denom=erc20%3A0xa00C59fF5a080D2b954d0c75e46E22a0c371235a> · read 2026-10-02T21:35:38Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/inj_escrow_balance_usdc`
  `"amount":"513039339"`
- <https://developers.circle.com/stablecoins/usdc-contract-addresses> · read 2026-10-02T21:15:56Z · SHA-256 of the page as received `429d18007d36b6b885c2937cc881602fd126e7993edf4445fc2b0e0b38ad2d1a`
  `Injective | 0xa00C59fF5a080D2b954d0c75e46E22a0c371235a |`

## C-zig-main-xaut-zero
**VERIFIED** · Mainnet: XAU₮-address denom with metadata only (supply 0)

On zigchain-1, ibc/294719272CB20610F3C0173B0E14DD65F9D7F515548AB3F8373CC91F36357234 (base 0x68749665ff8d2d112fa859aa293f07a622782f38, via channel-4/08-wasm-1369) has bank metadata but supply 0 at block 12610879. Tether lists the XAU₮ contract as 0x68749665FF8D2d112Fa859AA293F07A622782F38. Not in the ZIGChain registry.

*How:* LCD metadata and supply_by_denom plus Tether page read today.

- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/294719272CB20610F3C0173B0E14DD65F9D7F515548AB3F8373CC91F36357234> · read 2026-10-02T21:11:10Z · height 12610879 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_supply_by_denom_29471927`
  `"amount":"0"`
- <https://tether.to/en/supported-protocols/> · read 2026-10-02T21:18:13Z · SHA-256 of the page as received `4ec61b34b3146a3aa26d33934f753854869a5f8422ac824ede988edb56524292`
  `XAU₮ contract address: https://etherscan.io/token/0x68749665FF8D2d112Fa859AA293F07A622782F38`

## C-zig-main-no-axelar-stablecoin
**VERIFIED** · Mainnet: no Axelar-routed stablecoin

The LCD's transfer denoms list on zigchain-1 has 17 IBC denoms. The only ones via Axelar channels are uaxl (channel-0, channel-1) and unit-zig (channel-1); there is no uusdc or axlUSDC trace via channels 0/1/2. Channels 0 and 2 (to axelar-dojo-1) have Expired clients (07-tendermint-0, -2); channel-1 (07-tendermint-1) is Active.

*How:* Read /ibc/apps/transfer/v1/denoms, channels and client_status on the official LCD.

- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms?pagination.limit=500&pagination.count_total=true> · read 2026-10-02T21:09:39Z · combined from the paged reads of this endpoint
  `{"base":"unit-zig","trace":[{"port_id":"transfer","channel_id":"channel-1"}]}`
- <https://api.zigchain.com/ibc/core/client/v1/client_status/07-tendermint-0> · read 2026-10-02T21:10:43Z · height 12610871 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_clientstatus_07-tendermint-0`
  `{"status":"Expired"}`

## C-zig-main-vault-tokens
**VERIFIED** · Mainnet: USDC-named factory tokens are vault shares; no ZIG-native stablecoin found

The ZIGChain registry lists no ZIG-native (factory) stablecoin. The mainnet factory denoms whose metadata mention USDC are vault tokens by their own names: coin.zig1fn4rrr5knlg93nf3wyme9fzmgve3fftxu5l7wv90llp77mwg7ctq2lfwtd.n1usdc 'Nawa USDC Vault Shares' (supply 3321673751254 at block 12610845) and three Valdora vault tokens (symbols vVaultSY, vVaultCI, vVaultOC).

*How:* Searched all 602 mainnet denom metadata entries and the full supply list. Vault terms and returns are out of scope and not recorded.

- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata?pagination.limit=500&pagination.count_total=true> · read 2026-10-02T21:08:45Z · combined from the paged reads of this endpoint
  `"name":"Nawa USDC Vault Shares","symbol":"n1USDC"`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply?pagination.limit=1000&pagination.count_total=true> · read 2026-10-02T21:09:20Z · combined from the paged reads of this endpoint
  `"denom":"coin.zig1fn4rrr5knlg93nf3wyme9fzmgve3fftxu5l7wv90llp77mwg7ctq2lfwtd.n1usdc","amount":"3321673751254"`

## C-zig-docs-ibc-channels
**VERIFIED** · ZIGChain docs: official IBC channel list

docs.zigchain.com lists as 'Active IBC channels': mainnet zigchain-1 channel-1 to Axelar axelar-dojo-1 channel-182, channel-3 to Noble noble-1 channel-175, channel-4 to Cosmos cosmoshub-4 channel-1555; testnet zig-test-2 channel-0 to axelar-testnet-lisbon-3 channel-612, channel-44 to Noble grand-1 channel-704, channel-43 to Cosmos provider channel-566. Last updated on Jul 23, 2026.

*How:* Read via WebFetch (curl gets HTTP 403). The page does not list channel-12 (Injective), which the LCD shows open and Active.

- <https://docs.zigchain.com/integration-guides/ibc-channel-list> · read 2026-10-02T21:38:25Z · read through WebFetch, a processed view of the page (not a byte copy)
  ``Active IBC channels between ZIGChain and Axelar, Noble, and Cosmos Hub on testnet (`zig-test-2`) and mainnet (`zigchain-1`).``

## C-zig-docs-bridge-fees
**VERIFIED** · ZIGChain docs: Hub bridge and fee denom

The Hub bridge page says ZIG, USDC and other supported tokens can be transferred (no bridge provider named; last updated Aug 24, 2026). The fees page says fees are always paid in native ZIG (azig) and IBC vouchers cannot pay gas (last updated Aug 24, 2026).

*How:* Read via WebFetch. hub.zigchain.com/bridge/ itself returned only an app shell.

- <https://docs.zigchain.com/users/hub/bridge> · read 2026-10-02T21:38:25Z · read through WebFetch, a processed view of the page (not a byte copy)
  `You can transfer ZIG, USDC, and other supported tokens between ZIGChain and multiple networks without leaving the Hub dashboard.`
- <https://docs.zigchain.com/about-zigchain/fees> · read 2026-10-02T21:38:25Z · read through WebFetch, a processed view of the page (not a byte copy)
  ``Fees are always paid in native ZIG (`azig`). Factory tokens and other IBC vouchers cannot pay network gas.``

## C-zig-test-noble-expired
**VERIFIED** · Testnet: Noble (grand-1) USDC route not usable (clients expired)

On zig-test-2, every transfer channel whose light client tracks grand-1 (channels 35, 41, 42, 44, 52) has client status Expired; e.g. the docs-listed channel-44 uses client 07-tendermint-84, Expired at block 8045650. Remaining uusdc voucher supplies (blocks 8045653-8045654): channel-44 ibc/5260516290F7883EC893AADA09A6B8CEC790F2EEF3196F440037908749785BE8 = 280899262; channel-42 ibc/281118CE47767D7A50F80B0E03C61AFE1BE9BE7388765DBAA12EB60BECFAD5D5 = 114996090; channel-35 ibc/8E452E728A6598EEF051E63FFE49AF19004F5D2AA3F690413C2985660AAFD38F = 41961900; channel-41 ibc/972FD0BF... = 10; channel-52 ibc/85D825D2... = 4.

*How:* Testnet LCD client_state, client_status and supply_by_denom read today. Docs still list channel-44 as active.

- <https://testnet-api.zigchain.com/ibc/core/channel/v1/channels/channel-44/ports/transfer/client_state> · read 2026-10-02T21:10:20Z · height 8045644 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/test_clientstate_channel-44`
  `"chain_id":"grand-1"`
- <https://testnet-api.zigchain.com/ibc/core/client/v1/client_status/07-tendermint-84> · read 2026-10-02T21:10:51Z · height 8045650 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/test_clientstatus_07-tendermint-84`
  `{"status":"Expired"}`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/5260516290F7883EC893AADA09A6B8CEC790F2EEF3196F440037908749785BE8> · read 2026-10-02T21:11:11Z · height 8045653 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/test_supply_by_denom_52605162`
  `"amount":"280899262"`

## C-zig-test-axelar-ausdc
**VERIFIED** · Testnet: Axelar aUSDC trace (tiny) and Axelar testnet mapping

On zig-test-2, ibc/5BDD47E9E73BF91C14497E254F0A751F1A7D3A6084343F66EA7CEE834A384651 = transfer/channel-0/uausdc has supply 10 base units (block 8045654). Channel-0 client 07-tendermint-0 tracks axelar-testnet-lisbon-3 and is Active. Axelar's testnet config v1.0.156 maps zigchain-3 (externalChainId zig-test-2) to channel-0 (toAxelar) and channel-612 (fromAxelar) and lists only unit-zig for it; the uausdc (aUSDC) asset's chain list does not include zigchain-3.

*How:* Testnet LCD and Axelar official testnet static config read today.

- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc/5BDD47E9E73BF91C14497E254F0A751F1A7D3A6084343F66EA7CEE834A384651> · read 2026-10-02T21:11:12Z · height 8045654 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/test_supply_by_denom_5BDD47E9`
  `"amount":"10"`
- <https://testnet-api.zigchain.com/ibc/apps/transfer/v1/denoms?pagination.limit=500&pagination.count_total=true> · read 2026-10-02T21:09:41Z · combined from the paged reads of this endpoint
  `{"base":"uausdc","trace":[{"port_id":"transfer","channel_id":"channel-0"}]}`
- <https://axelar-testnet.s3.us-east-2.amazonaws.com/configs/testnet-config-1.x.json> · read 2026-10-02T21:19:21Z · SHA-256 of the response (compact JSON) `0faf356248c7b958203c9e9788b4555a7170656239d38f8ad6f71bc5b25e3f07`
  `"externalChainId": "zig-test-2"`

## C-zig-test-unattributed-tokens
**VERIFIED** · Testnet: stablecoin-named tokens without an identified issuer

zig-test-2 has stablecoin-named tokens that no official source attributes to Circle or Tether. Examples: factory denom coin.zig18sytwc03z5j3wge5egf4rdue6gxkzzyf4658vq.uusdc (metadata name 'USD Coin', symbol USDC, description 'USD Coin - Testnet', supply 10000000000000) and its sibling ...uusdt ('Tether USD - Testnet'). There is also a bare denom 'usdt' with supply 200000000000000000000 and no bank metadata (404 'client metadata for denom usdt').

*How:* Existence and figures read from the testnet LCD. Issuer identity is unknown; do not treat these as issuer stablecoins.

- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata?pagination.limit=500&pagination.count_total=true> · read 2026-10-02T21:08:47Z · combined from the paged reads of this endpoint
  `"description":"USD Coin - Testnet"`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=usdt> · read 2026-10-02T21:11:13Z · height 8045654 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/test_supply_by_denom_usdt`
  `{"amount":{"denom":"usdt","amount":"200000000000000000000"}}`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/usdt> · read 2026-10-02T21:11:29Z · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/test_denom_metadata_usdt`
  `"message":"client metadata for denom usdt"`

## C-circle-noble-dates
**VERIFIED** · checked again in [F18](../EVIDENCE_2026-10.md#f18) (CONFIRMED) · WARNING Noble: Circle discontinuation dates

Circle (blog dated September 10, 2026): new USDC minting on Noble via Circle Mint is disabled on October 13, 2026. Redemptions via Circle Mint remain until January 12, 2027, when the Noble USDC contract and CCTP routes are fully paused. Circle snapshots remaining Noble balances on the pause date, and manual redemption begins January 13, 2027. Noble will not receive CCTP V2.

*How:* Read on circle.com today (HTTP 200).

> Second check (F18): the snapshot is taken on the pause date, 2027-01-12; the manual redemption process begins 2027-01-13. The page adds: "After December 1, 2026, CCTP exits may be limited to destination chains that continue to support CCTP V1 burns."

- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `New minting of USDC on Noble through Circle Mint will be disabled on October 13, 2026. Redemptions from Noble via Circle Mint remain available until January 12, 2027, when the Noble USDC contract and CCTP routes will be fully paused.`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `On the pause date, Circle will take a snapshot of all remaining USDC on Noble balances and open a manual redemption portal. The manual redemption process begins January 13, 2027.`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `Noble will not receive CCTP V2. Circle Mint customers, retail USDC holders, and non-Circle customers who hold USDC on Noble should migrate to another supported blockchain.`

## C-circle-noble-exits
**VERIFIED** · checked again in [F18](../EVIDENCE_2026-10.md#f18) (CONFIRMED) · WARNING Noble: Circle-stated exit routes, CCTP limits, redemption eligibility

Circle says holders should move USDC off Noble before the January 12 pause via a CEX that accepts Noble USDC deposits, a DEX swap on Noble, or a CCTP V1 burn from Noble. CCTP V1 burn limits begin reducing October 31, 2026, and after December 1, 2026 exits may be limited. Circle will publish a shortlist of exit venues and will not run its own exit UI. Manual redemption requires USDC in a holder-controlled wallet whose address is in the Noble pause-day snapshot.

*How:* Read on circle.com today.

- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `Holders should move their USDC off Noble before the January 12 pause through: A CEX that supports Noble USDC deposits. A DEX swap on Noble. CCTP V1 burn-from-Noble to another supported chain`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `CCTP V1 burn limits will begin reducing on October 31, 2026. After December 1, 2026, CCTP exits may be limited to destination chains that continue to support CCTP V1 burns.`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `To qualify for manual redemption, USDC on Noble holders must: meet Circle's compliance and security requirements; have USDC in a holder-controlled wallet; and have a wallet address that is part of the Noble pause-day snapshot.`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `Circle will publish a shortlist of known exit venues. Circle is not operating its own exit UI.`

## C-circle-cctp-v1
**VERIFIED** · checked again in [F18](../EVIDENCE_2026-10.md#f18) (CONFIRMED) · Circle CCTP V1 deprecation and current developer listings

Circle blog (August 27, 2026): CCTP V1 (Legacy) deprecation begins October 31, 2026 and completes December 1, 2026. Circle's developer docs, read today, still list Noble among CCTP V1 mainnet chains and Noble 'uusdc' in the USDC address list.

*How:* Both pages read today on circle.com and developers.circle.com.

- <https://www.circle.com/blog/migrate-to-cctp-v2-ahead-of-cctp-v1-legacy-deprecation> · read 2026-10-02T21:17:21Z · SHA-256 of the page as received `bced966343676bbf7e036b15e3bb1ab6d7b2a27aada446a05f257592cdce8984`
  `CCTP V1 (Legacy) deprecation begins October 31, 2026 and completes on December 1, 2026, in favor of CCTP V2`
- <https://developers.circle.com/cctp/v1/cctp-supported-blockchains> · read 2026-10-02T21:15:56Z · SHA-256 of the page as received `2b8e60b6a858f4453b06e168b60222a80cdf27de6fa2d159dd976809aa631705`
  `CCTP V1 is available on the following blockchains where USDC is natively issued, providing Standard Transfer functionality.`

## C-circle-kb0010582
**VERIFIED** · Circle Help Center KB0010582: exact URL and content

KB0010582 is 'A closer look at USDC on Noble and the IBC protocol' at https://help.circle.com/support/en/a-closer-look-at-usdc-on-noble-and-the-ibc-protocol?id=kb_article_view&sysparm_article=KB0010582 (redirect target of help.circle.com/support?id=kb_article_view&sysparm_article=KB0010582). The knowledge API gives published 2026-06-23 and updated 2026-06-25 06:29:41. It is a general IBC explainer and contains no discontinuation dates.

*How:* Read the article page and Circle's public ServiceNow knowledge API (GET).

- <https://help.circle.com/support/en/a-closer-look-at-usdc-on-noble-and-the-ibc-protocol?id=kb_article_view&sysparm_article=KB0010582> · read 2026-10-02T21:14:56Z · SHA-256 of the page as received `b4a6ca788f8967d3eaae421a9d1968fe543509ca256208acea93b1888eb12a28`
  `USDC on Noble can be securely transferred to appchains in Cosmos via IBC.`
- <https://help.circle.com/api/sn_km_api/knowledge/articles/KB0010582> · read 2026-10-02T21:14:56Z · SHA-256 of the response (compact JSON) `025b7e40ba32845fdc36f8d157f826cb75d87d44b6a28a3a9b718fd06e49a402`
  `Please note that Circle Mint and Circle APIs only support USDC on Noble from the Cosmos ecosystem.`

## C-circle-kb0010590
**VERIFIED** · checked again in [F19](../EVIDENCE_2026-10.md#f19) (CONFIRMED) · Circle on IBC-transferred USDC (KB0010590)

KB0010590 ('USDC supported blockchains | minting, redemption, & FAQs', published 2026-09-16) says Circle Mint only supports native USDC on Noble, and that USDC moved from Noble to other appchains via IBC must be transferred back to Noble before depositing to Circle Mint.

*How:* Read via Circle's knowledge API today. A Help Center search for 'Noble' returned only KB0010582 and KB0010590.

> Second check (F19): the article says nothing about the Noble wind-down (no "discontinu", "deprecat" or "sunset", no 2026 or 2027 dates); it still presents Noble as a supported Circle Mint chain.

- <https://help.circle.com/api/sn_km_api/knowledge/articles/KB0010590> · read 2026-10-02T21:15:36Z · SHA-256 of the response (compact JSON) `ce9a3835237a6e63025d45af70132cf1bb3f1fd6f844ed6d56abc1c0b0f62688`
  `Does Circle Mint support USDC that has been transferred from Noble to other appchains via IBC? No. Circle Mint only supports native USDC on Noble.`
- <https://help.circle.com/api/sn_km_api/knowledge/articles/KB0010590> · read 2026-10-02T21:15:36Z · SHA-256 of the response (compact JSON) `ce9a3835237a6e63025d45af70132cf1bb3f1fd6f844ed6d56abc1c0b0f62688`
  `If you transfer USDC from Noble to other appchains via IBC, you must transfer back to Noble via IBC prior to depositing into your Circle Mint.`
- <https://help.circle.com/api/sn_km_api/knowledge/articles?query=Noble&limit=50> · read 2026-10-02T21:15:25Z · SHA-256 of the response (compact JSON) `764a0191178d379d1fdd714b89cab0d003b6c0c5a83fb59f7911060e32c6d138`
  `USDC supported blockchains | minting, redemption, & FAQs`

## C-circle-ibc-voucher-treatment
**UNVERIFIED** · WARNING Noble: treatment of IBC vouchers and IBC escrow at the 2027-01-12 pause

How Circle will treat USDC held as IBC vouchers on other chains (e.g. ZIGChain ibc/6490A7EA...) and the uusdc held in Noble IBC escrow accounts (e.g. noble1e4quceq0nhvfalpkct2yecpu56ss3erltz8yku, 259465404300 uusdc) at the January 12, 2027 pause and snapshot.

*How:* Not stated in the Circle blog of Sep 10, 2026, KB0010582 or KB0010590. The only official texts are the manual-redemption eligibility conditions and the instruction to move IBC-transferred USDC back to Noble for Circle Mint.

- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T21:14:01Z · SHA-256 of the page as received `e5f938a5b494c98987eb7f64d4caa34bae73a5c0eee1cf3fb837ffd0ef75ee3e`
  `have USDC in a holder-controlled wallet; and have a wallet address that is part of the Noble pause-day snapshot.`

## C-circle-mica-wp-noble
**VERIFIED** · Circle MiCA USDC white paper still lists Noble

Circle's MiCA USDC white paper page (the wp_url in ESMA's EMT register; record last update 15/09/2026) still lists Noble among USDC networks. Its paragraph on discontinued blockchains names only Tron and Flow as already deprecated.

*How:* Read the white paper page and searched for Noble and deprecation text.

- <https://www.circle.com/fr/legal/mica-usdc-whitepaper> · read 2026-10-02T21:27:30Z · SHA-256 of the page as received `63fe42dd79d6434eece4023a307642ff90175212f29ad7921049066c579a2877`
  `As of the date of this White Paper, the following blockchains have already been deprecated: Tron:`
- <https://www.esma.europa.eu/sites/default/files/2024-12/EMTWP.csv> · read 2026-10-02T21:26:58Z · SHA-256 of the CSV as received `5d63159cf4a5f11ffff065d0a48cc84384c7e7bd4a5c4d1e4896ddf3f2c198c3`
  `https://www.circle.com/fr/legal/mica-usdc-whitepaper | 01/07/2024`

## C-noble-own-statement
**UNVERIFIED** · WARNING Noble: Noble's own statement and replacement path

Noble's own statement on Circle's discontinuation of USDC and CCTP V1 on Noble, and any replacement path stated by Noble.

*How:* Not found on noble.xyz (homepage text shows only 'Noble Dollar' / 'Stablecoin Infrastructure'; /blog returns 404) or docs.noble.xyz (home, learn, tags/usdc, chain-upgrades/mainnet, cctp and fiattokenfactory module pages read). The docs home still says Noble has implemented CCTP.

- <https://docs.noble.xyz/> · read 2026-10-02T21:16:53Z · SHA-256 of the page as received `d0b0afc9201b2c708c680594139f26d8c2ae15d73a57bb761329f450f16bc407`
  `Additionally, Noble has implemented Circle's Cross-Chain Transfer Protocol (CCTP) to facilitate native transfers of USDC across multiple blockchain networks.`

## C-axelar-config-urls
**VERIFIED** · Axelar official static config URLs

docs.axelar.dev names the official static configs: https://axelar-testnet.s3.us-east-2.amazonaws.com/configs/testnet-config-1.x.json and https://axelar-mainnet.s3.us-east-2.amazonaws.com/configs/mainnet-config-1.x.json. Both were fetched (mainnet version 1.0.313, testnet 1.0.156).

*How:* Read docs page and both S3 files today.

- <https://docs.axelar.dev/resources/static-configs/static-configs/> · read 2026-10-02T21:19:10Z · SHA-256 of the page as received `39113cd50182789fa0a3368e41876ac2b32e7393d2fef2fbdf096d5fc4a1649f`
  `Mainnet: https://axelar-mainnet.s3.us-east-2.amazonaws.com/configs/mainnet-config-1.x.json`

## C-axelar-mainnet-zigchain
**VERIFIED** · Axelar mainnet config: ZIGChain entry

Axelar mainnet config 1.0.313 has chain 'zigchain' (externalChainId zigchain-1) with toAxelar channel-1 and fromAxelar channel-182, and one asset mapping: unit-zig to ibc/9BEE293E6559ED860CC702685996F394D4991D6DFFD60A19ABC3723E6F34788A. This matches ZIGChain docs and the LCD (channel-1 counterparty channel-182, client axelar-dojo-1 Active).

*How:* Read S3 config and ZIGChain LCD today.

- <https://axelar-mainnet.s3.us-east-2.amazonaws.com/configs/mainnet-config-1.x.json> · read 2026-10-02T21:19:21Z · SHA-256 of the response (compact JSON) `63167fe84035e3c56b229b3fdb906064197ea8af920c890a77e73449371679e7`
  `"unit-zig": "ibc/9BEE293E6559ED860CC702685996F394D4991D6DFFD60A19ABC3723E6F34788A"`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-1/ports/transfer/client_state> · read 2026-10-02T21:10:10Z · height 12610861 · kept in [evidence/ibc-and-swaps.json](ibc-and-swaps.json) as `research/c/main_clientstate_channel-1`
  `"chain_id":"axelar-dojo-1"`

## C-axelar-no-axlusdc
**VERIFIED** · axlUSDC does not route to ZIGChain (mainnet or testnet)

In Axelar mainnet config 1.0.313, the gateway asset 'uusdc' (USDC/axlUSDC) does not include 'zigchain' in its chains. In testnet config 1.0.156, the 'uausdc' (aUSDC) asset does not include 'zigchain-3'. Axelar describes axlUSDC as a wrapped representation of USDC backed by USDC locked in an Axelar Gateway on Ethereum.

*How:* Parsed both official configs; read the axlUSDC docs page.

- <https://axelar-mainnet.s3.us-east-2.amazonaws.com/configs/mainnet-config-1.x.json> · read 2026-10-02T21:19:21Z · SHA-256 of the response (compact JSON) `63167fe84035e3c56b229b3fdb906064197ea8af920c890a77e73449371679e7`
  `"externalChainId": "zigchain-1"`
- <https://docs.axelar.dev/learn/axlusdc/> · read 2026-10-02T21:19:40Z · SHA-256 of the page as received `7f037c2e5c3f0e7bd8a1c1d0900c639a18ca6ded7993cffbca2c9876a1557a36`
  `axlUSDC is a wrapped, multi-chain representation of USDC, a dollar stablecoin. For each unit of axlUSDC, there is a unit of USDC locked in an Axelar Gateway on Ethereum.`

## C-ondo-usdy-not-live
**VERIFIED** · Ondo USDY on ZIGChain: NOT LIVE

No IBC denom with a USDY base appears in /ibc/apps/transfer/v1/denoms on zigchain-1 or zig-test-2. Ondo's official addresses page lists USDY on Noble only ('ausdy'). ondo.finance (home, /usdy, sitemap) and docs.ondo.finance (home, /addresses) contain no 'ZIGChain' mention.

*How:* LCD denom lists and Ondo pages read and searched today.

- <https://docs.ondo.finance/addresses> · read 2026-10-02T21:20:01Z · SHA-256 of the page as received `7eac8c0335e0bec31ef8c20ea0bb3ff2180d95827de4a7fe3fe32864613831f1`
  `The USDY token on Noble (Cosmos ecosystem)`
- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms?pagination.limit=500&pagination.count_total=true> · read 2026-10-02T21:09:39Z · combined from the paged reads of this endpoint
  `{"base":"uusdc","trace":[{"port_id":"transfer","channel_id":"channel-3"}]}`

## C-zigchain-ondo-listing
**VERIFIED** · zigchain.com ecosystem listing of Ondo (not an asset announcement)

zigchain.com's ecosystem section lists 'Ondo' with the tagline 'Bringing institutional-grade real-world assets and tokenized finance onchain', linking to https://ondo.finance/. No ZIGChain or Ondo page read announces a USDY or other Ondo asset on ZIGChain.

*How:* Read via WebFetch (curl gets HTTP 403). The listing is recorded literally; no relationship is inferred.

- <https://zigchain.com/> · read 2026-10-02T21:38:25Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Bringing institutional-grade real-world assets and tokenized finance onchain`

## C-stablecoin-announcements
**UNVERIFIED** · ANNOUNCED (not live) stablecoins for ZIGChain

An official announcement of any additional stablecoin for ZIGChain (EURC, native USDT, USDY, a ZIG-native stablecoin, or a Noble-USDC replacement route).

*How:* No such announcement was found. Checked: docs.zigchain.com (bridge, IBC channel list, token registration, wealth management engine, about); zigchain.com homepage; the project's Medium RSS feed (10 items, 13 Aug 2025 to 23 Dec 2025, none mentioning USDC/USDT/EURC/Noble/Ondo/USDY/Circle/Tether/Eureka); and Circle, Tether and Ondo pages (0 'ZIGChain' matches). X/Twitter was not read.

- <https://docs.zigchain.com/integration-guides/register-your-token-in-cosmos-wallets> · read 2026-10-02T21:46:14Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Last updated on Jul 23, 2026`
- <https://zignaly.medium.com/feed> · read 2026-10-02T21:45:48Z · SHA-256 of the file as received `d912ecc2963302788f831a7fc87dc9dbda6f93748807e4dcff252dd0d243dd26`

## C-esma-register-emt-issuers
**VERIFIED** · checked again in [F21](../EVIDENCE_2026-10.md#f21) (CONFIRMED) · ESMA interim MiCA register: EMT white papers (Circle; no Tether)

ESMA's EMTWP.csv (Last-Modified Wed, 30 Sep 2026 16:10:58 GMT) lists Circle Internet Financial Europe SAS (ACPR, FR, LEI 969500OYUDADGZKCR583, 'Electronic money institution') with EMT white papers https://www.circle.com/fr/legal/mica-eurc-whitepaper and https://www.circle.com/fr/legal/mica-usdc-whitepaper. A search of EMTWP.csv for 'tether' or 'usdt' finds no entry. ARTZZ.csv has zero records.

*How:* Downloaded and parsed the official CSVs linked from ESMA's MiCA page. No legal conclusion is drawn about any token.

- <https://www.esma.europa.eu/sites/default/files/2024-12/EMTWP.csv> · read 2026-10-02T21:26:58Z · SHA-256 of the CSV as received `5d63159cf4a5f11ffff065d0a48cc84384c7e7bd4a5c4d1e4896ddf3f2c198c3`
  `Circle Internet Financial Europe SAS | 969500OYUDADGZKCR583`
