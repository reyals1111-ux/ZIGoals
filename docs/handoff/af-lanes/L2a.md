# Lane L2a — chain + signing (Session AF, ADR-028)

Branch `af/signing` from `feature/session-af-wealth-unlocked` (`59e44be9`). Worktree `agent-ae398341cbdb51770`, server port 3102.
This file is the lane's running record for the lead: what is done, what the lead must wire into shared registries, and every
assertion that changed (with the reason). Updated with every step's commit.

## Status by step (brief order)
| # | Step | State | Commit |
|---|---|---|---|
| 1 | chain-config `mainnet.json` + `networks.ts`; zigchain-1 explorer entries | done | `14f0d9a7` |
| 2 | `zigoals:staking-prefs:v1` + `zigoals:staking-journal:v1` (loose v1 records, readers keep unknown fields) | done | `5c459ca8` |
| 4 | `NATIVE_STAKING_SIGNING_ALLOWED` + `assertNativeStakingAllowed(messages)` (committed before 3: the signer starts with it) | done | see git log |
| 3 | `lib/staking/` pipeline + `lib/wallets/keplr-session.ts` + `staking-guard.test.ts`; `wallet-guard.test.ts` re-scoped | done | `TIER 3 (wallet/signing): … Part 3` |
| 5a | `apps/web/lib/chain/validators-wire.ts` (the wire schema L1 consumes), committed first | done | `TIER 3 (egress routes): … Part 5a` |
| 5 | `/api/positions` mainnet on public builds + `minHeight` + stZIG; `GET /api/chain/validators` | done | `TIER 3 (egress routes): … Part 5` |

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

- **H4's file name.** ADR-028 H4 names the one signer `lib/wallet/sign.ts` / `signFromReview()`; the brief and the L2 design
  name it `lib/staking/execute.ts` / `executeSigned()` behind `issueSignTicket()`. Built as the brief says; every property
  H4 asks for holds (one signer file beside the blocked contract path, reachable only from the review screen's submit
  handler, the type-URL allowlist, `signAndBroadcast`/`sendTransaction`/`eth_sendTransaction`/`signTransaction` forbidden
  elsewhere, no import from `components/ai` or `lib/ai`). The lead may rename the H4 row's file names.
- **No signer before the Sign press.** The quote simulates through CosmJS's read-only `StargateClient` with the account's
  public key from `getKey` (`tx.simulate(messages, '', pubkey, sequence)`), so `getOfflineSignerAuto` is called only inside
  `executeSigned` (after the trusted submit). This is stricter than the L2 design (whose quote held a signer for simulate):
  the signer-using files are two (`lib/staking/execute.ts`, `lib/wallet.ts`), not three.
