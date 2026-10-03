# Evidence register (a) Native staking on ZIGChain

Part of [EVIDENCE_2026-10.md](../EVIDENCE_2026-10.md), which explains the labels, lists the pages that could not be read and gives the second check (F01–F24). Read on 2026-10-02 (UTC). Chain parameters from the official LCDs listed in ZIGChain/networks, and what docs.zigchain.com says.

## A-zig-networks-lcd-listed
**VERIFIED** · native-staking/endpoints

The official ZIGChain/networks repo lists https://testnet-api.zigchain.com/ in zig-test-2/api-nodes.txt and https://api.zigchain.com in zigchain-1/api-nodes.txt (alongside Numia, Polkachu, NodeStake; mainnet also StakeAndRelax).

*How:* Read both raw api-nodes.txt files today (HTTP 200).

- <https://raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/api-nodes.txt> · read 2026-10-02T20:26:38Z · SHA-256 of the file as received `356a0597723611434232036e5328efa98d4b90953afd107a0d974dd6a26fb259`
  `https://testnet-api.zigchain.com/`
- <https://raw.githubusercontent.com/ZIGChain/networks/main/zigchain-1/api-nodes.txt> · read 2026-10-02T20:26:38Z · SHA-256 of the file as received `b3e13dbedc00550c901d5caad5c475b4910cf3acdb0d8516ef1702a4a14b7a30`
  `https://api.zigchain.com`

## A-zig-node-info
**VERIFIED** · native-staking/chain

Testnet LCD node_info reports network 'zig-test-2' with application zigchaind version v5.1.0 (block 8045179); mainnet LCD reports network 'zigchain-1' with zigchaind v5.1.2 (block 12610044).

*How:* Official LCD GET today; quotes are compact JSON of the response body.

- <https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info> · read 2026-10-02T20:26:52Z · height 8045179 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_cosmos_base_tendermint_v1beta1_node_info`
  `"network":"zig-test-2" ... "name":"zigchain","app_name":"zigchaind","version":"v5.1.0"`
- <https://api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info> · read 2026-10-02T20:26:53Z · height 12610044 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_cosmos_base_tendermint_v1beta1_node_info`
  `"network":"zigchain-1" ... "name":"zigchain","app_name":"zigchaind","version":"v5.1.2"`

