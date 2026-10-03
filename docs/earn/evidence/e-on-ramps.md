# Evidence register (e) On-ramps and getting ZIG

Part of [EVIDENCE_2026-10.md](../EVIDENCE_2026-10.md), which explains the labels, lists the pages that could not be read and gives the second check (F01–F24). Read on 2026-10-02 (UTC). Only what each provider officially publishes about ZIG or ZIGChain, plus the denomination facts an on-ramp would need.

## B-zigchain-docs-exchanges
**VERIFIED** · Acquiring ZIG / ZIGChain docs

The ZIGChain docs 'The ZIG Token' page has a 'Supported Exchanges' table showing which ZIG network each venue supports (ZIGChain native, ERC20, BEP20). ZIGChain-native is marked for Ascendex, Biconomy, Bitkub, BitMart, BloFin, BTSE, Bybit, CoinStore, KuCoin, LCX, MEXC, OurBit and Phemex. ERC20 only is marked for Bitget, Bitpanda, Bitvavo, CoinDCX, CoinEx, GroveX, HTX, Kraken, LBank, Uphold and WooX. Gate.io is ERC20 plus BEP20; Ascendex and MEXC are marked for all three. The page warns users to confirm the network before transferring.

*How:* Read today via WebFetch (curl gets 403); the page shows 'Last updated September 28, 2026'. The table was reproduced by WebFetch, so the exact marks should be re-checked in a browser.

- <https://docs.zigchain.com/about-zigchain/zig> · read 2026-10-02T20:31:30Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Wrong-network sends can lead to lost funds or long support tickets. Confirm the network on the exchange UI before you transfer.`

## B-zigchain-docs-onramp
**UNVERIFIED** · Acquiring ZIG / ZIGChain docs

ZIGChain's docs name a card or bank (fiat) on-ramp provider, or have a 'Get ZIG' page, for buying ZIG or stablecoins on ZIGChain.

*How:* Not found in docs pages read today via WebFetch: /users/ (navigation), /users/wallet-setup/zigchain-wallet, /users/hub/bridge, /about-zigchain/zig, `/integration-guides/`, /tutorials/, /about-zigchain/glossary. The wallet page only says users can fund the wallet on chain.

- <https://docs.zigchain.com/users/wallet-setup/zigchain-wallet> · read 2026-10-02T20:31:45Z · read through WebFetch, a processed view of the page (not a byte copy)
  `When mainnet is active, you can fund the wallet on chain or move on to Staking on ZIGChain when you are ready to delegate.`
- <https://docs.zigchain.com/users/> · read 2026-10-02T20:30:40Z · read through WebFetch, a processed view of the page (not a byte copy)

## B-zigchain-bridge
**VERIFIED** · Acquiring ZIG / bridging

ZIGChain docs say ZIG, USDC and other supported tokens can be bridged between ZIGChain and multiple networks through the ZIGChain Hub bridge (hub.zigchain.com/bridge), but do not name the routing or bridge provider. The MiCAR paper describes a native bridge built on Axelar technology for moving ERC-20 ZIG to ZIGChain.

*How:* Docs read via WebFetch (page 'Last updated Aug 24, 2026'); the MiCAR PDF was downloaded today. hub.zigchain.com itself returns a Cloudflare challenge to curl, and WebFetch got only its title.

- <https://docs.zigchain.com/users/hub/bridge> · read 2026-10-02T20:31:45Z · read through WebFetch, a processed view of the page (not a byte copy)
  `You can transfer ZIG, USDC, and other supported tokens between ZIGChain and multiple networks.`
- <https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf> · read 2026-10-02T20:32:06Z · SHA-256 of the PDF as received `0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9`
  `The plan is for the ERC20 version of the token to be bridged from Ethereum to ZIGChain by locking supply on one end and minting / releasing supply on the ZIGChain side. For this, we have developed a native bridge using underlying technology from Axelar.`

## B-zig-native-denom
**VERIFIED** · ZIG / denom (needed by any app)

On ZIGChain mainnet the native ZIG base denom is 'azig' with 18 decimals; the staking bond_denom is 'azig'. Per ZIGChain docs, v5 changed the base unit from 'uzig' (6 decimals) to 'azig'.

*How:* Official LCD api.zigchain.com (listed in ZIGChain/networks zigchain-1/api-nodes.txt), block 12610424: /cosmos/staking/v1beta1/params and /cosmos/bank/v1beta1/denoms_metadata. Docs redenomination page read via WebFetch.

- <https://api.zigchain.com/cosmos/staking/v1beta1/params> · read 2026-10-02T20:46:59Z · height 12610424 · kept in [evidence/zig-denoms.json](zig-denoms.json) as `research/b/lcd_staking_params`
  `"bond_denom": "azig"`
- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata> · read 2026-10-02T20:46:57Z · height 12610423 · kept in [evidence/zig-denoms.json](zig-denoms.json) as `research/b/lcd_denoms_metadata`
  `"description": "The native staking and gas token of ZIGChain (18-decimal base denom azig)."`
- <https://docs.zigchain.com/about-zigchain/redenomination> · read 2026-10-02T20:47:30Z · read through WebFetch, a processed view of the page (not a byte copy)
  `ZIGChain v5 changes the native base unit from uzig (6 decimals) to azig (18 decimals)`

## B-zigchain-registry-stale-denom
**VERIFIED** · ZIG / denom (needed by any app)

