# Earn & staking evidence, October 2026 (Session N)

Everything the earn design ([EARN_DESIGN.md](EARN_DESIGN.md)), [ADR-009](../architecture/ADR-009-earn-architecture.md), the
registry update and the read-only Valdora testnet reader rely on, with its source. Read on **2026-10-02 (UTC)**: three
read-only research passes from 20:26Z to 21:47Z, then an independent second check of the 24 facts that matter most,
from 22:50Z to 23:11Z. Only GET requests were made; nothing was signed, sent or bought. Not financial advice, and no
legal conclusions: section 6 of [LEGAL_CHECKLIST.md](../business/LEGAL_CHECKLIST.md) lists the questions.

## How to read this
- **VERIFIED**: read from the official source named in the item, with the access time and a quote copied verbatim.
  For a provider's documents this verifies *what the provider says*, not that it is true; such items say
  "provider-published" or "provider claim".
- **UNVERIFIED**: could not be confirmed from an official source; the item says why. Nothing is built on it.
- **CONFIRMED / PARTLY**: the result of the second check (F01–F24), done from scratch by a different reader. PARTLY
  items carry a note on what differs.
- **height**: the `x-cosmos-block-height` header the node returned (for Noble,
  `grpc-metadata-x-cosmos-block-height`), i.e. the chain state the answer reflects. For a block-by-height read it is the
  node's head at the time, not the block requested.
