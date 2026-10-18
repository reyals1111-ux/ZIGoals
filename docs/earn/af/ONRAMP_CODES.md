# On-ramp asset codes — Ramp Network and Banxa (Session AF Part 0, owner amendment 2)

> Read on 2026-10-18 between 22:34 and 22:41 UTC (00:34–00:41 Brussels on 2026-10-19) by the Part 0 research helper; GET only, public pages and
> public APIs only, no key, no account, nothing typed into any form. Research only: not legal, tax or financial advice; no endorsement, no
> partnership. Machine-readable twin: [`onramp-codes.json`](onramp-codes.json) (every row below, with its source and read time). Ramp's numbers
> are EUR and move; ZIGoals should read Ramp's list live through a server route (ADR-028 H16 (d)) and use this file for the codes and the
> parameter names, not for the figures. Builds on [R3_ONRAMPS.md](R3_ONRAMPS.md) §5 and §7; where tonight's read differs from R3, it is said below.

## What tonight settles

1. **Ramp's asset code is `CHAIN_SYMBOL`, and `COSMOS_ATOM` is now read, not inferred.** Ramp's docs page https://docs.rampnetwork.com/assets
   fills its table client-side; rendered in Chrome at 22:39:59Z it lists 126 on-ramp rows under the column "swapAsset symbol" (`BASE_USDC`,
   `COSMOS_ATOM`, `SOLANA_SOL`, `BTC_BTC`, `ETH_ETH` …) and 91 off-ramp rows. Every enabled, visible row of USDC, USDT, ETH, SOL, BTC and ATOM in
   the public assets API has its `chain` + `_` + `symbol` code in that table (R3's open question "COSMOS_ATOM is inferred" is closed).
2. **The current parameter names** (https://docs.rampnetwork.com/configuration, read 22:34:21Z): `enabledCryptoAssets`, `inAsset`, `outAsset`,
   `inAssetValue`, `outAssetValue` are the "New Unified Parameters"; `swapAsset`, `offrampAsset`, `defaultAsset`, `swapAmount`, `fiatCurrency`
   and `fiatValue` are marked "⚠️ Deprecated" (the migration guide says the widget still converts them). `hostApiKey`, `hostAppName` and
   `hostLogoUrl` are "required"; `userAddress` and `finalUrl` are optional, and `finalUrl` is "only available for the hosted integration and
   on-ramp flow".
3. **Without a key nothing past the first screen can be verified.** `https://app.demo.rampnetwork.com/?…&enabledCryptoAssets=COSMOS_ATOM…` (and
   the same with `BASE_USDC`, and production `app.rampnetwork.com`) loads with HTTP 200 but, with no `hostApiKey`, shows only "INTEGRATION ISSUE
   DETECTED — The application isn't properly connected to Ramp Network" (read 22:40:01–22:40:13Z; screenshots in
   `$HOME/zigoals-af/captures/reference/ramp-probe/`). Whether the widget pre-selects the code and accepts a `cosmos1…` `userAddress` needs the
   owner's demo key.
4. **Banxa's codes are two columns of one table**: `coinType` = the "Code" column and `blockchain` = the "Network" column of
   https://docs.banxa.com/reference/supported-cryptocurrencies-and-blockchains.md (read 22:40:35Z, 35,549 bytes, unchanged size since R3) —
   e.g. ATOM is `coinType=ATOM&blockchain=ATOM` (not `COSMOS`), USDC on Base is `coinType=USDC&blockchain=BASE`, ETH on Arbitrum is
   `coinType=ETH&blockchain=ARB`. Banxa sells **no USDT on Base** (USDT rows: ARB, ETH, MATIC, SOL, BSC, TRON … but no BASE).
5. **`returnUrl` vs `redirectUrl`**: the referral pages say `returnUrl` (supported-parameters, referral overview, constructing-referral-urls'
   encoding note, and the legacy referral-link page); `redirectUrl` appears only on pages about orders created through the API (`POST /v2/buy`
   body field, "Yes" required; redirect/web; redirecting-to-checkout; customer-journey). A referral link therefore uses `returnUrl`; sandbox
   still has to confirm it (Banxa sandbox needs a partner subdomain; `zigoals.banxa-sandbox.com` and `zigoals.banxa.com` give no DNS answer at
   22:41:04Z).

## The recommended network per asset (both providers sell it there)

| Asset | Recommended network | Ramp code | Banxa `coinType` / `blockchain` | Why | Onto ZIGChain from there (see [ROUTES_ONTO_ZIGCHAIN.md](ROUTES_ONTO_ZIGCHAIN.md)) |
|---|---|---|---|---|---|
| USDC | Base | `BASE_USDC` (min €6, network fee €0.01) | `USDC` / `BASE` | cheapest network fee among the EVM rows both list; Ethereum costs more gas for the next step | Skip Go: CCTP V2 → Injective → ZIGChain as USDC.inj (two signatures, ~18.5 min per Skip) |
| USDT | Ethereum | `ETH_USDT` (min €6, €0.01) | `USDT` / `ETH` | the only USDT with a clean route onto ZIGChain (IBC Eureka); Banxa has no USDT on Base | Skip Go: Eureka → Cosmos Hub → ZIGChain (one signature, ~20.5 min) — the ZIGChain USDT pool is tiny |
| ETH | Ethereum for ZIGChain; Base or Arbitrum to hold | `ETH_ETH` (min €6, €0.02) / `BASE_ETH`, `ARBITRUM_ETH` (€0.01) | `ETH` / `ETH`, `BASE`, `ARB` | only Ethereum ETH has a swap-free route onto ZIGChain | Skip Go limited to Eureka: wrap → Eureka → Hub → ZIGChain (one signature, ~20.5 min) — the ZIGChain ETH pool is tiny |
| SOL | Solana | `SOLANA_SOL` (min €6, €0.01) | `SOL` / `SOL` | its only network | no route onto ZIGChain checked or offered; hold on Solana |
| BTC | Bitcoin | `BTC_BTC` (min €6, network fee €0.23) | `BTC` / `BTC` (Banxa's `LN` row is restricted in BE and the rest of the EU) | its only main network | none onto ZIGChain without a swap elsewhere; hold on Bitcoin |
| ATOM | Cosmos Hub | `COSMOS_ATOM` (min €6.25, €0.01) | `ATOM` / `ATOM` (buy only; restricted UK, US) | the existing route B (H33/H49) | IBC Hub channel-1555 → ZIGChain channel-4 (one signature, ~30 s per Skip) |

The wallet address each needs is the person's own on that network: `0x…` from an EVM wallet for Base/Ethereum/Arbitrum, Solana base58 from
Phantom, a Bitcoin address, `cosmos1…` from Keplr (formats derived from the network; neither provider publishes an "address type" field —
Ramp's `type` is the asset standard: `NATIVE`, `ERC20`, `SPL` …).

## Ramp hosted mode — the parameters

Base URLs: production `https://app.rampnetwork.com/`, demo `https://app.demo.rampnetwork.com/` (demo minimum €0.05; "All the remaining
assets(e.g. BTC) are mocked"; https://docs.rampnetwork.com/testing-environment, read 22:34:46Z). Encode values with `encodeURIComponent`.

| Parameter | Required | Accepts | Status | ZIGoals |
|---|---|---|---|---|
| `hostApiKey` | yes | the partner's public key ("allows our system to properly recognize and count purchases") | current | owner supplies (demo and production) |
| `hostAppName` | yes | string | current | `ZIGoals` |
| `hostLogoUrl` | yes | https URL | current | a ZIGoals-hosted logo |
| `enabledCryptoAssets` | no | comma-separated codes, first = default (e.g. `BASE_USDC`, `COSMOS_ATOM`) | current (replaces `swapAsset`, `offrampAsset`) | the one code the person chose |
| `outAsset` | no | on-ramp: the crypto code received | current (replaces `defaultAsset`) | same code |
| `inAsset` | no | on-ramp: fiat code, e.g. `EUR` | current (replaces `fiatCurrency`) | `EUR` |
| `inAssetValue` | no | on-ramp: fiat in minor units ("10.00" EUR → "1000") | current (replaces `fiatValue`) | optional amount |
| `outAssetValue` | no | on-ramp: crypto in base units | current (replaces `swapAmount`) | not used |
| `userAddress` | no | "pre-sets the address the crypto will be sent to" | current | the person's own address on the matching network |
| `defaultFlow` / `enabledFlows` | no | `ONRAMP` / `OFFRAMP`; hosted mode takes a comma-separated string | current | `ONRAMP` / `ONRAMP` |
| `selectedCountryCode` | no | ISO 3166-1 alpha-2 | current | not used (Ramp remembers) |
| `paymentMethodType` | no | `MANUAL_BANK_TRANSFER`, `AUTO_BANK_TRANSFER`, `PIX`, `APPLE_PAY`, `GOOGLE_PAY`, `CARD_PAYMENT` (on-ramp only) | current (old `SEPA`, `CARD`, `APPLEPAY` … deprecated) | not used |
| `finalUrl` | no | https URL; hosted on-ramp only; redirect after completing | current | the Add money return page |
| `successUrl` / `failureUrl` | no | https URL; "Back to partner" button, opens a new tab | current | optional |
| `swapAsset`, `defaultAsset`, `swapAmount`, `fiatCurrency`, `fiatValue`, `offrampAsset` | no | legacy forms of the above (`swapAsset` also takes `CHAIN_*` wildcards) | **deprecated** | do not use |
| `userEmailAddress` | no | pre-fills an e-mail | current | **never** (personal data in a URL) |
| `webhookStatusUrl`, `offrampWebhookV3Url` | no | webhook URLs | current | **never** (creates inbound data) |
| `variant`, `url`, `containerNode`, `hideExitButton`, `useSendCryptoCallback` | no | SDK / embedded / off-ramp options | current | not used in hosted mode |

Template (public values only; the key is the owner's):
`https://app.rampnetwork.com/?hostApiKey=<owner key>&hostAppName=ZIGoals&hostLogoUrl=<https logo>&defaultFlow=ONRAMP&enabledFlows=ONRAMP&enabledCryptoAssets=BASE_USDC&outAsset=BASE_USDC&inAsset=EUR&userAddress=<the person's 0x… address>&finalUrl=<https return page>`

The public assets API (`GET /host-api/v3/assets`, https://docs.rampnetwork.com/rest-api-v3-reference) documents `currencyCode`, `hostApiKey`,
`userIp`, `withDisabled` ("assets with enabled: false will be returned … temporarily disabled, for example due to maintenance") and `withHidden`;
the fields are `symbol`, `chain`, `name`, `decimals`, `type`, `address` (token contract), `logoUrl`, `enabled`, `hidden`, `price`, `currencyCode`,
`minPurchaseAmount`, `maxPurchaseAmount` ("-1 means unlimited (global limits are used)"), `minPurchaseCryptoAmount` ("in wei/units"),
`networkFee` ("added on top of Ramp Network's fee"). Tonight (EUR, read 22:34:00Z): 126 assets by default, 219 with `withDisabled=true`, 221 with
`withDisabled=true&withHidden=true`; global `minPurchaseAmount` 6, `maxPurchaseAmount` 15000, `minFeePercent` 0.99, `maxFeePercent` 3.9,
`minFeeAmount` 2.49 — unchanged from R3. No ZIG and no ZIGChain network in any of the three lists.

## Banxa referral — the parameters

URL: `https://{partnerRef}.banxa.com/?{parameters}`, sandbox `https://{partnerRef}.banxa-sandbox.com/?{parameters}`; `{partnerRef}` is
"provided by Banxa during onboarding" (constructing-referral-urls.md). "All parameters are optional"; "Parameter names are case-sensitive";
"Payment method cannot be pre-selected via a referral URL parameter"; "There are no server-to-server API calls. No backend is required"
(overview.md; webhooks "—" for Referral). Read 22:40:35–22:40:52Z.

| Parameter | Accepts (as the referral docs say) | ZIGoals |
|---|---|---|
| `coinType` | coin code, e.g. `ETH` — the "Code" column | the asset |
| `blockchain` | "Blockchain network code", e.g. `ETH` — the "Network" column; Banxa's default network for the coin if omitted | always pass it (a wrong network loses funds) |
| `walletAddress` | the customer's address, URL-encoded | the person's own address |
| `walletAddressTag` | memo/tag (BNB, XRP …) | not needed for the six assets |
| `fiatType` / `fiatAmount` | fiat code / number; `fiatAmount` wins over `coinAmount` | `EUR` / optional |
| `coinAmount` | number | not used |
| `orderType` | `sell` opens off-ramp; default buy | not passed |
| `returnUrl` | "URL the customer is redirected to when they complete or cancel the order process. Must be URL-encoded." | the Add money return page |
| `theme`, `backgroundColor`, `primaryColor`, `secondaryColor`, `textColor` | `light`/`dark`; hex without `#` | optional |

`redirectUrl` is not a referral parameter: it is the required body field of `POST /v2/buy`
(https://docs.banxa.com/products/hosted-checkout/docs/api-integration/create-buy-order.md) and the name used by the redirect/web,
redirecting-to-checkout and customer-journey pages, which describe orders created through the API. The live coin list ("the cryptocurrency
lookup endpoint in your product's API Reference") needs the partner's `x-api-key`.

## Sandbox — what was verified without a key, and what needs the owner

| Check | Result tonight | Needs |
|---|---|---|
| Ramp demo widget loads with public parameters | yes, HTTP 200, but shows "INTEGRATION ISSUE DETECTED" without `hostApiKey` (demo and production alike) | the owner's **demo** `hostApiKey` (Ramp sends it with the staging key, R3 §7) |
| Ramp code pre-selection (`enabledCryptoAssets=COSMOS_ATOM`, `BASE_USDC`) | the codes exist in Ramp's own table; the widget behaviour is not visible without a key | demo key |
| Ramp accepts a `cosmos1…` / `0x…` `userAddress` | not verifiable | demo key |
| Ramp `finalUrl` return | not verifiable | demo key + a manual test release (R3 §7) |
| Banxa partner subdomain | `zigoals.banxa-sandbox.com`, `zigoals.banxa.com`, `checkout.banxa-sandbox.com`: no DNS answer; `api.banxa-sandbox.com/` → 404 | the owner's sandbox `partnerRef` ("Talk to our team") |
| Banxa `returnUrl` honoured in referral mode | not verifiable | sandbox partner + one test order (test data in R3 §7) |
| Banxa live coin lookup | not callable | sandbox `x-api-key` |

## Every row (generated from the two lists; the JSON carries the same rows)

Ramp: all rows of the asset in the API with `withDisabled=true&withHidden=true` (enabled, visible rows first). "In default list" = present
without those flags. Banxa: every row of the coin table for that code. "Extra" assets kept because both providers sell them on a shared network:
LINK (Ethereum, BNB Chain) and BNB (BNB Chain); EURC, USDT0, USDS, DAI and bridged USDC (USDCE) have no network both sell tonight, and POL is disabled at Ramp.

#### USDC

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `ARBITRUM_USDC` | arbitrum | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| `AVAX_USDC` | avalanche-c | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` |
| `BASE_USDC` | base | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| `BSC_USDC` | bnb-chain | 18 | 6 | 0.01 | yes | no | yes | ERC20 | `0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d` |
| `CELO_USDC` | celo | 6 | 6 | 0.02 | yes | no | yes | ERC20 | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| `DOT_USDC` | polkadot-assethub | 6 | 6.23 | 0.01 | yes | no | yes | DOT_AH | `1337` |
| `ETH_USDC` | ethereum | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` |
| `HEDERA_USDC` | hedera | 6 | 6.4 | 0.07 | yes | no | yes | ERC20 | `0x000000000000000000000000000000000006f89a` |
| `LINEA_USDC` | linea | 6 | 6.4 | 0.07 | yes | no | yes | ERC20 | `0x176211869ca2b568f2a7d4ee941e073a821ee1ff` |
| `MATIC_USDC` | polygon | 6 | 6 | 0.02 | yes | no | yes | ERC20 | `0x3c499c542cef5e3811e1192ce70d8cc03d5c3359` |
| `MONAD_USDC` | monad | 6 | 6.25 | 0.01 | yes | no | yes | ERC20 | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` |
| `NEAR_USDC` | near | 6 | 6.25 | 0.01 | yes | no | yes | NEAR_TOKEN | `17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1` |
| `OPTIMISM_USDC` | optimism | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` |
| `SOLANA_USDC` | solana | 6 | 6.25 | 0.01 | yes | no | yes | SPL | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| `STARKNET_USDC` | starknet | 6 | 6.25 | 0.01 | yes | no | yes | ERC20 | `0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb` |
| `WORLDCHAIN_USDC` | world-chain | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0x79A02482A880bCE3F13e09Da970dC34db4CD24d1` |
| `XDC_USDC` | xdc | 6 | 6.25 | 0.01 | yes | no | yes | ERC20 | `xdcfA2958CB79b0491CC627c1557F441eF849Ca8eb1` |
| `XLM_USDC` | stellar | 7 | 6 | 0.01 | yes | no | yes | ERC20 | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |
| `ZKSYNCERA_USDC` | zksync-era | 6 | 7.08 | 0.34 | yes | no | yes | ERC20 | `0x1d17CBcF0D6D143135aE902365D2E5e2A16538D4` |
| `FUSE_USDC` (not in docs table) | fuse | 6 | 6.25 | 0.01 | yes | yes | no | ERC20 | `0x620fd5fa44BE6af63715Ef4E65DDFA0387aD13F5` |
| `FANTOM_USDC` (not in docs table) | fantom | 6 | 6.25 | 0.01 | no | yes | no | ERC20 | `0x04068DA6C83AFCFA0e13ba15A6696662335D5B75` |
| `LOOPRING_USDC` (not in docs table) | loopring | 6 | 48 | 0.12 | no | yes | no | ERC20 | — |
| `MOONBEAM_USDC` (not in docs table) | moonbeam | 6 | 6.25 | 0.01 | no | yes | no | ERC20 | `0xFFfffffF7D2B0B761Af01Ca8e25242976ac0aD7D` |
| `POLYGONZKEVM_USDC` (not in docs table) | polygon-zkevm | 6 | 6.28 | 0.02 | no | yes | no | ERC20 | `0x37eAA0eF3549a5Bb7D431be78a3D99BD360d19e5` |
| `RONIN_USDC` (not in docs table) | ronin | 6 | 6.25 | 0.01 | no | yes | no | ERC20 | `0x0b7007c13325c48911f73a2dad5fa5dcbf808adc` |
| `SUI_USDC` (not in docs table) | sui | 6 | 6.25 | 0.01 | no | yes | no | SUI_COIN | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `USDC` | `ALEO` | aleo | ✅ | ❌ | — | no |
| `USDC` | `ALGO` | algo | ✅ | ❌ | CA | no |
| `USDC` | `APE` | ape | ✅ | ❌ | CA, UK | no |
| `USDC` | `APT` | apt | ✅ | ❌ | CA, UK, US | no |
| `USDC` | `ARB` | arbitrum | ✅ | ✅ | CA | no |
| `USDC` | `ARC` | arc | ✅ | ❌ | CA | no |
| `USDC` | `ASSETHUB` | polkadot-assethub | ✅ | ❌ | CA, UK, US | no |
| `USDC` | `ASTAR` | astar | ✅ | ❌ | CA, UK | no |
| `USDC` | `AVAX-C` | avalanche-c | ✅ | ✅ | CA | no |
| `USDC` | `BASE` | base | ✅ | ✅ | CA | no |
| `USDC` | `BITKUB` | bitkub | ✅ | ❌ | CA, UK | no |
| `USDC` | `BNCPOLKA` | bncpolka | ✅ | ❌ | CA, UK | no |
| `USDC` | `BOB` | bob | ✅ | ❌ | CA, UK | no |
| `USDC` | `BSC` | bnb-chain | ✅ | ✅ | CA | no |
| `USDC` | `CELO` | celo | ✅ | ✅ | CA, UK | no |
| `USDC` | `DYDX` | dydx | ✅ | ❌ | CA, UK | no |
| `USDC` | `ECLIPSE` | eclipse | ✅ | ❌ | CA | no |
| `USDC` | `ETH` | ethereum | ✅ | ✅ | CA | no |
| `USDC` | `FLOW-EVM` | flow-evm | ✅ | ❌ | CA, UK, US | no |
| `USDC` | `GLMR` | glmr | ✅ | ❌ | CA, UK | no |
| `USDC` | `GLUE` | glue | ✅ | ❌ | CA, UK | no |
| `USDC` | `HBAR` | hedera | ✅ | ❌ | CA | no |
| `USDC` | `HDX` | hdx | ✅ | ❌ | CA, UK | no |
| `USDC` | `HYPERCORE` | hypercore | ✅ | ❌ | CA, UK | no |
| `USDC` | `HYPEREVM` | hyperevm | ✅ | ❌ | CA, UK | no |
| `USDC` | `INK` | ink | ✅ | ❌ | CA | no |
| `USDC` | `KITEAI` | kiteai | ✅ | ❌ | CA, UK | no |
| `USDC` | `LINEA` | linea | ✅ | ❌ | CA, US | no |
| `USDC` | `LSK` | lsk | ✅ | ❌ | CA, UK | no |
| `USDC` | `MATIC` | polygon | ✅ | ✅ | CA | no |
| `USDC` | `METIS` | metis | ✅ | ❌ | CA | no |
| `USDC` | `Monad` | monad | ✅ | ✅ | CA, UK | no |
| `USDC` | `Morph` | morph | ✅ | ✅ | CA, UK | no |
| `USDC` | `OPTIMISM` | optimism | ✅ | ✅ | CA | no |
| `USDC` | `PEAQ-EVM` | peaq-evm | ✅ | ❌ | CA, UK | no |
| `USDC` | `PLMC` | plmc | ✅ | ❌ | AT, BE, BG, CA, CY, CZ, DE, DK, EE, ES, FI, FR, GR, HR, HU, IE, IT, LT, LU, LV, MT, NL, PL, PT, RO, SE, SI, SK, UK | yes |
| `USDC` | `RONIN` | ronin | ✅ | ✅ | CA, UK | no |
| `USDC` | `S` | s | ✅ | ❌ | CA, UK | no |
| `USDC` | `SEI (EVM)` | sei (evm) | ✅ | ✅ | CA, UK | no |
| `USDC` | `SOL` | solana | ✅ | ✅ | CA | no |
| `USDC` | `SOPHON` | sophon | ✅ | ✅ | CA, UK | no |
| `USDC` | `STARK` | starknet | ✅ | ❌ | AT, BE, BG, CA, CY, CZ, DE, DK, EE, ES, FI, FR, GR, HR, HU, IE, IT, LT, LU, LV, MT, NL, PL, PT, RO, SE, SI, SK, UK | yes |
| `USDC` | `SUI` | sui | ✅ | ❌ | CA, UK | no |
| `USDC` | `TEMPO` | tempo | ✅ | ❌ | CA | no |
| `USDC` | `UNICHAIN` | unichain | ✅ | ❌ | CA | no |
| `USDC` | `WLD` | world-chain | ✅ | ❌ | CA | no |
| `USDC` | `XLM` | stellar | ✅ | ❌ | CA | no |

#### USDT

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `ARBITRUM_USDT` | arbitrum | 6 | 6 | 0.03 | yes | no | yes | ERC20 | `0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9` |
| `AVAX_USDT` | avalanche-c | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7` |
| `BASE_USDT` | base | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0xfde4c96c8593536e31f229ea8f37b2ada2699bb2` |
| `BSC_USDT` | bnb-chain | 18 | 6 | 0.39 | yes | no | yes | ERC20 | `0x55d398326f99059ff775485246999027b3197955` |
| `CELO_USDT` | celo | 6 | 6 | 0.02 | yes | no | yes | ERC20 | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |
| `DOT_USDT` | polkadot-assethub | 6 | 6.23 | 0.01 | yes | no | yes | DOT_AH | `1984` |
| `ETH_USDT` | ethereum | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0xdac17f958d2ee523a2206206994597c13d831ec7` |
| `MATIC_USDT` | polygon | 6 | 6 | 0.02 | yes | no | yes | ERC20 | `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` |
| `NEAR_USDT` | near | 6 | 6.25 | 0.01 | yes | no | yes | NEAR_TOKEN | `usdt.tether-token.near` |
| `OPTIMISM_USDT` | optimism | 6 | 6 | 0.01 | yes | no | yes | ERC20 | `0x94b008aA00579c1307B0EF2c499aD98a8ce58e58` |
| `SOLANA_USDT` | solana | 6 | 6.25 | 0.01 | yes | no | yes | SPL | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |
| `TON_USDT` | ton | 6 | 6 | 0.02 | yes | no | yes | TON_JETTON | `EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs` |
| `TRON_USDT` | tron | 6 | 6 | 0.27 | yes | no | yes | TRC20 | `TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t` |
| `ZKSYNCERA_USDT` | zksync-era | 6 | 6.25 | 0.01 | yes | no | yes | ERC20 | `0x493257fD37EDB34451f62EDf8D2a0C418852bA4C` |
| `POLYGONZKEVM_USDT` (not in docs table) | polygon-zkevm | 6 | 6.28 | 0.02 | no | yes | no | ERC20 | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `USDT` | `ARB` | arbitrum | ✅ | ❌ | CA | no |
| `USDT` | `ASSETHUB` | polkadot-assethub | ✅ | ❌ | CA, UK, US | no |
| `USDT` | `AVAX-C` | avalanche-c | ✅ | ❌ | CA | no |
| `USDT` | `BNCPOLKA` | bncpolka | ✅ | ❌ | CA, UK | no |
| `USDT` | `BSC` | bnb-chain | ✅ | ✅ | CA | no |
| `USDT` | `CELO` | celo | ✅ | ✅ | CA, UK | no |
| `USDT` | `ECLIPSE` | eclipse | ✅ | ❌ | CA | no |
| `USDT` | `ETH` | ethereum | ✅ | ✅ | CA | no |
| `USDT` | `HDX` | hdx | ✅ | ❌ | CA, UK | no |
| `USDT` | `KLAY` | klay | ✅ | ✅ | CA | no |
| `USDT` | `LISK` | lisk | ✅ | ❌ | CA, UK | no |
| `USDT` | `MATIC` | polygon | ✅ | ✅ | CA | no |
| `USDT` | `OKC` | okc | ✅ | ❌ | CA, UK | no |
| `USDT` | `PEAQ-EVM` | peaq-evm | ✅ | ❌ | CA, UK | no |
| `USDT` | `PLMC` | plmc | ✅ | ❌ | AT, BE, BG, CA, CY, CZ, DE, DK, EE, ES, FI, FR, GR, HR, HU, IE, IT, LT, LU, LV, MT, NL, PL, PT, RO, SE, SI, SK, UK | yes |
| `USDT` | `SOL` | solana | ✅ | ✅ | CA | no |
| `USDT` | `STARK` | starknet | ✅ | ❌ | CA, UK | no |
| `USDT` | `TON` | ton | ✅ | ❌ | CA, US | no |
| `USDT` | `TRON` | tron | ✅ | ✅ | CA | no |
| `USDT` | `VIC` | vic | ✅ | ✅ | CA, UK | no |

#### ETH

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `ARBITRUM_ETH` | arbitrum | 18 | 6 | 0.01 | yes | no | yes | NATIVE | — |
| `BASE_ETH` | base | 18 | 6 | 0.01 | yes | no | yes | NATIVE | — |
| `BSC_ETH` | bnb-chain | 18 | 6 | 0.02 | yes | no | yes | ERC20 | `0x2170ed0880ac9a755fd29b2688956bd959f933f8` |
| `ETH_ETH` | ethereum | 18 | 6 | 0.02 | yes | no | yes | NATIVE | — |
| `LINEA_ETH` | linea | 18 | 6.28 | 0.02 | yes | no | yes | NATIVE | — |
| `MATIC_ETH` | polygon | 18 | 120.88 | 45.86 | yes | no | yes | ERC20 | `0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619` |
| `MEGAETH_ETH` | megaeth | 18 | 6.25 | 0.01 | yes | no | yes | NATIVE | — |
| `OPTIMISM_ETH` | optimism | 18 | 6 | 0.01 | yes | no | yes | NATIVE | — |
| `STARKNET_ETH` | starknet | 18 | 6.25 | 0.01 | yes | no | yes | ERC20 | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |
| `WORLDCHAIN_ETH` | world-chain | 18 | 6 | 0.01 | yes | no | yes | NATIVE | — |
| `ZKSYNCERA_ETH` | zksync-era | 18 | 6.93 | 0.28 | yes | no | yes | NATIVE | — |
| `STARKWARE_SORARE_ETH` (not in docs table) | starkware_sorare | 18 | 6.23 | 0 | yes | yes | no | ETH | — |
| `IMMUTABLEX_ETH` (not in docs table) | immutablex | 18 | 6.23 | 0 | no | yes | no | ETH | — |
| `LOOPRING_ETH` (not in docs table) | loopring | 18 | 48 | 0.12 | no | yes | no | ETH | — |
| `POLYGONZKEVM_ETH` (not in docs table) | polygon-zkevm | 18 | 6.25 | 0.01 | no | yes | no | NATIVE | — |
| `SORARE_ETH` (not in docs table) | sorare | 18 | 6.23 | 0 | no | yes | no | ETH | — |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `ETH` | `ARB` | arbitrum | ✅ | ✅ | — | no |
| `ETH` | `BASE` | base | ✅ | ✅ | — | no |
| `ETH` | `BSC` | bnb-chain | ✅ | ❌ | US | no |
| `ETH` | `BOB` | bob | ✅ | ❌ | UK | no |
| `ETH` | `ECLIPSE` | eclipse | ✅ | ❌ | UK | no |
| `ETH` | `ETH` | ethereum | ✅ | ✅ | — | no |
| `ETH` | `ETHERLINK` | etherlink | ✅ | ❌ | UK | no |
| `ETH` | `FUEL` | fuel | ✅ | ❌ | UK | no |
| `ETH` | `INK` | ink | ✅ | ❌ | — | no |
| `ETH` | `LINEA` | linea | ✅ | ✅ | — | no |
| `ETH` | `OPTIMISM` | optimism | ✅ | ✅ | — | no |
| `ETH` | `ROBINHOOD` | robinhood | ✅ | ❌ | — | no |
| `ETH` | `SOPHON` | sophon | ✅ | ✅ | UK | no |
| `ETH` | `STARK` | starknet | ✅ | ❌ | UK | no |
| `ETH` | `UNICHAIN` | unichain | ✅ | ❌ | — | no |
| `ETH` | `WLD` | world-chain | ✅ | ❌ | — | no |
| `ETH` | `ZKSYNC2` | zksync-era | ✅ | ✅ | — | no |

#### SOL

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `SOLANA_SOL` | solana | 9 | 6 | 0.01 | yes | no | yes | NATIVE | — |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `SOL` | `SOL` | solana | ✅ | ✅ | — | no |

#### BTC

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `BTC_BTC` | bitcoin | 8 | 6 | 0.23 | yes | no | yes | NATIVE | — |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `BTC` | `BTC` | bitcoin | ✅ | ✅ | — | no |
| `BTC` | `LN` | bitcoin-lightning | ✅ | ❌ | AT, BE, BG, CY, CZ, DE, DK, EE, ES, FI, FR, GR, HR, HU, IE, IT, LT, LU, LV, MT, NL, PL, PT, RO, SE, SI, SK | yes |

#### ATOM

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `COSMOS_ATOM` | cosmos-hub | 6 | 6.25 | 0.01 | yes | no | yes | NATIVE | — |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `ATOM` | `ATOM` | cosmos-hub | ✅ | ❌ | UK, US | no |

#### LINK

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `ARBITRUM_LINK` | arbitrum | 18 | 6 | 0.01 | yes | no | yes | ERC20 | `0xf97f4df75117a78c1A5a0DBb814Af92458539FB4` |
| `AVAX_LINK` | avalanche-c | 18 | 6 | 0.01 | yes | no | yes | ERC20 | `0x5947bb275c521040051d82396192181b413227a3` |
| `BSC_LINK` | bnb-chain | 18 | 6 | 0.01 | yes | no | yes | ERC20 | `0xf8a0bf9cf54bb92f17374d9e9a321e6a111a51bd` |
| `ETH_LINK` | ethereum | 18 | 6.5 | 0.11 | yes | no | yes | ERC20 | `0x514910771af9ca656af840dff83e8264ecf986ca` |
| `MATIC_LINK` | polygon | 18 | 6 | 0.24 | yes | no | yes | ERC20 | `0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39` |
| `OPTIMISM_LINK` | optimism | 18 | 6 | 0.01 | yes | no | yes | ERC20 | `0x350a791bfc2c21f9ed5d10980dad2e2638ffa7f6` |
| `XDAI_LINK` | gnosis | 18 | 6.25 | 0.01 | yes | no | yes | ERC20 | `0xE2e73A1c69ecF83F464EFCE6A5be353a37cA09b2` |
| `NEAR_LINK` (not in docs table) | near | 18 | 6.43 | 0.08 | no | yes | no | NEAR_TOKEN | `514910771af9ca656af840dff83e8264ecf986ca.factory.bridge.near` |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `LINK` | `BSC` | bnb-chain | ✅ | ❌ | US | no |
| `LINK` | `ETH` | ethereum | ✅ | ✅ | — | no |

#### BNB

| Ramp code | Network | Decimals | Min (EUR) | Network fee (EUR) | Enabled | Hidden | In default list | Type | Token address |
|---|---|---|---|---|---|---|---|---|---|
| `BSC_BNB` | bnb-chain | 18 | 6 | 0.01 | yes | no | yes | NATIVE | — |

| Banxa coinType | blockchain | Network | Buy | Sell | Restricted countries | BE restricted |
|---|---|---|---|---|---|---|
| `BNB` | `BSC` | bnb-chain | ✅ | ✅ | US | no |

