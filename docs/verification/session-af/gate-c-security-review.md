# Session AF Gate C — security review (G12, review 1 of 3)

Mon 19 Oct 2026, 19:10–19:31 Brussels. One fresh, read-only reviewer (no file written, no build, no browser, no network,
no test run) over the frozen head `196fa934` (`origin/main..HEAD`, 213 commits, all 74 `TIER 3` commits), with extra depth
on wallet/signing, CSP, egress routes and privacy. Decisions: ADR-028 H133.

Evidence label: code review (not a penetration test). Keplr's own behaviour with `preferNoSetFee` and with Ledger was
taken from the code and Keplr's docs, not exercised; no real wallet was used (N12).

**Verdict:** no critical or high finding. The signing path holds: nothing signs or broadcasts without the person's own
press on the review screen, and ZIGi cannot reach signing.

## Findings and what happened to them

| Id | Severity | Area | Finding | Outcome |
|---|---|---|---|---|
| S1 | medium | wallet/signing | The staking form could carry a validator the picker never offers (remembered from before, pre-filled by ZIGi, carried over from another tab) into a delegate or redelegate; the review showed no status | Fixed `d6a09eca`: only an active validator (bonded, not jailed) can be staked with or moved to; one that is not active is unchosen with a note and Review refuses it; a tab switch clears the choices; the review shows status and commission. `staking-validator-guard-af.spec.ts` |
| S2 | low | ZIGi / labels | ZIGi's card promised a real-network confirm the form skipped once confirmed on the device | Fixed `d6a09eca`: a pre-fill never switches the network by itself; the form offers the switch (the first-time confirm still applies) and the card says so |
| S3 | low | privacy (ZIGi) | With the Health gate closed, a Health section without a Health word in its title could reach the page view | Fixed `6563cb19`: on the Health page with the gate closed no card is shared at all |
| S4 | low | privacy | A linked ZIGChain wallet is also read on Cosmos Hub at PublicNode, which can rewrite that address into the ZIGChain one; PRIVACY did not say so | Fixed `0441cd7d`: PRIVACY names the read and what PublicNode can see (H16's privacy shape otherwise unchanged) |
| S5 | low | guard coverage | The app-wide signer guard did not name Keplr's sendTx/signArbitrary/signEthereum/experimental signing, EVM personal_sign/eth_sign/typed data or Solana's sign features | Fixed `d6a09eca`: `staking-guard.test.ts` names them all; no file outside the two signers contains any |
| S6 | low | privacy (on-chain) | A practice badge's memo prefix marks the address as a ZIGoals user, and with Keplr the practice address is the real-network one; the review did not say so | Fixed `d6a09eca`, `0441cd7d`: the review and the threat model say both; a prefix-free memo is a later option (ADR-028) |
| S7 | low | egress / availability | The chain relays counted clients by the raw connecting address (an IPv6 /128) | Fixed `83ca5838`: grouped by IPv4 address or IPv6 /48, as Earn and Ramp; `chain-client-group.test.ts` |
| S8 | info | threat model | The threat model named `decoy-guard.ts`, which nothing calls, as the decoy control | Fixed `0441cd7d`: it names the real controls (denom-free builders, `assertStakingMessages`, by-denom balance reads) |
| S9 | info | WalletConnect (dormant) | The read-only namespace accepted any `cosmos_*` method; enabling WalletConnect adds Verify's frame-src entries | Fixed `9807eb91`: exactly `cosmos_getAccounts`; the frame-src entries are an owner decision when the project id is set (STATUS owner items) |
| S10 | info | privacy doc | PRIVACY said the staking wallet lives only in the tab; its address and positions are kept in the synced (encrypted) finance record | Fixed `0441cd7d`: PRIVACY says so (ADR-028 H63) |
| S11 | info | wallet/signing (UX race) | A pre-fill arriving while a quote was read could leave the page and the review on different networks | Fixed `d6a09eca`: a review read while the form changed is dropped |

## Checked and found sound (the reviewer's coverage)
- **Wallet/signing:** one signer path (a ticket only for a sealed quote, only on the review form's trusted submit and a
  trusted click on the same button within 1 s, used once, 60 s life; `staking-guard.test.ts` pins every caller);
  `assertNativeStakingAllowed` at the ticket, after redemption, at the signature and at the broadcast; the message
  allowlist (the four staking messages, claim, MsgVote v1beta1, MsgRevoke for direct signers; a bank send only as the
  zig-test-2 practice badge); network checks at connect, quote and execute; the signed body compared byte for byte with
  the reviewed messages and memo; the receipt checked by hash, body and each message's event; fee = ceil(simulated gas ×
  1.3) × 2.5 Gazig; ZIGi's pre-fill never automatic, plain fields only, read once, ≤ 10 minutes old (`zigi-guard.test.ts`);
  EVM `eth_requestAccounts` and Solana connect/disconnect only (`wallet-guard.test.ts`); WalletConnect dormant.
- **CSP:** `csp-compose.mjs`, the security policy, middleware, `next.config` and the wrangler headers unchanged; exactly
  `https://rpc.zigchain.com` and the nine balance hosts added on `/app`; no wildcard, `http:`, script/style/img/frame
  change; Trusted Types and frame-ancestors untouched (`csp-compose.test.ts`, `hosts.test.ts`, `egress-server-only.test.ts`).
- **Egress routes:** strict query keys, bech32-checked addresses, fixed upstreams, GET only, no credentials, no redirects,
  12–30 s timeouts, 200 kB–2 MB body caps, block-height pinning and chain-id checks; fixed error texts; no-store and
  nosniff; no logging; in-memory caches with time limits and entry caps; the recipe import's resolve-then-check covers the
  private, loopback, link-local, CGNAT, ULA, IPv4-mapped and NAT64 ranges.
- **Privacy:** every new device key device-only, in Export, never synced, erased, never restored
  (`af-lead-registries.test.ts`); on-ramp hand-offs carry public parameters plus a guard-checked address; no referrer;
  share images carry counts only; votes and badges said to be public forever before signing; no secret, key-shaped value
  or mnemonic in the diff; no new innerHTML, eval, `new Function` or `window.open`; every `target=_blank` has
  `rel="noopener noreferrer"`; no text in the repository addressed to an AI.

## Verification of the fix round
Chromium on a production build of the fixed code (:3101): `staking-validator-guard-af` 8/8; `staking-sign`,
`staking-errors`, `staking-real-confirm`, `staking-page`, `attestation`, `governance`, `governance-vote`,
`zigi-earn-coach-af`, `goal-vaults`, `earn-hub`, `wallet-tracking`, `zigi-page-awareness-af` 85 passed, 1 skipped by design.
Unit: `lib/wallets`, `lib/staking`, `lib/ai/actions`, `lib/ai/context`, the relay tests — 456 + 67 + 25 passed. The full
suite and CI run on the final head.
