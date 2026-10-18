# Fiat on-ramp options for the staking session (research, Session AE Part 6, 2026-10-17)

> **Research only. Not legal, tax or financial advice.** No provider is endorsed, and nothing here is a promise that
> any route works for a given person. This page contains no affiliate, referral or tracking links. Fees are each
> provider's own published claim, with its source; they are recorded for the owner's decision and are not meant to be
> shown in the app as a comparison or ranking ([EARN_DESIGN.md](EARN_DESIGN.md), principles 4 and 5).

**As of 2026-10-17 (UTC).** Every fact marked with a source tag such as [S1] was read on that day from the provider's,
the chain's or the regulator's own page or API; the list is at the end. **Inference** marks our own reading, which no
source states. **Unverified** marks something we could not read. This page builds on the Session N work of 2026-10-02:
[ONRAMPS_AND_ZIGNALY.md](ONRAMPS_AND_ZIGNALY.md), its evidence register [(e) On-ramps](evidence/e-on-ramps.md),
[(d) Stablecoins and swaps](evidence/d-stablecoins-and-swaps.md) and the
[legal register](evidence/legal-sources.md). Facts taken from there are cited by their item id (for example
[B-moonpay-setup]) and were not re-read unless a tag says so.

## Summary
- **Still no on-ramp delivers native ZIG on ZIGChain, or any stablecoin on ZIGChain.** Re-read today: the asset lists
  of MoonPay, Transak, Ramp, Mercuryo and Banxa have no ZIG and no ZIGChain network [S4][S8][S12][S16][S21]. Guardarian
  still sells ZIG only as the Ethereum ERC-20 `0xb261…4f01` [S23]. Coinbase's public asset list has no ZIG [S25].
- **Native ZIG can be reached, but only in two to four steps.** The ways are: withdrawing from an exchange that supports
  ZIGChain withdrawals; buying ATOM, sending it over IBC and swapping it on OroSwap; buying ERC-20 ZIG and bridging it
  with the ZIGChain Hub. A USDC route through Noble and a USDT route also exist. Noble is being wound down and the USDT
  pool is tiny, so neither is worth building on. Skip Go routes stablecoins onto ZIGChain, but it has no swap venue
  there, so no single flow ends in native ZIG [S37][S38].
- **EU status (ESMA's interim register, file of 16 Oct 2026 [S1]).** These are MiCA-authorised, with Belgium in their
  passport:
  - MoonPay Europe B.V. (Dutch AFM);
  - Banxa's EU entity, EU Internet Ventures B.V. (AFM);
  - Ramp Swaps (Ireland) Limited (Central Bank of Ireland);
  - Coinbase Luxembourg S.A. (CSSF);
  - Simplex's Nuvei Liquidity UAB (Bank of Lithuania);
  - Criptan Trade S.L. (Spanish CNMV), which serves Mercuryo's EEA customers [S22].

  Transak, Guardarian, Onramper, Alchemy Pay and Swapped/Kado are not in the register. Transak's own lists name no EEA
  country at all [S9][S11].
- **The owner's rule decides most of it.** The rule "no provider secrets on a server" (owner, 2026-10-03,
  [ONRAMPS_AND_ZIGNALY.md](ONRAMPS_AND_ZIGNALY.md) decision 1) leaves three hand-offs:
  - Banxa's referral link;
  - Ramp's hosted mode;
  - a plain link to a provider's own page.

  All three are redirects, so none needs a CSP change.