- **Kept in evidence/…**: chain responses are committed as read in [evidence/](evidence/) as
  `{name, retrievedAt, url, httpStatus, height, sha256, body}`. `sha256` is the SHA-256 of the body in compact JSON
  (`JSON.stringify(body)`); for the responses whose raw bytes were also saved, that equals the bytes as sent
  (checked on the 20 successful chain responses whose raw bytes were saved: 20 of 20 equal; the nodes' error replies are formatted with spaces, so for those the hash is of the compact form). Records marked `trimmed` keep only the named fields and their `sha256` is of the full body; very
  large bodies are omitted and only their hash is kept.
- **SHA-256 of the page/PDF as received**: third-party pages and documents are not committed; their hash lets anyone
  check a copy they fetch.
- Quotes are verbatim. Claims and reasons are the readers' own words, lightly edited to follow this project's wording
  rules (nothing here implies a relationship between ZIGoals and any project or vendor). Items named "…-setup" record
  what a business would need before using a provider. Addresses are given in full where an item depends on them.
- ZIGChain's own sites (docs.zigchain.com, zigchain.com) refuse plain HTTP clients, so they were read through WebFetch,
  which returns a processed view; those quotes are marked and may be shortened.

## The facts that matter most
1. **Both ZIGChain networks use `azig` with 18 decimals** for staking and gas since the v5 upgrade (mainnet height
   12549000, 2026-09-30T09:45:17Z; testnet 7669200, 2026-09-08T09:10:49Z). `uzig` is now described on chain as a
   legacy 6-decimal denom kept only as IBC escrow backing. The app's mainnet read configuration still says `uzig`/6, so
   mainnet watch-only reads fail closed (follow-up in Session M's lane). ZIGChain's own GitHub registry also still says
   `uzig`/6. [[A-zig-azig-metadata](evidence/a-native-staking.md#a-zig-azig-metadata), [A-zig-uzig-legacy](evidence/a-native-staking.md#a-zig-uzig-legacy), [A-zig-v5-upgrade-heights](evidence/a-native-staking.md#a-zig-v5-upgrade-heights), [B-zigchain-registry-stale-denom](evidence/e-on-ramps.md#b-zigchain-registry-stale-denom); [F02](#f02), [F03](#f03)]
2. **Native staking:** 21-day unbonding (1,814,400 s), at most 14 validators and 7 unbonding entries; slashing 0.05%
   for double-signing and 0.01% for downtime with a 600 s jail; community tax 2%; identical on both networks. The docs
   say 5% for double-signing, which does not match the chain. [[A-zig-staking-params](evidence/a-native-staking.md#a-zig-staking-params), [A-zig-slashing-docs-vs-chain](evidence/a-native-staking.md#a-zig-slashing-docs-vs-chain); [F01](#f01)]
3. **Valdora's stakers were migrated after v5:** mainnet to code 179 on 2026-09-30, about 9 hours after the upgrade;
   testnet from code 1062 to 2532 on 2026-09-17. Both run the same code (checksum `2E68EC99…5F1C`) and report
   `stzig-staker 1.1.0`. [[A-valdora-mainnet-staker-contract](evidence/b-valdora.md#a-valdora-mainnet-staker-contract), [A-valdora-testnet-staker-contract](evidence/b-valdora.md#a-valdora-testnet-staker-contract), [A-valdora-hash-parity](evidence/b-valdora.md#a-valdora-hash-parity); [F04](#f04)–[F06](#f06)]
4. **One key controls Valdora's mainnet staker:** its admin, internal admin and treasury are a single secp256k1 account
   that can migrate the code, and did so with ordinary transactions. Valdora's security page says multi-signature; OAK's
   2025 report acknowledged "single admin without multi-sig". [[A-valdora-admin-account](evidence/b-valdora.md#a-valdora-admin-account), [A-valdora-security-claims](evidence/b-valdora.md#a-valdora-security-claims); [F08](#f08), [F15](#f15)]
5. **Valdora's own pages disagree on fees and minimums** (provider claims): the economics page says a 10% performance
   fee on rewards and no fees on deposit, redemption or holding; the FAQ says unstaking "may include a fee". The stake
   minimum is 50 ZIG (on chain too); the unstake minimum is 50 stZIG (FAQ), 50 ZIG (how-to guide) or 49 stZIG (on
   chain). [[A-valdora-fees-economics](evidence/b-valdora.md#a-valdora-fees-economics), [A-valdora-fees-unstake-contradiction](evidence/b-valdora.md#a-valdora-fees-unstake-contradiction), [A-valdora-minimums](evidence/b-valdora.md#a-valdora-minimums); [F10](#f10), [F11](#f11)]
6. **Getting out of stZIG** (provider claim): redeem burns stZIG, the ZIG joins a withdrawal queue, then the 21-day
   chain unbonding (the FAQ adds 2 days), then a separate claim; a request cannot be cancelled.
   [[A-valdora-redeem-steps](evidence/b-valdora.md#a-valdora-redeem-steps), [A-valdora-unbonding-timing](evidence/b-valdora.md#a-valdora-unbonding-timing); [F12](#f12)]
7. **No message schema is published anywhere read.** OAK published three Valdora reports (2025-09-28: 47 findings;
   2026-04-17 vault: 28; 2026-09-21: 7, a pull-request review only); the audited repositories are not public and no
   source maps the deployed checksums to audited commits. The price queries still name their fields `uzig_amount` and
   `stzig_amount`, with undocumented units, so no ZIG value of stZIG is computed anywhere in this work.
   [[A-valdora-execute-msg-structure](evidence/b-valdora.md#a-valdora-execute-msg-structure), [A-valdora-price-semantics](evidence/b-valdora.md#a-valdora-price-semantics), [A-oak-valdora-listing](evidence/b-valdora.md#a-oak-valdora-listing), [A-valdora-audited-repos](evidence/b-valdora.md#a-valdora-audited-repos); [F13](#f13)–[F15](#f15)]
8. **USDC from Noble is live on ZIGChain but being wound down:** `ibc/6490A7EA…` over channel-3, its supply equal to
   Noble's channel-175 escrow. Circle stops new Noble minting on 2026-10-13 and fully pauses Noble USDC and its CCTP
   routes on 2027-01-12. Circle's help article KB0010590 still lists Noble without the wind-down.
   [[C-zig-main-usdc-noble](evidence/d-stablecoins-and-swaps.md#c-zig-main-usdc-noble), [C-noble-escrow-crosscheck](evidence/d-stablecoins-and-swaps.md#c-noble-escrow-crosscheck), [C-circle-noble-dates](evidence/d-stablecoins-and-swaps.md#c-circle-noble-dates), [C-circle-kb0010590](evidence/d-stablecoins-and-swaps.md#c-circle-kb0010590); [F09](#f09), [F18](#f18), [F19](#f19)]
9. **USDT reaches ZIGChain over IBC Eureka**; ESMA's register of e-money-token white papers lists Circle (USDC, EURC)
   and no Tether entry. Circle's Injective USDC is on chain but not in ZIGChain's registry.
   [[C-zig-main-usdt-eureka](evidence/d-stablecoins-and-swaps.md#c-zig-main-usdt-eureka), [C-esma-register-emt-issuers](evidence/d-stablecoins-and-swaps.md#c-esma-register-emt-issuers), [C-zig-main-usdc-injective-unlisted](evidence/d-stablecoins-and-swaps.md#c-zig-main-usdc-injective-unlisted); [F21](#f21)]
10. **No on-ramp read today delivers ZIG on ZIGChain, or any stablecoin there.** Guardarian sells ZIG only as the
    Ethereum ERC-20 `0xb2617246d0c6c0087f18703d576831899ca94f01`; MoonPay's USDC-on-Noble is suspended; Transak lists
    no ZIG. Every provider needs a business agreement and keys before production use.
    [[B-onramps-no-zigchain-network](evidence/e-on-ramps.md#b-onramps-no-zigchain-network), [B-guardarian-zig](evidence/e-on-ramps.md#b-guardarian-zig), [B-moonpay-zig](evidence/e-on-ramps.md#b-moonpay-zig), [B-transak-zig](evidence/e-on-ramps.md#b-transak-zig); [F23](#f23)]
11. **Zignaly is off-chain and custodial:** pooled (PAMM) accounts held in Binance, BEP20 withdrawals, KYC for every user
    (the United States and Canada among 14 excluded places), and no new trading services since 2026-08-31. No public
    keyless API was found; its main sites are bot-walled, so its help center was read on Intercom's host.
    [B-zignaly-*; [F20](#f20)]
12. **ZIG began as Zignaly's token:** the MiCAR white paper linked from zigchain.com says ZIG was created in April 2021 as
    the Zignaly platform's utility token and names Comet Technologies Ltd. as the person seeking admission to trading;
    ESMA lists that white paper under Latvijas Banka. [[B-zig-origin-zignaly](evidence/c-zignaly.md#b-zig-origin-zignaly), [C-zig-mica-whitepaper](evidence/c-zignaly.md#c-zig-mica-whitepaper); [F21](#f21), [F22](#f22)]
13. **ZIG Markets** (zigmarkets.com redirects to zig.finance/markets) says it works through FSCA-supervised South African
    entities; the FSCA's December 2024 list has STARBUY PTY LTD as FSP 53740. No retail terms or eligibility were found.
    [[B-zigmarkets-licensing-statement](evidence/f-zig-markets.md#b-zigmarkets-licensing-statement), [B-fsca-starbuy-casp](evidence/f-zig-markets.md#b-fsca-starbuy-casp), [B-zigmarkets-retail-where](evidence/f-zig-markets.md#b-zigmarkets-retail-where); [F24](#f24)]
14. **OroSwap's fees differ from its docs** (provider claim "1% default fee"): on chain each pair type has its own fee
    (plain xyk 0.01%), and 20% of each swap fee goes to a Maker fee address. Every mainnet pair type is disabled for new
    pairs only. Halborn audited oroswap-core in July 2025. [[A-oroswap-docs-fees](evidence/d-stablecoins-and-swaps.md#a-oroswap-docs-fees), [A-oroswap-factory-config-mainnet](evidence/d-stablecoins-and-swaps.md#a-oroswap-factory-config-mainnet),
    [A-oroswap-halborn](evidence/d-stablecoins-and-swaps.md#a-oroswap-halborn); [F16](#f16), [F17](#f17)]

## What this means for the app today
The app's own native reader, unchanged from `main` at `57275a6`, was run read-only against the official LCDs for one
public account (`zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx`, Valdora's mainnet staker admin):

| Network | Read at (UTC) | App configuration | Result |
|---|---|---|---|
| zigchain-1 | 2026-10-02T23:39:22.380Z | `uzig`, 6 decimals (`apps/web/lib/position-reader.ts:5`) | refused: "Public network or denomination evidence does not match." |
| zig-test-2 | 2026-10-02T23:39:23.750Z | `azig`, 18 decimals | read 1 position |

So every mainnet watch-only staking read in the Alpha now fails closed, as designed for a denomination change
(`docs/verification/run8/CHAIN_FEE_FINDINGS.md:6`). The fix is in Session M's lane: the mainnet entry in
`position-reader.ts`, `positions.ts:225` and `:296`, `market-quotes.ts:7` and the tests that encode mainnet `uzig`/6
(see [EXISTING_RESEARCH.md](EXISTING_RESEARCH.md), "Code assumptions").

## What is still unknown
- Valdora's execute messages (deposit, redeem, withdraw) and the units of its price queries; whether `fees_percentage`
  "1000" is the documented 10%; why `min_stzig` is 49 rather than 50; which unstake fee rule is current.
- Whether Valdora's and OroSwap's deployed code matches the audited commits (no checksums or build attestations are
  published).
- Who controls Valdora's admin key beyond what the chain shows (the docs claim multi-signature).
- How Circle will treat the USDC held in Noble's escrow for ZIGChain at the 2027-01-12 snapshot, and what replaces
  Noble USDC on ZIGChain.
- Zignaly's legal entity, licences and API terms (zignaly.com is bot-walled).
- Whether any on-ramp will deliver ZIG or a stablecoin on ZIGChain; coverage of Onramper, Alchemy Pay, Kado and Coinbase.
- ZIG Markets' retail products, terms and eligibility.

The full list, with the evidence each question comes from, is under "Open questions" at the end.

## Pages that could not be read
### Official pages the owner could supply
These are official sources that refused automated reading (bot walls, sign-in, JavaScript-only pages) or are not
public. A copy saved from a normal browser, or a contact at the project, would let a later session check them.

| Page | What happened | Tried (UTC) |
|---|---|---|
| `https://raw.githubusercontent.com/Liquid-Zig/new-stzig-contracts/{main,master}/README.md` | HTTP 404 (repository appears private or absent) | 2026-10-02T20:37:41Z |
| `https://raw.githubusercontent.com/Liquid-Zig/new-stzig-contracts/{5fd9d3bf7a97daee3630e5487f6a6384013f3e21,9abdd76a5735a3894446d80366835077819c18ed}/{README.md,contracts/staker/README.md,contracts/staker/schema/staker.json,contracts/staker/schema/raw/query.json,contracts/staker/schema/raw/execute.json}` | HTTP 404 for all 10 URLs | 2026-10-02T20:37:44Z |
| `https://raw.githubusercontent.com/Liquid-Zig/vault-contracts-audit/{main,master}/README.md` | HTTP 404 | 2026-10-02T20:37:42Z |
| `https://raw.githubusercontent.com/Liquid-Zig/vault-contracts-audit/{57c3f00b63fc06a897a091768b378bc33c868a29,b5c583f8345339cae2b380e264995bfd100ca7cd}/{README.md,contracts/vault/README.md,contracts/vault/schema/vault.json}` | HTTP 404 for all 6 URLs | 2026-10-02T20:37:45Z |
| `https://valdora.finance/stake` | HTTP 200 but client-rendered; no staking parameters in server HTML | 2026-10-02T20:30:42Z |
| `https://zignaly.com/` | Bot wall: HTTP 403 with cf-mitigated: challenge (Cloudflare managed challenge) to curl; WebFetch HTTP 403 | 2026-10-02T20:26:57Z |
| `https://zignaly.com/legal` | Bot wall: HTTP 403 Cloudflare challenge (curl), WebFetch HTTP 403 | 2026-10-02T20:26:57Z |
| `https://zignaly.com/legal/api-agreement/` | Bot wall: HTTP 403 Cloudflare challenge (curl), WebFetch HTTP 403; Wayback availability API listed no snapshot | 2026-10-02T20:26:57Z |
| `https://zignaly.com/z-indexes` | Bot wall: HTTP 403 Cloudflare challenge (curl), WebFetch HTTP 403; no Wayback snapshot listed | 2026-10-02T20:26:58Z |
| `https://help.zignaly.com/en/articles/9044409-kyc-how-to-verify-your-account` | Bot wall: HTTP 403 Cloudflare challenge (curl), WebFetch HTTP 403. Content read instead via https://intercom.help/zignaly/en/articles/9044409-kyc-how-to-verify-your-account (canonical points here) | 2026-10-02T20:26:58Z |
| `https://help.zignaly.com/en/articles/6885234-faq-s-for-wealth-managers` | Bot wall: HTTP 403 Cloudflare challenge (curl), WebFetch HTTP 403. Content read via intercom.help/zignaly host | 2026-10-02T20:26:58Z |
| `https://help.zignaly.com/en/articles/13731033-understanding-z-indexes-services-composition` | Bot wall: HTTP 403 Cloudflare challenge (curl), WebFetch HTTP 403. Content read via intercom.help/zignaly host | 2026-10-02T20:26:58Z |
| `https://help.zignaly.com/en/` | Bot wall: HTTP 403 Cloudflare challenge. Second check: HTTP 403 with cf-mitigated: challenge (page title "Just a moment..."). | 2026-10-02T20:27:22Z, 2026-10-02T23:01:42Z |
| `https://zignaly.com/sitemap.xml` | Bot wall: HTTP 403 Cloudflare challenge (robots.txt itself returned 200) | 2026-10-02T20:27:20Z |
| `https://api.zignaly.com/` | Bot wall: HTTP 403 Cloudflare challenge | 2026-10-02T20:27:20Z |
| `https://app.zignaly.com/` | Bot wall: HTTP 403 Cloudflare challenge | 2026-10-02T20:27:20Z |
| `https://app.zignaly.com/legal/terms-of-service` | Bot wall: HTTP 403 Cloudflare challenge (curl); WebFetch HTTP 403 | 2026-10-02T20:49:37Z |
| `https://zignaly.com/legal/risks/` | Bot wall: HTTP 403 Cloudflare challenge | 2026-10-02T20:49:38Z |
| `https://b2b.zignaly.com/` | 301 to https://zignaly.com/, which is bot-walled (403) | 2026-10-02T20:49:37Z |
| `https://docs.zignaly.com/` | DNS: WebFetch 'getaddrinfo ENOTFOUND docs.zignaly.com'; curl proxy CONNECT 502 | 2026-10-02T20:27:20Z |
| `https://zignaly.gitbook.io/` | 307 redirect to https://docs.zignaly.com/ (unresolvable) | 2026-10-02T20:27:21Z |
| `https://identity.zignaly.com/` | curl proxy CONNECT 502 (policy denial or upstream failure) | 2026-10-02T20:27:23Z |
| `http://web.archive.org/web/20250820045705/https://zignaly.com/legal` | ARCHIVED COPY not obtainable: curl to web.archive.org connection reset (proxy relay ws_closed_mid_exchange); WebFetch 'unable to fetch from web.archive.org' | 2026-10-02T20:29:22Z |
| `http://web.archive.org/web/20260905024858/https://zignaly.com/` | ARCHIVED COPY not obtainable: WebFetch refuses web.archive.org; curl connection reset | 2026-10-02T20:29:35Z |
| `http://web.archive.org/web/20250917113117/https://help.zignaly.com/en/articles/6885234-faq-s-for-wealth-managers` | ARCHIVED COPY not obtainable: WebFetch refuses web.archive.org; curl connection reset | 2026-10-02T20:29:35Z |
| `https://web.archive.org/cdx/search/cdx?url=zignaly.com/legal&matchType=prefix` | Connection reset by peer (3 retries) | 2026-10-02T20:28:40Z |
| `https://wayback.archive.org/web/20250820045705id_/https://zignaly.com/legal` | Connection reset by peer | 2026-10-02T20:29:46Z |
| `https://docs.zigchain.com/` | curl: HTTP 403 Cloudflare challenge (root and subpages, sitemap.xml). Read instead via WebFetch; raw index HTML obtained at /llms.txt (CloudFront error-document fallback). Also: curl returns HTTP 403 (also sitemap.xml). WebFetch works and was used; there is no raw HTML for docs pages, and WebFetch output was kept only as session notes. | 2026-10-02T20:30:03Z, 2026-10-02T21:11:46Z |
| `https://zigchain.com/` | curl: HTTP 403 Cloudflare challenge. Read via WebFetch, which declined full verbatim reproduction, so only short quotes were obtained. Also: curl returns HTTP 403. WebFetch works and was used. | 2026-10-02T20:30:05Z, 2026-10-02T21:11:46Z |
| `https://hub.zigchain.com/bridge/` | curl: HTTP 403 Cloudflare challenge; WebFetch returned only the page title (JS app). Also: WebFetch returned only an app shell (title/header); no asset list, route or provider details are in static content. | 2026-10-02T20:46:23Z, 2026-10-02T21:38:25Z |
| `https://hub.zigchain.com/` | curl: HTTP 403 Cloudflare challenge | 2026-10-02T20:46:23Z |
| `https://docs-archive.onramper.com/embedded/coverage?type=crypto` | Client-side rendered (Next.js shell); no list content via curl or WebFetch | 2026-10-02T20:39:30Z |
| `https://docs-archive.onramper.com/embedded/coverage?type=network` | Client-side rendered (Next.js shell); no list content | 2026-10-02T20:39:30Z |
| `https://alchemypay.notion.site/Crypto-Chain-Coverages-419fc088f0704db8abbc9cfb77382dc1` | Notion JS shell; WebFetch saw no rows | 2026-10-02T20:41:25Z |
| `https://docs.kado.money/` | curl TLS 'tlsv1 alert internal error'; WebFetch HTTP 503 | 2026-10-02T20:41:37Z |
| `https://app.kado.money/` | JS shell; no asset data in HTML | 2026-10-02T20:41:37Z |
| `https://docs.mercuryo.io/` | curl proxy CONNECT 502 | 2026-10-02T20:40:09Z |
| `https://help.mercuryo.io/hc/en-gb/articles/14495549158045-Which-cryptocurrencies-are-supported` | Bot wall: HTTP 403 Cloudflare challenge (curl); WebFetch HTTP 403 | 2026-10-02T20:40:46Z |
| `https://help.mercuryo.io/hc/en-gb/articles/14495532693021-Where-does-Mercuryo-operate-` | WebFetch HTTP 403 | 2026-10-02T20:50:45Z |
| `https://eur-lex.europa.eu/eli/reg/2023/1114/oj/eng` | Bot wall: curl got HTTP 202 with 'x-amzn-waf-action: challenge' (AWS WAF via CloudFront) and an empty body; WebFetch returned empty content. The same official text was read via publications.europa.eu Cellar. | 2026-10-02T21:21:28Z |
| `https://data.europa.eu/eli/reg/2023/1114/oj` | Redirects to eur-lex.europa.eu/eli/reg/2023/1114/oj, which returns HTTP 202 WAF challenge. | 2026-10-02T21:21:45Z |
| `https://www.fsma.be/sites/default/files/media/files/2022-11/fsma_2022_25_en.pdf` | HTTP 404 (FSMA Communication on the notification procedure, linked from the FSMA crypto FAQ). | 2026-10-02T21:31:42Z |
| `https://www.fsma.be/en/crypto` | HTTP 200 but no extractable main content in static HTML. | 2026-10-02T21:31:40Z |
| `https://www.esma.europa.eu/publications-data/questions-answers?search_api_fulltext=staking` | Q&A listing is JS-rendered with no results in static HTML; ESMA site search (/search/site?keys=...) ignored most queries. Specific Q&As were located by ID (2067, 2404, 2463, 2932, 2933). | 2026-10-02T21:28:01Z |
| `https://gitbook.zignaly.com/white-paper` | The white paper ESMA's register points to for ZIG (OTHER.csv, Comet Technologies Ltd. row): HTTP 403 Cloudflare challenge to curl and WebFetch. | 2026-10-02T23:06:57Z |
| `https://www.fsca.co.za/ (FSP 46517 lookup)` | The regulator's FSP search is a form, so ZIG Markets' Merritt Administrators licence 46517 was not looked up. | 2026-10-02 |

### Wrong paths and API quirks (no action needed)
Guessed paths that do not exist, and endpoints that behave differently from the usual Cosmos routes; in each case the
content was found or read another way.

| Page | What happened | Tried (UTC) |
|---|---|---|
| `https://raw.githubusercontent.com/oroswap/oroswap-deployments/main/mainnet.json` | HTTP 404 (manifest actually lives at zigchain/mainnet.json, read successfully) | 2026-10-02T20:38:34Z |
| `https://raw.githubusercontent.com/oroswap/oroswap-deployments/main/testnet.json` | HTTP 404 (manifest actually lives at zigchain/testnet.json, read successfully) | 2026-10-02T20:38:34Z |
| `https://raw.githubusercontent.com/oroswap/oroswap-deployments/main/{deployments,contracts,addresses,mainnet,testnet,json}/*.json and zigchain/{README.md,devnet.json,codes.json}` | HTTP 404 for every guessed path (the full list stayed in the session log) | 2026-10-02T20:39:23Z |
| `https://raw.githubusercontent.com/oroswap/oroswap-core/main/contracts/router/src/msg.rs` | HTTP 404. Router messages live in packages/oroswap-core/src/router.rs (read) | 2026-10-02T20:39:30Z |
| `https://raw.githubusercontent.com/oroswap/oroswap-core/main/packages/oroswap/src/{router,factory,pair}.rs` | HTTP 404 (wrong path guess; the actual package dir is packages/oroswap-core) | 2026-10-02T20:39:31Z |
| `https://github.com/oroswap/oroswap-deployments (directory listing via GitHub API/MCP get_file_contents)` | Access denied: repository not configured for this session (GitHub API gated) | 2026-10-02T20:38:55Z |
| `https://raw.githubusercontent.com/oroswap/oroswap-tokens-list/main/tokenLists/{mainnet,testnet,zigchain-1,zig-test-2,ibc,tokens}.json and tokenLists/mainnet/ibc.json` | HTTP 404 (file names unknown; directory listing gated). Only README.md was readable | 2026-10-02T20:46:37Z |
| `https://api.zigchain.com/ibc/apps/transfer/v1/denom_traces/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4` | HTTP 501 Not Implemented (used /ibc/apps/transfer/v1/denoms/&lt;hash> instead, which works). Also: HTTP 501 Not Implemented (legacy route); the /ibc/apps/transfer/v1/denoms/{hash} route worked | 2026-10-02T20:45:50Z, 2026-10-02T20:46:59Z |
| `https://api.zigchain.com/cosmwasm/wasm/v1/code/{19,20,173,174}/contracts?pagination.limit=1000&pagination.count_total=true` | HTTP 400 'offset and count queries not supported' (re-queried without count_total successfully) | 2026-10-02T20:44:01Z |
| `https://testnet-api.zigchain.com/cosmwasm/wasm/v1/code?pagination.offset=2531&pagination.limit=2` | 'offset and count queries not supported' (used pagination.key instead) | 2026-10-02T20:31:20Z |
| `https://docs.oroswap.org/` | HTTP 200 but a client-side Docusaurus shell with no content; pages were read via sitemap.xml URLs under /docs/ | 2026-10-02T20:37:50Z |
| `https://zignaly.github.io/` | HTTP 404 (no GitHub Pages site); no official Zignaly GitHub org identified from any readable official page | 2026-10-02T20:27:22Z |
| `https://mercuryo.io/currencies` | HTTP 404 | 2026-10-02T20:40:09Z |
| `https://mercuryo.io/explore/coin/zig` | HTTP 404 | 2026-10-02T20:40:19Z |
| `https://banxa.com/supported-cryptocurrencies/` | HTTP 404 (docs list used instead) | 2026-10-02T20:37:29Z |
| `https://ramp.network/supported-assets` | Redirects to rampnetwork.com/supported-assets, which returns HTTP 404; the docs.rampnetwork.com/assets table is client-rendered, so the documented API was used | 2026-10-02T20:38:12Z |
| `https://www.simplex.com/supported-cryptocurrencies` | HTTP 404 (docs list used instead) | 2026-10-02T20:44:06Z |
| `https://guardarian.com/supported-currencies` | HTTP 404 (guardarian.com/currencies used instead) | 2026-10-02T20:41:56Z |
| `https://docs.stripe.com/crypto/onramp/supported-currencies.md` | HTTP 404 (also supported-networks.md, regional-restrictions.md, supported-countries.md); the currency list is on stripe-hosted.md | 2026-10-02T20:45:43Z |
| `https://zig.finance/sitemap-index.xml` | HTTP 404 (sitemap.xml exists) | 2026-10-02T20:33:34Z |
| `https://publications.europa.eu/resource/celex/02014L0065-20260606` | PDF manifestation (Accept: application/pdf) returned HTTP 404; the XHTML manifestation was read instead. Same for 02005L0029-20260927, 02011L0083-20260927 and 02015L2366-20250117. | 2026-10-02T21:23:42Z |
| `https://api.zigchain.com/ibc/apps/transfer/v1/denom_traces` | HTTP 501 {code 12, 'Not Implemented'}. Same on testnet-api.zigchain.com (21:09:40Z). /ibc/apps/transfer/v1/denoms was used instead. | 2026-10-02T21:09:39Z |
| `https://noble.xyz/blog` | HTTP 404 (Framer 'Page Not Found'). The noble.xyz homepage has no announcement text. | 2026-10-02T21:16:28Z |
| `https://docs.noble.xyz/llms.txt` | HTTP 404. | 2026-10-02T21:16:27Z |
| `https://help.circle.com/s/article/KB0010582` | HTTP 200 but only a 'Support Redirect' JS shell. help.circle.com/csm?id=kb_article_view&sysparm_article=KB0010582 redirects to Okta SSO, and /kb?id=... shows 'Login - Knowledge Portal'. The article was read at the /support/en/... URL and via the public knowledge API. | 2026-10-02T21:14:30Z |
| `https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/usdc.testnet.json` | HTTP 404: file does not exist (no testnet IBC asset files for usdc/usdt in the registry). | 2026-10-02T21:07:20Z |

## The second check (F01–F24)
A different reader re-read each claim from scratch at 22:50–23:11Z, without the first pass's files. 22 claims are
CONFIRMED and 2 PARTLY; none was refuted. The items each check covers carry its result.

| Check | Covers | Result |
|---|---|---|
| [F01](#f01) | [A-zig-staking-params](evidence/a-native-staking.md#a-zig-staking-params), [A-zig-slashing-params](evidence/a-native-staking.md#a-zig-slashing-params), [A-zig-distribution-params](evidence/a-native-staking.md#a-zig-distribution-params) | **CONFIRMED** |
| [F02](#f02) | [A-zig-v5-upgrade-heights](evidence/a-native-staking.md#a-zig-v5-upgrade-heights) | **CONFIRMED** |
| [F03](#f03) | [A-zig-azig-metadata](evidence/a-native-staking.md#a-zig-azig-metadata), [A-zig-uzig-legacy](evidence/a-native-staking.md#a-zig-uzig-legacy) | **CONFIRMED** |
| [F04](#f04) | [A-valdora-testnet-staker-contract](evidence/b-valdora.md#a-valdora-testnet-staker-contract) | **CONFIRMED** |
| [F05](#f05) | [A-valdora-mainnet-staker-contract](evidence/b-valdora.md#a-valdora-mainnet-staker-contract), [A-valdora-hash-parity](evidence/b-valdora.md#a-valdora-hash-parity) | **CONFIRMED** |
| [F06](#f06) | [A-valdora-hash-parity](evidence/b-valdora.md#a-valdora-hash-parity) | **CONFIRMED** |
| [F07](#f07) | [A-valdora-staker-protocol-info](evidence/b-valdora.md#a-valdora-staker-protocol-info) | **CONFIRMED** |
| [F08](#f08) | [A-valdora-admin-account](evidence/b-valdora.md#a-valdora-admin-account) | **CONFIRMED** |
| [F09](#f09) | [C-zig-main-usdc-noble](evidence/d-stablecoins-and-swaps.md#c-zig-main-usdc-noble), [C-noble-escrow-crosscheck](evidence/d-stablecoins-and-swaps.md#c-noble-escrow-crosscheck), [B-noble-usdc-on-zigchain](evidence/d-stablecoins-and-swaps.md#b-noble-usdc-on-zigchain) | **CONFIRMED** |
| [F10](#f10) | [A-valdora-minimums](evidence/b-valdora.md#a-valdora-minimums), [A-valdora-fees-unstake-contradiction](evidence/b-valdora.md#a-valdora-fees-unstake-contradiction) | **CONFIRMED** |
| [F11](#f11) | [A-valdora-fees-economics](evidence/b-valdora.md#a-valdora-fees-economics) | **CONFIRMED** |
| [F12](#f12) | [A-valdora-redeem-steps](evidence/b-valdora.md#a-valdora-redeem-steps), [A-valdora-unbonding-timing](evidence/b-valdora.md#a-valdora-unbonding-timing) | **CONFIRMED** |
| [F13](#f13) | [A-valdora-smart-contracts-page](evidence/b-valdora.md#a-valdora-smart-contracts-page) | **CONFIRMED** |
| [F14](#f14) | [A-oak-valdora-listing](evidence/b-valdora.md#a-oak-valdora-listing) | **CONFIRMED** |
| [F15](#f15) | [A-oak-valdora-2025-findings](evidence/b-valdora.md#a-oak-valdora-2025-findings), [A-oak-valdora-2026-vault](evidence/b-valdora.md#a-oak-valdora-2026-vault), [A-oak-valdora-2026-18dec](evidence/b-valdora.md#a-oak-valdora-2026-18dec) | **PARTLY** |
| [F16](#f16) | [A-oroswap-halborn](evidence/d-stablecoins-and-swaps.md#a-oroswap-halborn) | **CONFIRMED** |
| [F17](#f17) | [A-oroswap-docs-fees](evidence/d-stablecoins-and-swaps.md#a-oroswap-docs-fees), [A-oroswap-factory-config-mainnet](evidence/d-stablecoins-and-swaps.md#a-oroswap-factory-config-mainnet) | **CONFIRMED** |
| [F18](#f18) | [C-circle-noble-dates](evidence/d-stablecoins-and-swaps.md#c-circle-noble-dates), [C-circle-noble-exits](evidence/d-stablecoins-and-swaps.md#c-circle-noble-exits), [C-circle-cctp-v1](evidence/d-stablecoins-and-swaps.md#c-circle-cctp-v1) | **CONFIRMED** |
| [F19](#f19) | [C-circle-kb0010590](evidence/d-stablecoins-and-swaps.md#c-circle-kb0010590) | **CONFIRMED** |
| [F20](#f20) | [B-zignaly-marketplace-change-2026-08](evidence/c-zignaly.md#b-zignaly-marketplace-change-2026-08), [B-zignaly-profit-sharing-model](evidence/c-zignaly.md#b-zignaly-profit-sharing-model), [B-zignaly-deposit-withdraw-rails](evidence/c-zignaly.md#b-zignaly-deposit-withdraw-rails), [B-zignaly-custody-offchain](evidence/c-zignaly.md#b-zignaly-custody-offchain), [B-zignaly-kyc](evidence/c-zignaly.md#b-zignaly-kyc), [B-zignaly-restricted-jurisdictions](evidence/c-zignaly.md#b-zignaly-restricted-jurisdictions), [B-zignaly-helpcenter-host](evidence/c-zignaly.md#b-zignaly-helpcenter-host) | **PARTLY** |
| [F21](#f21) | [C-esma-register-emt-issuers](evidence/d-stablecoins-and-swaps.md#c-esma-register-emt-issuers), [C-zig-mica-whitepaper](evidence/c-zignaly.md#c-zig-mica-whitepaper) | **CONFIRMED** |
| [F22](#f22) | [B-zig-origin-zignaly](evidence/c-zignaly.md#b-zig-origin-zignaly), [C-zig-mica-whitepaper](evidence/c-zignaly.md#c-zig-mica-whitepaper) | **CONFIRMED** |
| [F23](#f23) | [B-guardarian-zig](evidence/e-on-ramps.md#b-guardarian-zig), [B-moonpay-zig](evidence/e-on-ramps.md#b-moonpay-zig), [B-transak-zig](evidence/e-on-ramps.md#b-transak-zig), [B-zig-erc20-contract](evidence/e-on-ramps.md#b-zig-erc20-contract) | **CONFIRMED** |
| [F24](#f24) | [B-fsca-starbuy-casp](evidence/f-zig-markets.md#b-fsca-starbuy-casp) | **CONFIRMED** |

### F01
**CONFIRMED.** Claim checked: On BOTH networks: /cosmos/staking/v1beta1/params has bond_denom "azig", unbonding_time "1814400s", max_validators 14, max_entries 7; /cosmos/slashing/v1beta1/params has slash_fraction_double_sign "0.000500000000000000", slash_fraction_downtime "0.000100000000000000", downtime_jail_duration "600s"; /cosmos/distribution/v1beta1/params has community_tax "0.020000000000000000".

All eight values match exactly, with matching types (string or int), on both networks. bond_denom "azig", unbonding_time "1814400s", max_validators 14, max_entries 7; slash_fraction_double_sign "0.000500000000000000", slash_fraction_downtime "0.000100000000000000", downtime_jail_duration "600s"; community_tax "0.020000000000000000". Chain IDs were checked via /cosmos/base/tendermint/v1beta1/blocks/latest at 22:50:54Z: api.zigchain.com is zigchain-1 (h 12612760) and testnet-api.zigchain.com is zig-test-2 (h 8046720). Fields not in the claim are also identical across the two networks: historical_entries 10000, min_commission_rate "0.000000000000000000", signed_blocks_window "35000", min_signed_per_window "0.800000000000000000", base/bonus_proposer_reward "0.000000000000000000", withdraw_addr_enabled true.

- <https://api.zigchain.com/cosmos/staking/v1beta1/params> · read 2026-10-02T22:50:43Z · height 12612756 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f01_main_staking`
  `{"params":{"unbonding_time":"1814400s","max_validators":14,"max_entries":7,"historical_entries":10000,"bond_denom":"azig","min_commission_rate":"0.000000000000000000"}}`
- <https://testnet-api.zigchain.com/cosmos/staking/v1beta1/params> · read 2026-10-02T22:50:44Z · height 8046718 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f01_test_staking`
  `{"params":{"unbonding_time":"1814400s","max_validators":14,"max_entries":7,"historical_entries":10000,"bond_denom":"azig","min_commission_rate":"0.000000000000000000"}}`
- <https://api.zigchain.com/cosmos/slashing/v1beta1/params> · read 2026-10-02T22:50:45Z · height 12612757 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f01_main_slashing`
  `{"params":{"signed_blocks_window":"35000","min_signed_per_window":"0.800000000000000000","downtime_jail_duration":"600s","slash_fraction_double_sign":"0.000500000000000000","slash_fraction_downtime":"0.000100000000000000"}}`
- <https://testnet-api.zigchain.com/cosmos/slashing/v1beta1/params> · read 2026-10-02T22:50:45Z · height 8046719 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f01_test_slashing`
  `{"params":{"signed_blocks_window":"35000","min_signed_per_window":"0.800000000000000000","downtime_jail_duration":"600s","slash_fraction_double_sign":"0.000500000000000000","slash_fraction_downtime":"0.000100000000000000"}}`
- <https://api.zigchain.com/cosmos/distribution/v1beta1/params> · read 2026-10-02T22:50:46Z · height 12612757 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f01_main_distr`
  `{"params":{"community_tax":"0.020000000000000000","base_proposer_reward":"0.000000000000000000","bonus_proposer_reward":"0.000000000000000000","withdraw_addr_enabled":true}}`
- <https://testnet-api.zigchain.com/cosmos/distribution/v1beta1/params> · read 2026-10-02T22:50:47Z · height 8046719 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f01_test_distr`
  `{"params":{"community_tax":"0.020000000000000000","base_proposer_reward":"0.000000000000000000","bonus_proposer_reward":"0.000000000000000000","withdraw_addr_enabled":true}}`
- <https://api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/latest> · read 2026-10-02T22:50:54Z · height 12612760 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/chainid_main_latest`
  `"chain_id":"zigchain-1","height":"12612760"`
- <https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/latest> · read 2026-10-02T22:50:54Z · height 8046720 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/chainid_test_latest`
  `"chain_id":"zig-test-2","height":"8046720"`

### F02
**CONFIRMED.** Claim checked: /cosmos/upgrade/v1beta1/applied_plan/v5 gives height 12549000 on mainnet and 7669200 on testnet, and the blocks at those heights have times 2026-09-30T09:45:17Z (mainnet) and 2026-09-08T09:10:49Z (testnet), to the second.

applied_plan/v5 returns {"height":"12549000"} on mainnet and {"height":"7669200"} on testnet. Block 12549000 (chain_id zigchain-1) has time 2026-09-30T09:45:17.367173229Z. Block 7669200 (chain_id zig-test-2) has time 2026-09-08T09:10:49.599297395Z. Both match the claim when truncated to the second. Caveat: rounding instead of truncating would make the testnet time 09:10:50Z (fraction .599); the mainnet time stays 09:45:17Z (fraction .367). The blockHeight given for the two block reads is the node head at query time, not the block requested.

- <https://api.zigchain.com/cosmos/upgrade/v1beta1/applied_plan/v5> · read 2026-10-02T22:50:55Z · height 12612760 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f02_main_plan`
  `{"height":"12549000"}`
- <https://testnet-api.zigchain.com/cosmos/upgrade/v1beta1/applied_plan/v5> · read 2026-10-02T22:50:56Z · height 8046720 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f02_test_plan`
  `{"height":"7669200"}`
- <https://api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/12549000> · read 2026-10-02T22:51:01Z · height 12612762 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f02_main_block_12549000`
  `"chain_id":"zigchain-1","height":"12549000","time":"2026-09-30T09:45:17.367173229Z"`
- <https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/7669200> · read 2026-10-02T22:51:02Z · height 8046721 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f02_test_block_7669200`
  `"chain_id":"zig-test-2","height":"7669200","time":"2026-09-08T09:10:49.599297395Z"`

### F03
**CONFIRMED.** Claim checked: /cosmos/bank/v1beta1/denoms_metadata/azig describes azig as the 18-decimal native staking and gas token (denom unit "zig" exponent 18), and /cosmos/bank/v1beta1/denoms_metadata/uzig describes uzig as a legacy 6-decimal base denom kept only as IBC escrow backing after the v5 redenomination. Both networks.

Both networks return byte-identical metadata. azig: description "The native staking and gas token of ZIGChain (18-decimal base denom azig)."; denom_units azig (exponent 0) and zig (exponent 18); base azig; display zig; name and symbol ZIG. uzig: description "Legacy 6-decimal ZIGChain base denom, retained only as IBC escrow backing after the v5 redenomination." The source says "retained only"; the claim's "kept only" is a paraphrase. Nuance: uzig's denom_units list only uzig (exponent 0, alias microzig) and mzig (exponent 3, alias millizig); display is "uzig" and symbol "UZIG". No unit has exponent 6, so "6-decimal" comes only from the description text.

- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/azig> · read 2026-10-02T22:51:11Z · height 12612765 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f03_main_azig`
  `"description":"The native staking and gas token of ZIGChain (18-decimal base denom azig).","denom_units":[{"denom":"azig","exponent":0,"aliases":[]},{"denom":"zig","exponent":18,"aliases":[]}],"base":"azig","display":"zig"`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/azig> · read 2026-10-02T22:51:12Z · height 8046723 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f03_test_azig`
  `"description":"The native staking and gas token of ZIGChain (18-decimal base denom azig).","denom_units":[{"denom":"azig","exponent":0,"aliases":[]},{"denom":"zig","exponent":18,"aliases":[]}],"base":"azig","display":"zig"`
- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/uzig> · read 2026-10-02T22:51:12Z · height 12612766 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f03_main_uzig`
  `"description":"Legacy 6-decimal ZIGChain base denom, retained only as IBC escrow backing after the v5 redenomination.","denom_units":[{"denom":"uzig","exponent":0,"aliases":["microzig"]},{"denom":"mzig","exponent":3,"aliases":["millizig"]}],"base":"uzig","display":"uzig"`
- <https://testnet-api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/uzig> · read 2026-10-02T22:51:13Z · height 8046723 · kept in [evidence/zigchain-staking.json](evidence/zigchain-staking.json) as `verify/v1/f03_test_uzig`
  `"description":"Legacy 6-decimal ZIGChain base denom, retained only as IBC escrow backing after the v5 redenomination.","denom_units":[{"denom":"uzig","exponent":0,"aliases":["microzig"]},{"denom":"mzig","exponent":3,"aliases":["millizig"]}],"base":"uzig","display":"uzig"`

### F04
**CONFIRMED.** Claim checked: Valdora testnet staker zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69: /cosmwasm/wasm/v1/contract/&lt;addr> code_id "2532", label "stZIG Staker", admin zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3; /history has an INIT with code 1062 and a MIGRATE to code 2532 at block 7812034, and block 7812034's time is 2026-09-17T17:14:45Z.

contract_info: code_id "2532", label "stZIG Staker", admin and creator both zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3, created at block 2652705. /history has exactly two entries (next_key null): INIT with code_id "1062" at block 2652705, then MIGRATE to code_id "2532" at block 7812034 (tx_index "0", msg {}). Block 7812034 (zig-test-2) has time 2026-09-17T17:14:45.929160544Z, which is 17:14:45Z truncated (rounding would give :46). Extra check: the block's only tx, A21485F0167805AD9F8EB5EC021A0CD2F72D3353A3A5AF61182B825C93EA97C6, is a /cosmwasm.wasm.v1.MsgMigrateContract sent by the admin zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3 to code_id 2532 with msg {}. It returned code 0 and tx_response.timestamp "2026-09-17T17:14:45Z" (read 2026-10-02T22:54:25Z at h 8046758; kept as `verify/v1/x_test_tx_migrate` in evidence/valdora.json). The INIT msg's protocol_info sets treasury_address zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx, which is the mainnet staker's admin.

- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69> · read 2026-10-02T22:51:21Z · height 8046725 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f04_test_contract`
  `"code_id":"2532","creator":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","admin":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","label":"stZIG Staker"`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/history> · read 2026-10-02T22:51:21Z · height 8046725 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f04_test_history`
  `"operation":"CONTRACT_CODE_HISTORY_OPERATION_TYPE_INIT","code_id":"1062","updated":{"block_height":"2652705","tx_index":"5709453"}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/history> · read 2026-10-02T22:51:21Z · height 8046725 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f04_test_history`
  `"operation":"CONTRACT_CODE_HISTORY_OPERATION_TYPE_MIGRATE","code_id":"2532","updated":{"block_height":"7812034","tx_index":"0"},"msg":{}`
- <https://testnet-api.zigchain.com/cosmos/base/tendermint/v1beta1/blocks/7812034> · read 2026-10-02T22:51:36Z · height 8046728 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f04_test_block_7812034`
  `"chain_id":"zig-test-2","height":"7812034","time":"2026-09-17T17:14:45.929160544Z"`
- <https://testnet-api.zigchain.com/cosmos/tx/v1beta1/txs/A21485F0167805AD9F8EB5EC021A0CD2F72D3353A3A5AF61182B825C93EA97C6> · read 2026-10-02T22:54:25Z · height 8046758 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/x_test_tx_migrate`
  `"@type":"/cosmwasm.wasm.v1.MsgMigrateContract","sender":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","contract":"zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69","code_id":"2532","msg":{}`

### F05
**CONFIRMED.** Claim checked: Valdora mainnet staker zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55: code_id "179", label "stZIG Staker", admin zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx, last history entry MIGRATE to 179 at block 12554333. Code 179 (mainnet) and code 2532 (testnet) have the same checksum/data_hash 2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C (use /cosmwasm/wasm/v1/code-info/&lt;id> if it exists, else /cosmwasm/wasm/v1/code with pagination; do not download wasm bytes).

contract_info: code_id "179", label "stZIG Staker", admin and creator both zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx, created at block 2606611. The history has four entries (next_key null): INIT code 26 at 2606611, MIGRATE 36 at 2675458, MIGRATE 39 at 3294663, and the last, MIGRATE 179 at 12554333 (tx_index "0", msg {}). /cosmwasm/wasm/v1/code-info/{id} exists. The checksum of code 179 (mainnet) and code 2532 (testnet) is 2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C on both, by exact string compare. Second source: /cosmwasm/wasm/v1/code paged with pagination.key (8-byte big-endian code id) gives the identical data_hash. pagination.offset returns HTTP 400 "offset and count queries not supported". No wasm bytes were downloaded. Notes: code 179 was uploaded by zig1w22ujeyravz4zhz7kxvmrjca3lvu8d3gtpczxl, not by the contract admin; code 2532 was uploaded by the testnet admin. The migrate at 12554333 is tx 4039950E4CA3A75A7952515D17D559D1A71E4ACD37390FC9F02C1A7E9A67411B, a MsgMigrateContract from zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx with msg {} and code 0. Its block time is 2026-09-30T19:06:27.799572097Z (block read 22:54:17Z at h 12612823; tx read 22:54:26Z at h 12612826).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55> · read 2026-10-02T22:51:44Z · height 12612776 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f05_main_contract`
  `"code_id":"179","creator":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","admin":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","label":"stZIG Staker"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/history> · read 2026-10-02T22:51:45Z · height 12612776 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f05_main_history`
  `"operation":"CONTRACT_CODE_HISTORY_OPERATION_TYPE_MIGRATE","code_id":"179","updated":{"block_height":"12554333","tx_index":"0"},"msg":{}`
- <https://api.zigchain.com/cosmwasm/wasm/v1/code-info/179> · read 2026-10-02T22:51:51Z · height 12612778 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f05_main_codeinfo_179`
  `"code_id":"179","creator":"zig1w22ujeyravz4zhz7kxvmrjca3lvu8d3gtpczxl","checksum":"2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C"`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/code-info/2532> · read 2026-10-02T22:51:52Z · height 8046730 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f05_test_codeinfo_2532`
  `"code_id":"2532","creator":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","checksum":"2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/code?pagination.key=AAAAAAAAALM%3D&pagination.limit=1> · read 2026-10-02T22:52:13Z · height 12612785 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f05_main_codelist_key179`
  `"code_id":"179","creator":"zig1w22ujeyravz4zhz7kxvmrjca3lvu8d3gtpczxl","data_hash":"2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C"`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/code?pagination.key=AAAAAAAACeQ%3D&pagination.limit=1> · read 2026-10-02T22:52:14Z · height 8046734 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f05_test_codelist_key2532`
  `"code_id":"2532","creator":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","data_hash":"2E68EC999E2182831C359EB87344A0E0B043168DF667AB1C5DE8463359E15F1C"`
- <https://api.zigchain.com/cosmos/tx/v1beta1/txs/4039950E4CA3A75A7952515D17D559D1A71E4ACD37390FC9F02C1A7E9A67411B> · read 2026-10-02T22:54:26Z · height 12612826 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/x_main_tx_migrate`
  `"@type":"/cosmwasm.wasm.v1.MsgMigrateContract","sender":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","contract":"zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55","code_id":"179","msg":{}`

### F06
**CONFIRMED.** Claim checked: Both stakers answer the smart query {"contract_version":{}} with {"contract":"stzig-staker","version":"1.1.0"} (base64 of the JSON in /cosmwasm/wasm/v1/contract/&lt;addr>/smart/&lt;b64>).

The query is the base64 string eyJjb250cmFjdF92ZXJzaW9uIjp7fX0=, which decodes to {"contract_version":{}}. Both stakers return {"data":{"version":"1.1.0","contract":"stzig-staker"}}. This is the same JSON object as claimed; only the key order differs (the LCD returns version first).

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJjb250cmFjdF92ZXJzaW9uIjp7fX0=> · read 2026-10-02T22:52:21Z · height 12612787 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f06_main_contract_version`
  `{"data":{"version":"1.1.0","contract":"stzig-staker"}}`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJjb250cmFjdF92ZXJzaW9uIjp7fX0=> · read 2026-10-02T22:52:22Z · height 8046736 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f06_test_contract_version`
  `{"data":{"version":"1.1.0","contract":"stzig-staker"}}`

### F07
**CONFIRMED.** Claim checked: Smart query {"protocol_info":{}}: mainnet fees_percentage "1000", min_deposit "50000000000000000000", min_stzig "49000000", withdrawal_request_limit 7; testnet fees_percentage "1000", min_deposit "1000000000000000000", min_stzig "1000000", withdrawal_request_limit 1. Record the full responses.

The query is the base64 string eyJwcm90b2NvbF9pbmZvIjp7fX0=. All eight claimed values match exactly, with the claimed types. FULL mainnet response (h 12612788): {"data":{"token_name":"stzig","token_denom":"coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig","minting_cap":"500000000000000","min_stzig":"49000000","min_deposit":"50000000000000000000","max_withdrawal_scan_limit":100,"withdrawal_request_limit":7,"fees_percentage":"1000","treasury_address":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx"}}. FULL testnet response (h 8046736): {"data":{"token_name":"stzig","token_denom":"coin.zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr.stzig","minting_cap":"100000000000000","min_stzig":"1000000","min_deposit":"1000000000000000000","max_withdrawal_scan_limit":100,"withdrawal_request_limit":1,"fees_percentage":"1000","treasury_address":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx"}}. Both stakers have the same treasury_address, zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx. Some current values differ from the INIT msgs in /history: mainnet INIT had min_deposit "50000000", min_stzig "50000000" and minting_cap "100000000000000"; testnet INIT had min_deposit "1000000".

- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJwcm90b2NvbF9pbmZvIjp7fX0=> · read 2026-10-02T22:52:23Z · height 12612788 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f07_main_protocol_info`
  `"minting_cap":"500000000000000","min_stzig":"49000000","min_deposit":"50000000000000000000","max_withdrawal_scan_limit":100,"withdrawal_request_limit":7,"fees_percentage":"1000"`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69/smart/eyJwcm90b2NvbF9pbmZvIjp7fX0=> · read 2026-10-02T22:52:23Z · height 8046736 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f07_test_protocol_info`
  `"minting_cap":"100000000000000","min_stzig":"1000000","min_deposit":"1000000000000000000","max_withdrawal_scan_limit":100,"withdrawal_request_limit":1,"fees_percentage":"1000"`

### F08
**CONFIRMED.** Claim checked: /cosmos/auth/v1beta1/accounts/zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx (mainnet) is a /cosmos.auth.v1beta1.BaseAccount whose pub_key type is /cosmos.crypto.secp256k1.PubKey (a single key, not a multisig key type).

The account is @type /cosmos.auth.v1beta1.BaseAccount with pub_key @type /cosmos.crypto.secp256k1.PubKey and key AhcApwgucg1oENc+F0zWeRpohP4Oxa1uoIHK+ruCgyT1 (a 33-byte compressed key); account_number 231, sequence 81. Independent check: sha256, then ripemd160, then bech32 with prefix zig, applied to that key gives back exactly zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx. It is a plain single-key account, not multisig. The mainnet migrate tx at 12554333 was also signed by a single /cosmos.crypto.secp256k1.PubKey. The same address on zig-test-2 is also a BaseAccount with the same pubkey (account_number 127388, sequence 3; read 22:52:37Z at h 8046738, kept as `verify/v1/f08_test_account` in evidence/valdora.json).

- <https://api.zigchain.com/cosmos/auth/v1beta1/accounts/zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx> · read 2026-10-02T22:52:36Z · height 12612792 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f08_main_account`
  `{"account":{"@type":"/cosmos.auth.v1beta1.BaseAccount","address":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","pub_key":{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"AhcApwgucg1oENc+F0zWeRpohP4Oxa1uoIHK+ruCgyT1"},"account_number":"231","sequence":"81"}}`
- <https://testnet-api.zigchain.com/cosmos/auth/v1beta1/accounts/zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx> · read 2026-10-02T22:52:37Z · height 8046738 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v1/f08_test_account`
  `"pub_key":{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"AhcApwgucg1oENc+F0zWeRpohP4Oxa1uoIHK+ruCgyT1"},"account_number":"127388","sequence":"3"`

### F09
**CONFIRMED.** Claim checked: Mainnet: /ibc/apps/transfer/v1/denoms/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4 is base "uusdc" with trace transfer/channel-3; the client of channel-3 (port transfer) tracks chain_id "noble-1"; and the supply of ibc/6490A7EA... on zigchain-1 equals the uusdc balance of Noble's channel-175 escrow account (find the escrow address via Noble's /ibc/apps/transfer/v1/channels/channel-175/ports/transfer/escrow_address, then its uusdc balance), read within a minute of each other.

The denom has base uusdc and trace [transfer/channel-3]. Recomputing sha256("transfer/channel-3/uusdc") gives 6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4. ZIGChain channel-3/transfer is STATE_OPEN with counterparty transfer/channel-175 over connection-3. Its client is 07-tendermint-3 with chain_id "noble-1", not frozen, latest_height 1-60657897. The Noble docs list "API https://api.noble.xyz" under Mainnet, Chain ID noble-1. On Noble, channel-175/transfer is STATE_OPEN with counterparty transfer/channel-3 over connection-179. Its client is 07-tendermint-184 with chain_id "zigchain-1", not frozen, latest_height 1-12611425. Noble's escrow address is noble1e4quceq0nhvfalpkct2yecpu56ss3erltz8yku; recomputing the ICS-20 escrow address, sha256("ics20-1" + 0x00 + "transfer/channel-175")[:20], gives the same address. Round 1: zigchain-1 supply 259314404300 at 22:53:42Z (h 12612813) and Noble escrow uusdc 259314404300 at 22:53:43Z (Noble h 60661863). Round 2: 259314404300 at 22:53:44Z (h 12612813) and 259314404300 at 22:53:44Z (Noble h 60661864). The two sides are equal (259,314.4043 USDC), read 1 to 2 seconds apart. This is a point-in-time result; packets in flight could make the two differ briefly. Side note: the older /ibc/apps/transfer/v1/denom_traces/{hash} route returns HTTP 501 Not Implemented on api.zigchain.com. Noble's height comes from the grpc-metadata-x-cosmos-block-height header; Noble does not send x-cosmos-block-height.

- <https://api.zigchain.com/ibc/apps/transfer/v1/denoms/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4> · read 2026-10-02T22:52:46Z · height 12612795 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_main_denom`
  `{"denom":{"base":"uusdc","trace":[{"port_id":"transfer","channel_id":"channel-3"}]}}`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-3/ports/transfer> · read 2026-10-02T22:52:48Z · height 12612795 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_main_channel3`
  `{"state":"STATE_OPEN","ordering":"ORDER_UNORDERED","counterparty":{"port_id":"transfer","channel_id":"channel-175"},"connection_hops":["connection-3"],"version":"ics20-1"}`
- <https://api.zigchain.com/ibc/core/channel/v1/channels/channel-3/ports/transfer/client_state> · read 2026-10-02T22:52:48Z · height 12612796 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_main_channel3_client_state`
  `"client_id":"07-tendermint-3","client_state":{"@type":"/ibc.lightclients.tendermint.v1.ClientState","chain_id":"noble-1"`
- <https://docs.noble.xyz/build/endpoints/mainnet> · read 2026-10-02T22:53:00Z · SHA-256 of the page as received `65fd73349aa96c291e24b842ba742af30beb8c25bf1bf4304e5a51925233109f`
  `Mainnet Chain ID: noble-1 [...] API https://api.noble.xyz https://noble-api.polkachu.com (visible page text, whitespace collapsed; HTTP 200 after redirect to /build/endpoints/mainnet/)`
- <https://api.noble.xyz/ibc/apps/transfer/v1/channels/channel-175/ports/transfer/escrow_address> · read 2026-10-02T22:53:17Z · height 60661840 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_noble_escrow_addr`
  `{"escrow_address":"noble1e4quceq0nhvfalpkct2yecpu56ss3erltz8yku"}`
- <https://api.noble.xyz/ibc/core/channel/v1/channels/channel-175/ports/transfer> · read 2026-10-02T22:53:18Z · height 60661840 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_noble_channel175`
  `{"state":"STATE_OPEN","ordering":"ORDER_UNORDERED","counterparty":{"port_id":"transfer","channel_id":"channel-3"},"connection_hops":["connection-179"],"version":"ics20-1","upgrade_sequence":"0"}`
- <https://api.noble.xyz/ibc/core/channel/v1/channels/channel-175/ports/transfer/client_state> · read 2026-10-02T22:53:18Z · height 60661841 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_noble_channel175_client_state`
  `"client_id":"07-tendermint-184","client_state":{"@type":"/ibc.lightclients.tendermint.v1.ClientState","chain_id":"zigchain-1"`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc%2F6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4> · read 2026-10-02T22:53:42Z · height 12612813 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_r1_zig_supply`
  `{"amount":{"denom":"ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4","amount":"259314404300"}}`
- <https://api.noble.xyz/cosmos/bank/v1beta1/balances/noble1e4quceq0nhvfalpkct2yecpu56ss3erltz8yku/by_denom?denom=uusdc> · read 2026-10-02T22:53:43Z · height 60661863 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_r1_noble_escrow_balance`
  `{"balance":{"denom":"uusdc","amount":"259314404300"}}`
- <https://api.zigchain.com/cosmos/bank/v1beta1/supply/by_denom?denom=ibc%2F6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4> · read 2026-10-02T22:53:44Z · height 12612813 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_r2_zig_supply`
  `{"amount":{"denom":"ibc/6490A7EAB61059BFC1CDDEB05917DD70BDF3A611654162A1A47DB930D40D8AF4","amount":"259314404300"}}`
- <https://api.noble.xyz/cosmos/bank/v1beta1/balances/noble1e4quceq0nhvfalpkct2yecpu56ss3erltz8yku/by_denom?denom=uusdc> · read 2026-10-02T22:53:44Z · height 60661864 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v1/f09_r2_noble_escrow_balance`
  `{"balance":{"denom":"uusdc","amount":"259314404300"}}`

### F10
**CONFIRMED.** Claim checked: https://docs.valdora.finance/faqs says the minimum stake is 50 ZIG and the minimum unstake is 50 stZIG, that unstaking "may include a fee that varies based on the amount of stZIG being unstaked", and that an unstake request cannot be cancelled once submitted.

All four parts appear word for word on the FAQ page (HTTP 200): minimum stake 50 ZIG; minimum unstake 50 stZIG; the unstake fee sentence (the claim's quoted fragment matches exactly); and no cancellation once submitted. Caveats from other official sources: (a) the on-chain staker protocol_info at block 12612930 has min_deposit "50000000000000000000" azig, which is 50 ZIG (azig has exponent 18), so that matches. But min_stzig is "49000000", and stZIG has exponent 6, so that is 49 stZIG, not 50. Whether the contract compares with &lt; or &lt;= is unknown because the source repo Liquid-Zig/new-stzig-contracts returns 404 on raw GitHub. (b) The how-to guide /how-to-guides/unstaking-process says "(Minimum amount to unstake is 50 ZIG.)", which uses ZIG, not stZIG. (c) The Economics page says there are no fees on redemption, which contradicts the FAQ's unstake-fee answer (see F11).

- <https://docs.valdora.finance/faqs> · read 2026-10-02T22:50:33Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `The minimum amount required to stake on Valdora is 50 ZIG. ... Users can unstake a partial amount of their stZIG balance, the current minimum amount is 50 stZIG.`
- <https://docs.valdora.finance/faqs> · read 2026-10-02T22:50:33Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `Yes. Unstaking ZIG on Valdora may include a fee that varies based on the amount of stZIG being unstaked. ... No. Once an unstake request is submitted on Valdora, it cannot be cancelled.`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJwcm90b2NvbF9pbmZvIjp7fX0=> · read 2026-10-02T22:59:57Z · height 12612930 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/valdora_staker_protocol_info`
  `"min_stzig": "49000000", "min_deposit": "50000000000000000000", ... "fees_percentage": "1000"`
- <https://api.zigchain.com/cosmos/bank/v1beta1/denoms_metadata/coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig> · read 2026-10-02T23:00:15Z · height 12612936 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/stzig_denom_metadata`
  `{"denom":"stZIG","exponent":6,"aliases":[]}`
- <https://docs.valdora.finance/how-to-guides/unstaking-process> · read 2026-10-02T23:01:05Z · SHA-256 of the page as received `ceea2ccc7a7647a5a93b45528e06e164c4e24d452b0782cdca6003be01f668b8`
  `Enter the amount of stZIG you want to unstake. (Minimum amount to unstake is 50 ZIG.)`

### F11
**CONFIRMED.** Claim checked: https://docs.valdora.finance/economics-and-incentives says a 10% performance fee is applied to staking rewards (not principal) and that there are no fees on deposit, redemption or holding stZIG.

The Economics & Incentives page (HTTP 200) says exactly this: a 10% performance fee on staking rewards, not user principal, and no fees on deposit, redemption or holding stZIG. Collected fees go to the "Protocol treasury (for audits, grants, and future development)". The page contradicts the FAQ, which says unstaking "may include a fee" (F10). On chain, the staker's fees_percentage is "1000" at block 12612930. That fits 10% if the scale is 10000; the scale is my inference from the 2025 OAK report's recommendation "Percentage values: ensure &lt;= 10000 (100%)". The on-chain treasury_address is zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx, the same account as the staker admin.

- <https://docs.valdora.finance/economics-and-incentives> · read 2026-10-02T22:50:34Z · SHA-256 of the page as received `21c241c09747f07955cffae02206d63ab52564c2a952d0244b05260c070ddc91`
  `10% performance fee is applied to staking rewards (not user principal). ... There are no fees on deposit, redemption, or holding stZIG. This ensures frictionless staking and liquidity participation.`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55/smart/eyJwcm90b2NvbF9pbmZvIjp7fX0=> · read 2026-10-02T22:59:57Z · height 12612930 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/valdora_staker_protocol_info`
  `"fees_percentage": "1000", "treasury_address": "zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx"`

### F12
**CONFIRMED.** Claim checked: https://docs.valdora.finance/liquid-staking/unstaking-and-redemption describes: the user submits a redeem transaction via the Staker contract, which burns the stZIG; the ZIG is requested into a withdrawal queue and unbonding starts; after unbonding the user claims. Also check whether it states a duration (e.g. 21 days, plus any extra days) and quote it.

The Normal Unstaking Flow lists the three steps exactly as claimed. Duration: the page says "Instead of waiting 21 days" (Fast Redemption section) and its table says "Wait Time | 21-day+ unbonding period | Instant (via DEX trade)". The page never states the 2 extra days. That figure is only in the FAQ: "ZIG unstaking on Valdora follows ZIG Chain's 21-day unbonding period, plus 2 additional days for Valdora distribution." On chain, the mainnet staking unbonding_time is "1814400s" (exactly 21.0 days) at block 12612910, with bond_denom "azig".

- <https://docs.valdora.finance/liquid-staking/unstaking-and-redemption> · read 2026-10-02T22:50:34Z · SHA-256 of the page as received `8a7000b9931c84757be5176115c3d0d0d647bf02af92e8bb96d3b81ce1a1d286`
  `User submits a redeem transaction via the Staker Contract, burning their stZIG. The equivalent amount of ZIG is requested into the withdrawal queue, initiating the unbonding process. Once the unbonding period completes, users can call the withdraw function to claim their ZIG.`
- <https://docs.valdora.finance/liquid-staking/unstaking-and-redemption> · read 2026-10-02T22:50:34Z · SHA-256 of the page as received `8a7000b9931c84757be5176115c3d0d0d647bf02af92e8bb96d3b81ce1a1d286`
  `Instead of waiting 21 days, users can sell stZIG on supported DEXs for ZIG or other tokens. ... Wait Time | 21-day+ unbonding period | Instant (via DEX trade)`
- <https://docs.valdora.finance/faqs> · read 2026-10-02T22:50:33Z · SHA-256 of the page as received `5f4faa472ebf7f684fb5d6b6c9602a43bbebd54936a2b8a3c8631e96a0732b85`
  `ZIG unstaking on Valdora follows ZIG Chain's 21-day unbonding period, plus 2 additional days for Valdora distribution.`
- <https://api.zigchain.com/cosmos/staking/v1beta1/params> · read 2026-10-02T22:58:52Z · height 12612910 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/staking_params`
  `{"params":{"unbonding_time":"1814400s","max_validators":14,"max_entries":7,"historical_entries":10000,"bond_denom":"azig",...}}`

### F13
**CONFIRMED.** Claim checked: https://docs.valdora.finance/smart-contracts publishes the mainnet staker zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55, the mainnet token zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2 and the testnet staker zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69 (compare every character). Also: does it publish any query/execute schema, code ID or checksum?

All three addresses match the page character for character, checked by script: each is 62 characters and has a valid bech32 checksum. The page publishes no query or execute schema, no code ID and no checksum; a search of the HTML found no code id, checksum, schema, sha256, instantiate or query/execute message terms. Besides the staker and token, the page lists the mainnet token denom coin.zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2.stzig, 4 mainnet ledgers, 5 vault addresses, the testnet token zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr and 4 testnet ledgers. From the chain, not the page: the mainnet staker is code_id 179, label "stZIG Staker", cw2 stzig-staker 1.1.0. The mainnet token is code_id 181, label "stZIG Token", its admin is the staker contract, cw2 stzig-token 1.1.0 (block 12612915). The testnet staker is code_id 2532, label "stZIG Staker" (testnet block 8046810). The staker's own error message lists its query variants: admin, pending_admin, paused, token_contract, st_zig_price, ... `partnered_vaults`.

- <https://docs.valdora.finance/smart-contracts> · read 2026-10-02T22:50:35Z · SHA-256 of the page as received `f030f4cb1bf0561145fc8d84d08d30103c9c051a1f3831f77bea6a6e17173d68`
  `Staker Contract Address: zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55 Token Contract Address: zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2 ... Testnet Staker Contract Address: zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55> · read 2026-10-02T22:59:07Z · height 12612915 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/valdora_staker_info`
  `"code_id":"179","creator":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","admin":"zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx","label":"stZIG Staker"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2> · read 2026-10-02T22:59:09Z · height 12612915 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/valdora_token_info`
  `"code_id":"181","creator":"zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55","label":"stZIG Token"`
- <https://testnet-api.zigchain.com/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69> · read 2026-10-02T22:59:21Z · height 8046810 (testnet) · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/valdora_testnet_staker_info`
  `"code_id":"2532","creator":"zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3","label":"stZIG Staker"`

### F14
**CONFIRMED.** Claim checked: https://raw.githubusercontent.com/oak-security/audit-reports/main/_tech_stacks/cosmwasm.md lists three Valdora reports (2025-09-28 Valdora; 2026-04-17 Valdora Vault Contract; 2026-09-21 Valdora 18 Decimals Update). Download each PDF from raw.githubusercontent.com (paths under Valdora/, URL-encode spaces) and check SHA-256: f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6 (2025-09-28), c938f8d2782a1e8dd9ac537a3db54fbace8eae5456453a60fa8f62bb0128a5db (2026-04-17), 56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6 (2026-09-21).

The "### Valdora" section of cosmwasm.md lists exactly three reports: "Valdora" (2025-09-28), "Valdora Vault Contract" (2026-04-17) and "Valdora 18 Decimals Update" (2026-09-21). No other Valdora or stZIG entries exist; separate ZIGChain entries are listed. The third file name ends in " v1.0" ("2026-09-21 Audit Report - Valdora 18 Decimals Update v1.0.pdf"). All three PDFs came from raw.githubusercontent.com with HTTP 200, and all three SHA-256 hashes match the claim exactly: 2025-09-28 is 897039 bytes and 39 pages, 2026-04-17 is 445070 bytes and 27 pages, 2026-09-21 is 765175 bytes and 25 pages. The cover of the 2026-09-21 PDF reads "Valdora 18 Decimals Update v1.0 September 21, 2026", but its metadata title is "Valdora Pull 18 — Security Audit Report". It covers Pull Request #18 of Liquid-Zig/new-stzig-contracts: base a00c79e720, head 0afa20bc38, fixes reviewed at 60afaab5b3.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/_tech_stacks/cosmwasm.md> · read 2026-10-02T22:51:46Z · SHA-256 of the file as received `20d8195df6cf13d0feb4c406588a1ccb489a37cbd8ded276ea01f90c8945c734`
  `### Valdora - [Valdora](.../Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf) - [Valdora Vault Contract](.../2026-04-17%20Audit%20Report%20-%20Valdora%20Vault%20Contract.pdf) - [Valdora 18 Decimals Update](.../2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf)`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T22:51:54Z · SHA-256 of the PDF as received `f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6`
  `sha256 f619b9e9d18d33578ac65fea7c2e7d9220f36fa335c813632e2bd980694a2fb6 (match)`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-04-17%20Audit%20Report%20-%20Valdora%20Vault%20Contract.pdf> · read 2026-10-02T22:51:54Z · SHA-256 of the PDF as received `c938f8d2782a1e8dd9ac537a3db54fbace8eae5456453a60fa8f62bb0128a5db`
  `sha256 c938f8d2782a1e8dd9ac537a3db54fbace8eae5456453a60fa8f62bb0128a5db (match)`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf> · read 2026-10-02T22:51:55Z · SHA-256 of the PDF as received `56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6`
  `sha256 56ab614729d83f3f345a42b092af0c77b0f9a483aa4aeba0fd802fb05a89f5d6 (match)`

### F15
**PARTLY.** Claim checked: Finding counts by severity in those three PDFs (use pdftotext): 2025-09-28: 47 findings = Critical 3, Major 9, Minor 11, Informational 24, with 1 Partially Resolved and 4 Acknowledged; 2026-04-17: 28 = Critical 2, Major 1, Minor 6, Informational 19, with 2 Acknowledged; 2026-09-21: 7 = Critical 1, Major 2, Minor 3, Informational 1, with 1 Acknowledged. Also confirm the 2025 report contains the sentence "Single admin model: All contracts use single admin without multi-sig." and its audited repository and commit.

2026-04-17: 28 findings (Critical 2, Major 1, Minor 6, Informational 19), 2 Acknowledged (#19, #20) and 26 Resolved. This matches exactly in both the summary table and the detailed section. 2026-09-21: 7 findings (Critical 1, Major 2, Minor 3, Informational 1), 1 Acknowledged (#5) and 6 Resolved. This also matches in both places. 2025-09-28: the Summary of Findings table (pp.10-12) gives 47 findings: Critical 3, Major 9, Minor 11, Informational 24, with 1 Partially Resolved (#9), 4 Acknowledged (#13, #18, #22, #24) and 42 Resolved, all matching the claim. However, the Detailed Findings section of the same PDF labels finding #24 ("Missing maximum ledger limit...") "Severity: Minor", while the summary table calls it Informational. By the detailed section the split is Minor 12 / Informational 23, so the PDF contradicts itself and the claim's 11/24 split holds only for the summary table. The "Single admin model" sentence appears word for word in finding #22 "Centralization risks" (Severity: Minor, Status: Acknowledged). Audited repository: https://github.com/Liquid-Zig/new-stzig-contracts at commit 5fd9d3bf7a97daee3630e5487f6a6384013f3e21. Fixes were verified at 9abdd76a5735a3894446d80366835077819c18ed. The report is v1.2, dated September 28, 2025, for client LIQUIDZIG LTD. On chain at block 12612975, the staker admin and treasury zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx is a BaseAccount with one secp256k1 key, not a multisig. That fits the finding's Acknowledged status.

- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T22:51:54Z · SHA-256 of the file as received `40729a6de0ea326e040ce08a706c25e593dec4fef01348ff3c84fb3dfa0589e1`
  `Summary table: "24 Missing maximum ledger limit could eventually cause issues with operations that iterate over all ledgers  Informational  Acknowledged". Detailed section: "24. Missing maximum ledger limit could eventually cause issues with operations that iterate over all ledgers Severity: Minor"`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2025-09-28%20Audit%20Report%20-%20Valdora.pdf> · read 2026-10-02T22:51:54Z · SHA-256 of the file as received `b5fd29da9946cad91c950d5981083bb702e50b2d3599cd158f6392da509c43c5`
  `22. Centralization risks Severity: Minor ... Single admin model: All contracts use single admin without multi-sig. ... Status: Acknowledged | Repository https://github.com/Liquid-Zig/new-stzig-contracts Commit 5fd9d3bf7a97daee3630e5487f6a6384013f3e21`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-04-17%20Audit%20Report%20-%20Valdora%20Vault%20Contract.pdf> · read 2026-10-02T22:51:54Z · SHA-256 of the file as received `6957c5fe10c45b19a505621cdbe0488bf088e0a4a69468b9037093299dd069cb`
  `1 ... Critical Resolved; 2 ... Critical Resolved; 3 ... Major Resolved; 4-9 Minor Resolved; 10-28 Informational (19 Acknowledged, 20 Acknowledged, rest Resolved)`
- <https://raw.githubusercontent.com/oak-security/audit-reports/main/Valdora/2026-09-21%20Audit%20Report%20-%20Valdora%2018%20Decimals%20Update%20v1.0.pdf> · read 2026-10-02T22:51:55Z · SHA-256 of the file as received `3714c7737616d9671ebdacf04a1aa2f6eb6036d9ece1cbb931527e424532c7dd`
  `1 ... Critical Resolved; 2 ... Major Resolved; 3 ... Major Resolved; 4 ... Minor Resolved; 5 ... Minor Acknowledged; 6 ... Minor Resolved; 7 ... Informational Resolved`
- <https://api.zigchain.com/cosmos/auth/v1beta1/accounts/zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx> · read 2026-10-02T23:02:19Z · height 12612975 · kept in [evidence/valdora.json](evidence/valdora.json) as `verify/v2/acct_staker_admin`
  `{"@type":"/cosmos.auth.v1beta1.BaseAccount","pub_key":{"@type":"/cosmos.crypto.secp256k1.PubKey"},"sequence":"81"}`

### F16
**CONFIRMED.** Claim checked: https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648: engagement June 30th to July 30th 2025; assessed commits 59f095b04ffb1c1bf8b38ee256b4cbb9a88d1dd3 and 9042989f8fd00b6524b470a5850ec03f8e5a2e4e; findings Critical 0, High 0, Medium 1, Low 5, Informational 13; 17 Solved, 2 Acknowledged.

The page returned HTTP 200 (title "CosmWasm Contracts Audit | Oro | Halborn Audit Reports", last updated 08/26/2025). The engagement ran June 30th to July 30th, 2025; the page's data has date_start 2025-06-30 and date_end 2025-07-30. The assessed commit IDs are shown as 59f095b and 9042989. In the page's embedded sources data, the full hashes are 59f095b04ffb1c1bf8b38ee256b4cbb9a88d1dd3 (oroswap/oroswap-core, 5 files under contracts/periphery/pool_initializer) and 9042989f8fd00b6524b470a5850ec03f8e5a2e4e (oroswap/oroswap-core, 162 files, stored as a commit URL). Severity breakdown: Critical 0, High 0, Medium 1, Low 5, Informational 13, 19 findings in total; 17 Solved, 2 Acknowledged, 0 Risk Accepted. I also counted the 19 findings by script and got the same totals. The Medium is "Permissionless “Collect” enables fee-harvest griefing" (Solved). The two Acknowledged are both Informational: #7 "Permissionless decimal spoofing" and #14 "Formula deviation with reference contracts".

- <https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648> · read 2026-10-02T22:54:02Z · SHA-256 of the page as received `300668b91314f1599d4c13bdc5fcbe063f1899353768e842a58a0340f66f2b9a`
  `Date of Engagement June 30th, 2025 - July 30th, 2025 Source Code oroswap-core oroswap-core Assessed Commit ID 59f095b 9042989 Severity Breakdown 0 Risk Accepted 2 Acknowledged 17 Solved 19 All Findings Critical 0 High 0 Medium 1 1 Solved Low 5 5 Solved Informational 13 2 Ack. 11 Solved`
- <https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648> · read 2026-10-02T22:54:02Z · SHA-256 of the file as read `ad122671bffb290b5105ef384d8946a9e6a5b0b02bb3dffff65d003a294e131c`
  `Oroswap engaged Halborn to conduct a security assessment on their smart contracts beginning on June 30th, 2025 and ending on July 30th, 2025. | "commitHash":"59f095b04ffb1c1bf8b38ee256b4cbb9a88d1dd3" | "commitHash":"https://github.com/oroswap/oroswap-core/commit/9042989f8fd00b6524b470a5850ec03f8e5a2e4e"`

### F17
**CONFIRMED.** Claim checked: https://docs.oroswap.org/docs/getting-started/swap says "Fees: 1% default fee, redistributed to liquidity providers." AND the mainnet OroSwap factory zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85 answers smart query {"config":{}} with pair_configs that all have is_disabled true. Then read the meaning of is_disabled in the official source (raw.githubusercontent.com/oroswap/oroswap-core/main/packages/oroswap-core/src/factory.rs, the PairConfig struct doc comment) and quote it: does it stop trading, or only new pair creation?

(1) The swap page (HTTP 200, last-modified Wed, 01 Oct 2025) contains the fee sentence exactly as quoted. (2) OroSwap's own Mainnet Contracts docs page gives OROSWAP_FACTORY_ADDRESS as zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85. I sent the smart query {"config":{}} to two official API nodes listed in ZIGChain/networks zigchain-1/api-nodes.txt: api.zigchain.com and public-zigchain-lcd.numia.xyz. Both returned byte-identical bodies at block 12612875. There are 9 pair_configs and all have "is_disabled": true: concentrated (code 174, 100 bps) and code 173 types xyk_10 (10), xyk_100 (100), xyk_200 (200), xyk_25 (25), xyk_97 (100), xyk_98 (25), xyk_99 (25) and xyk (1 bps). Every type has maker_fee_bps 2000 and pool_creation_fee 1e20. blacklisted_pair_types returns all 9 (block 12612898). (3) The PairConfig doc comment in factory.rs says a disabled type blocks only new pair creation; it does not stop trading. The code on main agrees. is_disabled is checked only in execute_create_pair (it returns PairConfigDisabled) and in query_blacklisted_pair_types. Halting trading uses a separate per-pair paused flag: check_pair_not_paused runs in provide_liquidity, withdraw_liquidity and swap. The factory's paused_pairs_count is 0 at block 12612898. Caveat: the deployed factory (code_id 172, label oroswap-factory-mainnet) reports cw2 {"contract":"oroswap-factory","version":"1.2.0"}, while contracts/factory/Cargo.toml on main says version 1.1.0. So the deployed build is not the current main branch.

- <https://docs.oroswap.org/docs/getting-started/swap> · read 2026-10-02T22:55:45Z · SHA-256 of the page as received `f31b670342dda4dfb56297cb17e515474194cc30572a378645424e72856b5f3c`
  `<li><strong>Fees</strong>: 1% default fee, redistributed to liquidity providers.</li>`
- <https://docs.oroswap.org/docs/contracts-faucet/creating_constant_product_pools> · read 2026-10-02T22:56:19Z · SHA-256 of the page as received `6426f802b108e790f55c97d0c0e6493b0b49181f293c649216d1ad5e8312ab3e`
  `Mainnet Deployment Addresses # Factory Contract export OROSWAP_FACTORY_ADDRESS="zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85"`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJjb25maWciOnt9fQ==> · read 2026-10-02T22:57:01Z · height 12612875 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v2/factory_config_api.zigchain.com`
  `{"code_id":173,"pair_type":{"xyk":{}},"total_fee_bps":1,"maker_fee_bps":2000,"is_disabled":true,"is_generator_disabled":false,"permissioned":false,"pool_creation_fee":"100000000000000000000"} (9 of 9 pair_configs is_disabled true)`
- <https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJjb25maWciOnt9fQ==> · read 2026-10-02T22:57:01Z · height 12612875 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v2/factory_config_public-zigchain-lcd.numia.xyz`
  `byte-identical body to api.zigchain.com (grpc-metadata-x-cosmos-block-height: 12612875)`
- <https://raw.githubusercontent.com/oroswap/oroswap-core/main/packages/oroswap-core/src/factory.rs> · read 2026-10-02T22:57:21Z · SHA-256 of the file as received `faff78468716218212bd8b785c16ea3c8698d1d2ac0250cfb7bada09bd860e4f`
  ```text
  /// Whether a pair type is disabled or not. If it is disabled, new pairs cannot be
  /// created, but existing ones can still read the pair configuration
  /// Default is false.
  #[serde(default)]
  pub is_disabled: bool,
  ```
- <https://raw.githubusercontent.com/oroswap/oroswap-core/main/contracts/factory/src/contract.rs> · read 2026-10-02T22:57:39Z · SHA-256 of the file as received `abb6d671aa1a55b4b8b485910836a533bf1e21ca59eb0c84b7eecf053103d548`
  ```text
  // Check if pair config is disabled
      if pair_config.is_disabled {
          return Err(ContractError::PairConfigDisabled {});
  ```
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/raw/Y29udHJhY3RfaW5mbw==> · read 2026-10-02T22:58:00Z · height 12612894 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v2/factory_cw2`
  `{"contract":"oroswap-factory","version":"1.2.0"} (main-branch contracts/factory/Cargo.toml: version = "1.1.0")`
- <https://api.zigchain.com/cosmwasm/wasm/v1/contract/zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85/smart/eyJwYXVzZWRfcGFpcnNfY291bnQiOnt9fQ==> · read 2026-10-02T22:58:14Z · height 12612898 · kept in [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) as `verify/v2/factory_paused_pairs_count`
  `{"data":0}`

### F18
**CONFIRMED.** Claim checked: https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble (dated September 10, 2026): new USDC minting on Noble via Circle Mint is disabled on October 13, 2026; redemptions via Circle Mint remain until January 12, 2027, when the Noble USDC contract and CCTP routes are fully paused; a snapshot is taken and manual redemption begins January 13, 2027; CCTP V1 burn limits begin reducing October 31, 2026; Noble will not receive CCTP V2.

Read fresh (HTTP 200). Title 'Circle is Discontinuing Support for USDC and CCTP V1 on Noble'. Byline date 'September 10, 2026'. JSON-LD has datePublished 2026-09-10 and dateModified 2026-09-10T16:00:01.326Z; the HTTP Last-Modified is Fri, 02 Oct 2026 12:35:06 GMT. All five parts match the text. (1) New Circle Mint minting on Noble is disabled October 13, 2026. (2) Circle Mint redemptions last until January 12, 2027, 'when the Noble USDC contract and CCTP routes will be fully paused'. (3) A snapshot is taken and a manual redemption portal opens; 'The manual redemption process begins January 13, 2027.' (4) 'CCTP V1 burn limits will begin reducing on October 31, 2026.' (5) 'Noble will not receive CCTP V2.' Precision notes: the snapshot is taken 'On the pause date', i.e. January 12, 2027, not January 13. The Mint section says burn limits 'will gradually reduce to zero beginning October 31, 2026'. The page also says something the claim leaves out: 'After December 1, 2026, CCTP exits may be limited to destination chains that continue to support CCTP V1 burns.'

- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T23:00:53Z · SHA-256 of the response body as received `2e9df9da10996ca8f3b28b5249f95e9f50532ad9b7977178ec7b35211dbb5c14`
  `New minting of USDC on Noble through Circle Mint will be disabled on October 13, 2026. Redemptions from Noble via Circle Mint remain available until January 12, 2027, when the Noble USDC contract and CCTP routes will be fully paused.`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T23:00:53Z · SHA-256 of the response body as received `2e9df9da10996ca8f3b28b5249f95e9f50532ad9b7977178ec7b35211dbb5c14`
  `On the pause date, Circle will take a snapshot of all remaining USDC on Noble balances and open a manual redemption portal. The manual redemption process begins January 13, 2027.`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T23:00:53Z · SHA-256 of the response body as received `2e9df9da10996ca8f3b28b5249f95e9f50532ad9b7977178ec7b35211dbb5c14`
  `CCTP V1 burn limits will begin reducing on October 31, 2026.`
- <https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble> · read 2026-10-02T23:00:53Z · SHA-256 of the response body as received `2e9df9da10996ca8f3b28b5249f95e9f50532ad9b7977178ec7b35211dbb5c14`
  `Noble will not receive CCTP V2.`

### F19
**CONFIRMED.** Claim checked: Circle help article KB0010590 (public knowledge API https://help.circle.com/api/sn_km_api/knowledge/articles/KB0010590) says Circle Mint only supports native USDC on Noble, and USDC moved to other appchains via IBC must be transferred back to Noble before depositing to Circle Mint.

The knowledge API returned HTTP 200 JSON: number 'KB0010590', short_description 'USDC supported blockchains | minting, redemption, & FAQs', language en, no date field. The Noble section says both things in the claim, word for word. It also says 'Circle Mint and Circle APIs only support USDC on Noble from the Cosmos ecosystem.' The supported Noble denom is listed as 'uusdc'. Separately, a Sei entry is marked 'NOT supported (USDC.n USDC via Noble)'. Gap worth noting: the article says nothing about the Noble wind-down announced September 10, 2026. It has 0 matches for discontinu, deprecat or sunset, and no 2026 or 2027 dates, so it still presents Noble as a supported Circle Mint chain.

- <https://help.circle.com/api/sn_km_api/knowledge/articles/KB0010590> · read 2026-10-02T23:01:14Z · SHA-256 of the response body as received `ce9a3835237a6e63025d45af70132cf1bb3f1fd6f844ed6d56abc1c0b0f62688`
  `Does Circle Mint support USDC that has been transferred from Noble to other appchains via IBC? No. Circle Mint only supports native USDC on Noble. If you transfer USDC from Noble to other appchains via IBC, you must transfer back to Noble via IBC prior to depositing into your Circle Mint.`

### F20
**PARTLY.** Claim checked: Zignaly's help center as served at https://intercom.help/zignaly/en/ (each page declares canonical help.zignaly.com; help.zignaly.com itself is behind a Cloudflare challenge: try it once and record the status): (a) articles/6894830-what-is-profit-sharing has an "Update (31 August 2026)" saying trading services were removed from the marketplace and existing services keep running; (b) articles/15899782-service-withdrawal-vs-withdrawing-to-your-wallet-how-each-one-works says Profit Sharing uses a pooled account (PAMM) and withdrawals go over BEP20; (c) articles/6164601-security-of-zignaly says deposited funds are held in Binance (Broker program / sub-accounts) and that Fireblocks applies only to account wallets; (d) articles/9044409-kyc-how-to-verify-your-account says all users must complete KYC and lists the United States and Canada among ineligible countries (copy the whole list).

help.zignaly.com, tried once at 2026-10-02T23:01:42Z: HTTP 403, header 'cf-mitigated: challenge', server cloudflare, page title 'Just a moment...'. All four intercom.help pages returned HTTP 200, and each declares &lt;link rel="canonical" href="https://help.zignaly.com/en/articles/...">.
(a) CONFIRMED word for word. lastUpdatedDate 2026-09-01T17:37:30Z. The page also says: 'Creating new Profit Sharing services or becoming a new Wealth Manager is currently not available on Zignaly.'
(b) CONFIRMED, with one nuance. The PAMM sentence is word for word. BEP20 appears only in the 'withdraw to a wallet' steps ('Select the network (BEP20)...'). A service withdrawal returns funds to the Zignaly balance and does not use a chain. lastUpdatedDate 2026-08-31T21:39:10Z.
(c) PARTLY. Confirmed: funds are 'held in Binance', the page names the 'Binance Broker Partner Program' (its own wording), and Fireblocks 'applies only to Zignaly account wallets (Available Balance)'. Not confirmed: 'sub-accounts' never appears (0 matches for sub-account/subaccount/sub account on all four pages). The page also contradicts itself: it first says Fireblocks protects 'all operations', then limits it to account wallets. lastUpdatedDate 2025-08-08T16:53:51Z, older than the 31 Aug 2026 marketplace update.
(d) CONFIRMED: 'All users must complete a Know Your Customer (KYC) verification.' Full list of ineligible countries, 14 bullets in source order: Canada; Crimea; Cuba; Democratic People's Republic of North Korea; Donetsk People's Republic (DNR); Iran; Kherson Oblast (Russian-occupied areas); Luhansk People's Republic (LNR); Myanmar; Sevastopol; Syria; United States; Venezuela; Zaporizhzhia Oblast (Russian-occupied areas). KYC provider named: Sumsub. lastUpdatedDate 2026-06-25T10:55:37Z.

- <https://help.zignaly.com/en/articles/6894830-what-is-profit-sharing> · read 2026-10-02T23:01:42Z · SHA-256 of the file as received `ce5a2c703c55d0a2696bd21d79ac9bb1ffa8f3970125449736d6fdc3a7918d32`
  `Just a moment...`
- <https://intercom.help/zignaly/en/articles/6894830-what-is-profit-sharing> · read 2026-10-02T23:01:49Z · SHA-256 of the response body as received `d53b52b9b9eed1e97dee90815e37d79e70a0b6b21995e7f841d2345f20ff12a8`
  `Update (31 August 2026): Trading services were removed from the Zignaly marketplace. Existing services keep running and existing investments are unaffected.`
- <https://intercom.help/zignaly/en/articles/15899782-service-withdrawal-vs-withdrawing-to-your-wallet-how-each-one-works> · read 2026-10-02T23:01:50Z · SHA-256 of the response body as received `77c3b815c82312c4e33dff6d491ef42ccba3a76f7395cfd8d9a2c9c3122d385a`
  `Profit Sharing services use a pooled account (PAMM), where each investment is a share of the total balance.`
- <https://intercom.help/zignaly/en/articles/15899782-service-withdrawal-vs-withdrawing-to-your-wallet-how-each-one-works> · read 2026-10-02T23:01:50Z · SHA-256 of the response body as received `77c3b815c82312c4e33dff6d491ef42ccba3a76f7395cfd8d9a2c9c3122d385a`
  `Select the network (BEP20), paste your external wallet address, set the amount, and complete verification.`
- <https://intercom.help/zignaly/en/articles/6164601-security-of-zignaly> · read 2026-10-02T23:01:50Z · SHA-256 of the response body as received `d880c5cffd17b00db3a5309360205fe4f59f4047e7759ae0a42cc2d75578558f`
  `Zignaly has also partnered with Binance through the Binance Broker Partner Program. When you deposit funds, they are held in Binance and covered by their Secure Asset Fund for Users (SAFU), providing an additional safety net.`
- <https://intercom.help/zignaly/en/articles/6164601-security-of-zignaly> · read 2026-10-02T23:01:50Z · SHA-256 of the response body as received `d880c5cffd17b00db3a5309360205fe4f59f4047e7759ae0a42cc2d75578558f`
  `This Fireblocks integration applies only to Zignaly account wallets (Available Balance). The Profit Sharing service accounts (Standby Fund and Trading Fund) remain unchanged for now.`
- <https://intercom.help/zignaly/en/articles/9044409-kyc-how-to-verify-your-account> · read 2026-10-02T23:01:51Z · SHA-256 of the response body as received `5e99a27154941998ab270b3d20ebed2eed87361a6a0a0e92185affb8ee4c4918`
  `All users must complete a Know Your Customer (KYC) verification.`
- <https://intercom.help/zignaly/en/articles/9044409-kyc-how-to-verify-your-account> · read 2026-10-02T23:01:51Z · SHA-256 of the response body as received `5e99a27154941998ab270b3d20ebed2eed87361a6a0a0e92185affb8ee4c4918`
  `If your country of residence is listed below, you are not eligible to complete KYC verification due to regulatory restrictions:`

### F21
**CONFIRMED.** Claim checked: ESMA interim MiCA register CSVs: https://www.esma.europa.eu/sites/default/files/2024-12/EMTWP.csv lists Circle Internet Financial Europe SAS with USDC and EURC white papers and has no Tether/USDT entry; https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv has a row Latvijas Banka / LV / Comet Technologies Ltd. Record the Last-Modified headers.

EMTWP.csv: HTTP 200, text/csv, 17957 bytes, Last-Modified: Wed, 30 Sep 2026 16:10:58 GMT, ETag "4625-65cb58b6cc408", 50 data rows, SHA-256 5d63159cf4a5f11ffff065d0a48cc84384c7e7bd4a5c4d1e4896ddf3f2c198c3. Lines 16 and 17 are both 'Circle Internet Financial Europe SAS': LEI 969500OYUDADGZKCR583, ACPR, FR, '4 Rue de Marivaux 75002 Paris', authorised 01/07/2024, 'Electronic money institution'. Their wp_url values are https://www.circle.com/fr/legal/mica-eurc-whitepaper (wp_lastupdate 24/12/2025) and https://www.circle.com/fr/legal/mica-usdc-whitepaper (wp_lastupdate 15/09/2026). A case-insensitive search for tether, usdt or USD₮ finds 0 matches, so there is no Tether/USDT entry. 'Banking Circle S.A.' also contains 'circle' but is a different firm.
OTHER.csv: HTTP 200, 236166 bytes, Last-Modified: Wed, 30 Sep 2026 16:09:09 GMT, ETag "39a86-65cb584f41e78", 1028 data rows, SHA-256 556db62050a19f3d4fc6a139e97eb4b309ff9fd1fdd92c06fd6b34775cb3c990. Line 804 is the Latvijas Banka / LV / Comet Technologies Ltd. row. Other fields in that row: ae_lei empty; ae_lei_cou_code VG; ae_lei_name_casp 'Bitvavo'; offer countries are the 27 EU states; wp_url https://gitbook.zignaly.com/white-paper, not the CDN PDF that zigchain.com links; wp_lastupdate 05.11.2025.

- <https://www.esma.europa.eu/sites/default/files/2024-12/EMTWP.csv> · read 2026-10-02T23:03:00Z · SHA-256 of the response body as received `5d63159cf4a5f11ffff065d0a48cc84384c7e7bd4a5c4d1e4896ddf3f2c198c3`
  `https://www.circle.com/fr/legal/mica-usdc-whitepaper,01/07/2024,`
- <https://www.esma.europa.eu/sites/default/files/2024-12/EMTWP.csv> · read 2026-10-02T23:03:00Z · SHA-256 of the file as received `6b78ccea34caeabb369d14e4f8f3b409780b79d15b287cd10153f2bae12fa12a`
  `https://www.circle.com/fr/legal/mica-eurc-whitepaper,01/07/2024,`
- <https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv> · read 2026-10-02T23:03:00Z · SHA-256 of the response body as received `556db62050a19f3d4fc6a139e97eb4b309ff9fd1fdd92c06fd6b34775cb3c990`
  `Latvijas Banka,LV,Comet Technologies Ltd.,,VG,Bitvavo,,AT|BE|BG|HR|CY|CZ|DK|EE|FI|FR|DE|GR|HU|IE|IT|LV|LT|LU|MT|NL|PL|PT|RO|SK|SI|ES|SE,,,https://gitbook.zignaly.com/white-paper,,05.11.2025`

### F22
**CONFIRMED.** Claim checked: ZIGChain's MiCAR white paper PDF https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf says the ZIG token was generated in April 2021 as a utility token for the Zignaly Social Investment platform, and names Comet Technologies Ltd. as the person seeking admission to trading. Record its SHA-256. Also check that zigchain.com links this PDF (WebFetch).

PDF: HTTP 200, application/pdf, 281343 bytes, Last-Modified Thu, 02 Oct 2025 19:18:26 GMT, ETag "78504b138652324a0acb06f154f464fb", 15 pages. Its PDF Title metadata is '30-09-25 Corrected MiCA Application.docx' and the producer is the Google Docs renderer. SHA-256 0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9. The document heading is 'ZIGChain MiCAR White Paper'. Both statements appear word for word once line breaks are joined. Section 1 also gives: Comet Technologies Ltd., Intershore Chambers P.O. Box 4342 Road Town, Tortola, British Virgin Islands, registration date 2021-03-04, identifier 2056175, parent company Greenscale Technologies Pte. Ltd.
zigchain.com link check: curl gets HTTP 403 with 'cf-mitigated: challenge'. WebFetch read the page twice, at 23:04:00Z and about 23:06:41Z, and both times found a footer link with text 'MiCAR White Paper' whose href exactly equals the claim's PDF URL. I left the URL out of my prompts. Limitation: WebFetch returns a model-converted markdown view, not raw HTML.

- <https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf> · read 2026-10-02T23:03:35Z · SHA-256 of the PDF as received `0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9`
  `ZIG token was generated in April 2021 as a utility token for the Zignaly Social Investment platform.`
- <https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf> · read 2026-10-02T23:03:35Z · SHA-256 of the PDF as received `0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9`
  `1. Information about the Person Seeking Admission to Trading Name: Comet Technologies Ltd.`
- <https://zigchain.com/> · read 2026-10-02T23:04:00Z · SHA-256 of the file as read `69229b83c9ec1882a65da70af1ffe26e8bf35822ae97fe02ea3e92cc792506a7`
  `[MiCAR White Paper](https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf)`

### F23
**CONFIRMED.** Claim checked: On-ramp public lists: (a) https://api-payments.guardarian.com/v1/currencies/ZIG lists ZIG with only an ETH network and token_contract 0xb2617246d0c6c0087f18703d576831899ca94f01, and this address appears in ZIGChain's registry (https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/ — find the native ZIG asset file and its ethereum trace); (b) https://api.moonpay.com/v3/currencies has code usdc_noble with isSuspended true and no ZIG or ZIGChain entry; (c) https://api.transak.com/cryptocoverage/api/v1/public/crypto-currencies has no entry containing "zig" (case-insensitive).

(a) Guardarian: HTTP 200, SHA-256 75ca9894...b1ee83a. Ticker 'ZIG', name 'ZIGChain', enabled and available. The networks array has exactly one entry: name 'ZIGChain', network 'ETH', explorer https://etherscan.io/address/$$, token_contract 0xb2617246d0c6c0087f18703d576831899ca94f01. The ZIGChain registry's native ZIG file is assets/native/zig.mainnet.json (asset_id 'zigchain', base_denom 'uzig', coingecko_id 'zignaly'; ETag 63f5dbb2...). Its traces[0] has type 'additional-mintage', counterparty chain_name 'ethereum', base_denom '0xb2617246d0c6c0087f18703d576831899ca94f01', provider 'ZIGChain'. A string comparison with Guardarian's token_contract is exactly equal. generated/chain-registry/zigchain/assetlist.json carries the same trace under base uzig. (I also tried assets/native/uzig.mainnet.json, which is 404.) Note: Guardarian labels the network 'ZIGChain', but its code is ETH and its explorer is Etherscan, so what Guardarian lists is the Ethereum ERC-20 ZIG, not native uzig.
(b) MoonPay: HTTP 200, 154 entries. Code 'usdc_noble' (name 'USD Coin', networkCode 'noble', contractAddress 'uusdc') has isSuspended true and updatedAt 2026-09-16T13:32:07.704Z. A case-insensitive search for 'zig' across each entry's full JSON finds 0 entries, so there is no ZIG or ZIGChain entry.
(c) Transak: HTTP 200, {response: 145 entries, success}. The raw body contains 'zig' 0 times (case-insensitive). With ?page=2&limit=1000, and at the older /api/v2/currencies/crypto-currencies, the body is byte-identical (SHA-256 3ce009c5f08239d5d50aabe51f4ad6bb5bb376cee4267ab8d8f6478231dbb99e), so the list is not paginated.

- <https://api-payments.guardarian.com/v1/currencies/ZIG> · read 2026-10-02T23:04:21Z · SHA-256 of the response body as received `75ca98945861535f646ade85a555d22497e000bd87f3bd9ac3510b097b1ee83a`
  `"networks":[{"name":"ZIGChain","network":"ETH","block_explorer_url_mask":"https://etherscan.io/address/$$","token_contract":"0xb2617246d0c6c0087f18703d576831899ca94f01"`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/native/zig.mainnet.json> · read 2026-10-02T23:04:44Z · SHA-256 of the response body as received `f45c5bf3387b7b1d3bc1dd056379320ad5921cbf9936e8ac36022a24fa3d396e`
  `"type": "additional-mintage", "counterparty": { "chain_name": "ethereum", "base_denom": "0xb2617246d0c6c0087f18703d576831899ca94f01" }, "provider": "ZIGChain"`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/generated/chain-registry/zigchain/assetlist.json> · read 2026-10-02T23:04:45Z · SHA-256 of the response body as received `b1e379449865d2ecacc7b35a42cf26ff336bce7337f4a0bc31e937c2c2c270e2`
- <https://api.moonpay.com/v3/currencies> · read 2026-10-02T23:05:04Z · SHA-256 of the response body as received `43a6c7cf629bb116276ddff111ef0a2a87edb72a56ed79aab45999d5229941ab`
  `"name":"USD Coin","code":"usdc_noble" ... "isSuspended":true`
- <https://api.transak.com/cryptocoverage/api/v1/public/crypto-currencies> · read 2026-10-02T23:05:23Z · SHA-256 of the response body as received `3ce009c5f08239d5d50aabe51f4ad6bb5bb376cee4267ab8d8f6478231dbb99e`
- <https://api.transak.com/api/v2/currencies/crypto-currencies> · read 2026-10-02T23:05:36Z · SHA-256 of the response body as received `3ce009c5f08239d5d50aabe51f4ad6bb5bb376cee4267ab8d8f6478231dbb99e`

### F24
**CONFIRMED.** Claim checked: FSCA "Published list of Authorised CASPs_18 December 2024" PDF (https://www2.fsca.co.za/Regulatory%20Frameworks/Documents/Published%20list%20of%20Authorised%20CASPs_18%20December%202024.pdf) contains "STARBUY PTY LTD" with FSP number 53740.

HTTP 200, application/pdf, 472253 bytes, Last-Modified Wed, 18 Dec 2024 12:43:44 GMT, 36 pages, created 2024-12-18 11:08:06 UTC in Word for Microsoft 365. SHA-256 0432ac9e22e9bdbd25feea231ee8b6a092a8f5412b897fb50eb5f7744f459ad9. Heading: 'LIST OF CRYPTO ASSET SERVICE PROVIDERS (CASPS) AUTHORISED UNDER THE FINANCIAL ADVISORY AND INTERMEDIARY SERVICES (FAIS) ACT, NO. 37 OF 2002 – DECEMBER 2024'. Row 204 reads name 'STARBUY PTY LTD' (written without brackets around PTY), FSP number 53740, licence category CAT I, activity Intermediary services. The name and number match exactly. Caveats: this is a list as of December 2024, so it says nothing about status on 2026-10-02. The list also numbers two rows 203.

- <https://www2.fsca.co.za/Regulatory%20Frameworks/Documents/Published%20list%20of%20Authorised%20CASPs_18%20December%202024.pdf> · read 2026-10-02T23:05:43Z · SHA-256 of the PDF as received `0432ac9e22e9bdbd25feea231ee8b6a092a8f5412b897fb50eb5f7744f459ad9`
  `204 STARBUY PTY LTD 53740 CAT I • Intermediary services`

### Notes from the checkers

- All nine claims (F01 to F09) are CONFIRMED and none were refuted. All 58 claimed values matched the source exactly, including types. Every read was done between 2026-10-02T22:50:43Z and 22:54:26Z UTC.
- Two time claims hold only when fractional seconds are cut off, not rounded. Testnet block 7669200 is 09:10:49.599Z and testnet block 7812034 is 17:14:45.929Z; rounding would give :50 and :46.
- Unexpected: the testnet staker's treasury_address, both in its INIT msg and in current protocol_info, is zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx. That is the mainnet staker's admin, creator and treasury. The same secp256k1 key controls this address on zig-test-2 (account_number 127388).
- Unexpected: mainnet code 179 was uploaded by zig1w22ujeyravz4zhz7kxvmrjca3lvu8d3gtpczxl, not by the contract admin. Testnet code 2532 was uploaded by the testnet admin zig1699nzk4hsf0v68pkrpqlw689a6ly0hhpvgf9a3.
- Both recent migrations were ordinary MsgMigrateContract txs sent by the admin, with msg {}, not governance actions. Mainnet migrated at 12554333 (2026-09-30T19:06:27.799572097Z), about 9h21m after the v5 upgrade block 12549000. Testnet migrated at 7812034 (2026-09-17T17:14:45Z), about 9 days 8 hours after testnet v5 at 7669200.
- Current staker values differ from the INIT msgs. Mainnet INIT had min_deposit "50000000", min_stzig "50000000" and minting_cap "100000000000000"; it now has "50000000000000000000", "49000000" and "500000000000000". Testnet INIT had min_deposit "1000000"; it is now "1000000000000000000". The min_deposit changes equal a factor of 10^12, consistent with moving from 6 to 18 decimals.
- The uzig metadata has no exponent-6 unit (only uzig at 0 and mzig at 3, display uzig). "6-decimal" appears only in the description text.
- Endpoint behaviour: /ibc/apps/transfer/v1/denom_traces/{hash} returns HTTP 501 on api.zigchain.com; only /denoms/{hash} works. pagination.offset on /cosmwasm/wasm/v1/code returns HTTP 400, so I used pagination.key instead. Noble's LCD reports block height only in the grpc-metadata-x-cosmos-block-height header, which is what I recorded as Noble's blockHeight.
- The USDC supply on zigchain-1 and the Noble escrow balance (both 259314404300 uusdc) were equal in two back-to-back rounds 1 to 2 seconds apart. This is a snapshot; packets in flight can make them differ briefly.
- Faithfulness: for every HTTP 200 response, the compact JSON of the saved body has the same byte count as the server's content-length, so the quoted JSON fragments are verbatim substrings.
- zig.finance and zigmarkets.com were not fetched. docs.zigchain.com, zigchain.com and WebFetch were not needed.
- Valdora's docs contradict themselves on fees. The FAQ says unstaking 'may include a fee that varies based on the amount of stZIG being unstaked'. The Economics page says 'There are no fees on deposit, redemption, or holding stZIG.' F10 and F11 are each confirmed, but they cannot both be cited as fact without noting the conflict.
- Valdora's unstake minimum differs between sources. The FAQ says 50 stZIG. The how-to guide says '(Minimum amount to unstake is 50 ZIG.)'. The on-chain staker has min_stzig = 49000000, which is 49 stZIG (exponent 6), at block 12612930. The on-chain min_deposit is 50e18 azig = 50 ZIG, which matches the docs.
- The 2025-09-28 OAK PDF contradicts itself. Finding #24 is 'Informational' in the Summary of Findings table but 'Severity: Minor' in the Detailed Findings section. The claimed split (Minor 11 / Informational 24) holds only for the summary table.
- Halting OroSwap trading uses a separate per-pair 'paused' flag (checked in swap, provide_liquidity and withdraw_liquidity), not is_disabled. The factory's paused_pairs_count is 0 at block 12612898. All 9 pair types are disabled, which by the source blocks only new pair creation.
- The deployed OroSwap factory (code_id 172) reports cw2 version 1.2.0, but main-branch contracts/factory/Cargo.toml says 1.1.0. The GitHub main source may not be exactly what runs on chain.
- OroSwap's on-chain fees differ from '1% default fee, redistributed to liquidity providers'. The plain 'xyk' type is 1 bps (0.01%); only concentrated, xyk_100 and xyk_97 are 100 bps (1%). Every type has maker_fee_bps 2000. By the main-branch code, maker_fee_rate = maker_fee_bps/10000 and maker fee = commission x rate, so 20% of each swap fee goes to the Maker (fee_address zig1hyja4uyjktpeh0fxzuw2fmjudr85rk2qu98fa6nuh6d4qru9l0ss0j233h, which is OROSWAP_MAKER_ADDRESS in the docs), not to LPs.
- Admin keys at block 12612975. The Valdora staker's wasm admin, internal admin (pending_admin null, read at block 12612980) and treasury are all zig1gy5zketezrfdea9g80we02663r2gjz3z0002kx, a single secp256k1 key. This fits the acknowledged OAK finding #22. The OroSwap factory owner/admin zig1kctvwjfqg6fmx3s2n7y297ut5304kfzy4x7ted is a 2-of-3 LegacyAminoPubKey multisig.
- Decimals: ZIGChain mainnet bond_denom is now 'azig' (18 decimals; metadata: '18-decimal base denom azig'), but stZIG metadata still has exponent 6. Pool creation fees of 1e20 azig equal 100 ZIG.
- The third OAK file is '2026-09-21 Audit Report - Valdora 18 Decimals Update v1.0.pdf'. Its PDF metadata title is 'Valdora Pull 18 — Security Audit Report'. It reviews only the PR #18 diff of Liquid-Zig/new-stzig-contracts (base a00c79e720, head 0afa20bc38) and is not a full codebase review.
- Method: Valdora, Halborn and OroSwap docs were read with curl (HTTP 200, server-rendered). For docs.zigchain.com, WebFetch returned only summaries; the official endpoint list was read from raw.githubusercontent.com/ZIGChain/networks/main/zigchain-1/api-nodes.txt. Chain reads used api.zigchain.com, cross-checked with public-zigchain-lcd.numia.xyz. Liquid-Zig/new-stzig-contracts returns 404 on raw GitHub (probably private), so how the contract compares against min_stzig could not be checked.
- Circle's own sources disagree. Help article KB0010590 still lists Noble ('uusdc') as a supported Circle Mint chain and never mentions the wind-down. The blog post of September 10, 2026 says Circle Mint minting on Noble stops October 13, 2026 and that Noble is fully paused January 12, 2027. Anyone relying on the help article alone would miss this.
- Circle blog precision: the snapshot is taken on the pause date, January 12, 2027; only the manual redemption process begins January 13, 2027. The post adds a limit the claim does not mention: after December 1, 2026, CCTP exits may be limited to destination chains that still support CCTP V1 burns.
- ESMA OTHER.csv: the Comet Technologies Ltd. row points to the white paper at https://gitbook.zignaly.com/white-paper, not the CDN PDF that zigchain.com links. It names Bitvavo as the CASP, gives LEI country VG, and has wp_lastupdate 05.11.2025. That gitbook URL returned HTTP 403 with a Cloudflare challenge to curl (23:06:57Z) and HTTP 403 to WebFetch, so I could not compare the registered version with the CDN PDF. Its robots.txt path returns a GitBook HTML shell with meta robots 'noindex, nofollow' rather than a real robots file.
- Entity names differ. The zigchain.com footer (via WebFetch) reads 'ZIGCHAIN FOUNDATION, Incorporated 25 April 2025 under Registration Number # 420931'. The MiCAR PDF instead names Comet Technologies Ltd. (BVI, identifier 2056175, parent Greenscale Technologies Pte. Ltd.) as the person seeking admission. The PDF also gives a tentative admission start date of '2025-10-30' and says ZIG is listed on Bitvavo (MIC: VAVO) and Kraken (MIC: KRME).
- Guardarian's ZIG is the Ethereum ERC-20 (network code ETH, Etherscan explorer), even though the network is labelled 'ZIGChain'. ZIGChain's registry records that contract as an 'additional-mintage' trace of native uzig, so buying ZIG through Guardarian would deliver ERC-20 ZIG, not native ZIGChain ZIG. At currency level, Guardarian lists only the CN_CUSTODY payment method (category CRYPTO) for ZIG.
- MoonPay's usdc_noble entry has updatedAt 2026-09-16T13:32:07.704Z, six days after Circle's announcement; the exact suspension date is not shown. The entry also lists notAllowedCountries ['CA'] and notAllowedUSStates ['NY','VI'].
- Zignaly: help.zignaly.com was tried once (23:01:42Z) and returned HTTP 403 with 'cf-mitigated: challenge'. The security article (lastUpdatedDate 2025-08-08) is older than the 31 August 2026 marketplace update. It also contradicts itself on Fireblocks, first claiming 'all operations are protected', later limiting it to account wallets. On intercom.help the relative 'Updated over N ago' labels do not match the ISO lastUpdatedDate values (for example 2026-08-31 shows as 'over 2 months ago'), so use the ISO dates. The withdrawal article also says Wealth Managers must release exit funds within 7 days and that Z-Index withdrawals can take up to 90 days.
- The ZIGChain registry was read only through raw.githubusercontent.com on the main branch; the GitHub API was not used, so no commit SHA was recorded. The ETag for assets/native/zig.mainnet.json was 63f5dbb2f335f6194a09d3a1b31d5d1725386db211a0af7fde9de1e92af3a730.

## The register, by topic
Every item, with its claim, how it was read, and each source with its access time and a verbatim quote.

| Register | Verified | Unverified | Covers |
|---|---|---|---|
| [(a) Native staking on ZIGChain](evidence/a-native-staking.md) | 15 | 0 | Chain parameters from the official LCDs listed in ZIGChain/networks, and what docs.zigchain.com says. |
| [(b) Valdora (stZIG) and its audits](evidence/b-valdora.md) | 39 | 4 | Valdora's docs (provider claims), its contracts as the chain reports them, and OAK Security's reports. |
| [(c) Zignaly](evidence/c-zignaly.md) | 13 | 2 | Zignaly's help center (read on Intercom's host because zignaly.com and help.zignaly.com are bot-walled) and how ZIG relates to Zignaly. |
| [(d) Stablecoins and swaps on ZIGChain](evidence/d-stablecoins-and-swaps.md) | 52 | 5 | What is live on chain, what the issuers say (Noble is recorded as a warning, never as something to build on), and OroSwap. |
| [(e) On-ramps and getting ZIG](evidence/e-on-ramps.md) | 27 | 6 | Only what each provider officially publishes about ZIG or ZIGChain, plus the denomination facts an on-ramp would need. |
| [(f) ZIG Markets and ZIG Finance](evidence/f-zig-markets.md) | 9 | 2 | What zig.finance says (its robots.txt asks AI crawlers not to train on it, so quotes are kept short) and the regulator cross-check. |
| [Legal sources (for LEGAL_CHECKLIST section 6)](evidence/legal-sources.md) | 22 | 0 | Official texts and supervisor documents, identified and quoted; no conclusions. |

## Open questions
### Native staking, Valdora and OroSwap
- Valdora ExecuteMsg JSON: what is the exact JSON for deposit, redeem, withdraw_unbonded and withdraw_unbonded_by_id on staker code 179 (field names, funds denom)? Audits name these messages only in prose and the repositories are not public. Ask Valdora for the schema or a public tagged source.
- Valdora query units: what units do the st_zig_price / reverse_st_zig_price inputs and outputs use after v5? The fields are still named uzig_amount/stzig_amount. Which value should a UI show as the stZIG:ZIG rate?
- Valdora fee: does fees_percentage '1000' mean the documented 10% performance fee? The 2025 audit gives a 10000 denominator, but the deployed code is a different version.
- Valdora minimums: are min_deposit '50000000000000000000' and min_stzig '49000000' the documented 50 ZIG / 50 stZIG minimums? Why is min_stzig 49 rather than 50?
- Valdora unstake fee: the economics page says there is no redemption fee, but the FAQ says unstaking 'may include a fee that varies'. Which is current, and what is the formula?
- Valdora testnet ledgers: they use unbonding_period 604800 while the chain unbonding_time is 1814400s. The OAK 2025 report says the contract's period must match the chain's. Is testnet redemption timing therefore unrepresentative?
- Valdora admin: the docs claim multi-sig control, but the staker wasm admin zig1gy5zk… is a single secp256k1 key (BaseAccount). Is there an off-chain or MPC control not visible on-chain?
- Valdora deployed code: does code 179/180/181 (data_hash 2E68EC99…, 81197AF1…, 40D22BDE…) correspond to the OAK-reviewed fix commit 60afaab5b3 of new-stzig-contracts PR #18? No checksum or build attestation is published.
- OroSwap uzig pairs: 101 mainnet pairs on code 19 (including 3 ZIG/USDC pairs) and 324 testnet pairs still report 'uzig' in asset_infos after v5. Are these pairs still tradeable, migrated or deprecated? Only zig186ucx5… (xyk_25) reports 'azig' among mainnet ZIG/USDC pairs.
- OroSwap pair creation: every mainnet pair_config is is_disabled=true. Is new pool creation intentionally halted, and does the docs' '1% default fee' refer to a specific pair type? On-chain total_fee_bps ranges from 1 to 200 by type.
- OroSwap factory listing: the 'pairs' pagination returned 31 of 165 mainnet pair contracts. Is this a known key-encoding issue after the redenomination migration? Apps should not rely on it to find pairs.
- OroSwap deployed code: which commit matches factory code 172, router 14 and pair 173? The deployed factory accepted a 'redenom' migrate field that the public main-branch MigrateMsg lacks, and no checksums are published.
- OroSwap manifest: zigchain/mainnet.json has chain_id 'zig-mainnet-1', which does not match the actual chain ID 'zigchain-1'.
- IBC denoms: no official ZIGChain or OroSwap source read today names ibc/630F… (base 0xdac17f958d2ee523a2206206994597c13d831ec7) or the other 0x… IBC denoms (via channel-4 → 08-wasm-1369), so they cannot be labelled as stablecoins.
- ZIGChain docs vs chain: the docs state a 5% double-sign slash while the chain parameter is 0.0005. Which is authoritative for user-facing risk copy?
- OAK 18-decimals report: the 2026-09-21 report (PDF title 'Valdora Pull 18 — Security Audit Report', different layout from the other OAK reports) is listed in OAK's official repository index. Is there an OAK-hosted page confirming it?

### Zignaly, on-ramps and ZIG Markets
- Should Zignaly help-center content read through https://intercom.help/zignaly (pages declare canonical help.zignaly.com) count as official? zignaly.com and help.zignaly.com themselves are bot-walled.
- Zignaly's operating entity, licence or registration claims, and API-agreement terms need a human with a real browser to read https://zignaly.com/legal, https://zignaly.com/legal/api-agreement/ and https://app.zignaly.com/legal/terms-of-service.
- Denom conflict: on-chain metadata (api.zigchain.com) and the docs say native ZIG is azig with 18 decimals, but ZIGChain's GitHub registry and generated assetlist still say uzig with 6 decimals. Which one do wallets, explorers and on-ramps use today? Should apps filter out the on-chain factory decoy token with symbol 'ZIG'?
- Can Guardarian actually sell ZIG for fiat end to end, and in which countries? The fiat-to-ZIG quote endpoint (/v1/estimate) and transaction creation need a business API key and a contract. Guardarian delivers ERC-20 ZIG only, so users would still have to bridge to ZIGChain.
- Coverage for Onramper (JS-rendered list or API key), Alchemy Pay (Notion list or signed API), Kado (redirects to swapped.com; docs unreachable) and Coinbase Onramp (Options API needs a CDP key) is still unknown.
- The BEP-20 (BNB Chain) ZIG contract address was not found in any official source read.
- FSCA FSP 46517 (Merritt Administrators) was not checked at the regulator, because the lookup is a search form. The FSCA CASP list (Dec 2024) shows 'STARBUY PTY LTD' (FSP 53740) but no registration number to match against 2022/221936/07.
- ZIG Markets: no consumer-facing product terms, eligibility rules or jurisdiction list were found on zig.finance. Do any retail-facing ZIG Markets products exist, and under which entity's terms?
- Whether Zignaly's Z-Index component 'The ZIG Vault (DeFi yield)' runs on ZIGChain (and which protocol) is not stated in the article read.
- The ZIGChain Hub bridge (hub.zigchain.com/bridge) is a JS app behind a Cloudflare challenge. Its routing provider, supported source chains and any built-in buy option could not be read.

### Stablecoins and legal
- Post-Noble USDC path: Circle's Injective USDC is already on zigchain-1 via channel-12 (513039339 base units), but it is not in the ZIGChain registry or docs channel list. No official ZIGChain statement names a replacement for Noble USDC before the 12 Jan 2027 pause.
- How will Circle treat the 259465404300 uusdc held in Noble's channel-175 escrow (backing ZIGChain vouchers) at the pause-day snapshot? Circle only states the 'holder-controlled wallet in the snapshot' eligibility. This needs Circle confirmation.
- Noble has published no migration guidance on noble.xyz or docs.noble.xyz. Check again closer to 13 Oct 2026 and 12 Jan 2027.
- Is the EURC-address denom ibc/CC5268F8... (on-chain via Eureka, not in the registry, no decimals in ZIGChain metadata) intentionally unlisted? It should not be treated as a supported asset without an official listing.
- For counsel: USDT reaches ZIGChain via IBC Eureka, and ESMA's EMT register (30 Sep 2026) has no Tether entry. Counsel should assess any planned service touching USDT against MiCA Titles III/IV, Commission Q&A 2404 and ESMA statement ESMA75-223375936-6099. No conclusion is drawn here.
- For counsel: under the EBA PSD2/MiCA No Action Letter (EBA/Op/2025/08; transition ended 2 March 2026), do any planned EMT (USDC/EURC) custody or transfer features need PSD2 authorisation or a contract with a licensed payment service provider?
- For counsel: the MiCA transitional period ended EU-wide on 1 July 2026 (ESMA75-113276571-1679). Confirm the authorisation status of any CASP the product relies on, using ESMA's CASPS.csv.
- The task cited an 'FSMA regulation of 2024', but FSMA pages read refer only to the FSMA Regulation of 5 January 2023 (Royal Decree of 8 February 2023; in force 17 May 2023). Counsel should confirm whether any 2024 FSMA instrument exists.
- PSR/PSD3 are not adopted (EP Legislative Observatory: awaiting Council 1st-reading position; indicative plenary 14/12/2026). Monitor for publication in the Official Journal.
- Testnet has no usable issuer stablecoin route: all Noble testnet clients are Expired, Axelar aUSDC supply is 10 base units, and the stablecoin-named factory tokens and the bare 'usdt' denom have no identified issuer. Choosing a test asset is a product decision.
- The Cosmos Hub side of Eureka (08-wasm-1369 to Ethereum channel-0) was not checked on an official Cosmos Hub endpoint, because none was identified.
- ZIGChain docs list testnet channel-44 among 'Active IBC channels' while its client is Expired, and do not list mainnet channel-12 (Injective), which is open and Active. Docs may be out of date.
- Circle's MiCA USDC white paper (register record updated 15/09/2026) does not list Noble as deprecated despite the 10 Sep 2026 announcement. Watch for an update.

## Recorded chain responses
Read-only GET responses from the official chain APIs, kept as read. The Valdora testnet reader has its own pinned set of
15 responses at block 8046854 in `apps/web/lib/earn/valdora/fixtures/testnet-block-8046854.json`.

| File | What | Records |
|---|---|---|
| [evidence/zigchain-staking.json](evidence/zigchain-staking.json) | ZIGChain chain parameters, denominations and the v5 upgrade (zigchain-1 and zig-test-2) | 35 |
| [evidence/valdora.json](evidence/valdora.json) | Valdora stZIG contracts on zigchain-1 and zig-test-2: contract info, history, code info and read-only queries | 68 |
| [evidence/ibc-and-swaps.json](evidence/ibc-and-swaps.json) | Stablecoin routes over IBC (ZIGChain, Noble, Injective) and the OroSwap factory | 68 |
| [evidence/zig-denoms.json](evidence/zig-denoms.json) | Native ZIG denomination reads used by the acquisition and on-ramp items | 2 |
