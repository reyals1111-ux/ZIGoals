# Evidence register (b) Valdora (stZIG) and its audits

Part of [EVIDENCE_2026-10.md](../EVIDENCE_2026-10.md), which explains the labels, lists the pages that could not be read and gives the second check (F01–F24). Read on 2026-10-02 (UTC). Valdora's docs (provider claims), its contracts as the chain reports them, and OAK Security's reports.

## A-valdora-docs-pages-read
**VERIFIED** · valdora/docs

All 19 pages linked from docs.valdora.finance returned HTTP 200 with server-rendered content: overview, security, economics-and-incentives, smart-contracts, faqs, `vaults/{introduction,stablecoin-yield-vault,core-income-vault,opportunistic-credit-vault}`, `liquid-staking/{introduction,architecture,unstaking-and-redemption}`, `how-to-guides/{get-usdc-into-zigchain,deposit-usdc-into-a-vault,how-to-withdraw-from-a-vault,get-your-usdzig-tokens,send-usdzig-to-wallet,stake-your-usdzig-and-receive-stzig,unstaking-process}`.

*How:* curl GET today 20:29:25Z–20:29:53Z.

- <https://docs.valdora.finance/> · read 2026-10-02T20:29:25Z · SHA-256 of the page as received `44472e67ff05d717e17073e71bec1c5498af4225c430a89294619c5ece75295f`
  `Liquid ZIG staking. Stake ZIG to receive stZIG, a token that keeps earning staking rewards while remaining yours to use.`

## A-valdora-mint-flow
**VERIFIED** · valdora/mint

Valdora docs (provider-published) describe the mint flow: the user sends ZIG to the Staker contract, which mints stZIG ('1:1 initially and changes over time'). stZIG is a ZIG Chain token-factory denom, and the Staker pools deposits and delegates through Ledger contracts.

*How:* Read liquid-staking/architecture via curl today.

- <https://docs.valdora.finance/liquid-staking/architecture> · read 2026-10-02T20:29:45Z · SHA-256 of the page as received `d7e0519016c241816a7ed8f5438577455d5892955b4724d74bbe9938d1a15c81`
  `The user initiates a deposit transaction by sending their ZIG tokens to the Staker Smart Contract.`
- <https://docs.valdora.finance/liquid-staking/architecture> · read 2026-10-02T20:29:45Z · SHA-256 of the page as received `d7e0519016c241816a7ed8f5438577455d5892955b4724d74bbe9938d1a15c81`
  `The minting ratio is 1:1 initially and changes over time, so if you stake 100 ZIG, you receive 100 stZIG.`
- <https://docs.valdora.finance/liquid-staking/architecture> · read 2026-10-02T20:29:45Z · SHA-256 of the page as received `d7e0519016c241816a7ed8f5438577455d5892955b4724d74bbe9938d1a15c81`
  `These stZIG tokens are ZIG Chain's token factory denoms, allowing them to be transferred, traded on DEXs, or used in DeFi protocols.`

## A-valdora-exchange-ratio-docs
**VERIFIED** · valdora/exchange-ratio

Valdora docs and site (provider-published) say rewards are auto-compounded into the stZIG/ZIG price ratio, and that ZIG received on unstake follows the prevailing stZIG-to-ZIG exchange rate. No numeric ratio is published in the docs.

*How:* Read docs architecture page and valdora.finance/faqs via curl today.

- <https://docs.valdora.finance/liquid-staking/architecture> · read 2026-10-02T20:29:45Z · SHA-256 of the page as received `d7e0519016c241816a7ed8f5438577455d5892955b4724d74bbe9938d1a15c81`
  `Staked ZIG tokens generate rewards, which are auto-compounded and reflected in the stZIG token price ratio.`
- <https://valdora.finance/faqs> · read 2026-10-02T20:30:43Z · SHA-256 of the page as received `598449446951ab0cf601ed4874b0e7a645ce2b9379c89bd21a9550247ed6a56b`
  `The amount of ZIG received is based on the prevailing stZIG-to-ZIG exchange rate, which reflects accumulated staking rewards.`

