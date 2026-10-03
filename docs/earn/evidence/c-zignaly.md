# Evidence register (c) Zignaly

Part of [EVIDENCE_2026-10.md](../EVIDENCE_2026-10.md), which explains the labels, lists the pages that could not be read and gives the second check (F01–F24). Read on 2026-10-02 (UTC). Zignaly's help center (read on Intercom's host because zignaly.com and help.zignaly.com are bot-walled) and how ZIG relates to Zignaly.

## B-zignaly-helpcenter-host
**VERIFIED** · checked again in [F20](../EVIDENCE_2026-10.md#f20) (PARTLY) · Zignaly / source access

zignaly.com, help.zignaly.com and app.zignaly.com return HTTP 403 with 'cf-mitigated: challenge' (Cloudflare managed challenge) to curl and HTTP 403 to WebFetch; the Zignaly help-center articles are readable at https://intercom.help/zignaly/en/... where each page declares &lt;link rel="canonical" href="https://help.zignaly.com/en/...">.

*How:* Headers saved for zignaly.com and help.zignaly.com (403, cf-mitigated: challenge). intercom.help/zignaly pages returned 200 with canonical links to help.zignaly.com. All Zignaly help-center items below were read through this Intercom host (an alternate host of the official help center, not an archive). The owner accepted this host as the official help center on 2026-10-03.

> Second check (F20): help.zignaly.com was tried once more at 2026-10-02T23:01:42Z: HTTP 403, cf-mitigated: challenge. The relative "Updated over …" labels on intercom.help do not match the pages' ISO lastUpdatedDate values, so the ISO dates are the ones to use.

- <https://help.zignaly.com/en/articles/9044409-kyc-how-to-verify-your-account> · read 2026-10-02T20:26:58Z · SHA-256 of the file as received `84f6b0eb1de264364ae751e3675071b99031bc76a2471303a1d9088631b11304`
  `HTTP/2 403 ... cf-mitigated: challenge`
- <https://intercom.help/zignaly/en/> · read 2026-10-02T20:47:43Z · SHA-256 of the response body as received `6ea1c6df4f4d8488bdbf6fab43517a2326ca3cca5fce74151f4b039185188bdb`
  `<link rel="canonical" href="https://help.zignaly.com/en/" data-next-head=""/>`

## B-zignaly-profit-sharing-model
**VERIFIED** · checked again in [F20](../EVIDENCE_2026-10.md#f20) (PARTLY) · Zignaly / profit sharing

Zignaly describes Profit Sharing as a model where vetted Wealth Managers trade investors' pooled funds. The help center contrasts it with Copy Trading (no API keys needed from investors), says success fees apply only to profits under a High Watermark, and says withdrawals are subject to the manager's release schedule.

*How:* Read today on the Zignaly help center (Intercom host, canonical help.zignaly.com), article 'What is Profit Sharing' (shown as 'Updated over a month ago'). The fee percentages in the article are deliberately left out.

- <https://intercom.help/zignaly/en/articles/6894830-what-is-profit-sharing> · read 2026-10-02T20:48:04Z · SHA-256 of the response body as received `7116b3e6bafb51b46c35fd6f3930bf571cb50af62ba9133b92f53658cbfe6d60`
  `Profit Sharing is an innovative, hands-off investment model where professional Wealth Managers trade on your behalf.`
- <https://intercom.help/zignaly/en/articles/15899782-service-withdrawal-vs-withdrawing-to-your-wallet-how-each-one-works> · read 2026-10-02T20:49:11Z · SHA-256 of the response body as received `3c4e633ecddc1cd2c915dba0b929414dd44d8f5ecbd7766d01db7fd7186811eb`
  `Profit Sharing services use a pooled account (PAMM), where each investment is a share of the total balance.`

## B-zignaly-marketplace-change-2026-08
**VERIFIED** · checked again in [F20](../EVIDENCE_2026-10.md#f20) (PARTLY) · Zignaly / product status

On 31 August 2026 Zignaly removed trading (Profit Sharing) services from its public marketplace. Existing services keep running. Creating new Profit Sharing services or becoming a new Wealth Manager is not currently available; users take part only as investors.

*How:* Read today in three Zignaly help-center articles (Intercom host, canonical help.zignaly.com).

- <https://intercom.help/zignaly/en/articles/6894830-what-is-profit-sharing> · read 2026-10-02T20:48:04Z · SHA-256 of the response body as received `7116b3e6bafb51b46c35fd6f3930bf571cb50af62ba9133b92f53658cbfe6d60`
  `Update (31 August 2026): Trading services were removed from the Zignaly marketplace. Existing services keep running and existing investments are unaffected.`
- <https://intercom.help/zignaly/en/articles/16544418-can-i-create-a-profit-sharing-service-or-become-a-wealth-manager-trader-on-zignaly> · read 2026-10-02T20:49:10Z · SHA-256 of the response body as received `340779a6b09363f9f6d53337a387e6084638d4ee603dd3b0e3130b395e8d5e06`
  `There is no option to create a new trading service, connect external trading APIs (such as Altrady or Postman) for new services, or list new strategies in the marketplace.`
- <https://intercom.help/zignaly/en/articles/16765545-trading-services-update-what-changed-and-how-exits-work> · read 2026-10-02T20:49:09Z · SHA-256 of the response body as received `18fec6a2d125fac4b6e4edd5e86648ee94a4a533e440411e6269f95e52439534`
  `Note: On 31 August 2026, trading services were removed from the Zignaly public marketplace.`

## B-zignaly-custody-offchain
**VERIFIED** · checked again in [F20](../EVIDENCE_2026-10.md#f20) (PARTLY) · Zignaly / custody (on-chain vs off-chain)

Zignaly says Profit Sharing funds are held off-chain in Binance sub-accounts under the Binance Broker program, and an investor cannot connect their own Binance account. Zignaly account wallets ('Available Balance') use Fireblocks and can be checked on BscScan; Profit Sharing service accounts (Standby Fund and Trading Fund) are not covered by that.

*How:* Read today in the Zignaly help-center articles 'Security of Zignaly' ('Updated over a year ago'), 'FAQ's for Wealth Managers' and 'How to create API keys' (Intercom host, canonical help.zignaly.com).

> Second check (F20, PARTLY): the security article confirms funds are "held in Binance" under what it calls the "Binance Broker Partner Program", and that Fireblocks "applies only to Zignaly account wallets (Available Balance)". The word "sub-accounts" is not in that article (it comes from the API-keys article). The security article also first says Fireblocks protects "all operations"; its lastUpdatedDate, 2025-08-08, is older than the 31 August 2026 marketplace update.

- <https://intercom.help/zignaly/en/articles/6164601-security-of-zignaly> · read 2026-10-02T20:48:04Z · SHA-256 of the response body as received `5ab8bfb06f00e3e52002e3801e421947509a57f6b2619b8fe35438503686bb8b`
  `When you deposit funds, they are held in Binance and covered by their Secure Asset Fund for Users (SAFU), providing an additional safety net.`
- <https://intercom.help/zignaly/en/articles/6164601-security-of-zignaly> · read 2026-10-02T20:48:04Z · SHA-256 of the response body as received `5ab8bfb06f00e3e52002e3801e421947509a57f6b2619b8fe35438503686bb8b`
  `This Fireblocks integration applies only to Zignaly account wallets (Available Balance). The Profit Sharing service accounts (Standby Fund and Trading Fund) remain unchanged for now.`
- <https://intercom.help/zignaly/en/articles/6885234-faq-s-for-wealth-managers> · read 2026-10-02T20:48:03Z · SHA-256 of the response body as received `4e83b9c8532a5ee11f1bc2f607628d62008a18771ef13780d9c291b92f260711`
  `It's impossible, as Profit Sharing works already with Binance sub-account.`

## B-zignaly-deposit-withdraw-rails
**VERIFIED** · checked again in [F20](../EVIDENCE_2026-10.md#f20) (PARTLY) · Zignaly / funding rails

Withdrawing from Zignaly takes two steps: first redeem from the service back to the Zignaly balance, then withdraw to an external wallet over BEP20. Zignaly has no direct bank-account withdrawal. A Profit Sharing exit must be released by the manager within 7 days; a Z-Index withdrawal can take up to 90 days.

*How:* Read today in the Zignaly help-center articles 'Service Withdrawal vs. Withdrawing to Your Wallet', 'FAQ's for Investors' and 'Trading services update' (Intercom host, canonical help.zignaly.com).

> Second check (F20): BEP20 appears only in the "withdraw to a wallet" steps; a service withdrawal returns funds to the Zignaly balance and does not use a chain.

- <https://intercom.help/zignaly/en/articles/15899782-service-withdrawal-vs-withdrawing-to-your-wallet-how-each-one-works> · read 2026-10-02T20:49:11Z · SHA-256 of the response body as received `3c4e633ecddc1cd2c915dba0b929414dd44d8f5ecbd7766d01db7fd7186811eb`
  `Select the network (BEP20), paste your external wallet address, set the amount, and complete verification.`
- <https://intercom.help/zignaly/en/articles/6873562-faq-s-for-investors> · read 2026-10-02T20:48:04Z · SHA-256 of the response body as received `e2ea8827da69c99da201171302ed859c01ba3cbcf98b6f856fb275cddf3fdcc0`
  `We do not offer a direct feature to withdraw funds to a bank account.`
- <https://intercom.help/zignaly/en/articles/16765545-trading-services-update-what-changed-and-how-exits-work> · read 2026-10-02T20:49:09Z · SHA-256 of the response body as received `18fec6a2d125fac4b6e4edd5e86648ee94a4a533e440411e6269f95e52439534`
  `Z-Index: a Z-Index is made up of several underlying services, so withdrawals can take longer, in some cases up to 90 days .`

## B-zignaly-kyc
**VERIFIED** · checked again in [F20](../EVIDENCE_2026-10.md#f20) (PARTLY) · Zignaly / KYC

Zignaly requires every user to complete KYC before depositing or investing. The provider is Sumsub; accepted documents are a passport, ID card or driver licence, and a liveness check is required.

*How:* Read today in the Zignaly help-center article 'KYC: How to verify your account' ('Updated over 4 months ago'; Intercom host, canonical help.zignaly.com/en/articles/9044409...). The help.zignaly.com URL itself was bot-walled.

- <https://intercom.help/zignaly/en/articles/9044409-kyc-how-to-verify-your-account> · read 2026-10-02T20:48:02Z · SHA-256 of the response body as received `83cc8a83a06b69d7517c9477d3453d0f005e6dae876858822214cd1e1098c604`
  `All users must complete a Know Your Customer (KYC) verification.`

## B-zignaly-restricted-jurisdictions
**VERIFIED** · checked again in [F20](../EVIDENCE_2026-10.md#f20) (PARTLY) · Zignaly / restricted jurisdictions

Zignaly lists these countries and regions as not eligible to complete KYC: Canada, Crimea, Cuba, North Korea (DPRK), Donetsk (DNR), Iran, Kherson Oblast (Russian-occupied areas), Luhansk (LNR), Myanmar, Sevastopol, Syria, United States, Venezuela and Zaporizhzhia Oblast (Russian-occupied areas).

*How:* Read today in the same KYC help-center article (Intercom host). F20 gives the full list in source order.

- <https://intercom.help/zignaly/en/articles/9044409-kyc-how-to-verify-your-account> · read 2026-10-02T20:48:02Z · SHA-256 of the response body as received `83cc8a83a06b69d7517c9477d3453d0f005e6dae876858822214cd1e1098c604`
  `If your country of residence is listed below, you are not eligible to complete KYC verification due to regulatory restrictions:`

## B-zignaly-api-keys
**VERIFIED** · Zignaly / API

The only API described in the Zignaly help center is a set of Binance-API-compatible keys that Wealth Managers create for their Profit Sharing service sub-accounts, for use with trading terminals. It is a private trading API, not a public data API.

*How:* Read today in the help-center article 'How to create API keys' ('Updated over 2 months ago'; Intercom host).

- <https://intercom.help/zignaly/en/articles/7211344-how-to-create-api-keys> · read 2026-10-02T20:49:11Z · SHA-256 of the response body as received `d0cb2c9d47b205c0ea20373a6d79b8f38c223a005c06b0bc187985c1f7a48317`
  `This process is only compatible only with Terminals that support a Binance API connection , given that Profit Sharing services function as sub-accounts within the framework of the Binance Broker program.`

## B-zignaly-public-api
**UNVERIFIED** · Zignaly / API

Zignaly offers an official public API (keyless or key-based) with published terms.

*How:* No source could be read. https://zignaly.com/legal/api-agreement/ (linked from the help-center footer) returns Cloudflare 403 to curl and WebFetch. https://api.zignaly.com/ returns 403. https://docs.zignaly.com/ does not resolve (WebFetch ENOTFOUND, proxy 502), and https://zignaly.gitbook.io/ 307-redirects to that unresolvable host. No Wayback snapshot of the API agreement was listed by the availability API, and web.archive.org could not be reached.

- <https://zignaly.com/legal/api-agreement/> · read 2026-10-02T20:26:57Z · not readable; see [Pages that could not be read](../EVIDENCE_2026-10.md#pages-that-could-not-be-read)
- <https://zignaly.gitbook.io/> · read 2026-10-02T20:27:21Z · not readable; see [Pages that could not be read](../EVIDENCE_2026-10.md#pages-that-could-not-be-read)
  `HTTP/2 307 ... location: https://docs.zignaly.com/`

## B-zignaly-legal-entity
**UNVERIFIED** · Zignaly / legal & regulatory status

Zignaly's operating entity, governing law and regulatory or licensing status, as stated in Zignaly's own Terms.

*How:* Bot wall: https://zignaly.com/legal, https://app.zignaly.com/legal/terms-of-service and https://zignaly.com/legal/risks/ all return HTTP 403 (Cloudflare challenge) to curl and WebFetch. The only related statement read is ZIG Finance's claim that the team 'previously built Zignaly, a licensed social investment platform'; the licence itself was not verified.

- <https://app.zignaly.com/legal/terms-of-service> · read 2026-10-02T20:49:37Z · not readable; see [Pages that could not be read](../EVIDENCE_2026-10.md#pages-that-could-not-be-read)
- <https://zig.finance/what-is-zig-finance> · read 2026-10-02T20:33:31Z · SHA-256 of the response body as received `ca618aafb9cd17256cbef819d02eec47828e595dae360a407d12fa6a52d06f7a`
  `The team behind ZIG Finance previously built Zignaly, a licensed social investment platform connecting 600,000+ users with 150+ professional portfolio managers.`

## B-zignaly-zindexes
**VERIFIED** · Zignaly / Z-Indexes

Z-Indexes are risk-tiered portfolios (Conservative, Balanced, Advanced) spread across several underlying strategies. The composition article lists 'The ZIG Vault (DeFi yield)' as a component of every tier.

*How:* Read today in the help-center article 'Understanding Z-Indexes Services Composition' ('Updated over 8 months ago'; Intercom host). https://zignaly.com/z-indexes itself was bot-walled. Weight percentages are left out.

- <https://intercom.help/zignaly/en/articles/13731033-understanding-z-indexes-services-composition> · read 2026-10-02T20:48:03Z · SHA-256 of the response body as received `8cfcfbcad2e52d1913216b36596ab5a855d2855a529c88e15d3b8c35954cd95a`
  `Z-Indexes are pre-built, risk-tiered portfolios that allocate your capital across multiple strategies with different return drivers (private credit, tokenized real-world assets, DeFi yield, and systematic trading).`

## B-zignaly-vs-zigchain
**VERIFIED** · Zignaly / relationship to ZIGChain

Zignaly's help center says Zignaly (an investment platform) and ZIGChain (a blockchain network) belong to the same ecosystem but are different products. ZIGChain provides the infrastructure layer, Zignaly the investment platform, and each has separate support (Intercom for Zignaly, Discord for ZIGChain).

*How:* Read today: help-center article 'Zignaly vs ZIGChain: What's the difference' (WebFetch shows the update date November 28, 2025; Intercom host, canonical help.zignaly.com).

- <https://intercom.help/zignaly/en/articles/12960542-zignaly-vs-zigchain-what-s-the-difference> · read 2026-10-02T20:49:09Z · SHA-256 of the response body as received `24f8217da6a7241079fbe235edd388e3cb116429e5f72c95f23c3d73858ed737`
  `Zignaly and ZIGChain belong to the same ecosystem, but they are not the same product.`
- <https://intercom.help/zignaly/en/articles/12960542-zignaly-vs-zigchain-what-s-the-difference> · read 2026-10-02T20:49:09Z · SHA-256 of the response body as received `24f8217da6a7241079fbe235edd388e3cb116429e5f72c95f23c3d73858ed737`
  `ZIGChain provides the infrastructure layer , while Zignaly provides the investment platform built on top of the ecosystem.`

## B-zig-origin-zignaly
**VERIFIED** · checked again in [F22](../EVIDENCE_2026-10.md#f22) (CONFIRMED) · ZIG token / relationship to Zignaly

ZIGChain's MiCAR white paper, linked from zigchain.com, says ZIG was created in April 2021 as the utility token of the Zignaly Social Investment platform and in 2025 is becoming ZIGChain's native utility token. The person seeking admission to trading is Comet Technologies Ltd (BVI), parent company Greenscale Technologies Pte. Ltd.; its listed contact e-mail is on the zignaly.com domain (the address itself is withheld). The paper also states it has not been approved by any EU competent authority.

*How:* PDF downloaded today from the link on zigchain.com (MiCAR White Paper; date of notification 2025-09-26); text extracted with pdftotext. sha256 0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9. The statements are as of the paper's date.

- <https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf> · read 2026-10-02T20:32:06Z · SHA-256 of the PDF as received `0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9`
  `ZIG token was generated in April 2021 as a utility token for the Zignaly Social Investment platform. In 2025, the token is evolving into the Native Utility Token of ZIGChain, reflecting the platform’s transition toward becoming a blockchain ecosystem focused on wealth generation.`
- <https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf> · read 2026-10-02T20:32:06Z · SHA-256 of the PDF as received `0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9`
  `Name: Comet Technologies Ltd. ... Parent Company: Greenscale Technologies Pte. Ltd.`

## B-zigchain-zignaly-references
**VERIFIED** · ZIGChain / what ZIGChain states about Zignaly

ZIGChain's own pages mention Zignaly only through links and metadata. zigchain.com shows a 'Zignaly' link (https://zignaly.com) described as 'Regulated asset managers and onchain investment strategies'. The docs.zigchain.com footer links Discord at discord.zignaly.com, Medium at zignaly.medium.com and CoinGecko at /coins/zignaly. The ZIGChain registry entry for native ZIG has coingecko_id 'zignaly'. The Tokenomics 2.0 paper names Zignaly as a contributing initiative alongside ZIG Markets and WME.

*How:* zigchain.com read via WebFetch (curl gets 403). The docs footer comes from raw HTML served by docs.zigchain.com at the /llms.txt path, which returns the site's index page through a CloudFront error-document fallback. The registry was read via raw.githubusercontent.com and the Tokenomics PDF from whitepaper.zigchain.com.

- <https://zigchain.com/> · read 2026-10-02T20:52:30Z · read through WebFetch, a processed view of the page (not a byte copy)
  `Heading: "Zignaly" - Description: "Regulated asset managers and onchain investment strategies"`
- <https://docs.zigchain.com/llms.txt> · read 2026-10-02T20:30:18Z · SHA-256 of the response body as received `de975efe4b7309a43ad3ef376f9f83f65b8f9ca53032995dfe27988544608c0b`
  `<a href=https://www.coingecko.com/en/coins/zignaly target=_blank rel="noopener noreferrer" class=footer__link-item>Coingecko`
- <https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/native/zig.mainnet.json> · read 2026-10-02T20:46:36Z · SHA-256 of the response body as received `f45c5bf3387b7b1d3bc1dd056379320ad5921cbf9936e8ac36022a24fa3d396e`
  `"coingecko_id": "zignaly",`
- <https://whitepaper.zigchain.com/zig-tokenomics.pdf> · read 2026-10-02T20:32:06Z · SHA-256 of the PDF as received `d5dd82520633e0f1b67e8a452e1c5055645e66621139b28168526683af348bba`
  `is the primary mechanism today, alongside other contributing initiatives such as WME and Zignaly.`

## C-zig-mica-whitepaper
**VERIFIED** · checked again in [F21](../EVIDENCE_2026-10.md#f21) (CONFIRMED) · checked again in [F22](../EVIDENCE_2026-10.md#f22) (CONFIRMED) · ZIG MiCA Title II white paper (context for counsel)

zigchain.com links a 'MiCAR White Paper' PDF for ZIG: Date of Notification 2025-09-26, person seeking admission Comet Technologies Ltd. (BVI), Home Member State LV, with an Article 6(3) non-approval statement. ESMA's OTHER.csv lists Latvijas Banka / LV / Comet Technologies Ltd. / CASP 'Bitvavo' / wp_url https://gitbook.zignaly.com/white-paper / last update 05.11.2025.

*How:* PDF downloaded (sha256 0d57de5b...); ESMA CSV parsed.

> Second check (F21, F22): ESMA's row for Comet Technologies Ltd. points to https://gitbook.zignaly.com/white-paper (HTTP 403 to curl and WebFetch at 23:06:57Z), not to the PDF that zigchain.com links, so the registered version could not be compared. The zigchain.com footer (read through WebFetch) names "ZIGCHAIN FOUNDATION, Incorporated 25 April 2025 under Registration Number # 420931", while the PDF names Comet Technologies Ltd. (BVI, identifier 2056175).

- <https://cdn.prod.website-files.com/68343fb616fa6ee830ca7b09/68ded001e86b6cdb57358749_30-09-25%20MiCA.pdf> · read 2026-10-02T21:13:31Z · SHA-256 of the PDF as received `0d57de5b93ad4e2f201619aa58fa52b358536fb94c8899907379e38c7dc7a4f9`
  `This crypto-asset white paper has not been approved by any competent authority in any Member State of the European Union.`
- <https://www.esma.europa.eu/sites/default/files/2024-12/OTHER.csv> · read 2026-10-02T21:26:58Z · SHA-256 of the CSV as received `556db62050a19f3d4fc6a139e97eb4b309ff9fd1fdd92c06fd6b34775cb3c990`
  `Latvijas Banka | LV | Comet Technologies Ltd.`
