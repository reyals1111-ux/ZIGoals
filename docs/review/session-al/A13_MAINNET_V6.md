# A13: mainnet v6 day check (Session AL, lane L9)

**Result: zigchain-1 runs `zigchaind` v6.0.0, past proposal #45's upgrade height.** Read from this cloud sandbox on
**2026-11-04 at 21:31 UTC** (the requests ran 21:31:14–21:31:30 UTC), read-only GETs, no key.

| What | Value |
|---|---|
| Endpoint | `https://api.zigchain.com` (the official mainnet LCD, `packages/chain-config/src/mainnet.json` `restUrl`) |
| `application_version.version` | **v6.0.0** (`git_commit` `81af3b281338487d1c6e17993754f45f9fd974db`, Cosmos SDK v0.53.8) |
| Latest height | **13,507,180** (block time 2026-11-04T21:31:10Z) |
| Proposal #45 upgrade height | 13,466,800 (plan `v6`; status `PROPOSAL_STATUS_PASSED`, voting ended 2026-11-02T10:48:30Z, no "no" or veto votes) |
| Latest − upgrade height | **+40,380 blocks**: the upgrade height is behind the chain, and the node answers v6.0.0 |
| v6 base fee (`/cosmos/evm/feemarket/v1/base_fee`, `BASE_FEE_REST_PATH`) | `{"base_fee":"2500000000.000000000000000000"}`: 2.5 Gazig per gas, the reviewed floor; HTTP 200 |

What this means for the app (no change made here): `REVIEWED_MINORS["zigchain-1"]` already lists v5.1 and v6.0
(`packages/chain-config/src/reviewed-versions.ts`, Session AJ), so the mainnet reader and staking accept v6.0.0, and the
v6 fee path (the base-fee read) now applies on mainnet too. The path `/cosmos/feemarket/v1/base_fee` (without `evm/`)
answers 501 "Not Implemented"; the app uses the `evm/` path, which answers.

## Raw excerpts
`GET https://api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info` (HTTP 200, 33,005 bytes; `build_deps` left out):
```json
{
  "default_node_info": {
    "network": "zigchain-1",
    "version": "0.38.25",
    "moniker": "zrpc02-mainnet"
  },
  "application_version": {
    "name": "zigchain",
    "app_name": "zigchaind",
    "version": "v6.0.0",
    "git_commit": "81af3b281338487d1c6e17993754f45f9fd974db",
    "build_tags": "muslc,ledger",
    "go_version": "go version go1.26.9 linux/amd64",
    "cosmos_sdk_version": "v0.53.8"
  }
}
```
`GET https://api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/latest` (HTTP 200; header fields only):
```json
{"block": {"header": {"chain_id": "zigchain-1", "height": "13507180", "time": "2026-11-04T21:31:10.501831297Z"}}}
```
`GET https://api.zigchain.com/cosmos/gov/v1/proposals/45` (HTTP 200; fields only):
```json
{"id": "45", "status": "PROPOSAL_STATUS_PASSED", "title": "Software Upgrade to v6",
 "summary": "Upgrade to v6 at height 13466800 (~Tue 2026-11-03 09:30 UTC): EVM enabled alongside CosmWasm, with Ethereum JSON-RPC and EIP-1559 fees.",
 "voting_end_time": "2026-11-02T10:48:30.359633102Z",
 "final_tally_result": {"yes_count": "290793932230161026948565883", "abstain_count": "0", "no_count": "0", "no_with_veto_count": "0"},
 "plan": {"name": "v6", "height": "13466800"}}
```

## Owner re-check (any time, read-only)
```sh
curl -sS --max-time 20 https://api.zigchain.com/cosmos/base/tendermint/v1beta1/node_info | jq -r .application_version.version
curl -sS --max-time 20 https://api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/latest | jq -r .block.header.height
curl -sS --max-time 20 https://api.zigchain.com/cosmos/evm/feemarket/v1/base_fee
```