- **Recommendation (research, not legal advice):** approach **Banxa** first and **Ramp Network** as the fallback. If
  neither works out, there is a no-contract fallback: a "ways to get ZIG" help page that only gives plain references.
  Nothing should be built until four things are true:
  1. the lawyer has answered the questions in [Open legal questions](#open-legal-questions-for-the-owners-lawyer);
  2. ZIGoals has a legal entity that can pass the provider's business checks (KYB);
  3. a provider delivers on ZIGChain, or the owner accepts a multi-step route;
  4. the app has left "practice money" mode for real-value mainnet use.

## What changed since 2026-10-02
- **Leap Wallet has been sunset.** ZIGChain's wallet page says Leap and related products were sunset on 28 May 2026,
  and it builds its guide around Keplr [S30].
- **Transak no longer lists any EEA country.** Its public countries endpoint returns 26 countries [S9], and its coverage
  page names no EEA country [S11]. Its terms (updated 21 Sep 2026) name no EU-authorised entity [S10].
- **ESMA answered Q&A 2882 on 18 June 2026,** on the line between advice and a plain reference to a CASP [S43]. It is
  the most relevant text yet for "linking to a provider" (see the legal questions).
- **ZIGChain's ZIG page (updated 9 Oct 2026) still names no card or bank provider**, and neither does its home page
  [S31][S34].
- **The registries still disagree.** ZIGChain's GitHub registry still says native ZIG is `uzig` with 6 decimals; its
  file is byte-identical to the 2026-10-02 copy [S41]. The Cosmos chain-registry lists `azig` with 18 decimals as "ZIG"
  and `uzig` as "ZIG.legacy" [S42]. A provider integrating ZIGChain must use `azig`/18.
- **Skip Go now lists `zigchain-1` and `zig-test-2`** and knows native `azig`, but it has no swap venue on ZIGChain
  [S35][S36][S38].

## What ZIGoals would and would not do
ZIGoals never takes custody, never touches fiat, never does identity checks (KYC) or anti-money-laundering checks
(AML), and never signs for the person. The provider does all of that on its own pages. ZIGoals could at most host or
link a licensed provider's flow, as many DeFi apps do. Keplr and ZIGChain stay the main wallet and chain.

**What the app allows today** (read at `11d84082` [S50]):
- The `/app` Content-Security-Policy frames only chess.com's and Lichess's puzzle and game pages (`frame-src`).
- The Permissions-Policy on `/app` is `camera=()`, except `/app/health`.
- Scripts need the page's nonce (`'strict-dynamic'`), and Trusted Types are enforced.
- The page sends `Cross-Origin-Opener-Policy: same-origin` and `Referrer-Policy: no-referrer`.
- No new dependencies may be added without owner approval.

**What each kind of hand-off would need:**

| Hand-off | Change to ZIGoals | Notes |
|---|---|---|
| Plain link to the provider's public page (the person types their own address) | None | Opens in a new tab. No contract is needed, but there is also no partner set-up, so the provider does not know the person came from ZIGoals. |
| Hosted redirect with the address in the link (Banxa referral, Ramp hosted mode) | None to the CSP (a navigation is not governed by `frame-src` or `connect-src`) | Needs a business agreement. The wallet address travels in the URL to the provider. The provider's identity check (camera, selfie) runs on its own origin, under its own policies. |
| Embedded widget (iframe) | `TIER 3 (CSP)`: add the provider to `frame-src` in `egress-policy.json` | **Inference** from how Permissions-Policy works: with `camera=()` on the parent page, no iframe can use the camera, so the provider's identity check would fail inside the frame unless the Permissions-Policy were changed as well (a second Tier 3 change). Card wallets inside a frame usually need the `payment` permission too. Test before relying on either point. |
| Provider SDK | A new dependency (owner approval), `connect-src` additions, a Trusted Types review | Not considered further. |

## Comparison
"Belgium" means Belgium is in the passport column of ESMA's register [S1]. "Rule fit" means the hand-off works without
a provider secret on a server.

| Provider | ZIG on sale? (network) | What it can deliver toward ZIGChain | EU authorisation (ESMA register, 16 Oct 2026) | Belgium | KYC/AML and custody | Hand-off; rule fit | Published fees | What a partner needs |
|---|---|---|---|---|---|---|---|---|
| **Banxa** | No [S16] | ATOM on Cosmos Hub, buy only [S16] | EU Internet Ventures B.V. (names include BNXA and OSL Pay), AFM, 08/10/2025; exchange for funds, exchange for crypto, transfer services [S1] | Yes | Banxa says it is "the regulated entity responsible for KYC and AML" [B-banxa-setup]. No custody in its EU authorisation [S1]. | Referral URL: "No server-to-server calls required" [S18]. Address, coin and chain go in the link [S19]. Redirect or iframe [S18]. **Fits.** | Card and Apple Pay processing fee 1.99%; other methods 0%; Banxa spread typically 2–4% (max 15%); optional partner spread typically 0–1% (max 10%) [S20] | Partner dashboard, sandbox, testing, then production enabled by Banxa [S18]; subdomain from Banxa [B-banxa-setup]; Native API needs a signed agreement [S18] |
| **Ramp Network** | No [S12] | ATOM on Cosmos [S12] | Ramp Swaps (Ireland) Limited, CBI, 02/12/2025; exchange for funds only [S1] | Yes | Basic identity check for card purchases [B-ramp-setup]. No custody in its EU authorisation [S1]. | Hosted mode redirects to `app.rampnetwork.com` with `userAddress` [B-ramp-setup]; its configuration page mentions no signing [S15]. **Fits.** | Manual bank transfer up to 1.40%; easy bank transfer up to 2.40%; card up to 3.9% (5.45% for other currencies); minimum up to €2.49; optional partner fee [S13] | A production API key through Ramp's onboarding [B-ramp-setup] |
| **MoonPay** | No [S4] | ATOM on Cosmos. USDC on Noble is listed but suspended [S4] | MoonPay Europe B.V., AFM, 30/12/2024; exchange for funds, exchange for crypto, transfer services [S1] | Yes; MoonPay's unsupported list has no EU country [S6] | MoonPay does both. No custody in its EU authorisation [S1]. | New set-ups must sign URLs, and signing is required whenever an address is passed [B-moonpay-setup]. **Does not fit.** | Cards up to 4.5%; bank transfer up to 1%; a €3.99 minimum fee below a threshold; partner "ecosystem fee" up to 10%, typically 0–2% [S7] | Account review and KYB; production keys after approval [B-moonpay-setup] |
| **Coinbase Onramp** | No: not in Coinbase's public asset list, and Coinbase Exchange returns 404 for ZIG [S25] | Whatever Coinbase.com supports [S26] | Coinbase Luxembourg S.A., CSSF, 20/06/2025, with custody [S1] | Yes | Coinbase. Guest checkout is US, UK and Canada only and is being discontinued [S26]; others use a Coinbase account (custodial). | Session token made on a backend with a developer key [B-coinbase-setup]. **Does not fit.** | Free for developers; users pay a spread plus fees, 2.5% on credit cards; zero-fee USDC for select partners [S26] | Developer key, domain allowlist [B-coinbase-setup] |
| **Transak** | No [S8] | — | Not in the register [S1] | **No EEA country in its own lists** [S9][S11] | Transak does KYC; it may hold funds temporarily, for example for refunds [S10] | Widget URL made on a server [B-transak-auth]. **Does not fit.** | — | KYB; a one-time listing fee for new tokens [B-transak-auth] |
| **Mercuryo** | No [S21] | ATOM on Cosmos; also INJ and TIA [S21] | Through Criptan Trade S.L., CNMV, 26/06/2026, with custody [S1][S22] | Yes (Criptan) | Through SumSub; light KYC up to €699 [B-mercuryo-setup] | Every URL signed with a secret [B-mercuryo-setup]. **Does not fit.** | Not found in the pages read | Widget ID and secret from an integration manager [B-mercuryo-setup] |
| **Guardarian** | **Yes, but only as the Ethereum ERC-20** `0xb261…4f01`; EUR minimum €16.50 and maximum €25,000 per its public endpoint [S23] | ERC-20 ZIG, which still needs the Hub bridge | FinSeven CZ s.r.o. (Czech) is not in the register. Its terms say EU and EEA customers are served "exclusively by third-party licensed service providers", not named [S24]. | Unverified | KYC through Sum and Substance; "does not provide you with any custodian services" [S24] | Contract plus API token [B-guardarian-setup]. **Does not fit.** | Not read | A signed contract [B-guardarian-setup] |
| **Simplex (Nuvei)** | No [B-simplex-zig] | ATOM on Cosmos [B-simplex-zig] | Nuvei Liquidity UAB, Bank of Lithuania, 16/12/2025 [S1] | Yes | Simplex | iFrame form with a public key on an allow-listed domain [B-simplex-setup]: no secret, but **needs a CSP change** | Not read | Business public key [B-simplex-setup] |
| **Onramper** (aggregator) | Unverified [B-onramper-zig] | Depends on the providers it routes to | Not in the register [S1]; it says it "does not process payments or handle funds directly" [S27] | — | The underlying provider [S27] | Signed when wallet addresses are passed [B-onramper-setup]. **Does not fit.** | Partner pays a subscription [B-onramper-setup] | Legal entity, KYB [B-onramper-setup] |
| **Swapped (ex-Kado)** | Unverified | Unverified | No Swapped entity in the register [S1]. A third-party profile claims a Danish authorisation (unverified). | Unverified | Unverified | `kado.money` redirects to `swapped.com`, which returned 403 [S28] | — | — |
| **Stripe** | No [B-stripe-zig] | No Cosmos network [B-stripe-zig] | Its US/EU entity was not matched in this pass | — | Stripe | Server session [B-stripe-setup]. **Does not fit.** | — | Approved application [B-stripe-setup] |
| **Alchemy Pay** | Unverified [B-alchemypay-zig] | — | Not in the register [S1] | — | — | Every URL signed [B-alchemypay-setup]. **Does not fit.** | — | Sales contact [B-alchemypay-setup] |

**Wallets, routers and DEX front ends** (not on-ramps themselves):

| Name | What it offers | Can it end in native ZIG? |
|---|---|---|
| **Keplr's Buy button** | Hands off to MoonPay, Transak or Swapped. Keplr says available assets and networks "may vary depending on the provider" (help page updated 22 Sep 2025) [S29]. | No ZIGChain network at any of the three. In Belgium only MoonPay is a verified MiCA option, which **can** deliver ATOM to the person's Cosmos Hub address in Keplr (inference from [S4][S29]). |
| **Leap** | Sunset on 28 May 2026 [S30] | — |
| **Skip Go** | Lists `zigchain-1` with `azig` as its fee asset [S35][S36]. Quoted today: 100 USDT (Ethereum) to USDT on ZIGChain over IBC Eureka, about 1,230 s, about $0.20 relay fee; 100 USDC (Ethereum) to Noble USDC on ZIGChain through CCTP and Noble, about 1,110 s, about $0.02 relay fee [S37]. | **No.** "no routes found" from Ethereum USDC, Noble USDC, Ethereum ERC-20 ZIG or Cosmos Hub ATOM to `azig` [S37], and none of its 39 swap venues is on ZIGChain [S38]. |
| **Squid** | Axelar-based routing | Unverified: its API needs an integrator ID [S39] |
| **Osmosis** | Its own buy options were not confirmed in this pass | ZIGChain's docs list no IBC channel to Osmosis ([C-zig-docs-ibc-channels]), so it is no shortcut to ZIGChain |
| **ZIGChain Hub bridge** | Moves "ZIG, USDC, and other supported tokens" between ZIGChain and other networks; no provider or fee schedule is named (page updated 5 Oct 2026) [S32] | Yes, for ERC-20 ZIG through the Token Wrapper (see route C below) |

## Per-provider notes
**Banxa.**
- *Fit with ZIGoals:* its referral integration is a plain URL to a partner subdomain, with the address, coin and chain
  as parameters. Banxa says no server-to-server calls are needed, and the checkout can open as a redirect [S18][S19].
  That fits the owner's rule and needs no CSP change.
- *Licence:* its EU entity is AFM-authorised with a Belgian passport [S1].
- *Assets:* no ZIG, no ZIGChain and no Noble network. ATOM on Cosmos Hub is buy-only [S16].
- *Fees:* its pricing is published as a structure (processing fee plus spreads) rather than one number [S20]. The
  partner spread is optional, so ZIGoals could ask for 0%.
- *Countries:* its unsupported-country list has no EU country [S17].

**Ramp Network.**
- *Fit with ZIGoals:* hosted mode is a redirect with `userAddress`, and the configuration docs mention no signing
  [S15][B-ramp-setup]. It fits the owner's rule.
- *Licence:* Ramp Swaps (Ireland) Limited is CBI-authorised for "exchange of crypto-assets for funds" only, with a
  Belgian passport [S1]. **Inference:** that is the service an on-ramp provides; whether a narrower authorisation
  matters for delivery to a self-hosted wallet is a lawyer's question, not ours.
- *Assets:* ATOM on Cosmos is listed; no ZIG, ZIGChain or Noble [S12].
- *Countries:* Belgium is not on Ramp's unsupported list, but its page does not say "supported" either [S14].

**MoonPay.**
- *Strengths:* the best-known option, already behind Keplr's Buy button [S29], AFM-authorised since 30 Dec 2024 with a
  Belgian passport [S1].
- *Blocker:* signed URLs [B-moonpay-setup], which means a server secret. If the owner ever revisits the rule, MoonPay
  becomes a strong candidate.
- *Assets:* `usdc_noble` is still flagged suspended (`updatedAt` 2026-09-16) [S4].
- *Regions:* its ramps run in every region MoonPay supports except the United Kingdom [S5].

**Coinbase Onramp.**
- *Assets:* no ZIG [S25]. Coinbase says Onramp supports what Coinbase.com supports [S26], so **inference:** there is no
  ZIG route here.
- *Hand-off:* a backend session token [B-coinbase-setup].
- *Accounts:* outside the US, UK and Canada the person needs a Coinbase account [S26]. That makes the first step
  custodial.

**Transak.** It does not appear to serve the EEA at all (26 countries, none in the EEA [S9]). **Unsuitable** for a
Belgian owner and EU users today.

**Mercuryo.**
- *Licence:* licensed in the EEA through Criptan (CNMV) [S1][S22].
- *Blocker:* every URL must be signed [B-mercuryo-setup].
- *Assets:* no ZIG [S21].

**Guardarian.**
- *Assets:* the only provider that sells ZIG at all, and only the ERC-20 on Ethereum. Its network label says
  "ZIGChain", but the network code is `ETH` and the explorer is Etherscan [S23][B-guardarian-zig].
- *Licence:* its EU service runs through unnamed third parties [S24], and its operating entity is not in ESMA's
  register [S1].
- *Hand-off:* needs a contract and an API token [B-guardarian-setup].
- *Verdict:* **unsuitable** as a partner. Mixing up "ZIGChain" and Ethereum is exactly the wrong-network trap ZIGChain's
  docs warn about [B-zigchain-docs-exchanges].

**Simplex (Nuvei).** Authorised in Lithuania with a Belgian passport [S1]. Its iframe uses a public key, so there is no
secret, but it needs a Tier 3 CSP change and probably a Permissions-Policy change. It sells no ZIG.

**Onramper, Swapped (Kado), Alchemy Pay, Stripe.**
- Onramper adds a layer between ZIGoals and the provider, and charges a subscription [B-onramper-setup].
- Swapped's site could not be read [S28].
- Alchemy Pay and Stripe need secrets [B-alchemypay-setup][B-stripe-setup].
- None is a first candidate.

**Exchanges that sell ZIG in the EU.** These are not on-ramps but are part of the routes below.
- ESMA's white-paper register lists ZIG's MiCA white paper under Latvijas Banka, for Comet Technologies Ltd. (British
  Virgin Islands), with "Bitvavo" as the CASP and Belgium among the offer countries [S3].
- ZIGChain's own table (9 Oct 2026) marks native ZIGChain withdrawals for 13 venues, including Bybit, KuCoin and LCX
  [S31]. Bitvavo, Bitpanda and Kraken are marked ERC-20 only.
- Bybit EU GmbH and KuCoin EU Exchange GmbH are FMA-authorised with a Belgian passport [S1]. Whether those EU entities
  offer ZIG with native ZIGChain withdrawals is **unverified**: their public APIs were geo-blocked from this session.

**Belgium.**
- *Supervisor and law:* the FSMA is the Belgian authority. Belgium implemented MiCA by the Law of 11 December 2025,
  and the FSMA says it granted no registrations under the pre-MiCA national rules [S48].
- *Where to check a provider:* the FSMA lists only Belgian CASPs, authorised or notified [S48]. A provider authorised in
  another member state shows up in the passport column of ESMA's register instead [S1].
- *Warnings:* the FSMA also uses ESMA's non-compliant list; for example, it warned against "Bank Bit" on 29/06/2026
  for providing crypto-asset services in Belgium without a MiCA licence [S2]. None of the providers compared here is on
  that list [S2].
- *Belgium is in every authorised provider's passport:* MoonPay, Banxa, Ramp, Coinbase, Simplex, Criptan (Mercuryo),
  Bybit EU, KuCoin EU and Bitvavo [S1].

## Routes to native ZIG on ZIGChain
Native ZIG is `azig` with 18 decimals on `zigchain-1` ([B-zig-native-denom]). Watch for the same-name factory decoy
token ([B-zigchain-decoy-zig]). Every route below ends with the person holding native ZIG in their own Keplr wallet.
ZIGoals would only explain each route; it would not perform any step.

| Route | Steps | Who holds the money along the way | What exists today | Problems |
|---|---|---|---|---|
| **A. Exchange withdrawal** | 1. Buy ZIG on an exchange. 2. Withdraw on the ZIGChain network to Keplr. | The exchange, until the withdrawal | 13 venues marked "ZIGChain native" by ZIGChain [S31]; Bybit EU and KuCoin EU are MiCA-authorised [S1] | Custodial first step; the EU entities' ZIG listing and network are unverified; picking the wrong network loses funds or opens a long support ticket [B-zigchain-docs-exchanges] |
| **B. ATOM, then IBC, then OroSwap** | 1. Buy ATOM to a Cosmos Hub address (MoonPay through Keplr, Banxa, Ramp or Mercuryo [S4][S12][S16][S21]). 2. Send it over IBC to ZIGChain on channel-4 ([A-zig-ibc-channels]). 3. Swap ATOM for ZIG on OroSwap. | The person, at every step | ATOM/`azig` pool `zig1wvqk…fe45`: 80,043.37 ZIG and 2,398.79 ATOM at block 13014905 [S40] | Three signed steps and two chains; a thin pool (**inference**, constant-product arithmetic: 10 ATOM moves the price about 0.4%, 100 ATOM about 4%, before fees); no router does it in one go [S37][S38] |
| **C. ERC-20 ZIG, then the Hub bridge** | 1. Buy ERC-20 ZIG (Guardarian [S23] or an exchange). 2. Bridge it with the ZIGChain Hub. Axelar and the Token Wrapper turn it into native ZIG [S33]. | The person; then the bridge and the module wallet in transit | The Token Wrapper releases native ZIG for Axelar vouchers (page updated 28 Sep 2026) [S33] | Needs ETH for gas. The operator can disable the wrapper. A failure leaves IBC vouchers that need a manual recovery [S33]. The Hub is a JavaScript app behind a bot wall, so it was not read [S32]. Skip finds no route [S37]. |
| **D. USDC through Noble, then OroSwap** | 1. Buy USDC on Ethereum. 2. Move it through CCTP to Noble and over IBC to ZIGChain. 3. Swap USDC for ZIG. | The person | Skip quotes legs 1–2 [S37]; USDC/`azig` pool `zig186u…373h` holds 42,510.63 USDC and 843,728.97 ZIG [S40] | **Do not build on it.** Circle stopped new Noble minting through Circle Mint on 2026-10-13 and pauses Noble USDC and CCTP on 2027-01-12 ([C-circle-noble-dates]). |
| **E. USDT through Eureka, then OroSwap** | 1. Buy USDT on Ethereum. 2. Move it through IBC Eureka over the Cosmos Hub to ZIGChain. 3. Swap. | The person | Skip quotes legs 1–2 [S37]; USDT/`azig` pool `zig1ucw…09t6` holds 139.57 USDT [S40] | The pool is tiny: **inference**, 50 USDT would move the price by about a quarter. ESMA's e-money-token register has no Tether entry ([C-esma-register-emt-issuers]), which is a MiCA question for the lawyer. |

**What is not possible today:**
- one payment that ends in native ZIG in the person's wallet;
- any provider that lists ZIGChain as a network;
- any router that swaps on ZIGChain.

**What would change that.** A provider would have to add the ZIGChain network with `azig`/18, not the `uzig`/6 still
in ZIGChain's GitHub registry [S41][S42]. Listings like that are normally requested by the token's own project; Transak,
for example, charges new tokens a one-time listing fee [B-transak-auth]. So the realistic sponsor is ZIGChain or
Zignaly, not ZIGoals.

No ZIGChain or Zignaly page read names an on-ramp partner [S31][S34]. Zignaly's own sites were bot-walled in Session N
([B-zignaly-public-api]), so any partner they use or plan is **unverified**. ZIGoals should ask them directly.

## Recommendation (research, not legal advice)
**1. Approach Banxa first.** The reasons:
- Its referral flow is the only documented hand-off that needs no server-to-server call [S18]. That keeps the owner's
  rule and needs no CSP change.
- It is MiCA-authorised by the AFM with a Belgian passport [S1], and it says it is the regulated entity for KYC and AML
  [B-banxa-setup].
- It publishes its fee and spread structure [S20], with an optional partner spread that can be zero.
- It already delivers ATOM on Cosmos Hub, so route B is possible from day one.

**What to ask Banxa:**
- Will it add ZIGChain (`azig`/18) or a stablecoin on ZIGChain, and what would ZIGChain have to provide?
- Can a prefilled address be locked, and does Banxa log the referral URL?
- What KYB does it need from a small Belgian business, and what does the contract cover?
- Can the partner spread be zero, with no commission at all?
- Which of its risk warnings and disclosures must appear before the hand-off?
- Can ZIGoals receive no order data or webhooks at all?

**2. Ramp Network as the fallback.** It has the same shape: hosted redirect, no signing described [S15], CBI-authorised
with a Belgian passport [S1], ATOM on Cosmos [S12], and published fees [S13]. Ask it the same questions, plus whether
its "exchange for funds" authorisation covers everything the hand-off involves.

**3. Fallback without any contract.** A help page, "Ways to get ZIG", would:
- describe routes A–C in plain words;
- link only to ZIGChain's exchange table and to Keplr's own help page about its Buy button;
- carry no prefilled address, no logos, no tracking and no referral parameters;
- be the same for every visitor.

**Inference:** that is the closest shape to ESMA's "solely a reference to a CASP (without further indications) equally
accessible to all potential investors" [S43]. The lawyer must confirm it, and the Belgian advertising question (B2
below) still applies.

