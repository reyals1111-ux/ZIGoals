# ZIGoals on-chain: what Session AF built (Part 6)

> Session AF, lane L2a chunk 3 (ADR-028 D4, D6, H16, H42, H45, H46, H48, H60; plan rows P6.5–P6.8 and section 8). The
> research behind each item is `R5_ONCHAIN_PURPOSE.md`; Goal Vaults (rank 1) are lane L2b's (`docs/handoff/af-lanes/L2b.md`).
> Every LCD path below was read once live on 2026-10-19 between 00:15 and 00:16 UTC to confirm its shape; the answers
> are recorded verbatim in `apps/web/tests/fixtures/chain/governance-lcd-2026-10-19.json`. Nothing here is advice.

## The rules every item keeps
- **Only the review screen signs.** Every action below opens the one review screen (`components/staking/review-sheet.tsx`);
  its Sign button's own trusted click is the only way to the signer (`lib/staking/execute.ts`). ZIGoals and ZIGi never sign
  or submit; nothing in `lib/ai` or `components/ai` imports the pipeline (`lib/staking/staking-guard.test.ts`).
- **The allowed messages** (`lib/app-environment.ts`): MsgDelegate, MsgUndelegate, MsgBeginRedelegate,
  MsgWithdrawDelegatorReward, gov v1beta1 MsgVote and authz MsgRevoke on both networks (H46); and a bank MsgSend **only**
  as a practice badge on ZIGChain Testnet (below). A staking signature carries no memo.
- **What becomes public is said before the Sign press**, on every review: the address, the validator and amount; for a
  vote "Your vote is public and tied to your address forever"; for a revoke, who had the permission and what ends; for a
  practice badge, the address, the time and the memo, forever.
- **Reads:** address-free data (proposals, validators) and address-bearing reads for display (the person's vote, the
  permissions they gave) go through ZIGoals' own routes, on the relay pattern of `/api/positions` (H16 (a)): strict
  queries, the two official LCDs at one block height, 60 s to 2 minutes of cache, 10 reads a minute per client, no address
  logged, HTTP 200 with `status: 'unavailable'` and a reason when the chain fails (H58). Signing talks to the chain's own
  RPC from the browser, as staking does (H16 (b)).
- **Practice first.** The practice network (zig-test-2, no real value) is the default; the real network asks the
  first-real confirm once (`zigoals:staking-prefs:v1`).

## Governance (rank 2; P6.5, P6.6) — `/app/governance`
- Proposals in plain words from `GET /api/chain/proposals?network=` (the newest 20) and `/api/chain/proposal?network=&id=`:
  state, deadline, what each would change (from the message types it carries — never from the proposer's text, which is
  shown apart, labelled, as plain text), the tally as shares beside the chain's own quorum (0.334), threshold (0.51,
  expedited 0.667) and veto (0.334, deposit burned above it) from `/cosmos/gov/v1/params/tallying`, and for an open vote
  "if voting ended now…" with the turnout against the bonded total. Voting period and deposit from the chain: 4 days and
  10,000 ZIG on mainnet, 10 minutes and 100 ZIG on the practice network (read 2026-10-19).
- Eligibility: stake with a bonded validator on that network (the read-only relay). The person's own vote during voting
  from `GET /api/chain/vote?network=&proposal=&voter=`; "voting again replaces it".
- Vote Yes / No / Abstain / No with veto (gov **v1beta1** MsgVote, which Keplr and a Ledger can sign; nothing preselected).
- The chain removes votes when it counts them (SDK `tally.go`), so this device's staking journal keeps every vote
  ("Your votes from this device", in Export everything).

## Validator health (rank 3; P6.7) — Staking page
- For each validator the person stakes with: tombstoned, jailed, not in the active set, missing blocks (half of the
  misses the chain allows: window 35,000 − floor(35,000 × 0.8) = 7,000), a commission change since this device last
  looked (rate, max change, update time; baselines in `zigoals:validator-alerts:v1`), a change in the last 14 days. From
  `GET /api/chain/validators` (chunk 1). In the app only: no notification. `useValidatorHealth` is exported for Earn.

## Rewards sweep (rank 4; H60) — Staking page and a Goal Vault's one action
- "Put your rewards to work": one MsgDelegate of the rewards waiting with a validator, to that validator. Delegating pays
  those rewards out first (the SDK's delegation hook), so one message restakes them and the liquid balance needs only the
  fee. A Goal Vault with rewards waiting links to it (`/app/staking#rewards-sweep`).

## Grants and allowances (H45) — Staking page
- "Permissions you have given": `GET /api/chain/grants?network=&address=` reads `/cosmos/authz/v1beta1/grants/granter/
  {address}` and `/cosmos/feegrant/v1beta1/issued/{address}`; each in plain words. "Revoke" (authz MsgRevoke) for a
  direct signer only — CosmJS 0.38 has no Ledger (amino) format for authz. Fee allowances are shown, not ended. ZIGoals
  never creates a grant or an allowance (authz auto-compound waits: no REStake operator exists for ZIGChain).

## Practice badges (rank 6; D4, H48) — Staking page, practice network only, opt-in
- Off by default (`zigoals:staking-prefs:v1` `attestations: 'on'` turns them on). A badge is a 1 azig send from the
  address to itself (a zero-amount send is refused by the chain) whose memo holds **only**
  `zigoals:att:v1:c:<64 hex>` — SHA-256 of `zigoals-attestation-v1`, 32 random bytes of salt and the person's note — or
  `zigoals:att:v1:b:<32 hex>`, 16 random bytes. The note and the salt stay in this device's staking journal; a plain hash
  of a name is never written (it would be guessable). The signing gate refuses a send off zig-test-2, to anyone else, of
  any other amount, beside any other message, or with any other memo.
- Read back on request ("Check them on the chain") by `GET /api/chain/attestations?network=zig-test-2&address=`: a
  sender-scoped transaction search on Polkachu's public testnet LCD (`https://zigchain-testnet-api.polkachu.com`), since
  the official LCDs answer 403 to `?query=` (testnet read 2026-10-19 00:15 UTC; mainnet per R5). That server read tells
  Polkachu the testnet address (from ZIGoals' server, never the person's browser), only when the person presses it.
- Mainnet badges wait for the owner's privacy review (H48; ADR-028 "Later options").

## Later options (not built; ADR-028)
Authz auto-compound (no operator), feegrant for newcomers (needs a funded ZIGoals key), memo attestations on mainnet,
habit pacts (a contract), and an in-app MsgTransfer (H49).