ZIGChain's GitHub registry (main branch) still lists native ZIG as base_denom 'uzig' with 6 decimals, both in assets/native/zig.mainnet.json and in the generated chain-registry assetlist.json. That contradicts the on-chain azig (18 decimals) metadata.

*How:* Both files read today via raw.githubusercontent.com. The contradiction with the LCD is stated as observed; which source apps should follow is an open question.

- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/native/zig.mainnet.json> · read 2026-10-02T20:46:36Z · SHA-256 of the response body as received `f45c5bf3387b7b1d3bc1dd056379320ad5921cbf9936e8ac36022a24fa3d396e`
  `"decimals": 6, "display_denom": "ZIG", "base_denom": "uzig",`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/generated/chain-registry/zigchain/assetlist.json> · read 2026-10-02T20:46:37Z · SHA-256 of the response body as received `b1e379449865d2ecacc7b35a42cf26ff336bce7337f4a0bc31e937c2c2c270e2`
  `"symbol": "ZIG", "base": "uzig"`

## B-zigchain-decoy-zig
**VERIFIED** · ZIG / denom (a hazard for apps)

ZIGChain mainnet denom metadata includes a token-factory denom 'coin.zig153u6vhv4ds6x95chdnqmsduwxzpt0teh43alsk.zig' with name and symbol 'ZIG', described as a same-name decoy for testing. Matching by symbol alone could confuse it with native azig.

*How:* Literal entry in the official LCD /cosmos/bank/v1beta1/denoms_metadata response (block 12610423; first page of 602 records).

- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata> · read 2026-10-02T20:46:57Z · height 12610423 · kept in [evidence/zig-denoms.json](zig-denoms.json) as `research/b/lcd_denoms_metadata`
  `"description": "ZIG same-name Factory decoy for authorized deposit testing"`