**Not now:**
- **MoonPay:** signed URLs (unless the owner changes the rule).
- **Coinbase:** no ZIG; backend session; account needed.
- **Transak:** no EEA coverage.
- **Mercuryo:** signed URLs.
- **Guardarian:** ERC-20 only; unnamed EU providers; contract and token.
- **Simplex:** iframe only.
- **Onramper:** subscription; signing.
- **Swapped/Kado:** unreadable.
- **Stripe:** no Cosmos network.
- **Alchemy Pay:** signing.

**What would make a provider unsuitable for an unaudited Alpha:**
- no MiCA authorisation covering Belgium in ESMA's register;
- an integration that needs a server secret, or an iframe that needs CSP and Permissions-Policy holes;
- any commission, referral or affiliate payment to ZIGoals;
- the provider sending order data back to ZIGoals;
- ZIG offered on the wrong network under a "ZIGChain" label.

**Preconditions before any build:**
- **Mainnet.** The Alpha's honesty labels say "practice money (no real value)", "financial execution is disabled" and
  mainnet is off (`apps/web/components/shell.tsx:114`; Help). An on-ramp brings real money, so it cannot ship inside
  today's Alpha without changing those facts.
- **A legal entity for KYB.** The repository records none.
- **Owner approval.** Any CSP or Permissions-Policy change is Tier 3.

