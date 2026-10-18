# Lane L2a — chain + signing (Session AF, ADR-028)

Branch `af/signing` from `feature/session-af-wealth-unlocked` (`59e44be9`). Worktree `agent-ae398341cbdb51770`, server port 3102.
This file is the lane's running record for the lead: what is done, what the lead must wire into shared registries, and every
assertion that changed (with the reason). Updated with every step's commit.

## Status by step (brief order)
| # | Step | State | Commit |
|---|---|---|---|
| 1 | chain-config `mainnet.json` + `networks.ts`; zigchain-1 explorer entries | done | see git log |

## Facts read live for this lane (one GET each, 2026-10-18)
- 20:52 UTC `https://api.zigchain.com` node_info: network `zigchain-1`, application_version `v5.1.2` on both nodes
  (zrpc01-mainnet, zrpc02-mainnet; six reads), cosmos_sdk v0.53.8, CometBFT 0.38.25; staking params bond_denom `azig`,
  unbonding_time `1814400s`, max_entries 7; bank metadata base `azig`, display `zig` at exponent 18; node config minimum gas
  `2500000000azig` (testnet identical, testnet node_info `v5.1.2`). `REVIEWED_VERSIONS.real = ['v5.1.2']`.
- `https://rpc.zigchain.com`: `/status` network `zigchain-1`, 0.38.25; `abci_info` version `v5.1.2`; CORS `*` on GET and on
  an OPTIONS preflight for POST + content-type (204); `tx_search` by height answers (the signer's confirmation path).
- 20:55 UTC explorer probes (GET, all 200 text/html): `https://zigscan.org/tx/719C2171…7E93`, `/address/zig1akyvf3r…lpc2`,
  `/validators/zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl`, `https://app.range.org/tx/zigchain/719C2171…7E93`,
  `https://app.range.org/address/zigchain/zig1akyvf3r…lpc2`; testnet `https://testnet.zigscan.org/validators/zigvaloper1pwwy…rwk`.

## Decisions taken inside the brief (for the lead / ADR-028)
- `packages/chain-config` gains a subpath export `@zigoals/chain-config/networks` (as ecosystem-registry does) instead of a
  re-export from index.ts: networks.ts imports `TESTNET` from index.ts, so a re-export would be a circular import.
- The browser never reaches `api.zigchain.com` (H16): `verifyNetworkFor` (REST) serves server code, scripts and the practice
  network; the signing path checks the same evidence (`assertNetworkEvidence`) over the RPC it signs through.
- Mainnet explorers are a separate list (`mainnetExplorers`) so the Ecosystem page's "Open … testnet ↗" buttons
  (`explorers`, asserted by ecosystem.spec and human-x J168) stay exactly as they are; `buildExplorerUrl` and the new
  `explorerLinksFor` search both lists. New explorer kind `validator` (zigscan only; Range has no validator route).

## What the lead must wire (shared registries)
- (filled per step)

## Assertions changed
- none so far