## B-zig-erc20-contract
**VERIFIED** · checked again in [F23](../EVIDENCE_2026-10.md#f23) (CONFIRMED) · ZIG / ERC-20 representation

ZIGChain's registry gives the Ethereum counterparty of native ZIG (trace type 'additional-mintage', provider 'ZIGChain') as base_denom 0xb2617246d0c6c0087f18703d576831899ca94f01. The MiCAR paper says '$ZIG is an ERC-20 token on Ethereum and BEP-20 token on BNB Chain.'

*How:* Registry JSON read via raw.githubusercontent.com today; the MiCAR PDF was downloaded today. No BEP-20 contract address was found in any official source read (see B-zig-bep20-contract).

- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/native/zig.mainnet.json> · read 2026-10-02T20:46:36Z · SHA-256 of the response body as received `f45c5bf3387b7b1d3bc1dd056379320ad5921cbf9936e8ac36022a24fa3d396e`
  `"counterparty": { "chain_name": "ethereum", "base_denom": "0xb2617246d0c6c0087f18703d576831899ca94f01" }, "provider": "ZIGChain"`
- <https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf> · read 2026-10-02T20:32:06Z · SHA-256 of the PDF as received `0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9`
  `$ZIG is an ERC-20 token on Ethereum and BEP-20 token on BNB Chain.`

## B-zig-bep20-contract
**UNVERIFIED** · ZIG / BEP-20 representation

The BEP-20 (BNB Chain) contract address of ZIG.

*How:* Not found in the official sources read: the ZIGChain docs ZIG page (WebFetch says no contract addresses are shown), the MiCAR paper, Tokenomics 2.0 and the ZIGChain registry native asset file. It was not inferred from any other source.

- <https://docs.zigchain.com/about-zigchain/zig> · read 2026-10-02T20:31:30Z · read through WebFetch, a processed view of the page (not a byte copy)
  `No ERC-20 or BEP-20 contract addresses are provided on this page.`

## B-valdora-get-zig
**VERIFIED** · Acquiring ZIG / Valdora guide

Valdora's guide at /how-to-guides/get-your-usdzig-tokens is titled 'Get Your $ZIG Tokens'; the 'usdzig' in the URL is the slug of '$ZIG', not a stablecoin. It tells users to buy $ZIG on a CEX (examples: Bitget, Bybit) or swap ATOM or USDC for $ZIG on a DEX such as OroSwap, then withdraw or bridge to ZIGChain. No card or bank on-ramp is named.

*How:* Fetched today with curl (GitBook HTML). The CEX sentence is mangled by LaTeX rendering on the page; its LaTeX source is quoted. The 'Important' sentence is quoted verbatim.

- <https://docs.valdora.finance/how-to-guides/get-your-usdzig-tokens> · read 2026-10-02T20:34:26Z · SHA-256 of the response body as received `a7c12004d5e73da5ff280ecd046cbb7a0027f47534fa7b895ca17f4ea3d8c724`
  `Important: After purchase, make sure to withdraw or bridge $ZIG to the ZIG/Zignaly Chain, the network where Valdora operates.`
- <https://docs.valdora.finance/how-to-guides/get-your-usdzig-tokens> · read 2026-10-02T20:34:26Z · SHA-256 of the response body as received `a7c12004d5e73da5ff280ecd046cbb7a0027f47534fa7b895ca17f4ea3d8c724`
  `From a DEX: Swap tokens like ATOM or USDC for $ZIG using a decentralized exchange like OroSwap.`

## B-onramps-no-zigchain-network
**VERIFIED** · On-ramps / summary

None of the on-ramp lists read today (Transak, MoonPay, Banxa, Ramp, Mercuryo, Guardarian, Simplex, Stripe) has a ZIGChain network, so none delivers ZIGChain-native ZIG or a stablecoin on ZIGChain. Guardarian alone lists ZIG, as ERC-20 on ETH. MoonPay's only Noble asset (usdc_noble) is flagged isSuspended=true.

*How:* Each provider's official list or documented endpoint was read today and every field was searched for 'zig', 'zigchain' and 'noble' (details in the provider items). Onramper, Alchemy Pay, Kado and Coinbase could not be read (separate UNVERIFIED items).

- <https://api.moonpay.com/v3/currencies> · read 2026-10-02T20:37:03Z · SHA-256 of the response (compact JSON) `0b80306271a6e147c4f76ef99a94a46c574ad26df43ee4179d7a02d4fb760d7a`
  `"code": "usdc_noble", "name": "USD Coin", "isSuspended": true`

## B-transak-zig
**VERIFIED** · checked again in [F23](../EVIDENCE_2026-10.md#f23) (CONFIRMED) · On-ramp / Transak

Transak's public crypto-currencies endpoint returned 145 entries across 56 network names, none containing 'zig' or a ZIGChain or Noble network. ATOM is listed on network 'mainnet'. The marketing coverage page has no ZIG mention.

*How:* Documented production endpoint (base https://api.transak.com) called today without a key; HTTP 200 and the full JSON was saved. Note: this keyless call worked even though the docs mark x-api-key as required (see B-transak-auth).

- <https://api.transak.com/cryptocoverage/api/v1/public/crypto-currencies> · read 2026-10-02T20:35:38Z · SHA-256 of the response (compact JSON) `3ce009c5f08239d5d50aabe51f4ad6bb5bb376cee4267ab8d8f6478231dbb99e`
  `HTTP 200; response list of 145 objects (fields symbol/name/network); no object contains 'zig'`
- <https://docs.transak.com/api/public/get-crypto-currencies.md> · read 2026-10-02T20:35:15Z · SHA-256 of the response body as received `15539516063a159c2c5c2738a998e3809c281df9802d60a17bf62b9148086b1a`
  `This is a public API endpoint, so no authentication is required.`

## B-transak-auth
**VERIFIED** · On-ramp / Transak: what a business needs

Transak needs an account on its 'Partner Dashboard': the staging key is issued immediately and the production key after KYB approval. Widget URLs must be created server-side with the Create Widget URL API (single-use, valid 5 minutes); passing query parameters directly in the widget URL, including walletAddress, is deprecated. The Mandatory Security Changes page (deadline 15 July 2026) requires x-api-key on every call, including Public APIs, and backend static egress IP allowlisting. Listing a new token requires a one-time listing fee. KYC is multi-level (Light, Standard, Enhanced). Coverage claim: '136 + cryptocurrencies across 45 + blockchains in over 26 + countries'.

*How:* Read today from docs.transak.com Markdown pages and transak.com/crypto-coverage. Hand-off for a non-custodial app: a backend creates the widgetUrl (with walletAddress and network inside widgetParams), then the app redirects, iframes or uses the SDK.

- <https://docs.transak.com/guides/how-to-create-partner-dashboard-account.md> · read 2026-10-02T20:35:20Z · SHA-256 of the response body as received `e6d285006cf4246f9968e22941732abd86042ae3ba8cf4d9ffbaf186131255a1`
  `Once created, you get your **staging API key** immediately and unlock your **production API key** after KYB approval.`
- <https://docs.transak.com/guides/migration-to-api-based-transak-widget-url.md> · read 2026-10-02T20:35:19Z · SHA-256 of the response body as received `f00fede975355a3f16d18f3082da91176bc16d4377e35f61296739e52b3583c8`
  `Passing query parameters directly in the widget URL is **deprecated and no longer supported**.`
- <https://docs.transak.com/guides/mandatory-security-changes.md> · read 2026-10-02T20:35:19Z · SHA-256 of the response body as received `b55e35c6505ef01aa8a7eba730c3b7d37ba292ad5893279aa7add20b3fe10651`
  ``Send `x-api-key` on **every call** to the below mentioned Transak's APIs.``
- <https://docs.transak.com/guides/partner-faqs.md> · read 2026-10-02T20:35:26Z · SHA-256 of the response body as received `6f81078296d29ab212b88aab0f6bd2b7a46af68948b5f989fce5a8a6d3ff265b`
  `Token listings require a one-time listing fee.`
- <https://transak.com/crypto-coverage> · read 2026-10-02T20:35:03Z · SHA-256 of the response body as received `bc9e38493b110ee78e190c926c40466b22efe530db16e736567d4f81f9943da2`
  `Transak supports 136 + cryptocurrencies across 45 + blockchains in over 26 + countries`

## B-moonpay-zig
**VERIFIED** · checked again in [F23](../EVIDENCE_2026-10.md#f23) (CONFIRMED) · On-ramp / MoonPay

MoonPay's currencies data (the source that its official 'Supported currencies' docs page fetches without a key) has 121 non-fiat entries, 75 of them not suspended, over 51 network codes. None is ZIG or on ZIGChain. A 'noble' asset (usdc_noble) exists but is isSuspended=true, so the docs table hides it. ATOM on 'cosmos' is active.

*How:* dev.moonpay.com supported-currencies.md shows the docs component calling fetch("https://api.moonpay.com/v3/currencies"). That URL was fetched today (HTTP 200) and the full JSON saved.

> Second check (F23): usdc_noble has updatedAt 2026-09-16T13:32:07.704Z (the suspension date itself is not shown), notAllowedCountries ["CA"] and notAllowedUSStates ["NY","VI"].

- <https://dev.moonpay.com/platform/overview/supported-currencies.md> · read 2026-10-02T20:36:44Z · SHA-256 of the response body as received `b9965eed88ecf973acff7ddc156e087e961b69bc4098943da7f23f485a8a1f42`
  `return fetch("https://api.moonpay.com/v3/currencies");`
- <https://api.moonpay.com/v3/currencies> · read 2026-10-02T20:37:03Z · SHA-256 of the response (compact JSON) `0b80306271a6e147c4f76ef99a94a46c574ad26df43ee4179d7a02d4fb760d7a`
  `"code": "usdc_noble", ... "networkCode": "noble" ... "isSuspended": true`

## B-moonpay-setup
**VERIFIED** · On-ramp / MoonPay: what a business needs

MoonPay sets up business accounts and credentials directly; onboarding is an Account Review plus KYB, and production keys unlock after approval. The subscription 'paywall' was removed on 16 April 2026. New widget set-ups must sign URLs, and signing is required whenever walletAddress is passed; IP matching is mandatory to go live. Platform 'Ramps' are offered in every MoonPay region except the UK. MoonPay publishes a list of unsupported jurisdictions (e.g. Iceland, India, Japan, Russia).

*How:* Read today from dev.moonpay.com Markdown pages and support.moonpay.com articles. Hand-off: buy.moonpay.com?apiKey=&lt;publishable key> with a server-signed walletAddress, or the Web/React/RN SDKs.

- <https://dev.moonpay.com/widget/on-ramp/integration-methods/url.md> · read 2026-10-02T20:36:46Z · SHA-256 of the response body as received `2c767d371602c0d346fce912ee6051b4db213cbeda551e3638496a708e17fb5e`
  ``Signing is also required whenever you pass `walletAddress`, `walletAddresses`, or other sensitive parameters; the widget fails to load without it.``
- <https://dev.moonpay.com/platform/overview/availability.md> · read 2026-10-02T20:36:45Z · SHA-256 of the response body as received `95bec2b357909117e82efeb088113d72ad5502b87b6507fecd0ae5db50a11564`
  `| Ramps | Every region MoonPay supports, except the United Kingdom (GBR). |`
- <https://support.moonpay.com/en/articles/694185-partner-onboarding-overview-from-signup-to-going-live> · read 2026-10-02T20:50:35Z · SHA-256 of the response body as received `f8bb205a6493bf0a5505538acb704f3e01e42fd0a2b325bbd57e64e28503e9cc`
  `Your Production keys — the live ones — unlock once your KYB and product are approved.`
- <https://support.moonpay.com/en/articles/380968-moonpay-s-unsupported-countries> · read 2026-10-02T20:50:09Z · SHA-256 of the response body as received `2ed23275ac8cacaf18fdb17cccc1c1ee569bd6364996e77fc08445365f28063f`
  `Moonpay's services are not available to customers in the following jurisdictions:`

## B-banxa-zig
**VERIFIED** · On-ramp / Banxa

Banxa's official 'Supported Crypto Assets & Blockchains' table (355 rows) has no ZIG, no ZIGChain and no Noble network. ATOM is listed as buy-only.

*How:* docs.banxa.com Markdown page fetched today; all rows searched.

- <https://docs.banxa.com/products/hosted-checkout/docs/reference/supported-cryptocurrencies-and-blockchains.md> · read 2026-10-02T20:37:41Z · SHA-256 of the response body as received `01b6a9459cce190e30d568a2bf7df2b354bb1a21eb043a49427c4a334507cdaf`
  `All cryptocurrencies and blockchain networks supported by Banxa for on-ramp and off-ramp transactions.`

## B-banxa-setup
**VERIFIED** · On-ramp / Banxa: what a business needs

Banxa's hosted hand-off (Banxa names it 'Referral') needs no backend, but uses a business subdomain that Banxa provides during onboarding. Production is enabled by Banxa after testing approval, and the Native API requires a signed agreement. Banxa says it is the regulated entity responsible for KYC/AML, publishes a list of unsupported countries, and claims '150+ countries, 45 global licences'.

*How:* Read today from docs.banxa.com Markdown pages. Hand-off: `https://{partnerRef}.banxa.com/?walletAddress=...&coinType=...&blockchain=...`, or an API-created checkoutUrl.

- <https://docs.banxa.com/products/hosted-checkout/docs/referral-integration/constructing-referral-urls.md> · read 2026-10-02T20:37:42Z · SHA-256 of the response body as received `6dfa0768602aa15f03a11b6accf5a8f7340a40f2916fbb68d45a7c1da480a613`
  ``Your `{partnerRef}` is your partner subdomain, provided by Banxa during onboarding.``
- <https://docs.banxa.com/products/hosted-checkout/docs/getting-started/access-and-setup.md> · read 2026-10-02T20:37:43Z · SHA-256 of the response body as received `198ef592b377aa2ec487d2be162117432a5150a975a5afce8c97b0640aa16cca`
  `The Native API is not enabled by default and is not self-serve. Access is granted per account under a signed agreement with Banxa that covers headless integration.`
- <https://docs.banxa.com/products/hosted-checkout/docs/identity-compliance/verification-flow-and-tiers.md> · read 2026-10-02T20:37:43Z · SHA-256 of the response body as received `e6835551b4798a62fafe5c551d2665b33c50155e72d8e078e0485bf4cd3f5d56`
  `Banxa is the regulated entity responsible for KYC and AML compliance.`
- <https://docs.banxa.com/products/hosted-checkout/docs/reference/geographic-and-asset-restrictions.md> · read 2026-10-02T20:37:41Z · SHA-256 of the response body as received `b79233d61379502bf6957b3a7e570538db7699c134c191d56143109d4c9bad7b`
  `Banxa does not service customers in the following countries. A mobile number from any of these countries will likely cause an error during KYC sharing:`

## B-ramp-zig
**VERIFIED** · On-ramp / Ramp Network

Ramp Network's documented host-api v3 assets endpoint returned 125 assets on 38 chains by default, and 214 assets when disabled and hidden assets are included. None is ZIG or on a ZIGChain or Noble chain. ATOM on chain COSMOS is listed.

*How:* The docs (docs.rampnetwork.com/rest-api-v3-reference) document GET https://api.rampnetwork.com/api/host-api/v3/assets with hostApiKey optional. Called today without a key: both calls returned HTTP 200.

- <https://api.rampnetwork.com/api/host-api/v3/assets?withDisabled=true&withHidden=true> · read 2026-10-02T20:38:48Z · SHA-256 of the response (compact JSON) `69b5d6c95e288a7e921db6762605ad4def6567ffd60017f068e8ebe2bcd90b0a`
  `HTTP 200; 214 assets; none with 'zig' in any field`
- <https://docs.rampnetwork.com/rest-api-v3-reference> · read 2026-10-02T20:38:26Z · SHA-256 of the response body as received `e4f33337e426b75e782fb8a362b4cae4be829ca2ddc92eb184c13b6f34685e7a`
  `hostApiKey (optional): if you have a custom integration, provide the key to access your enabled features.`

## B-ramp-setup
**VERIFIED** · On-ramp / Ramp Network: what a business needs

Ramp's widget needs an active production API key, obtained through a form and Ramp's onboarding; hostApiKey is described as a required widget parameter. Hosted mode redirects to https://app.rampnetwork.com/ with configuration parameters, and userAddress can prefill the destination address. Ramp says card purchases need basic KYC and are available in all countries Ramp supports.

*How:* Read today from docs.rampnetwork.com pages; docs.ramp.network redirects there.

- <https://docs.rampnetwork.com/getting-started> · read 2026-10-02T20:38:24Z · SHA-256 of the response body as received `69683dd7259e54e22002d4b5daf42b04d0f0a006b168a22f681fbe798b6c8d93`
  `⚠️ Please note that the widget won't work without an active production API key!`
- <https://docs.rampnetwork.com/configuration> · read 2026-10-02T20:38:25Z · SHA-256 of the response body as received `de3a2b5a548d2237c099a735334e7038a56a2ee8209056939fd9fbcd4cbf1e5a`
  `A required string parameter that allows our system to properly recognize and count purchases made through your API integration.`

## B-onramper-zig
**UNVERIFIED** · On-ramp / Onramper

Onramper's official crypto and network coverage lists include ZIG or ZIGChain.

*How:* Could not read the lists. docs.onramper.com/docs/crypto-asset-support and network-support embed https://docs-archive.onramper.com/embedded/coverage?type=crypto|network, which renders client-side (Next.js shell; WebFetch saw no content). The /supported API takes an Authorization API key, and none was used.

- <https://docs.onramper.com/docs/crypto-asset-support.md> · read 2026-10-02T20:39:20Z · SHA-256 of the response body as received `9488b730d67b8b15e2671ae013d5c4258ceaf0d98e0c7c1fe5c99254738f09d2`
  `<Embed url="https://docs-archive.onramper.com/embedded/coverage?type=crypto"`

## B-onramper-setup
**VERIFIED** · On-ramp / Onramper: what a business needs

Onramper requires an incorporated legal entity, KYB, a monthly or annual subscription fee and a production API key. A widget URL that carries wallet addresses must be signed, or checkout is rejected. Onramper's coverage claim: '190+ countries'.

*How:* Read today from docs.onramper.com Markdown pages. Hand-off: buy.onramper.com with apiKey plus signed 'wallets' or 'networkWallets' parameters.

- <https://docs.onramper.com/docs/step-by-step-guide.md> · read 2026-10-02T20:39:22Z · SHA-256 of the response body as received `64c070aded4446c0a4eb8701647a641e74e4a3334fe2908556775dac0df607a8`
  `You are aware that there is a monthly/annual subscription fee for using Onramper.`
- <https://docs.onramper.com/docs/supported-widget-parameters.md> · read 2026-10-02T20:39:22Z · SHA-256 of the response body as received `31ac64d72cf31f4607c402ae2cc90a221ae363addb9a574d5d1b1e974031254c`
  `Otherwise checkout requests are going to be rejected.`

## B-mercuryo-zig
**VERIFIED** · On-ramp / Mercuryo

Mercuryo's documented public currencies endpoint lists 54 cryptocurrencies across 34 networks. None is ZIG, and there is no ZIGChain or Noble network; COSMOS (ATOM) is present.

*How:* Mercuryo's widget OpenAPI document (`widget.docs.mercuryo.io`) marks GET /lib/currencies with security: []. Production base https://api.mercuryo.io/v1.6 was called today without a key (HTTP 200). The help-center crypto list is bot-walled.

- <https://api.mercuryo.io/v1.6/lib/currencies> · read 2026-10-02T20:40:57Z · SHA-256 of the response (compact JSON) `382ecdc777c93a1ab782119f60109284095164f2c2f21fc08e8345af2a53afbb`
  `"crypto": ["BTC", "ETH", "USDT", "USDC", ... "ATOM", ...] (no ZIG)`
- <https://widget.docs.mercuryo.io/api/widget-partner/openapi.json> · read 2026-10-02T20:40:41Z · SHA-256 of the response body as received `b4be080e8be1c85ca3af501b01fe40140bfe0fda8f0d5db9d4d2e253877e6a29`
  `GET /lib/currencies | Get supported currencies | security: []`

## B-mercuryo-setup
**VERIFIED** · On-ramp / Mercuryo: what a business needs

Mercuryo needs dashboard credentials from an 'integration manager': a Widget ID plus a Secret used to sign every on-ramp URL. The hand-off is exchange.mercuryo.io?widget_id=...&address=...&merchant_transaction_id=...&signature=v2:.... Mercuryo runs KYC through SumSub, with light KYC (no documents) up to €699, and says it is 'available in most countries worldwide'.

*How:* Read today from widget.docs.mercuryo.io Markdown pages.

- <https://widget.docs.mercuryo.io/guide/getting-started/overview/index.md> · read 2026-10-02T20:40:26Z · SHA-256 of the response body as received `7397eb9c32ae9cebbd0dca08182a00c97f9bb0609d192821d868dbafabd7c4a6`
  `KYC is handled by Mercuryo via SumSub, with a light-KYC option (no documents required) available for transactions up to €699.`
- <https://widget.docs.mercuryo.io/guide/integration/security/index.md> · read 2026-10-02T20:40:27Z · SHA-256 of the response body as received `ed14be9a815b43e8a2ea00ab03014cdfbcfc66525b4f617eab8ecea0d15679d2`
  ``The `signature` parameter protects On-Ramp widget URLs from forgery. It must be included in every On-Ramp request.``
- <https://widget.docs.mercuryo.io/guide/more/faq/index.md> · read 2026-10-02T20:40:39Z · SHA-256 of the response body as received `f4221cd261c20236c980caca8f13d733927ac0831f70117fe1015ce86198f81d`
  `Mercuryo is available in most countries worldwide.`

## B-alchemypay-zig
**UNVERIFIED** · On-ramp / Alchemy Pay

Alchemy Pay's official crypto and network coverage includes ZIG or ZIGChain.

*How:* The coverage list linked from the docs is a Notion page (alchemypay.notion.site) that renders as a JS shell to WebFetch. The crypto-list API needs merchant appid, timestamp and sign. The docs 'Network Code' page, which is not described as a complete list, has no ZIGChain or Noble entry.

- <https://alchemypay.readme.io/docs/crypto-currency-coverage.md> · read 2026-10-02T20:41:16Z · SHA-256 of the response body as received `fad607451b09f15d2c1c06bfc694a3fb284df4989649629fd63eac26b888e82b`
  `Check supported crypto and network for onramp and offramp:`
- <https://alchemypay.readme.io/docs/crypto-query.md> · read 2026-10-02T20:41:18Z · SHA-256 of the response body as received `77717145f03e42a734fcbcc81d9237769f5a4bc08a92c350458973b3caee26d1`
  `Partner unique ID, once a merchant has been on-boarded with Alchemy Pay, the merchant will be provided with the credentials with appId and appSecret`

## B-alchemypay-setup
**VERIFIED** · On-ramp / Alchemy Pay: what a business needs

Alchemy Pay onboarding starts by contacting sales. The merchant gets an appId and appSecret, every redirect URL (ramp.alchemypay.org?appId=...) must carry a signature, outbound IPs must be registered before go-live, and an 'address' parameter can lock the destination wallet.

*How:* Read today from alchemypay.readme.io Markdown pages. KYC limits and the country list are on Notion pages that were not readable.

- <https://alchemypay.readme.io/docs/page-integration-2.md> · read 2026-10-02T20:41:17Z · SHA-256 of the response body as received `0d20b613881fe56cf9533e9691fa8c178e4f4b51bb55ccc23a8e626b2f6cb43d`
  `**The URL that the merchant redirects to must include the signature string.`
- <https://alchemypay.readme.io/docs/merchant-access-and-integration-guide.md> · read 2026-10-02T20:41:17Z · SHA-256 of the response body as received `ad9f9a216dba41bc14bcebf81d49bf40bd8d0b964b4271c4b92c39d9e44d6382`
  `## Step 1: Contact Us For Sales`

## B-kado-zig
**UNVERIFIED** · On-ramp / Kado

Kado's official supported-asset list includes ZIG or ZIGChain.

*How:* Not readable. https://kado.money/ goes to www.kado.money, which 301-redirects to https://swapped.com. https://docs.kado.money/ failed (curl TLS internal error, WebFetch HTTP 503). https://app.kado.money/ is a JS shell with no asset data.

- <https://www.kado.money/> · read 2026-10-02T20:41:36Z · SHA-256 of the file as received `55543a12b22defc68438ea7ec8db8eb13fab6a581453833bcedc731d2727dfa5`
  `HTTP/2 301 ... location: https://swapped.com`

## B-guardarian-zig
**VERIFIED** · checked again in [F23](../EVIDENCE_2026-10.md#f23) (CONFIRMED) · On-ramp / Guardarian (ZIG listed, ERC-20 only)

Guardarian's documented public API lists ZIG (name 'ZIGChain', enabled, is_available true) with one network, 'ETH', and token_contract 0xb2617246d0c6c0087f18703d576831899ca94f01. That address matches the ethereum trace in ZIGChain's registry. No ZIGChain-native network is listed. The public min-max-range endpoint recognises the pairs eur_zig-eth and usd_zig-eth (HTTP 200), while a made-up coin returns 404. Guardarian's currencies page data also has a 'ZIGChain' record with network 'eth', isBuy true and isSell true.

*How:* The OpenAPI spec embedded at https://api-payments.guardarian.com/v1/api-docs gives GET /v1/currencies/{ticker}, /v1/currencies/crypto and /v1/market-info/min-max-range/{from_to} no security requirement. They were called today without a key (HTTP 200). End-to-end fiat purchasability needs the key-protected /v1/estimate, which was not called, and min/max values are not reported here.

> Second check (F23): Guardarian labels the network "ZIGChain", but its network code is ETH and its explorer is Etherscan. ZIGChain's registry records that contract as an "additional-mintage" trace, so buying ZIG there delivers the Ethereum ERC-20, not native ZIG.

- <https://api-payments.guardarian.com/v1/currencies/ZIG> · read 2026-10-02T20:42:43Z · SHA-256 of the response (compact JSON) `94605851008ecc727a731fe447f6bac23d48b62dcec99dc1f8c6c0c16ba9f391`
  `"ticker": "ZIG", "name": "ZIGChain", "enabled": true, ... "networks": [{"name": "ZIGChain", "network": "ETH", ... "token_contract": "0xb2617246d0c6c0087f18703d576831899ca94f01"`
- <https://api-payments.guardarian.com/v1/market-info/min-max-range/eur_zig-eth> · read 2026-10-02T20:43:28Z · SHA-256 of the response (compact JSON) `255c763a87c5fd39e72d4f658eaeb25e1cf4d90abb9594096ba9d7ebf03ad753`
  `{"from": "EUR", "to": "ZIG", "min": ..., "max": ...} (HTTP 200)`
- <https://guardarian.com/currencies> · read 2026-10-02T20:42:03Z · SHA-256 of the file as read `91b1c7af5e27bcba85324b7a4d4a5977e3518fc9bf5c6b56e9e260c0c2cc8fae`
  `"currentTicker":"zig","name":"ZIGChain","link":null,"network":"eth" ... "isBuy":true,"isSell":true`

## B-guardarian-setup
**VERIFIED** · On-ramp / Guardarian: what a business needs

Using Guardarian starts with a signed contract, which gives a business account and an API token. POST /v1/transaction (x-api-key required) returns a redirect_url to Guardarian checkout, and pre-setting the payout wallet address needs the allow_preset_payout_address permission. Guardarian says it handles payments, KYC, the exchange and the payout. Its countries API returns 250 countries, 128 flagged supported:true, while its business page (`guardarian.com/for-partners`) claims '170+ Supported countries'. Guardarian says it is registered in the Czech Republic (registry code 22304681).

*How:* Read today from guardarian.com/api-doc, the embedded OpenAPI spec, `guardarian.com/for-partners`, the guardarian.com home FAQ, and GET /v1/countries (no security requirement). Affiliate and referral parameters are deliberately left out.

- <https://guardarian.com/api-doc> · read 2026-10-02T20:42:04Z · SHA-256 of the response body as received `2ae0a6f1959f4b0cc92a1f7678500f0a0124141d422a3fa1d327a5e21b713e45`
  `Sign a contract with Guardarian`
- <https://guardarian.com/api-doc> · read 2026-10-02T20:42:04Z · SHA-256 of the response body as received `2ae0a6f1959f4b0cc92a1f7678500f0a0124141d422a3fa1d327a5e21b713e45`
  `Guardarian handles payments, KYC, the exchange itself and the payout.`
- <https://api-payments.guardarian.com/v1/api-docs> · read 2026-10-02T20:41:57Z · SHA-256 of the file as read `05a3523c3d6456b54c7e4af33d7075b22d6de94a9fc9c55c8fedf21a68006233`
  `` `payout_info.payout_address` (string, body) - Pre-set payout address (requires `allow_preset_payout_address` permission) ``
- <https://api-payments.guardarian.com/v1/countries> · read 2026-10-02T20:43:29Z · SHA-256 of the response (compact JSON) `4bcac96dde13fc96a30dc99751dd4e05f9cd6d8c2df5c0a50825d4e65c3fcf17`
  `250 country objects; 128 with "supported": true`

## B-simplex-zig
**VERIFIED** · On-ramp / Simplex (Nuvei)

Simplex's 'Supported currencies' docs page has a static crypto table of 244 rows. None is ZIG and no row uses a ZIGChain or Noble network; ATOM on Cosmos is listed. The page itself claims 247 supported crypto assets.

*How:* `integrations.simplex.com` supported_currencies.md fetched today and the table rows parsed.

- <https://integrations.simplex.com/docs/supported_currencies.md> · read 2026-10-02T20:44:19Z · SHA-256 of the response body as received `72a9ff1578e1f61bd91560225d9139ce7bb58daeec0f682145021a787a867a60`
  `Simplex supports payments with 88 fiat currencies, allowing your customers to purchase any of our 247 supported crypto assets in their local currency.`

## B-simplex-setup
**VERIFIED** · On-ramp / Simplex: what a business needs

Simplex describes itself as an EU-licensed financial institution. Its options are an iFrame form initialised with a business public key on an allow-listed domain (wallet_address can be prefilled), a Wallet API for businesses whose servers have static IPs, and a JWT API signed with an API secret. No KYC statement or country list was found in the pages read.

*How:* Read today from `integrations.simplex.com` Markdown pages. Referral parameters in the examples are deliberately left out.

- <https://integrations.simplex.com/docs/getting-started.md> · read 2026-10-02T20:44:20Z · SHA-256 of the response body as received `821703abedeac804ea11cd406fe01b39cc105b1f4003b7d22bb1a556f5a6ef83`
  `Simplex by Nuvei is an EU-licensed financial institution empowering the crypto industry with a full fiat infrastructure.`
- <https://integrations.simplex.com/docs/iframe.md> · read 2026-10-02T20:51:09Z · SHA-256 of the response body as received `d8f06067f463229fd485c2027933f0f19cb9f74cfb91f7cf68def595a228e50e`
  `Simplex.init({public_key: '<partner_public_key>'})`

## B-coinbase-zig
**UNVERIFIED** · On-ramp / Coinbase Onramp

Coinbase Onramp supports ZIG (on any network).

*How:* The asset list comes only from the Onramp Options API (api.developer.coinbase.com/onramp/v1/buy/options), which needs a CDP API key; it was not called. The FAQ says Onramp supports all assets available on Coinbase.com, but whether ZIG is on Coinbase.com was not checked in an official source. Coinbase does not appear in the ZIGChain docs exchange table.

- <https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md> · read 2026-10-02T20:45:09Z · SHA-256 of the response body as received `6bbf81078feece5b23779b39ca00db00f8480cf290ffe4322a33fd57fe0698fa`
  `Coinbase Onramp supports all assets and networks available for trade/send/receive on Coinbase.com.`
- <https://docs.cdp.coinbase.com/onramp/coinbase-hosted-onramp/countries-&-currencies.md> · read 2026-10-02T20:45:08Z · SHA-256 of the response body as received `a94a29a565623f9fce807d44dd869bc8cdc162779e30c8337372d4f71afeda52`
  `cdpcurl -k /tmp/cdp_api_key.json 'https://api.developer.coinbase.com/onramp/v1/buy/options?country=US&subdivision=NY'`

## B-coinbase-setup
**VERIFIED** · On-ramp / Coinbase Onramp: what a business needs

Coinbase-hosted Onramp needs a single-use session token, valid 5 minutes, created on the backend with CDP API key and JWT authentication. Redirect URLs must be on the CDP Portal domain allowlist. Guest checkout through the hosted widget is deprecated as of 30 June 2026. Coinbase says Onramp is available everywhere Coinbase operates except Japan and is free for developers.

*How:* Read today from docs.cdp.coinbase.com Markdown pages.

- <https://docs.cdp.coinbase.com/onramp/coinbase-hosted-onramp/overview.md> · read 2026-10-02T20:45:07Z · SHA-256 of the response body as received `2d253174541a11d94d428343ed7b2cae4e7fc05d7c5b9086580c3fbdfbfc4627`
  `You must create a new [session token](/api-reference/rest-api/onramp-offramp/create-session-token) from your backend for each user session. Tokens are single-use and expire after 5 minutes.`
- <https://docs.cdp.coinbase.com/onramp/additional-resources/faq.md> · read 2026-10-02T20:45:09Z · SHA-256 of the response body as received `6bbf81078feece5b23779b39ca00db00f8480cf290ffe4322a33fd57fe0698fa`
  `Coinbase Onramp is available in all countries which Coinbase operates except Japan.`

## B-stripe-zig
**VERIFIED** · On-ramp / Stripe crypto onramp

Stripe's onramp currency list ('available in the US and EU') has 14 entries: ETH on Ethereum and Base, SOL, POL, MATIC, BTC, AVAX, XLM, and USDC on Ethereum, Solana, Polygon, Avalanche, Base and Stellar. There is no ZIG and no ZIGChain or Noble network.

*How:* docs.stripe.com/crypto/onramp/stripe-hosted.md fetched today.

- <https://docs.stripe.com/crypto/onramp/stripe-hosted.md> · read 2026-10-02T20:45:42Z · SHA-256 of the response body as received `09a568b43eb52ca163972d155ca4f7b6192132973052b4fd748d579271e06e6f`
  `The following currencies are available in the US and EU. Available currencies are subject to change.`

## B-stripe-setup
**VERIFIED** · On-ramp / Stripe: what a business needs

Every Stripe onramp mode, including test environments, needs an approved onramp application. The embedded onramp is limited to the EU and the US (excluding Hawaii). Prefilling the destination wallet address needs a session minted server-side with a Stripe account. Stripe says it handles KYC and sanctions screening.

*How:* Read today from docs.stripe.com Markdown and HTML pages.

- <https://docs.stripe.com/crypto/onramp.md> · read 2026-10-02T20:45:35Z · SHA-256 of the response body as received `d2ffbfece6c1f6d96fa2ed2924fed7e964d77086441926f259a3d4dbafddabf4`
  `To access any of the onramps, you must first [submit an onramp application](https://docs.stripe.com/crypto/onramp.md#submit-your-application).`
- <https://docs.stripe.com/crypto/onramp> · read 2026-10-02T20:45:36Z · not readable; see [Pages that could not be read](../EVIDENCE_2026-10.md#pages-that-could-not-be-read)
  `We also handle all regulatory requirements, know your customer (KYC) verifications, and sanctions screening.`
- <https://docs.stripe.com/crypto/onramp/embedded.md> · read 2026-10-02T20:45:42Z · SHA-256 of the response body as received `ec1729b7f7f8a3e1e216960d6df845c9357fc8cec2b188b058ad213e1fa65520`
  `1. The embedded onramp is only available in the EU and the US (excluding Hawaii).`