## Open legal questions for the owner's lawyer
These add to [LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md) §6.1 (on-ramps), §6.5 (affiliate and referral) and
§6.7 (consumer disclosures). They do not repeat them. No answer is implied.

**A. Hosting or linking a provider's flow (MiCA perimeter)**
1. **Reception and transmission of orders.** MiCA Art. 3(1)(23) defines this as "the reception from a person of an
   order to purchase or sell one or more crypto-assets … and the transmission of that order to a third party for
   execution" [S46]. ESMA Q&A 2653 applies it "when a CASP transmits orders to a third-party for execution" [S44]. In a
   redirect, ZIGoals receives no order. Does prefilling the asset, network and address in the link change that? Would an
   embedded iframe change it?
2. **Placing.** MiCA Art. 3(1)(22) defines placing as "the marketing, on behalf of or for the account of the offeror or
   a party related to the offeror, of crypto-assets to purchasers" [S46]. Would a hand-off focused on ZIG be placing if
   ZIGoals had any relationship with ZIGChain, Zignaly or ZIG's offeror, Comet Technologies Ltd. [S3]? The owner should
   tell the lawyer about any such relationship.
3. **Advice.** ESMA Q&A 2882 (18 June 2026) says introductory services that recommend a crypto-asset service "may be
   regarded as advice … depending on the circumstances". It also says "providing solely a reference to a CASP (without
   further indications) equally accessible to all potential investors should not constitute a recommendation" [S43].
   Which of these does each design fall under?
   - a help page that is the same for everyone;
   - a single provider's button inside the Wealth or Staking pages, shown to someone whose wallet is connected;
   - a prefilled address;
   - offering one provider rather than several.