## A-zig-staking-params
**VERIFIED** · checked again in [F01](../EVIDENCE_2026-10.md#f01) (CONFIRMED) · native-staking/params

On both networks /cosmos/staking/v1beta1/params returns identical values: bond_denom 'azig', unbonding_time '1814400s', max_validators 14, max_entries 7, historical_entries 10000, min_commission_rate '0.000000000000000000'.

*How:* Official LCD GET today on both networks (testnet block 8045179, mainnet block 12610044).

- <https://testnet-api.zigchain.com/cosmos/staking/v1beta1/params> · read 2026-10-02T20:26:54Z · height 8045179 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_cosmos_staking_v1beta1_params`
  `{"params":{"unbonding_time":"1814400s","max_validators":14,"max_entries":7,"historical_entries":10000,"bond_denom":"azig","min_commission_rate":"0.000000000000000000"}}`
- <https://api.zigchain.com/cosmos/staking/v1beta1/params> · read 2026-10-02T20:26:54Z · height 12610044 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_cosmos_staking_v1beta1_params`
  `{"params":{"unbonding_time":"1814400s","max_validators":14,"max_entries":7,"historical_entries":10000,"bond_denom":"azig","min_commission_rate":"0.000000000000000000"}}`

## A-zig-slashing-params
**VERIFIED** · checked again in [F01](../EVIDENCE_2026-10.md#f01) (CONFIRMED) · native-staking/params

On both networks /cosmos/slashing/v1beta1/params returns signed_blocks_window '35000', min_signed_per_window '0.800000000000000000', downtime_jail_duration '600s', slash_fraction_double_sign '0.000500000000000000', slash_fraction_downtime '0.000100000000000000'.

*How:* Official LCD GET today; testnet and mainnet bodies identical.

- <https://api.zigchain.com/cosmos/slashing/v1beta1/params> · read 2026-10-02T20:26:55Z · height 12610044 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_cosmos_slashing_v1beta1_params`
  `{"params":{"signed_blocks_window":"35000","min_signed_per_window":"0.800000000000000000","downtime_jail_duration":"600s","slash_fraction_double_sign":"0.000500000000000000","slash_fraction_downtime":"0.000100000000000000"}}`
- <https://testnet-api.zigchain.com/cosmos/slashing/v1beta1/params> · read 2026-10-02T20:26:55Z · height 8045180 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_cosmos_slashing_v1beta1_params`
  `"slash_fraction_double_sign":"0.000500000000000000","slash_fraction_downtime":"0.000100000000000000"`

## A-zig-distribution-params
**VERIFIED** · checked again in [F01](../EVIDENCE_2026-10.md#f01) (CONFIRMED) · native-staking/params

On both networks /cosmos/distribution/v1beta1/params returns community_tax '0.020000000000000000', base_proposer_reward '0', bonus_proposer_reward '0', withdraw_addr_enabled true.

*How:* Official LCD GET today; testnet and mainnet bodies identical.

- <https://api.zigchain.com/cosmos/distribution/v1beta1/params> · read 2026-10-02T20:26:57Z · height 12610045 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_cosmos_distribution_v1beta1_params`
  `{"params":{"community_tax":"0.020000000000000000","base_proposer_reward":"0.000000000000000000","bonus_proposer_reward":"0.000000000000000000","withdraw_addr_enabled":true}}`
- <https://testnet-api.zigchain.com/cosmos/distribution/v1beta1/params> · read 2026-10-02T20:26:56Z · height 8045180 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_cosmos_distribution_v1beta1_params`
  `"community_tax":"0.020000000000000000"`

## A-zig-azig-metadata
**VERIFIED** · checked again in [F03](../EVIDENCE_2026-10.md#f03) (CONFIRMED) · native-staking/denom

Bank denom metadata for the bond denom 'azig' (both networks): base 'azig' exponent 0, display 'zig' exponent 18, symbol 'ZIG', description 'The native staking and gas token of ZIGChain (18-decimal base denom azig).'

*How:* Official LCD GET today on both networks; bodies identical.

- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/azig> · read 2026-10-02T20:27:03Z · height 12610047 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_denoms_metadata_azig`
  `"description":"The native staking and gas token of ZIGChain (18-decimal base denom azig).","denom_units":[{"denom":"azig","exponent":0,"aliases":[]},{"denom":"zig","exponent":18,"aliases":[]}]`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/azig> · read 2026-10-02T20:27:02Z · height 8045181 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_denoms_metadata_azig`
  `{"denom":"zig","exponent":18,"aliases":[]}],"base":"azig","display":"zig","name":"ZIG","symbol":"ZIG"`

## A-zig-uzig-legacy
**VERIFIED** · checked again in [F03](../EVIDENCE_2026-10.md#f03) (CONFIRMED) · native-staking/denom

Bank metadata for 'uzig' on both networks describes it as 'Legacy 6-decimal ZIGChain base denom, retained only as IBC escrow backing after the v5 redenomination.' Bank supply of uzig was still non-zero today (mainnet 136936694446; testnet 1085969753).

*How:* Official LCD GET today (metadata 20:27Z; supply 20:57Z).

> Second check (F03): the uzig metadata has no unit with exponent 6 (only uzig at 0 and mzig at 3, display uzig); "6-decimal" comes only from its description text.

- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/uzig> · read 2026-10-02T20:27:04Z · height 12610047 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_denoms_metadata_uzig`
  `"description":"Legacy 6-decimal ZIGChain base denom, retained only as IBC escrow backing after the v5 redenomination."`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=uzig> · read 2026-10-02T20:57:53Z · height 12610629 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_supply_uzig`
  `{"amount":{"denom":"uzig","amount":"136936694446"}}`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=uzig> · read 2026-10-02T20:57:54Z · height 8045511 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_supply_uzig`
  `{"amount":{"denom":"uzig","amount":"1085969753"}}`

## A-zig-v5-upgrade-heights
**VERIFIED** · checked again in [F02](../EVIDENCE_2026-10.md#f02) (CONFIRMED) · native-staking/chain

Upgrade plan 'v5' was applied at testnet height 7669200 (block time 2026-09-08T09:10:49.599297395Z) and mainnet height 12549000 (block time 2026-09-30T09:45:17.367173229Z).

*How:* Official LCD GET today of /cosmos/upgrade/v1beta1/applied_plan/v5 and of the block headers at those heights.

> Second check (F02): the times are truncated to the second, not rounded. The height recorded for a block read is the node head at the time of the read, not the block requested.

- <https://api.zigchain.com/cosmos/upgrade/v1beta1/applied_plan/v5> · read 2026-10-02T20:36:01Z · height 12610216 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_upgrade_applied_plan_v5`
  `{"height":"12549000"}`
- <https://testnet-api.zigchain.com/cosmos/upgrade/v1beta1/applied_plan/v5> · read 2026-10-02T20:36:00Z · height 8045277 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_upgrade_applied_plan_v5`
  `{"height":"7669200"}`
- <https://api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/12549000> · read 2026-10-02T20:36:02Z · height 12610217 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_block_12549000`
  `"time":"2026-09-30T09:45:17.367173229Z"`
- <https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/7669200> · read 2026-10-02T20:36:01Z · height 8045277 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/testnet_block_7669200`
  `"time":"2026-09-08T09:10:49.599297395Z"`

## A-zig-docs-redenomination
**VERIFIED** · native-staking/docs

docs.zigchain.com states v5 changes the base unit from uzig (6 decimals) to azig (18 decimals) at 1 uzig = 10^12 azig, that balances, delegations and unbonding entries rescale automatically at the upgrade height, and that staked/unbonding positions keep the same ZIG value. The page does not state the upgrade date or height.

*How:* Read via WebFetch today (two reads, consistent wording).

- <https://docs.zigchain.com/about-zigchain/redenomination> · read 2026-10-02T20:58:36Z · read through WebFetch, a processed view of the page (not a byte copy)
  `ZIGChain v5 changes the native base unit from uzig (6 decimals) to azig (18 decimals) at 1 uzig = 10¹² azig. One ZIG remains one ZIG. Balances rescale automatically at the upgrade height.`
- <https://docs.zigchain.com/about-zigchain/redenomination> · read 2026-10-02T20:58:36Z · read through WebFetch, a processed view of the page (not a byte copy)
  `The chain rescales your balance, delegations, and unbonding entries at the upgrade height.`

## A-zig-docs-unbonding
**VERIFIED** · native-staking/docs

docs.zigchain.com states unstaking (undelegation) has a 21-day unbonding period during which tokens stay locked and cannot be sent or traded; on ZIGChain Hub they appear under 'Unstaking' until they return to the spendable balance.

*How:* Read via WebFetch today (users/staking 'Last updated Sep 28, 2026'; users/hub/staking).

- <https://docs.zigchain.com/users/staking/> · read 2026-10-02T20:58:52Z · read through WebFetch, a processed view of the page (not a byte copy)
  `When you unstake (undelegate) ZIG Tokens during ZIGChain staking, a 21-day unbonding period applies before those tokens are available to withdraw.`
- <https://docs.zigchain.com/users/staking/> · read 2026-10-02T20:28:00Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Until the period ends, those tokens stay locked and cannot be sent or traded.`
- <https://docs.zigchain.com/users/hub/staking> · read 2026-10-02T20:59:02Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Unbonding period: The mandatory 21-day wait after you unstake before tokens return to your spendable wallet balance; during this time tokens appear under Unstaking on the Hub.`

## A-zig-docs-rewards
**VERIFIED** · native-staking/docs

docs.zigchain.com states rewards stop as soon as undelegation begins. Rewards accumulate automatically and can be claimed at any time (Claim All or per validator), and pending rewards from a validator are claimed automatically when the user stakes or unstakes with that validator.

*How:* Read via WebFetch today (delegators_faq 'Last updated Sep 28, 2026', read three times with the same wording for the quoted sentence; users/hub/staking).

- <https://docs.zigchain.com/users/governance/delegators_faq> · read 2026-10-02T20:59:25Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Rewards stop as soon as undelegation begins.`
- <https://docs.zigchain.com/users/hub/staking> · read 2026-10-02T20:59:02Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Rewards accumulate automatically and can be claimed at any time from the Staking page or per validator.`
- <https://docs.zigchain.com/users/hub/staking> · read 2026-10-02T20:59:02Z · read through WebFetch, a processed view of the page (not a byte copy)
  `If you have unclaimed rewards from a validator and you stake or unstake tokens with that same validator, your rewards will be automatically claimed first.`

## A-zig-docs-redelegation
**VERIFIED** · native-staking/docs

docs.zigchain.com states up to 7 redelegations between the same validator pair within a 21-day window, and tokens stay bonded and keep accruing rewards during redelegation. This is consistent with the on-chain max_entries 7.

*How:* Read via WebFetch today (two reads, same wording for the quoted sentences; page 'Last updated Aug 19, 2026').

- <https://docs.zigchain.com/users/staking/staking-redelegation> · read 2026-10-02T20:59:39Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Each wallet can perform up to 7 redelegations between the same pair of validators within a 21-day window.`
- <https://docs.zigchain.com/users/staking/staking-redelegation> · read 2026-10-02T20:59:39Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Tokens stay bonded and keep earning rewards during the move`

## A-zig-slashing-docs-vs-chain
**VERIFIED** · native-staking/discrepancy

docs.zigchain.com says double-signing 'results in a 5% slash' and downtime is '(0.01%)'. The on-chain slashing params return slash_fraction_double_sign '0.000500000000000000' and slash_fraction_downtime '0.000100000000000000'. The downtime figures agree; the documented double-sign figure does not match the on-chain parameter.

*How:* Both values read today; the comparison is literal.

- <https://docs.zigchain.com/users/staking/> · read 2026-10-02T20:58:52Z · read through WebFetch, a processed view of the page (not a byte copy)
  `This type of violation is considered highly detrimental to network integrity and results in a 5% slash on staked tokens, along with the validator's removal from the active set.`
- <https://api.zigchain.com/cosmos/slashing/v1beta1/params> · read 2026-10-02T20:26:55Z · height 12610044 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/a/lcd/mainnet_cosmos_slashing_v1beta1_params`
  `"slash_fraction_double_sign":"0.000500000000000000","slash_fraction_downtime":"0.000100000000000000"`

## A-zig-docs-reward-terms
**VERIFIED** · native-staking/docs

The docs.zigchain.com page titled 'Staking APR' defines community tax as a portion of staking rewards for development/governance and validator commission as the share validators keep before paying delegators (rate figures deliberately not recorded).

*How:* Read via WebFetch today (page 'Last updated Sep 28, 2026'); rate numbers omitted on purpose.

- <https://docs.zigchain.com/users/staking/staking-apr> · read 2026-10-02T20:54:11Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Percentage of staking rewards the validator keeps before paying delegators.`
- <https://docs.zigchain.com/users/staking/staking-apr> · read 2026-10-02T20:54:11Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Portion of staking rewards for network development and governance.`

## C-zig-official-lcds
**VERIFIED** · ZIGChain official endpoints

ZIGChain/networks lists https://api.zigchain.com as a zigchain-1 API node and https://testnet-api.zigchain.com/ as a zig-test-2 API node; node_info returned network zigchain-1 (app v5.1.2, x-cosmos-block-height 12610829) and zig-test-2 (v5.1.0, height 8045624).

*How:* Read raw api-nodes.txt files and queried node_info on both LCDs.

- <https://raw.githubusercontent.com/ZIGChain/networks/main/zigchain-1/api-nodes.txt> · read 2026-10-02T21:07:13Z · SHA-256 of the file as received `b3e13dbedc00550c901d5caad5c475b4910cf3acdb0d8516ef1702a4a14b7a30`
  `https://api.zigchain.com`
- <https://raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/api-nodes.txt> · read 2026-10-02T21:07:13Z · SHA-256 of the file as received `356a0597723611434232036e5328efa98d4b90953afd107a0d974dd6a26fb259`
  `https://testnet-api.zigchain.com/`
- <https://api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info> · read 2026-10-02T21:08:29Z · height 12610829 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/c/main_node_info`
  `"network":"zigchain-1"`
- <https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info> · read 2026-10-02T21:08:30Z · height 8045624 · kept in [evidence/zigchain-staking.json](zigchain-staking.json) as `research/c/test_node_info`
  `"network":"zig-test-2"`