## A-valdora-fees-economics
**VERIFIED** · checked again in [F11](../EVIDENCE_2026-10.md#f11) (CONFIRMED) · valdora/fees

Provider-published claim (economics page): a 10% performance fee is applied to staking rewards (not principal), and there are no fees on deposit, redemption, or holding stZIG.

*How:* Read economics-and-incentives via curl today; recorded only as a provider claim.

> Second check (F11): on chain fees_percentage is "1000"; reading it as 10% assumes a scale of 10000, which is inferred from the 2025 OAK report, not documented. Collected fees go to the "Protocol treasury" per the page; on chain the treasury is the admin key.

- <https://docs.valdora.finance/economics-and-incentives> · read 2026-10-02T20:29:42Z · SHA-256 of the page as received `21c241c09747f07955cffae02206d63ab52564c2a952d0244b05260c070ddc91`
  `10% performance fee is applied to staking rewards (not user principal).`
- <https://docs.valdora.finance/economics-and-incentives> · read 2026-10-02T20:29:42Z · SHA-256 of the page as received `21c241c09747f07955cffae02206d63ab52564c2a952d0244b05260c070ddc91`
  `There are no fees on deposit, redemption, or holding stZIG.`

## A-valdora-fees-unstake-contradiction
**VERIFIED** · checked again in [F10](../EVIDENCE_2026-10.md#f10) (CONFIRMED) · valdora/fees

The Valdora FAQ (docs and site) says unstaking 'may include a fee that varies based on the amount of stZIG being unstaked'. This contradicts the economics page ('no fees on ... redemption'). No fee schedule is published.

*How:* Both statements read today from official Valdora pages; the contradiction is literal.

- <https://docs.valdora.finance/faqs> · read 2026-10-02T20:29:43Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `Yes. Unstaking ZIG on Valdora may include a fee that varies based on the amount of stZIG being unstaked. Users should review the estimated fee in the app before confirming the unstake transaction.`
- <https://valdora.finance/faqs> · read 2026-10-02T20:30:43Z · SHA-256 of the page as received `598449446951ab0cf601ed4874b0e7a645ce2b9379c89bd21a9550247ed6a56b`
  `Yes. Unstaking ZIG on Valdora may include a fee that varies based on the amount of stZIG being unstaked.`

## A-valdora-unbonding-timing
**VERIFIED** · checked again in [F12](../EVIDENCE_2026-10.md#f12) (CONFIRMED) · valdora/redemption

Valdora docs (provider-published): the normal redeem flow follows ZIG Chain's 21-day unbonding period plus 2 additional days for Valdora distribution ('21-day+'). Instant exit is only by selling stZIG on DEXs, with market discount/slippage risk.

*How:* Read faqs, liquid-staking/architecture and unstaking-and-redemption via curl today; the same wording is on valdora.finance/faqs.

> Second check (F12): the unstaking page itself says only "21-day+"; the extra 2 days appear only in the FAQ.

- <https://docs.valdora.finance/faqs> · read 2026-10-02T20:29:43Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `ZIG unstaking on Valdora follows ZIG Chain's 21-day unbonding period, plus 2 additional days for Valdora distribution. This applies to the normal redeem flow before users can claim their available ZIG.`
- <https://docs.valdora.finance/liquid-staking/unstaking-and-redemption> · read 2026-10-02T20:29:46Z · SHA-256 of the page as received `8a7000b9931c84757be5176115c3d0d0d647bf02af92e8bb96d3b81ce1a1d286`
  `This option allows for instant exit, although the value may be subject to market discounts or slippage.`

## A-valdora-redeem-steps
**VERIFIED** · checked again in [F12](../EVIDENCE_2026-10.md#f12) (CONFIRMED) · valdora/redemption

Valdora docs describe the exit steps: (1) submit a redeem tx to the Staker, which burns the stZIG; (2) the equivalent ZIG goes into the withdrawal queue and unbonding starts; (3) after unbonding (and distribution) the user calls withdraw/claim. In the app this shows as 'Available for claiming'. Unstake requests cannot be cancelled.

*How:* Read unstaking-and-redemption, faqs and how-to-guides/unstaking-process via curl today.

- <https://docs.valdora.finance/liquid-staking/unstaking-and-redemption> · read 2026-10-02T20:29:46Z · SHA-256 of the page as received `8a7000b9931c84757be5176115c3d0d0d647bf02af92e8bb96d3b81ce1a1d286`
  `User submits a redeem transaction via the Staker Contract, burning their stZIG. The equivalent amount of ZIG is requested into the withdrawal queue, initiating the unbonding process. Once the unbonding period completes, users can call the withdraw function to claim their ZIG.`
- <https://docs.valdora.finance/faqs> · read 2026-10-02T20:29:43Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `No. Once an unstake request is submitted on Valdora, it cannot be cancelled.`
- <https://docs.valdora.finance/how-to-guides/unstaking-process> · read 2026-10-02T20:29:53Z · SHA-256 of the page as received `ceea2ccc7a7647a5a93b45528e06e164c4e24d452b0782cdca6003be01f668b8`
  `Once the "Available for claiming" amount is ready, you can claim the unbonded ZIG.`

## A-valdora-minimums
**VERIFIED** · checked again in [F10](../EVIDENCE_2026-10.md#f10) (CONFIRMED) · valdora/minimums

Valdora docs (provider-published) give a 50 ZIG minimum stake and a 50 stZIG minimum unstake (FAQ). The unstaking how-to guide words the unstake minimum as '50 ZIG'.

*How:* Read faqs and the how-to guides via curl today; the unit inconsistency is literal.

> Second check (F10): on chain, min_deposit "50000000000000000000" azig is 50 ZIG, which matches the docs, but min_stzig "49000000" at exponent 6 is 49 stZIG, not 50. Whether the contract compares with &lt; or &lt;= is unknown (source not public).

- <https://docs.valdora.finance/faqs> · read 2026-10-02T20:29:43Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `The minimum amount required to stake on Valdora is 50 ZIG.`
- <https://docs.valdora.finance/faqs> · read 2026-10-02T20:29:43Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `Users can unstake a partial amount of their stZIG balance, the current minimum amount is 50 stZIG.`
- <https://docs.valdora.finance/how-to-guides/unstaking-process> · read 2026-10-02T20:29:53Z · SHA-256 of the page as received `ceea2ccc7a7647a5a93b45528e06e164c4e24d452b0782cdca6003be01f668b8`
  `Enter the amount of stZIG you want to unstake. (Minimum amount to unstake is 50 ZIG.)`

## A-valdora-security-claims
**VERIFIED** · valdora/security

Valdora's security page claims: an OAK Security audit, staked ZIG distributed across multiple Ledger contracts, multi-signature authorization for critical functions, and circuit breakers that temporarily halt operations.

*How:* Read docs.valdora.finance/security via curl today (provider claims; see A-valdora-admin-account and A-oak-2025-mechanics for the on-chain and audit evidence).

- <https://docs.valdora.finance/security> · read 2026-10-02T20:29:44Z · SHA-256 of the page as received `88fa080873dedca2e7583ba37ff5b8b5891f91dc193766c5b4e8cc18ae210442`
  `Critical functions such as contract upgrades, fund withdrawals, and changes require multi-signature authorization.`
- <https://docs.valdora.finance/security> · read 2026-10-02T20:29:44Z · SHA-256 of the page as received `88fa080873dedca2e7583ba37ff5b8b5891f91dc193766c5b4e8cc18ae210442`
  `Smart contracts are designed with circuit breakers that temporarily halt operations if anomalies are detected.`

## A-valdora-smart-contracts-page
**VERIFIED** · checked again in [F13](../EVIDENCE_2026-10.md#f13) (CONFIRMED) · valdora/addresses

docs.valdora.finance/smart-contracts publishes mainnet staker zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55, token zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2 (denom coin.zig109f7…maam2.stzig), and ledgers zig1h92knx…um94vx, zig1sunpvu…qaa39l, zig1j6ttdc…spf2rl2, zig1h4e9j7…st86yap. It publishes 5 vaults ('Stablecoin Yield' zig1h3au5n…svluenp, 'Quant Strategy' zig17vuryz…gqa77qp2, 'Opportunistic Credit' zig1mayx7w…ql58gkq, 'SpaceX' zig1626xrg…sqsaks9, 'Core Income' zig1m526fl…cswd9grk). Testnet: staker zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69, token zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr, ledgers zig160ck80…sxv9m4d, zig1wz6sqc…ypfmfz, zig1exc33l…xyj4gw, zig1krqs3l…zjuy24. Full addresses are in the recorded responses in evidence/valdora.json.

*How:* Read via curl today; every address was then queried on the official LCD (labels match: 'stZIG Staker', 'stZIG Token', 'Ledger-1..4', 'Valdora Vault (mainnet …)').

- <https://docs.valdora.finance/smart-contracts> · read 2026-10-02T20:29:44Z · SHA-256 of the page as received `f030f4cb1bf0561145fc8d84d08d30103c9c051a1f3831f77bea6a6e17173d68`
  `Staker Contract Address: zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55 ... Token Denom coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig`

## A-valdora-site
**VERIFIED** · valdora/site

valdora.finance (public site) restates the docs on staking: stake ZIG to receive stZIG, rewards reflected in stZIG value, 50 ZIG minimum, 21-day plus 2-day unbonding, no cancellation, and a possible unstake fee. /stake is client-rendered and shows no parameters in server HTML. Server-rendered metrics show placeholder values and were not recorded.

*How:* curl GET of https://valdora.finance/, /stake and /faqs today (HTTP 200).

- <https://valdora.finance/faqs> · read 2026-10-02T20:30:43Z · SHA-256 of the page as received `598449446951ab0cf601ed4874b0e7a645ce2b9379c89bd21a9550247ed6a56b`
  `Rewards are reflected in the value of stZIG relative to ZIG. As they accrue, the amount of ZIG redeemable for each stZIG can increase over time.`
- <https://valdora.finance/> · read 2026-10-02T20:30:34Z · SHA-256 of the page as received `d46ca6f7f112084def21001da27074d4a702a1dd29f1aa4cd0818744cdc37c57`
  `Keep capital liquid while maintaining exposure to staking rewards.`

## A-valdora-mainnet-staker-contract
**VERIFIED** · checked again in [F05](../EVIDENCE_2026-10.md#f05) (CONFIRMED) · valdora/onchain

Mainnet staker zig18nnde5…k7ue55 (block 12610139):
- code_id 179, label 'stZIG Staker'
- creator and admin zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx
- created at block 2606611 (2025-09-30T14:49:55Z)
History:
- INIT code 26 @2606611, msg protocol_info{fees_percentage '1000', max_withdrawal_scan_limit 100, min_deposit '50000000', min_stzig '50000000', minting_cap '100000000000000', token_denom 'stzig', treasury_address zig1gy5zk…, withdrawal_request_limit 7}
- MIGRATE 36 @2675458 msg {"new_admin":null}
- MIGRATE 39 @3294663 msg {"new_admin":null}
- MIGRATE 179 @12554333 (2026-09-30T19:06:27Z) msg {}
Code 179 data_hash 2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C.

*How:* LCD /cosmwasm/wasm/v1/contract/&lt;addr>, /history, /code-info/179 and the key-paginated /code listing (data_hash, no wasm bytes) GET today.

> Second check (F05): code 179 was uploaded by zig1w22ujeyravz4zhz7kxvmrjca3lvu8d3gtpczxl, not by the contract admin. The migration at 12554333 (tx 4039950E…411B, an ordinary MsgMigrateContract from the admin, msg {}) has block time 2026-09-30T19:06:27.799572097Z, about 9 h 21 min after the v5 upgrade block. Current protocol values differ from the INIT message: min_deposit grew by 10^12 (6 → 18 decimals); nothing read shows what changed min_stzig or the minting cap.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55> · read 2026-10-02T20:31:55Z · height 12610139 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/mainnet_staker_contract`
  `"code_id":"179","creator":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","admin":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","label":"stZIG Staker"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/history> · read 2026-10-02T20:31:55Z · height 12610139 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/mainnet_staker_history`
  `"operation":"CONTRACT_CODE_HISTORY_OPERATION_TYPE_MIGRATE","code_id":"179","updated":{"block_height":"12554333","tx_index":"0"},"msg":{}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/code?pagination.key=AAAAAAAAALM%3D&pagination.limit=1> · read 2026-10-02T20:31:57Z · height 12610139 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/mainnet_code_179_listing`
  `"code_id":"179","creator":"zig1w22ujeyravz4zhz7kxvmrjca3lvu8d3gtpczxl","data_hash":"2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C"`

## A-valdora-testnet-staker-contract
**VERIFIED** · checked again in [F04](../EVIDENCE_2026-10.md#f04) (CONFIRMED) · valdora/onchain

Testnet staker zig19a8kl…6lqy69 is now code_id 2532 (label 'stZIG Staker', creator and admin zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3).
History:
- INIT code 1062 @block 2652705 (2025-10-18T02:17:37Z), msg protocol_info{fees_percentage '1000', max_withdrawal_scan_limit 100, min_deposit '1000000', min_stzig '1000000', minting_cap '100000000000000', token_denom 'stzig', treasury_address zig1gy5zk…, withdrawal_request_limit 1}
- MIGRATE code 2532 @block 7812034 (2026-09-17T17:14:45Z), msg {}
Code 2532 data_hash 2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C. This confirms the earlier 1062 record and today's 2532.

*How:* LCD contract, history, code-info and code listing GET today.

> Second check (F04): block 7812034 is 2026-09-17T17:14:45.929160544Z. Its only transaction, A21485F0…97C6, is a MsgMigrateContract from the admin with msg {}. The testnet staker's treasury_address is zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx, the mainnet staker's admin, and the same key controls that address on zig-test-2 (account_number 127388).

- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/history> · read 2026-10-02T20:31:35Z · height 8045230 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/testnet_staker_history`
  `"operation":"CONTRACT_CODE_HISTORY_OPERATION_TYPE_INIT","code_id":"1062","updated":{"block_height":"2652705" ... "operation":"CONTRACT_CODE_HISTORY_OPERATION_TYPE_MIGRATE","code_id":"2532","updated":{"block_height":"7812034","tx_index":"0"},"msg":{}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/code-info/2532> · read 2026-10-02T20:31:38Z · height 8045230 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/testnet_code_2532_codeinfo`
  `{"code_id":"2532","creator":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","checksum":"2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C"`
- <https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/7812034> · read 2026-10-02T20:35:37Z · height 8045273 · kept in [evidence/valdora.json](valdora.json) as `research/a/lcd/testnet_block_7812034`
  `"time":"2026-09-17T17:14:45.929160544Z"`

## A-valdora-token-contracts
**VERIFIED** · valdora/onchain

stZIG token contracts:
- Mainnet zig109f7…maam2: code 181, label 'stZIG Token', creator and admin = mainnet staker. History INIT 25 @2606617 msg {"token_name":"stzig","minting_cap":"100000000000000"}, MIGRATE 37 @2675528, MIGRATE 181 @12554430 msg {"migration_data":null}.
- Testnet zig18dgn…6anrnr: code 2534, creator and admin = testnet staker. History INIT 1061 @2652707, MIGRATE 2534 @7812041.
Both codes have data_hash 40D22BDEDCC797DFCA12C97D48B308600C63AA82E767B001AA325B585F67E777.

*How:* LCD contract, history and code listing GET today.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2/history> · read 2026-10-02T20:31:57Z · height 12610140 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/mainnet_token_history`
  `"code_id":"181","updated":{"block_height":"12554430","tx_index":"0"},"msg":{"migration_data":null}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/code-info/2534> · read 2026-10-02T20:31:40Z · height 8045230 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/testnet_code_2534_codeinfo`
  `"checksum":"40D22BDEDCC797DFCA12C97D48B308600C63AA82E767B001AA325B585F67E777"`

## A-valdora-ledger-contracts
**VERIFIED** · valdora/onchain

Ledger contracts:
- Mainnet: the 4 ledgers are code 180 (labels Ledger-1..4; creator and admin = mainnet staker). History INIT 27, then MIGRATE 180 @12554351. Init ledger_settings: max_unbonding_requests 7, unbonding_period 1814400, redelegation_cooldown_period 1814400. Validators: zigvaloper18vykgj…, zigvaloper1vd9ljp…, zigvaloper1jh6jve…, zigvaloper15pwqnx….
- Testnet: the 4 ledgers are code 2533 (INIT 1063, then MIGRATE 2533 @7812038). Init ledger_settings: unbonding_period 604800, redelegation_cooldown_period 604800, max_unbonding_requests 7.
Both ledger codes have data_hash 81197AF1BB468125CD745CFF0C043E76198BD6CB5F4EDCE086D50A2955B40C82. The testnet ledger unbonding_period (604800) differs from the chain's unbonding_time 1814400s.

*How:* LCD contract, history and code listing GET today for all 8 ledgers; get_ledgers on the staker returns the same periods.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1h92knxmguyjq6acphudkrtl3avmn67t6hmqg7p8svsewag8luzvqum94vx/history> · read 2026-10-02T20:31:59Z · height 12610140 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/mainnet_ledger1_history`
  `"ledger_settings":{"max_unbonding_requests":7,"validator_address":"zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl","unbonding_period":1814400,"redelegation_cooldown_period":1814400}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig160ck80wcx4xlw2ahe7sf65jq54v2nakapxjyt742zm5k7fte40hsxv9m4d/history> · read 2026-10-02T20:31:40Z · height 8045231 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/testnet_ledger1_history`
  `"ledger_settings":{"max_unbonding_requests":7,"validator_address":"zigvaloper1pwwymlyeyfcz3pjvcegvz8tj3yf0pr3wqqhrwk","unbonding_period":604800,"redelegation_cooldown_period":604800}`

## A-valdora-vault-contracts
**VERIFIED** · valdora/onchain

All 5 mainnet vault addresses are code 146 (data_hash 5A000AD1A8765E66F505CBA8BC78BB95298A451D897BFFE561DF6514B3B9ED58). Creator and admin is zig1gy5zk….
Labels:
- 'Valdora Vault (mainnet)'
- '…/ quant-strategy'
- '…/ usdc-opportunistic-credit'
- '…/ spacex'
- '…/ usdc-core-income'
History: INIT code 133, then MIGRATE 146 at ~block 11615095–11615117.
Init msgs: vault_type 'externally_managed', asset_denom ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4 (Noble uusdc), minting_cap '50000000000000'.

*How:* LCD contract, history and code listing GET today (20:32:14–18Z).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1h3au5n3lsyqm32ydz3usgy7r9z7wpx4gttcxmypfecz29adtu64svluenp/history> · read 2026-10-02T20:32:14Z · height 12610145 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/mainnet_vault_stablecoin_yield_history`
  `"token_name":"vvaultsy" ... "minting_cap":"50000000000000","asset_denom":"ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4","vault_type":"externally_managed"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/code-info/146> · read 2026-10-02T20:32:15Z · height 12610145 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_lcd/mainnet_code_146_codeinfo`
  `"checksum":"5A000AD1A8765E66F505CBA8BC78BB95298A451D897BFFE561DF6514B3B9ED58"`

## A-valdora-hash-parity
**VERIFIED** · checked again in [F05](../EVIDENCE_2026-10.md#f05) (CONFIRMED) · checked again in [F06](../EVIDENCE_2026-10.md#f06) (CONFIRMED) · valdora/onchain

Mainnet and testnet Valdora code is byte-identical by data_hash:
- staker (179 vs 2532): 2E68EC99…
- token (181 vs 2534): 40D22BDE…
- ledgers (180 vs 2533): 81197AF1…
contract_version is {"version":"1.1.0","contract":"stzig-staker"} on both stakers and {"version":"1.1.0","contract":"stzig-token"} on both tokens.

*How:* Compared literal LCD data_hash/checksum values and contract_version query results from today.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJjb250cmFjdF92ZXJzaW9uIjp7fX0=> · read 2026-10-02T20:33:14Z · height 12610164 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_contract_version_empty`
  `{"data":{"version":"1.1.0","contract":"stzig-staker"}}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJjb250cmFjdF92ZXJzaW9uIjp7fX0=> · read 2026-10-02T20:33:13Z · height 8045247 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/testnet_staker_contract_version_empty`
  `{"data":{"version":"1.1.0","contract":"stzig-staker"}}`

## A-valdora-staker-variants
**VERIFIED** · valdora/interface

The staker's own serde error (identical on mainnet and testnet) lists 30 query variants: admin, pending_admin, paused, token_contract, st_zig_price, reverse_st_zig_price, funds_raised, total_supply, withdrawal_requests, st_zig_balance, protocol_info, get_ledgers, get_ledger, completed_unbondings, contract_version, protocol_modifiers, roles, role, user_role, users, emergency_status, emergency_withdrawal_history, total_withdrawal_requests, total_completed_unbondings, daily_rewards_and_fees, total_losses, loss_percentage_today, completed_unbonding, completed_unbondings_amount, and one vault-list variant ending in '_vaults' (`partnered_vaults`, in the recorded response in evidence/valdora.json).

*How:* Smart query {"zz_unknown":{}} (base64 eyJ6el91bmtub3duIjp7fX0=) on both stakers today returned HTTP 500 with the variant list; the quote is truncated to 300 chars.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJ6el91bmtub3duIjp7fX0=> · read 2026-10-02T20:32:48Z · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_zz_unknown`
  ``kind: Serialization, error: unknown variant `zz_unknown`, expected one of `admin`, `pending_admin`, `paused`, `token_contract`, `st_zig_price`, `reverse_st_zig_price`, `funds_raised`, `total_supply`, `withdrawal_requests`, `st_zig_balance`, `protocol_info`,``
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJ6el91bmtub3duIjp7fX0=> · read 2026-10-02T20:32:48Z · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/testnet_staker_zz_unknown`
  `` `get_ledgers`, `get_ledger`, `completed_unbondings`, `contract_version`, `protocol_modifiers`, `roles`, `role`, `user_role`, `users`, `emergency_status`, `emergency_withdrawal_history`, `total_withdrawal_requests`, `total_completed_unbondings`, `daily_rewards_and_fees`, `total_losses`, ``

## A-valdora-staker-required-fields
**VERIFIED** · valdora/interface

Required fields, discovered from the contract's 'missing field' serde errors (both networks):
- st_zig_price {amount}, reverse_st_zig_price {amount}
- withdrawal_requests {address}, st_zig_balance {address}
- get_ledger {address}
- completed_unbondings {address}, completed_unbondings_amount {address}
- completed_unbonding {address, withdrawal_request_id (u64)}
- role {role_name}, users {role_name}, user_role {user_address}
All other variants accept {}. The contract silently ignores unknown extra fields, so optional fields could not be discovered.

*How:* Empty-param probes and follow-ups today; serde error strings are saved per variant.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJjb21wbGV0ZWRfdW5ib25kaW5nIjp7ImFkZHJlc3MiOiJ6aWcxcXlxc3pxZ3BxeXFzenFncHF5cXN6cWdwcXlxc3pxZ3BuZXl2MDUifX0=> · read 2026-10-02T20:33:58Z · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_completed_unbonding_syn_try0`
  ``kind: Serialization, error: missing field `withdrawal_request_id` at line 1 column 79: query wasm contract failed``
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJ1c2VyX3JvbGUiOnt9fQ==> · read 2026-10-02T20:33:18Z · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_user_role_empty`
  ``kind: Serialization, error: missing field `user_address` at line 1 column 15: query wasm contract failed``
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJzdF96aWdfcHJpY2UiOnt9fQ==> · read 2026-10-02T20:33:04Z · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_st_zig_price_empty`
  ``kind: Serialization, error: missing field `amount` at line 1 column 18: query wasm contract failed``

## A-valdora-staker-protocol-info
**VERIFIED** · checked again in [F07](../EVIDENCE_2026-10.md#f07) (CONFIRMED) · valdora/interface

protocol_info:
- Mainnet: token_name 'stzig', token_denom coin.zig109f7…maam2.stzig, minting_cap '500000000000000', min_stzig '49000000', min_deposit '50000000000000000000', max_withdrawal_scan_limit 100, withdrawal_request_limit 7, fees_percentage '1000', treasury_address zig1gy5zk….
- Testnet: minting_cap '100000000000000', min_stzig '1000000', min_deposit '1000000000000000000', withdrawal_request_limit 1, fees_percentage '1000'.
Min_deposit values are 10^12 times their init values (mainnet init '50000000'). min_stzig was not rescaled.

*How:* Smart query {"protocol_info":{}} on both stakers today; init values from the contract history.

> Second check (F07): both stakers name the same treasury_address, zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJwcm90b2NvbF9pbmZvIjp7fX0=> · read 2026-10-02T20:33:10Z · height 12610162 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_protocol_info_empty`
  `"minting_cap":"500000000000000","min_stzig":"49000000","min_deposit":"50000000000000000000","max_withdrawal_scan_limit":100,"withdrawal_request_limit":7,"fees_percentage":"1000","treasury_address":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx"`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJwcm90b2NvbF9pbmZvIjp7fX0=> · read 2026-10-02T20:33:09Z · height 8045246 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/testnet_staker_protocol_info_empty`
  `"minting_cap":"100000000000000","min_stzig":"1000000","min_deposit":"1000000000000000000","max_withdrawal_scan_limit":100,"withdrawal_request_limit":1,"fees_percentage":"1000"`

## A-valdora-staker-status
**VERIFIED** · valdora/interface

Status on both networks: paused {"paused":false}; emergency_status {emergency_mode false, initiated_by null, initiated_at null, emergency_unbonded_ledgers []}; emergency_withdrawal_history {history []}; pending_admin null. Admin is zig1gy5zk… (mainnet) / zig1699nz… (testnet). token_contract returns the published token address on each network.

*How:* Smart queries today (mainnet blocks 12610159–12610166, testnet 8045244–8045248).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJwYXVzZWQiOnt9fQ==> · read 2026-10-02T20:33:01Z · height 12610160 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_paused_empty`
  `{"data":{"paused":false}}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJlbWVyZ2VuY3lfc3RhdHVzIjp7fX0=> · read 2026-10-02T20:33:19Z · height 12610165 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_emergency_status_empty`
  `{"data":{"emergency_mode":false,"initiated_by":null,"initiated_at":null,"emergency_unbonded_ledgers":[]}}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJwYXVzZWQiOnt9fQ==> · read 2026-10-02T20:33:01Z · height 8045245 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/testnet_staker_paused_empty`
  `{"data":{"paused":false}}`

## A-valdora-staker-supply-funds
**VERIFIED** · valdora/interface

funds_raised:
- mainnet '194866560514523149941061108'
- testnet '21053483433920316900675760'
The staker's total_supply ('182007710986082' mainnet, '18633318795402' testnet) equals the token contract total_supply and the bank supply of the stzig denom.

*How:* Staker smart queries, token token_info and bank supply/by_denom GET today (within about 2 minutes of each other).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJmdW5kc19yYWlzZWQiOnt9fQ==> · read 2026-10-02T20:33:06Z · height 12610161 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_funds_raised_empty`
  `{"data":{"funds_raised":"194866560514523149941061108"}}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJ0b3RhbF9zdXBwbHkiOnt9fQ==> · read 2026-10-02T20:33:07Z · height 12610161 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_total_supply_empty`
  `{"data":{"total_supply":"182007710986082"}}`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig> · read 2026-10-02T20:35:29Z · height 12610206 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_stzig_supply_by_denom`
  `{"amount":{"denom":"coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig","amount":"182007710986082"}}`

## A-valdora-staker-price-queries
**VERIFIED** · valdora/interface

Literal price-query responses (field names as returned):
- mainnet st_zig_price {amount '1000000'} → {stzig_amount '1070650026082820507', uzig_amount '1000000'}
- mainnet st_zig_price {'1000000000000000000'} → stzig_amount '1070650026082820507555758469069'
- mainnet reverse_st_zig_price {'1000000'} → stzig_amount '0'
- mainnet reverse_st_zig_price {'1000000000000000000'} → stzig_amount '934012'
- testnet, same order: '1129883713421761571', '1129883713421761571266038753369', '0', '885046'
The responses still use the field name 'uzig_amount' after v5.

*How:* Smart queries today (mainnet block 12610190, testnet 8045262). Values are recorded literally; no interpretation.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJzdF96aWdfcHJpY2UiOnsiYW1vdW50IjoiMTAwMDAwMCJ9fQ==> · read 2026-10-02T20:34:36Z · height 12610190 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_st_zig_price_1000000`
  `{"data":{"stzig_amount":"1070650026082820507","uzig_amount":"1000000"}}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJyZXZlcnNlX3N0X3ppZ19wcmljZSI6eyJhbW91bnQiOiIxMDAwMDAwMDAwMDAwMDAwMDAwIn19> · read 2026-10-02T20:34:38Z · height 12610190 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_reverse_st_zig_price_1000000000000000000`
  `{"data":{"stzig_amount":"934012","uzig_amount":"1000000000000000000"}}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJzdF96aWdfcHJpY2UiOnsiYW1vdW50IjoiMTAwMDAwMCJ9fQ==> · read 2026-10-02T20:34:35Z · height 8045262 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/testnet_staker_st_zig_price_1000000`
  `{"data":{"stzig_amount":"1129883713421761571","uzig_amount":"1000000"}}`

## A-valdora-staker-ledgers
**VERIFIED** · valdora/interface

get_ledgers returns 4 ledgers per network. Each entry has the keys address, unbonding_requests_count, bonded_amount, unbonding_amount, validator_address, max_unbonding_requests, unbonding_period, redelegation_cooldown_period, last_reward, current_reward, effective_stake, balance, slash_today.
- Mainnet unbonding_requests_count values are 6, 2, 1, 0 (max 7), with unbonding_period 1814400 and slash_today '0'.
- Testnet: all counts 0, unbonding_period 604800.
get_ledger {address} returns one such entry.

*How:* Smart queries today (mainnet block 12610163, testnet 8045247); full responses saved.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJnZXRfbGVkZ2VycyI6e319> · read 2026-10-02T20:33:11Z · height 12610163 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_get_ledgers_empty`
  `"address":"zig1h4e9j7n97e7dfykw7kywn6szavlzmx42cm3uwryphuecxvfr76pst86yap","unbonding_requests_count":6, ... "max_unbonding_requests":7,"unbonding_period":1814400,"redelegation_cooldown_period":1814400`

## A-valdora-staker-counters
**VERIFIED** · valdora/interface

Contract-level counters:
- Mainnet: total_withdrawal_requests {total_count 18}; total_completed_unbondings {total_count 50, total_amount '15116728401596000000000000'}; daily_rewards_and_fees {rewards_earned_today '27468846944369654319127', fees_minted_today '2565947806'}; total_losses '0'; loss_percentage_today '0'.
- Testnet: total_count 0; completed {1, '1000000000000000000'}; daily {'8371852388539684307692', '741213409'}; losses '0'.

*How:* Smart queries today (mainnet 12610166–12610167, testnet 8045248–8045249). Raw counters only; no rate computed.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJ0b3RhbF9jb21wbGV0ZWRfdW5ib25kaW5ncyI6e319> · read 2026-10-02T20:33:22Z · height 12610166 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_total_completed_unbondings_empty`
  `{"data":{"total_count":50,"total_amount":"15116728401596000000000000"}}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJkYWlseV9yZXdhcmRzX2FuZF9mZWVzIjp7fX0=> · read 2026-10-02T20:33:23Z · height 12610167 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_daily_rewards_and_fees_empty`
  `{"data":{"rewards_earned_today":"27468846944369654319127","fees_minted_today":"2565947806"}}`

## A-valdora-staker-roles
**VERIFIED** · valdora/interface

Roles:
- roles: mainnet ["cron_worker"], testnet [].
- role {role_name 'cron_worker'} on mainnet → functions execute_reconcile_ledgers, execute_distribute_losses, execute_distribute_rewards_and_fees, execute_collect_unbonded_amounts, execute_sync.
- On testnet the same role query errors with 'not found'.
- users {role_name 'cron_worker'} shape: {role_name: str, users: [&lt;redacted>]} (1 entry on mainnet, empty on testnet).

*How:* Smart queries today; the users list address is redacted per instructions (shape only).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJyb2xlIjp7InJvbGVfbmFtZSI6ImNyb25fd29ya2VyIn19> · read 2026-10-02T20:34:15Z · height 12610183 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_role_cron_worker_try0`
  `{"data":{"role_name":"cron_worker","functions":["execute_reconcile_ledgers","execute_distribute_losses","execute_distribute_rewards_and_fees","execute_collect_unbonded_amounts","execute_sync"]}}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJ1c2VycyI6eyJyb2xlX25hbWUiOiJjcm9uX3dvcmtlciJ9fQ==> · read 2026-10-02T20:34:27Z · SHA-256 of the file as read `7114ff8fb74829bf0bc4b2ff33711dfd1811f48b59644740ba5555179353f03c`
  `{"data": {"role_name": "str", "users": ["<redacted>"]}} (shape)`

## A-valdora-staker-protocol-modifiers
**VERIFIED** · valdora/interface

protocol_modifiers returns the same 25 admin-gated functions on both networks. Examples: execute_pause, execute_unpause, execute_update_admin, execute_update_minting_cap, execute_update_withdrawal_request_limit, execute_update_min_stzig, execute_update_fees_percentage, execute_update_treasury_address, execute_register_ledger, execute_migrate_token, execute_migrate_ledger, execute_redelegate_ledger, execute_update_ledger_settings, execute_initiate_emergency, execute_withdraw_emergency_funds, execute_emergency_open_more_unbondings, plus role/user/modifier management and two vault add/remove entries (exact names in the recorded response in evidence/valdora.json).

*How:* Smart query {"protocol_modifiers":{}} today on both stakers.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJwcm90b2NvbF9tb2RpZmllcnMiOnt9fQ==> · read 2026-10-02T20:33:15Z · height 12610164 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_protocol_modifiers_empty`
  `{"data":{"modifiers":["execute_pause","execute_unpause","execute_update_admin","execute_update_minting_cap","execute_update_withdrawal_request_limit","execute_update_min_stzig","execute_update_fees_percentage",`

## A-valdora-staker-vault-list-variant
**VERIFIED** · valdora/interface

The staker has a query variant the contract names `partnered_vaults`. Queried with {}, it returned two vault contract addresses on mainnet and one on testnet (HTTP 200).

*How:* Smart query {"partnered_vaults":{}} on both stakers today (the first reader recorded only that it exists; the responses are quoted here from the recorded files).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJwYXJ0bmVyZWRfdmF1bHRzIjp7fX0=> · read 2026-10-02T20:33:27Z · height 12610168 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_partnered_vaults_empty`
  `{"data":{"vaults":["zig105hvpz3se09wlvvjjk2ytk32mhfp9cly5ax5dc93lauugke4uaes4sa0ce","zig1fqxfjv54zavyr9464vj6n2jgw9fxgdnxucf866spedunntw0skcsq9gz33"]}}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJwYXJ0bmVyZWRfdmF1bHRzIjp7fX0=> · read 2026-10-02T20:33:27Z · height 8045249 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/testnet_staker_partnered_vaults_empty`
  `{"data":{"vaults":["zig19vwcmdj2a55u5kw4n7n3p25wl8rgacucp50cdtyj3rl4uwu0uayq4ktp5n"]}}`

## A-valdora-staker-address-scoped
**VERIFIED** · valdora/interface

Address-scoped queries were run with the synthetic address zig1qyqszqgpqyqszqgpqyqszqgpqyqszqgpneyv05 (bech32 hrp 'zig' over 20 bytes of 0x01). Results on both networks:
- st_zig_balance → {address, balance '0'}
- withdrawal_requests → {address, requests []}
- completed_unbondings → {address, completed_unbondings []}
- completed_unbondings_amount → {address, total_amount '0'}
- completed_unbonding {address, withdrawal_request_id 1} → data null
- user_role → {user_address, role null}
- token balance → {address, balance '0'}

*How:* Smart queries today; the address was computed with a local BIP-173 implementation and round-trip decoded.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJ3aXRoZHJhd2FsX3JlcXVlc3RzIjp7ImFkZHJlc3MiOiJ6aWcxcXlxc3pxZ3BxeXFzenFncHF5cXN6cWdwcXlxc3pxZ3BuZXl2MDUifX0=> · read 2026-10-02T20:33:56Z · height 12610177 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_withdrawal_requests_syn_try0`
  `{"data":{"address":"zig1qyqszqgpqyqszqgpqyqszqgpqyqszqgpneyv05","requests":[]}}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJzdF96aWdfYmFsYW5jZSI6eyJhZGRyZXNzIjoiemlnMXF5cXN6cWdwcXlxc3pxZ3BxeXFzenFncHF5cXN6cWdwbmV5djA1In19> · read 2026-10-02T20:33:55Z · height 12610176 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_staker_st_zig_balance_syn_try0`
  `{"data":{"address":"zig1qyqszqgpqyqszqgpqyqszqgpqyqszqgpneyv05","balance":"0"}}`

## A-valdora-token-interface
**VERIFIED** · valdora/interface

stZIG token contracts list 7 query variants (both networks): total_supply, balance, token_info, admin, pending_admin, contract_version, denom_metadata_admin. balance requires {address}.
token_info:
- mainnet {denom 'stzig', minting_cap '500000000000000', total_supply '182007710986082'}
- testnet {denom 'stzig', minting_cap '100000000000000', total_supply '18633318795402'}
The token admin is the staker on each network, and denom_metadata_admin is the token itself (mainnet) or zig1699nz… (testnet). No decimals query exists.

*How:* Smart queries today (mainnet 12610200–12610202, testnet 8045267–8045268).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2/smart/eyJ6el91bmtub3duIjp7fX0=> · read 2026-10-02T20:34:56Z · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_token_zz_unknown`
  ``kind: Serialization, error: unknown variant `zz_unknown`, expected one of `total_supply`, `balance`, `token_info`, `admin`, `pending_admin`, `contract_version`, `denom_metadata_admin` at line 1 column 13: query wasm contract failed``
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2/smart/eyJ0b2tlbl9pbmZvIjp7fX0=> · read 2026-10-02T20:35:10Z · height 12610201 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_token_token_info_try0`
  `{"data":{"denom":"stzig","minting_cap":"500000000000000","total_supply":"182007710986082"}}`

## A-valdora-stzig-bank-metadata
**VERIFIED** · valdora/denom

Bank metadata for coin.zig109f7…maam2.stzig (mainnet) and coin.zig18dgn…6anrnr.stzig (testnet): name 'Staked ZIG', symbol 'stZIG', display 'stZIG' with exponent 6, base exponent 0, empty uri.

*How:* LCD /cosmos/bank/v1beta1/denoms_metadata/&lt;url-encoded denom> and denoms_metadata_by_query_string GET today; both returned the same body.

- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig> · read 2026-10-02T20:35:28Z · height 12610206 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/mainnet_stzig_denoms_metadata`
  `{"denom":"stZIG","exponent":6,"aliases":[]}],"base":"coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig","display":"stZIG","name":"Staked ZIG","symbol":"stZIG"`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/coin.zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr.stzig> · read 2026-10-02T20:35:26Z · height 8045271 · kept in [evidence/valdora.json](valdora.json) as `research/a/valdora_q/testnet_stzig_denoms_metadata`
  `{"denom":"stZIG","exponent":6,"aliases":[]}`

## A-valdora-admin-account
**VERIFIED** · checked again in [F08](../EVIDENCE_2026-10.md#f08) (CONFIRMED) · valdora/security

The wasm admin of the mainnet staker (zig1gy5zk…) and of the testnet staker (zig1699nz…) are both auth BaseAccounts with pub_key type /cosmos.crypto.secp256k1.PubKey, a single-key type and not a multisig pubkey type. The docs claim multi-signature authorization.

*How:* LCD /cosmos/auth/v1beta1/accounts/&lt;addr> GET today.

> Second check (F08, and a later read at block 12612975): the staker's wasm admin, its internal admin (pending_admin null) and its treasury are the same single secp256k1 key; the mainnet migrate transaction was also signed by one secp256k1 key. For comparison, the OroSwap factory owner zig1kctvwjfqg6fmx3s2n7y297ut5304kfzy4x7ted is a 2-of-3 multisig.

- <https://api.zigchain.com/cosmos/auth/v1beta1/accounts/zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx> · read 2026-10-02T20:53:50Z · height 12610553 · kept in [evidence/valdora.json](valdora.json) as `research/a/lcd/mainnet_auth_account_zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx`
  `"@type":"/cosmos.auth.v1beta1.BaseAccount" ... "pub_key":{"@type":"/cosmos.crypto.secp256k1.PubKey"`

## A-valdora-execute-msg-structure
**UNVERIFIED** · valdora/interface

The exact JSON ExecuteMsg structures for deposit/redeem/withdraw on the Valdora staker (field names, which funds to attach) are not published.

*How:* Not found in the docs. The audits name Deposit, Redeem, WithdrawUnbonded and WithdrawUnbondedById only in prose. The audited repositories (Liquid-Zig/new-stzig-contracts, Liquid-Zig/vault-contracts-audit) return 404 on raw.githubusercontent.com. Execute messages cannot be probed read-only.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf> · read 2026-10-02T20:36:15Z · SHA-256 of the PDF as received `56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6`
  `The dispatcher checks the flag only for Deposit, Redeem, WithdrawUnbonded and WithdrawUnbondedById.`

## A-valdora-price-semantics
**UNVERIFIED** · valdora/interface

What the units of st_zig_price / reverse_st_zig_price inputs and outputs are (which denom each 'stzig_amount' / 'uzig_amount' field is in after v5), and therefore any stZIG:ZIG exchange ratio.

*How:* Not documented in any official source read today. The raw responses are recorded, but the field names predate v5 and no source defines their units. No ratio is stated here.

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJzdF96aWdfcHJpY2UiOnsiYW1vdW50IjoiMTAwMDAwMCJ9fQ==> · read 2026-10-02T20:34:36Z · not readable; see [Pages that could not be read](../EVIDENCE_2026-10.md#pages-that-could-not-be-read)
  `{"data":{"stzig_amount":"1070650026082820507","uzig_amount":"1000000"}}`

## A-valdora-param-semantics
**UNVERIFIED** · valdora/fees

Whether on-chain fees_percentage '1000' means the documented 10% performance fee, and whether min_stzig '49000000' / min_deposit '50000000000000000000' are the documented 50 stZIG / 50 ZIG minimums.

*How:* No official source defines these field units. The 2025 OAK audit says 10000 is the fee percentage denominator, but it describes 2025 code and is not tied to deployed code 179.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T20:36:14Z · SHA-256 of the PDF as received `f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6`
  `the number literal 10000 is used to represent the fee percentage denominator.`

## A-oak-valdora-listing
**VERIFIED** · checked again in [F14](../EVIDENCE_2026-10.md#f14) (CONFIRMED) · audits/oak

OAK Security's cosmwasm tech-stack index lists three Valdora reports: '2025-09-28 Audit Report - Valdora', '2026-04-17 Audit Report - Valdora Vault Contract', '2026-09-21 Audit Report - Valdora 18 Decimals Update v1.0'. The PDFs were downloaded with sha256 f619b9e9…2fb6, c938f8d2…a5db and 56ab6147…f5d6 respectively.

*How:* Read the raw cosmwasm.md and downloaded each PDF via raw.githubusercontent.com today (HTTP 200).

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/_tech_stacks/cosmwasm.md> · read 2026-10-02T20:36:08Z · SHA-256 of the file as received `20d8195df6cf13d0feb4c406588a1ccb489a37cbd8ded276ea01f90c8945c734`
  `- [Valdora 18 Decimals Update](https://github.com/oak-security/audit-reports/blob/main/Valdora/2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf)`

## A-oak-valdora-2025-scope
**VERIFIED** · audits/oak

OAK report 'Valdora' v1.2, dated September 28, 2025. Client: LIQUIDZIG LTD. Scope: repository https://github.com/Liquid-Zig/new-stzig-contracts at commit 5fd9d3bf7a97daee3630e5487f6a6384013f3e21, 'All contracts were in scope' (staker, ledger, token). Fixes verified at 9abdd76a5735a3894446d80366835077819c18ed. Test coverage 78.67%.

*How:* pdftotext of the downloaded PDF (sha256 f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6); whitespace collapsed in the quote.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T20:36:14Z · SHA-256 of the PDF as received `f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6`
  `Repository https://github.com/Liquid-Zig/new-stzig-contracts Commit 5fd9d3bf7a97daee3630e5487f6a6384013f3e21 Scope All contracts were in scope. Fixes verified 9abdd76a5735a3894446d80366835077819c18ed`

## A-oak-valdora-2025-findings
**VERIFIED** · checked again in [F15](../EVIDENCE_2026-10.md#f15) (PARTLY) · audits/oak

The 2025-09-28 Valdora report summary table lists 47 findings:
- Critical 3 (all Resolved)
- Major 9 (8 Resolved; #9 'Slash calculation excludes unbonding amounts' Partially Resolved)
- Minor 11 (8 Resolved; #13, #18, #22 Acknowledged)
- Informational 24 (23 Resolved; #24 Acknowledged; the detailed section labels #24 'Severity: Minor')
Criticals: #1 unbonding request ID collision, #2 reward overwriting, #3 incorrect total supply calculation affecting the stzig redemption rate.

*How:* Counted programmatically from the pdftotext summary table and checked against the detailed sections.

> Second check (F15, PARTLY): the 2026-04-17 and 2026-09-21 counts match in both the summary table and the detailed section. In the 2025-09-28 report, finding #24 is Informational in the summary table but "Severity: Minor" in the detailed section, so the split is Minor 11 / Informational 24 by the table and Minor 12 / Informational 23 by the detailed section.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T20:36:14Z · SHA-256 of the PDF as received `f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6`
  `3 Incorrect total supply calculation affects stzig Critical Resolved redemption rate`

## A-oak-valdora-2025-mechanics
**VERIFIED** · audits/oak

The 2025 report describes these mechanics (as of the audited code):
- 10000 is the fee percentage denominator.
- Fees are minted as stzig to the treasury (finding #5).
- Redeem records a request, and unbonding starts later in Sync.
- completion_time was computed as +21 days.
- The withdraw-completed-unbonding function withdraws all of a user's completed unbondings.
- A mandatory execution sequence must run every 24 hours.
- Centralization (Acknowledged): 'Single admin model: All contracts use single admin without multi-sig.'

*How:* Quoted from pdftotext of the downloaded PDF.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T20:36:14Z · SHA-256 of the PDF as received `f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6`
  `the completion_time is calculated by adding 21 days to the current time using the magic number 21 * 24 * 60 * 60. ... the unbonding does not start within Redeem but within Sync which can happen at any time later`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T20:36:14Z · SHA-256 of the PDF as received `f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6`
  `Single admin model: All contracts use single admin without multi-sig.`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T20:36:14Z · SHA-256 of the PDF as received `f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6`
  `the function actually withdraws for all completed unbondings of the user.`

## A-oak-valdora-2026-vault
**VERIFIED** · checked again in [F15](../EVIDENCE_2026-10.md#f15) (PARTLY) · audits/oak

OAK report 'Valdora Vault Contract' v1.0, dated April 17, 2026. Client: Highend Technologies LLC. Repository https://github.com/Liquid-Zig/vault-contracts-audit at commit 57c3f00b63fc06a897a091768b378bc33c868a29; fixes verified at b5c583f8345339cae2b380e264995bfd100ca7cd. 28 findings: Critical 2, Major 1, Minor 6 (all Resolved); Informational 19 (17 Resolved, #19 and #20 Acknowledged).

*How:* pdftotext of the downloaded PDF (sha256 c938f8d2782a1e8dd9ac537a3db54fbace8eae5456453a60fa8f62bb0128a5db); counts from the summary table.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-04-17%20Audit%20Report%20-%20Valdora%20Vault%20Contract.pdf> · read 2026-10-02T20:36:15Z · SHA-256 of the PDF as received `c938f8d2782a1e8dd9ac537a3db54fbace8eae5456453a60fa8f62bb0128a5db`
  `Valdora Vault is a CosmWasm smart contract on ZigChain that implements a NAV-based vault where users deposit a single asset (e.g., USDC) and receive vault shares (a native ZigChain factory token).`

## A-oak-valdora-2026-18dec
**VERIFIED** · checked again in [F15](../EVIDENCE_2026-10.md#f15) (PARTLY) · audits/oak

OAK report 'Valdora 18 Decimals Update' v1.0, dated September 21, 2026 (PDF title 'Valdora Pull 18 — Security Audit Report'). Client: Highend Technologies LLC. Scope: diff of new-stzig-contracts Pull Request #18 (base a00c79e720, head 0afa20bc38), covering ledger and staker files; fixes reviewed at 60afaab5b3. 7 findings: Critical 1, Major 2 (all Resolved), Minor 3 (2 Resolved, #5 Acknowledged), Informational 1 (Resolved). The report states the migration multiplies stored base amounts by 10^12 while the stZIG supply is deliberately left unscaled.

*How:* pdftotext of the downloaded PDF (sha256 56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6).

> Second check (F14): the PDF's metadata title is "Valdora Pull 18 — Security Audit Report". It reviews only the diff of pull request #18 of Liquid-Zig/new-stzig-contracts (base a00c79e720, head 0afa20bc38, fixes reviewed at 60afaab5b3), not the whole codebase.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf> · read 2026-10-02T20:36:15Z · SHA-256 of the PDF as received `56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6`
  `In either case the stZIG exchange rate, which is derived from FUNDS_RAISED_BALANCE, is corrupted by a factor of 10¹² against a token supply that is deliberately left unscaled, and there is no rollback path.`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf> · read 2026-10-02T20:36:15Z · SHA-256 of the PDF as received `56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6`
  `fixes-review: new-stzig-contracts@60afaab5b3`

## A-oak-valdora-msg-names
**VERIFIED** · audits/oak

No Valdora audit includes a QueryMsg/ExecuteMsg schema. Message names appear only in prose and code excerpts:
- staker: Deposit, Redeem, WithdrawUnbonded, WithdrawUnbondedById, Sync, ReconcileLedgers, DistributeLosses, CollectUnbondedAmounts, DistributeRewardsAndFees, RegisterToken, RegisterLedger, ExecMsg::MigrateLedger, MigrateToken, ContractMigrateMsg { new_admin: None }
- ledger: LedgerExecMsg::Bond plus Unbond, Reconcile, Redelegate, WithdrawBalance, ResetSlashToday
- vault: execute_request_redeem, execute_approve_request, execute_reject_request
The 18-decimals report says pause gates only Deposit, Redeem, WithdrawUnbonded and WithdrawUnbondedById.

*How:* grep of the pdftotext output of all three PDFs.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf> · read 2026-10-02T20:36:15Z · SHA-256 of the PDF as received `56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6`
  `PAUSED is read at exactly nine sites, and none of them gates ReconcileLedgers, DistributeLosses, Sync, CollectUnbondedAmounts or DistributeRewardsAndFees. The dispatcher checks the flag only for Deposit, Redeem, WithdrawUnbonded and WithdrawUnbondedById.`

## A-valdora-audited-repos
**UNVERIFIED** · audits/oak

Public README or schema/\*.json for the audited Valdora repositories (Liquid-Zig/new-stzig-contracts, Liquid-Zig/vault-contracts-audit).

*How:* All 20 raw.githubusercontent.com URLs tried (main/master README and the audited commit SHAs with README.md, contracts/\*/README.md, schema paths) returned HTTP 404. The repositories appear not to be public. The GitHub API is gated for this session.

- <https://raw.githubusercontent.com/Liquid-Zig/new-stzig-contracts/5fd9d3bf7a97daee3630e5487f6a6384013f3e21/README.md> · read 2026-10-02T20:37:42Z · SHA-256 of the file as received `d71121daebd3acb6715e039ff7ea2ac3ae43eb49856e37e9311d28db85881209`
  `404: Not Found`