4. **Non-EU providers.** ESMA's reverse-solicitation guidelines name "the direction of the audience to the third-country
   firm's website, the provision of the means of access to the services" and showing its logo as signs of acting on its
   behalf. They add that "the lack of remuneration or benefit should, however, not necessarily exclude" this [S45].
   Must ZIGoals show only MiCA-authorised providers to EU visitors? Must it geo-gate, or check ESMA's register before
   each change?

**B. Marketing and advertising (EU and Belgium)**
1. **MiCA.** MiCA Art. 66(2) requires a CASP's marketing to be "fair, clear and not misleading" and identified as
   marketing ([C-legal-mica-conduct-dates]). Who is responsible for a co-branded hosted page, and for text in ZIGoals
   that describes the provider?
2. **The FSMA Regulation.** The FSMA's FAQ (last update 03-2025) says ads outside MiCA's scope remain subject to the
   FSMA Regulation of 5 January 2023. It gives as an example "advertisements disseminated when distributing virtual
   currencies to consumers in Belgium by persons who do not provide crypto-asset services" [S47]. It defines
   distribution as "presenting a product or a virtual currency, in any way whatsoever, with a view to encouraging an
   existing or potential client to purchase" [S47].
   - Would any of these be an advertisement under that Regulation: an "Add money" button, a "Ways to get ZIG" page, or
     the existing **"Buy ZIG" habit template** (`apps/web/components/habits/habit-editor.tsx:23`)?
   - If so, they would need the short and extended FSMA warnings "word for word" [S47], an "advertisement" label, and
     the contracts kept.
   - Does the "mass media campaign" threshold of 25,000 consumers ([C-legal-fsma-advertising]) apply to an app?