- **The reviewed fee is the signed fee.** `getOfflineSignerAuto(chainId, {preferNoSetFee: true})` (Keplr's sign option) so
  Keplr does not replace the 2.5 Gazig quote with its 25 Gazig "average"; the person can still raise it in Keplr, and the
  review says so. The signed bytes are checked against the reviewed messages before broadcast (a wallet that changed a
  message is refused) and again in the receipt; the fee is not compared (H61).
- **A node's CheckTx refusal is a certain failure.** CosmJS's `BroadcastTxError` (insufficient fee 13, sequence 32,
  insufficient funds 5) means the transaction never entered a block: the journal says FAILED with the code and the screen
  says nothing moved, instead of lib/transaction.ts's generic "may have moved" (which still applies to a lost connection).

- **stZIG in the platform record.** The relay adds an stZIG position (`providerId 'native-zig'`, `sourceType
  'LIQUID_STAKING'`, `asset 'stZIG'`, 6 decimals, id `<chain>:<address>:stzig`) only when the address holds some; its value
  is never converted (Wealth reads it as "unavailable" until H44's two-source rate exists). The Staking page's ZIG totals
  now count `asset === 'ZIG'` only. Mainnet stZIG metadata read live 2026-10-18 (display stZIG at exponent 6).
- **`/api/chain/validators`** reads, per network, at one block: the paged validator list, signing infos (`zigvalcons` =
  SHA-256 of the ed25519 consensus key, first 20 bytes), slashing params (window 35,000), the staking pool, and each
  validator's self-delegation (eight at a time; the chain's 404 code 5 = "0"). Checked live once on 2026-10-18 21:30 UTC:
  19 mainnet / 39 testnet validators answered the wire schema. Sorted by name, never by rate. Errors: 400 bad query, 429
  too many reads, otherwise 200 (`status: 'unavailable'` with a reason, H58).

## What the lead must wire (shared registries)
### Storage keys (step 2; names in `apps/web/lib/af-signing-keys.ts`, a module with no imports)
| Registry | Row to add |
|---|---|
| `lib/onboarding.ts` `DEVICE_RECORD_KEYS` (personal: a device holding it is not new) | `STAKING_JOURNAL_KEY` (`zigoals:staking-journal:v1`) |
| `lib/onboarding.ts` `NON_PERSONAL_KEYS` | `STAKING_PREFS_KEY` (`zigoals:staking-prefs:v1`); `onboarding.test.ts` pins the literals |
| `lib/export/everything.ts` `DEVICE_KEYS` (Export everything) | `stakingJournal: STAKING_JOURNAL_KEY`, `stakingPrefs: STAKING_PREFS_KEY` |
| `lib/data-health/catalog.ts` `DEVICE_LABELS` | `stakingJournal: ['Staking and vote transactions', 'Wallet']`, `stakingPrefs: ['Staking choices: practice or real', 'Wallet']` |
| `lib/aa-device-forget.ts` erase list | both keys (the journal is personal; the prefs hold the first-real confirm, which the account's erase resets) |
| `lib/vault/frozen-fixtures.test.ts` records + checks + the equality assertion | `records[STAKING_PREFS_KEY] = JSON.stringify({version: 1, network: 'real', realConfirmedAt: '2026-10-18T21:00:00.000Z', lastValidator: {'zigchain-1': 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl'}})`, check `{key: STAKING_PREFS_KEY, module: './staking/prefs', spec: 'STAKING_PREFS', expect: {network: 'real'}}`; `records[STAKING_JOURNAL_KEY] = JSON.stringify({version: 1, entries: [{operationId: '00000000-0000-4000-8000-000000000001', chainId: 'zig-test-2', wallet: 'zig1qvpsxqcrqvpsxqcrqvpsxqcrqvpsxqcrrdrgwr' /* toBech32('zig', 20 × 0x03), fictional */, action: 'delegate', validator: 'zigvaloper18vykgjgcmp2z4xzkt6mh74glrpd7qda8fqldrl', amount: '25000000000000000000', state: 'CONFIRMED', hash: 'AB'.repeat(32), height: '8290600', code: 0, at: '2026-10-18T21:00:00.000Z'}]})`, check `{key: STAKING_JOURNAL_KEY, module: './staking/journal', spec: 'STAKING_JOURNAL', expect: {version: 1}}`. Both modules import only zod, device-record.ts, af-signing-keys.ts (and the prefs `@cosmjs/encoding` via staking/address.ts) |
| sync guard | nothing to add: `lib/staking/storage.test.ts` fails if any sync module, extras section or Worker names a staking key (the frozen-fixture test excepted) |
| Showcase | nothing: the staking actions refuse in the Showcase ("Exit the Showcase to stake") and write nothing |
| sessionStorage hand-offs (not records, never exported) | `WALLET_SESSION_KEY` `zigoals:wallet-session:v1`, `STAKING_PREFILL_KEY` `zigoals:ai:staking-prefill:v1` — PRIVACY.md "tab-only" sentence |

## Assertions changed
- `apps/web/lib/wallet-guard.test.ts`, third test ("the only signer stays in lib/wallet.ts's blocked execute path"): the
  files that may name `getOfflineSigner` go from `['lib/wallet.ts']` to `['lib/staking/execute.ts', 'lib/wallet.ts']`
  (ADR-028 H4, the owner's rule change for native-staking signing). Equal or greater strength: lib/wallet.ts's checks are
  unchanged; the new file's only calling function must be `executeSigned`, whose first statement must be
  `assertNativeStakingAllowed(ticket.messages);`; `lib/wallets/keplr-session.ts` is added to the FORBIDDEN-shape check; and
  `lib/staking/staking-guard.test.ts` adds the stricter gate (signer shapes in exactly those two files, each signer call once,
  the review sheet's onSubmit as the only door, ZIGi's code never importing the pipeline, the type-URL allowlist).
- `apps/web/lib/server/positions-relay.test.ts`, "the public builds refuse mainnet with a plain sentence and read nothing":
  replaced by "every build reads mainnet through the relay, GET only, to api.zigchain.com only; the query stays strict"
  (ADR-028 H16, owner amendment 6 lifted Session Z-Cloud's C4). The refusal it pinned no longer exists by the owner's
  decision; the new test pins what the read may do (only GET, only the official mainnet LCD, every build), the strict query
  including the new `minHeight` (0, letters, 21 digits, a repeat → 400) and a 502 on upstream failure. A new test pins the
  `minHeight` cache rule (a lower kept block is re-read and counts toward the 10/min limit).
- Fixtures only (no assertion changed): `lib/native-positions.test.ts`, `lib/mainnet-denomination.test.ts`,
  `lib/positions-route.test.ts` and `lib/server/positions-relay.test.ts` answer the new stZIG `by_denom` read with a zero
  stZIG balance, so every existing quantity list and count is unchanged (the relay's "≤ 10 upstream calls" bound now
  measures 10, at its limit).