3. **Wording.** May ZIGoals say "Add money", or must it say "Buy crypto from [provider], a separate company"? Must a
   page name ZIG, ATOM or USDC at all, or can it stay generic?

**C. Affiliate and referral fees**
1. MoonPay's "ecosystem fee" (up to 10%) [S7], Banxa's partner spread (up to 10%) [S20] and Ramp's partner fee [S13]
   are the providers' ways of paying a partner. If ZIGoals set them to zero, would the contract alone still make
   ZIGoals a person "acting on behalf" of the provider ([S45], para. 19–20)?
2. If a fee were ever taken: which inducement, disclosure and Belgian rules apply? (ESMA's finfluencer factsheet asks
   for payment to be disclosed: [C-legal-esma-finfluencers].) Must ZIGoals state "we receive nothing" next to each
   hand-off today?

**D. Consumer protection**
1. **UCPD.** Under the Unfair Commercial Practices Directive (Art. 6–7, [C-legal-ucpd]), does leaving out the provider's
   fees, the wrong-network risk, or Noble's wind-down from a ZIGoals page count as a misleading omission? Must ZIGoals
   show the provider's fees, or is linking to them enough? (The earn design forbids comparing or ranking fees.)
2. **Distance marketing.** Does the distance-marketing regime for financial services (Directive (EU) 2023/2673, applying
   from 19 June 2026, [C-legal-dmfsd]) reach an app that hands off but concludes no contract?

**E. Liability for the provider's flow**
1. If the provider's flow fails, delivers to the wrong network, is phished, or freezes funds, what is ZIGoals' exposure
   to Belgian consumers?
2. How far can ZIGoals' terms limit that liability? What indemnity and incident terms should the provider contract
   contain?
3. Is a screen saying "you are leaving ZIGoals" needed, or useful?

**F. Data protection**
1. **The address in the URL.** Passing the wallet address (and, if ever, country or e-mail) to the provider in the
   link: is the address personal data in this context, and who is controller for that disclosure? The EDPB's
   Guidelines 02/2025 on blockchain have a final version after consultation [S49].
2. **Notice, basis and transfers.** What must
   [PRIVACY_NOTICE_DRAFT.md](../legal/PRIVACY_NOTICE_DRAFT.md) say? What is the legal basis? Several providers have UK
   or US group entities ([S10], [S22]), so what about transfers outside the EEA?
3. **Order data.** Should ZIGoals refuse webhooks and order status entirely, so it never holds purchase data?

**G. The Alpha's "practice money" positioning**
1. Can a real-money on-ramp appear anywhere in an app whose labels say "practice money (no real value)" and
   "financial execution is disabled"?
2. Is a provider's sandbox (Banxa and Ramp both have one [S18][S15]) acceptable for showing the flow in the Alpha, if
   it is clearly labelled as a test?
3. What must change in the labels, Help and terms before mainnet and an on-ramp, and is "unaudited" enough as a
   disclosure?

**H. Who contracts, stablecoins and the travel rule**
1. **The contracting party.** Which legal entity signs the provider contract and passes KYB? Does the owner's personal
   residence in Brussels make Belgian law and the FSMA the relevant frame even for users in other member states?
2. **Stablecoin routes.** May ZIGoals describe route E (USDT, with no Tether white paper in ESMA's register) or route D
   (Noble USDC, being wound down) at all? ([LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md) §6.2 covers the
   underlying MiCA questions.)
3. **The travel rule.** The Transfer of Funds Regulation (Art. 14, [C-legal-tfr]) covers transfers over €1,000 to a
   self-hosted address. If the provider asks the person to prove they control the address, may ZIGoals help, for
   example with a signed message? Would that give ZIGoals any duty of its own?

## Sources
All read on 2026-10-17 (UTC). "curl" means the raw response was saved and hashed (SHA-256 of the body as received).
"WebFetch" means a processed view of the page, not a byte copy. Provider items cited as [B-…], [C-…] or [A-…] are in
the Session N registers linked at the top. They were read on 2026-10-02 and were not re-read unless a tag below covers
them.

| Tag | Source | Read | How |
|---|---|---|---|
| S1 | ESMA interim MiCA register, CASPs: <https://www.esma.europa.eu/sites/default/files/2024-12/CASPS.csv> (Last-Modified 16 Oct 2026 15:36:15 GMT; 378 rows) | 18:12:43Z | curl `b7a80501…a4ca` |
| S2 | ESMA interim register, non-compliant entities: <https://www.esma.europa.eu/sites/default/files/2024-12/NCASP.csv> (16 Oct 2026); none of the providers above listed | 18:13:31Z | curl `7d71d7f3…9b30` |
| S3 | ESMA interim register, white papers (other crypto-assets): <https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv> (16 Oct 2026) | 18:28:48Z | curl `be688c88…a481` |
| S4 | MoonPay currencies: <https://api.moonpay.com/v3/currencies> | 18:12:42Z | curl `1b1f8ed2…1f78` |
| S5 | MoonPay availability: <https://dev.moonpay.com/platform/overview/availability.md> | 18:25:41Z | curl `95bec2b3…1564` |
| S6 | MoonPay unsupported countries: <https://support.moonpay.com/customers/docs/moonpays-unsupported-countries> | 2026-10-17 | WebFetch |
| S7 | MoonPay Europe pricing disclosure: <https://www.moonpay.com/legal/europe_pricing_disclosure> (no date on page) | 2026-10-17 | WebFetch |
| S8 | Transak crypto list: <https://api.transak.com/cryptocoverage/api/v1/public/crypto-currencies> (143 entries) | 18:13:49Z | curl `b6a4d6dd…9956` |
| S9 | Transak countries: <https://api.transak.com/api/v2/countries> (26 countries) | 18:15:46Z | curl `b93e5a90…92fb` |
| S10 | Transak terms of service: <https://transak.com/terms-of-service> (last updated 21 Sep 2026) | 2026-10-17 | WebFetch |
| S11 | Transak coverage: <https://transak.com/crypto-coverage> | 2026-10-17 | WebFetch |
| S12 | Ramp assets: <https://api.rampnetwork.com/api/host-api/v3/assets?withDisabled=true&withHidden=true> (221 assets) | 18:13:50Z | curl `3fe552e4…64b8` |
| S13 | Ramp buy fees: <https://support.rampnetwork.com/en/articles/10415-what-fees-are-charged-when-buying-crypto> (25 Jun 2025) | 2026-10-17 | WebFetch |
| S14 | Ramp countries: <https://support.rampnetwork.com/en/articles/433-what-countries-do-you-support> | 2026-10-17 | WebFetch |
| S15 | Ramp configuration: <https://docs.rampnetwork.com/configuration> | 2026-10-17 | WebFetch |
| S16 | Banxa assets: <https://docs.banxa.com/reference/supported-cryptocurrencies-and-blockchains.md> | 18:14:00Z | curl `db014445…657e` |
| S17 | Banxa restrictions: <https://docs.banxa.com/products/hosted-checkout/docs/reference/geographic-and-asset-restrictions.md> | 18:25:40Z | curl `b79233d6…ad7b` |
| S18 | Banxa access and set-up: <https://docs.banxa.com/products/hosted-checkout/docs/getting-started/access-and-setup.md> | 18:29:00Z | curl `198ef592…6cca` |
| S19 | Banxa referral URLs: <https://docs.banxa.com/products/hosted-checkout/docs/referral-integration/constructing-referral-urls.md> | 2026-10-17 | WebFetch |
| S20 | Banxa pricing article: <https://support.banxa.com/en/support/solutions/articles/44002465167-how-does-banxa-set-the-price-of-cryptocurrency-> (modified 15 May 2025) | 2026-10-17 | WebFetch |
| S21 | Mercuryo currencies: <https://api.mercuryo.io/v1.6/lib/currencies> (56 crypto) | 18:13:51Z | curl `52a20ce1…c5fb` |
| S22 | Mercuryo legal: <https://mercuryo.io/legal/> | 2026-10-17 | WebFetch |
| S23 | Guardarian ZIG: <https://api-payments.guardarian.com/v1/currencies/ZIG>; range: <https://api-payments.guardarian.com/v1/market-info/min-max-range/eur_zig-eth> (HTTP 200; `eur-zig_eth` 404) | 18:13:51Z | curl `ddca28f2…5588` |
| S24 | Guardarian terms: <https://guardarian.com/terms-of-service> (general terms 5 May 2026; B2B 31 Dec 2025) | 2026-10-17 | WebFetch |
| S25 | Coinbase currencies: <https://api.coinbase.com/v2/currencies/crypto> (413 assets, no ZIG); <https://api.exchange.coinbase.com/currencies/ZIG> (404) | 18:26:22Z | curl `43e27094…19c3` |
| S26 | Coinbase Onramp FAQ: <https://docs.cdp.coinbase.com/onramp/additional-resources/faq> | 2026-10-17 | WebFetch |
| S27 | Onramper knowledge base: <https://knowledge.onramper.com/how-to-buy-crypto-using-onramper> | 2026-10-17 | WebFetch |
| S28 | Kado and Swapped: <https://www.kado.money/> (301 to swapped.com); <https://swapped.com/legal> (403) | 2026-10-17 | curl headers |
| S29 | Keplr help, fiat on-ramps: <https://help.keplr.app/extension/5R3bMyjtr2FwnBvJQuJwJu/fiat-on-ramps-buy-tokens/5So5gM41Lj22zW1xnH59qG> (22 Sep 2025) | 2026-10-17 | WebFetch |
| S30 | ZIGChain docs, wallet set-up: <https://docs.zigchain.com/users/wallet-setup/zigchain-wallet> (23 Jul 2026) | 2026-10-17 | WebFetch |
| S31 | ZIGChain docs, the ZIG token and exchanges: <https://docs.zigchain.com/about-zigchain/zig> (9 Oct 2026) | 2026-10-17 | WebFetch |
| S32 | ZIGChain docs, Hub bridge: <https://docs.zigchain.com/users/hub/bridge> (5 Oct 2026); <https://hub.zigchain.com/> 403 to curl | 2026-10-17 | WebFetch, curl |
| S33 | ZIGChain docs, Token Wrapper: <https://docs.zigchain.com/builders/token-wrapper-module> (28 Sep 2026) | 2026-10-17 | WebFetch |
| S34 | ZIGChain home: <https://www.zigchain.com/> | 2026-10-17 | WebFetch |
| S35 | Skip Go chains: <https://api.skip.build/v2/info/chains?include_evm=true&include_svm=true> (102 chains) | 18:18:16Z | curl `3b47d1ee…8bec` |
| S36 | Skip Go assets on ZIGChain: <https://api.skip.build/v2/fungible/assets?chain_ids=zigchain-1&native_only=false&include_cw20_assets=true> (24 assets) | 18:18:31Z | curl `5a2fd4e9…5f79` |
| S37 | Skip Go route quotes, read-only (`POST https://api.skip.build/v2/fungible/route`). USDT route `8d2c666b…4619`; USDC route `e8c3f146…9d56`; the four routes to `azig` returned "no routes found" `c7c23811…ee0e` | 18:18:54–57Z | curl |
| S38 | Skip Go swap venues: <https://api.skip.build/v2/fungible/venues> (39, none on ZIGChain) | 18:19:11Z | curl `c60ac552…1e3d` |
| S39 | Squid API: <https://v2.api.squidrouter.com/v2/chains> ("x-integrator-id header is missing") | 18:24:35Z | curl |
| S40 | OroSwap pools via ZIGChain's LCD, `{"pool":{}}` on `zig186ucx5…8373h`, `zig1ucwnlu…09t6`, `zig1wvqk2t…fe45` at block 13014905 (<https://api.zigchain.com/cosmwasm/wasm/v1/contract/>…) | 18:27:10–12Z | curl |
| S41 | ZIGChain registry, native ZIG: <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/native/zig.mainnet.json> (same as 2026-10-02) | 18:28:19Z | curl `f45c5bf3…396e` |
| S42 | Cosmos chain-registry, ZIGChain assets: <https://raw.githubusercontent.com/cosmos/chain-registry/master/zigchain/assetlist.json> | 18:28:20Z | curl `87002fe6…ddfe` |
| S43 | ESMA Q&A 2882, perimeter of advice (answer 18 Jun 2026): <https://www.esma.europa.eu/publications-data/questions-answers/2882> | 18:22:40Z | curl `44eda28e…1e0a` |
| S44 | ESMA Q&A 2653, execution services (answer 14 Oct 2025): <https://www.esma.europa.eu/publications-data/questions-answers/2653> | 2026-10-17 | WebFetch |
| S45 | ESMA final report, guidelines on reverse solicitation under MiCA (ESMA35-1872330276-1899), Guideline 2, para. 18–21: <https://www.esma.europa.eu/sites/default/files/2024-12/ESMA35-1872330276-1899_-_Final_report_on_GLs_on_reverse_solicitation_under_MiCA.pdf> | 18:22:50Z | curl `25cbbd87…f6fe` |
| S46 | MiCA, Regulation (EU) 2023/1114, Art. 3(1)(22)–(24), from the EU Publications Office: <https://publications.europa.eu/resource/celex/32023R1114> (EUR-Lex: <https://eur-lex.europa.eu/eli/reg/2023/1114/oj>) | 18:28:37Z | curl `c694819a…26fb` |
| S47 | FSMA, FAQ about crypto (last update 03-2025): <https://www.fsma.be/en/faq/faq-about-crypto> | 18:23:45Z | curl `c3342863…8a12` |
| S48 | FSMA, crypto-asset service providers: <https://www.fsma.be/en/crypto-asset-service-provider-casp> (Belgian MiCA law of 11 Dec 2025; lists Belgian CASPs only) | 2026-10-17 | WebFetch |
| S49 | EDPB Guidelines 02/2025 on blockchain, consultation page (marked "Obsolete version", links the final text): <https://www.edpb.europa.eu/our-work-tools/documents/public-consultations/2025/guidelines-022025-processing-personal-data_en> | 2026-10-17 | WebFetch |
| S50 | ZIGoals at `11d84082`: `apps/web/lib/egress-policy.json` (`csp`, `permissionsPolicy`), `apps/web/lib/csp-compose.mjs`, `apps/web/next.config.ts` (COOP, Referrer-Policy) | 2026-10-17 | read |

**Searched but not relied on.** Press and third-party pages say Swapped.com acquired Kado in April 2025, that Kado's
product is inactive, and that Swapped ApS holds a Danish authorisation. None of this was confirmed on an official page,
and ESMA's register has no Swapped entry [S1]. No official Zignaly page naming an on-ramp partner was found.
