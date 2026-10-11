# Evidence register (f) ZIG Markets and ZIG Finance

Part of [EVIDENCE_2026-10.md](../EVIDENCE_2026-10.md), which explains the labels, lists the pages that could not be read and gives the second check (F01–F24). Read on 2026-10-02 (UTC). What zig.finance says (its robots.txt asks AI crawlers not to train on it, so quotes are kept short) and the regulator cross-check.

## B-zigfinance-distinct-brands
**VERIFIED** · ZIG Finance / brand structure

The ZIG Finance Terms (effective 22 Sep 2026) say ZIG Finance, ZIG Chain, ZIG Markets, ZIG Labs, Zignaly and $ZIG are distinct products and brands, each governed by its own Product Terms. The site operator is STARBUY (PTY) LTD (registration 2022/221936/07), the Terms cover only the corporate website, and they are governed by South African law.

*How:* zig.finance/legal/terms-of-service fetched with curl today (static Astro HTML).

- <https://zig.finance/legal/terms-of-service> · read 2026-10-02T20:33:28Z · SHA-256 of the response body as received `fbcf154b42a5a0a1e31d85cafe3a7425d9f29980250f6f49cce3dc43683cb3da`
  `refer to distinct products and brands within the wider ZIG ecosystem. Each is operated through its own website and governed exclusively by its own terms of service, risk disclosures, privacy notice and related documents (together, “Product Terms”).`
- <https://zig.finance/legal/terms-of-service> · read 2026-10-02T20:33:28Z · SHA-256 of the response body as received `fbcf154b42a5a0a1e31d85cafe3a7425d9f29980250f6f49cce3dc43683cb3da`
  `Website operator: STARBUY (PTY) LTD (Registration Number: 2022/221936/07)`

## B-zigmarkets-redirect
**VERIFIED** · ZIG Markets / URLs

https://zigmarkets.com/ returns 301 to https://zig.finance/markets (final URL, HTTP 200). https://zigmarkets.com/legal/terms-and-conditions also returns 301 to https://zig.finance/markets, so there is no Terms page at that path.

*How:* curl -L with headers saved today.

- <https://zigmarkets.com/> · read 2026-10-02T20:32:48Z · SHA-256 of the file as received `f6fcc335d732cd5749e2fa739cde830c6ac45275472260c177207a04cf6a873a`
  `HTTP/2 301 ... location: https://zig.finance/markets`
- <https://zigmarkets.com/legal/terms-and-conditions> · read 2026-10-02T20:32:50Z · SHA-256 of the file as received `0adcaca2fec485e51fdb64b860293134c80c93d02f3cd308fb76192df8c406fd`
  `HTTP/2 301 ... location: https://zig.finance/markets`

## B-zigmarkets-licensing-statement
**VERIFIED** · ZIG Markets / licensing

ZIG Markets says it operates through licensed South African entities supervised by the FSCA under the FAIS Act: Merritt Administrators (Pty) Ltd (registration 2013/189063/07, FSP Category I and II, Licence 46517) and Starbuy (Pty) Ltd (FSP Category I plus CASP authorisation).

*How:* Quoted from https://zig.finance/markets, fetched today. This verifies the statement as published, not the licences themselves; see B-fsca-starbuy-casp for the regulator cross-check.

- <https://zig.finance/markets> · read 2026-10-02T20:32:48Z · SHA-256 of the response body as received `1e4fb7f7bf9f6d221cbea2cc03edf5386ad0a09ff0a969c45c49bc38fd4c4dbd`
  `ZIG Markets operates through licensed South African entities, supervised by the Financial Sector Conduct Authority (FSCA) under the Financial Advisory and Intermediary Services (FAIS) Act.`
- <https://zig.finance/markets> · read 2026-10-02T20:32:48Z · SHA-256 of the response body as received `1e4fb7f7bf9f6d221cbea2cc03edf5386ad0a09ff0a969c45c49bc38fd4c4dbd`
  `Merritt Administrators (Pty) Ltd Registration 2013/189063/07, FSP Category I and II, Licence 46517. Starbuy (Pty) Ltd FSP Category I, plus CASP (Crypto Asset Service Provider) authorisation.`

## B-fsca-starbuy-casp
**VERIFIED** · checked again in [F24](../EVIDENCE_2026-10.md#f24) (CONFIRMED) · ZIG Markets / regulator cross-check

The FSCA's published list of CASPs authorised under the FAIS Act (December 2024) includes row 204: 'STARBUY PTY LTD', FSP number 53740, CAT I, intermediary services. The list gives no company registration number, so it does not on its own confirm this is the same entity as STARBUY (PTY) LTD 2022/221936/07.

*How:* Regulator PDF downloaded today from the link on www.fsca.co.za. sha256 0432ac9e22e9bdbd25feea231ee8b6a092a8f5412b897fb50eb5f7744f459ad9. The list is dated December 2024 and no newer CASP list was linked.

> Second check (F24): the list is as of December 2024, so it says nothing about status on 2026-10-02. It also numbers two rows 203.

- <https://www2.fsca.co.za/Regulatory%20Frameworks/Documents/Published%20list%20of%20Authorised%20CASPs_18%20December%202024.pdf> · read 2026-10-02T20:51:51Z · SHA-256 of the PDF as received `0432ac9e22e9bdbd25feea231ee8b6a092a8f5412b897fb50eb5f7744f459ad9`
  `204    STARBUY PTY LTD                                   53740       CAT I      •   Intermediary services`

## B-fsca-merritt-46517
**UNVERIFIED** · ZIG Markets / regulator cross-check

FSCA records confirm Merritt Administrators (Pty) Ltd as FSP 46517 with Category I and II licences.

*How:* Not checked at the regulator. The FSCA FSP lookup is the search tool at https://www.fsca.co.za/Entity-Persons-Search/?iframe_target=financial-services-providers, a form, which the rules exclude. The only static list found (CASPs, Dec 2024) has no Merritt entry.

- <https://www.fsca.co.za/> · read 2026-10-02T20:51:38Z · not readable; see [Pages that could not be read](../EVIDENCE_2026-10.md#pages-that-could-not-be-read)

## B-zigmarkets-products
**VERIFIED** · ZIG Markets / distribution products

ZIG Markets' 'Product Shelf' lists GCC Invoice Factoring, GCC SME Finance, Cross-Border PayFi, Global Trade Receivables, Shariah-Compliant Private Credit and Global Equities & ETFs. It presents ZIG Markets as a structuring and distribution layer for originators, distributors and investors, reached through a contact form ('Connect with Us').

*How:* zig.finance/markets fetched today (static HTML). No sign-up, app or product-terms link exists on the page.

- <https://zig.finance/markets> · read 2026-10-02T20:32:48Z · SHA-256 of the response body as received `1e4fb7f7bf9f6d221cbea2cc03edf5386ad0a09ff0a969c45c49bc38fd4c4dbd`
  `A curated selection of regulated investment products, structured for compliant access across onchain and traditional markets.`

## B-zigmarkets-retail-claim
**VERIFIED** · ZIG Markets / retail

ZIG Finance says ZIG Markets distributes regulated products to institutional allocators and retail capital, and says 'ZIG Finance is not itself a regulated firm'. The contact page routes product access through 'Institutional / sales'.

*How:* Quoted from zig.finance pages fetched today (what-is-zig-finance, markets, contact).

- <https://zig.finance/what-is-zig-finance> · read 2026-10-02T20:33:31Z · SHA-256 of the response body as received `ca618aafb9cd17256cbef819d02eec47828e595dae360a407d12fa6a52d06f7a`
  `ZIG Markets is the commercial and distribution layer of the ecosystem. It structures, accesses, and distributes regulated financial products (private credit, equities, real estate, structured products) to both institutional allocators and retail capital, with ZIG Chain as its preferred settlement infrastructure.`
- <https://zig.finance/what-is-zig-finance> · read 2026-10-02T20:33:31Z · SHA-256 of the response body as received `ca618aafb9cd17256cbef819d02eec47828e595dae360a407d12fa6a52d06f7a`
  `ZIG Finance is not itself a regulated firm.`
- <https://zig.finance/contact> · read 2026-10-02T20:33:33Z · SHA-256 of the response body as received `69bd61ead6457081578f1c27e0891350a2df03a368e4ea25e86bf41ca485232f`
  `Institutional / sales Access regulated products through ZIG Markets.`

## B-zigmarkets-retail-where
**UNVERIFIED** · ZIG Markets / retail availability

There is a ZIG Markets product open to retail consumers, with published eligibility rules and permitted jurisdictions.

*How:* Not found. All 12 URLs in https://zig.finance/sitemap.xml were fetched. None has retail onboarding, eligibility rules, jurisdiction lists or Product Terms. The ZIG Finance Terms say eligibility and jurisdictions are set only by each product's own Product Terms, and none were found linked.

- <https://zig.finance/legal/terms-of-service> · read 2026-10-02T20:33:28Z · SHA-256 of the response body as received `fbcf154b42a5a0a1e31d85cafe3a7425d9f29980250f6f49cce3dc43683cb3da`
  `Access to this Site does not establish eligibility for any product. Jurisdictional availability, sanctions screening and eligibility requirements for a specific product are determined exclusively by that product's own Product Terms, which you should consult directly.`
- <https://zig.finance/sitemap.xml> · read 2026-10-02T20:33:35Z · not readable; see [Pages that could not be read](../EVIDENCE_2026-10.md#pages-that-could-not-be-read)

## B-tokenomics-zigmarkets
**VERIFIED** · ZIG Markets / official description

ZIGChain's Tokenomics 2.0 paper calls ZIG Markets a technology-enabled infrastructure ('Compliant Yield Access Layer') that does not itself generate investment returns. It says licensed counterparties perform any regulated activities, and the initial commercial focus is emerging and frontier markets.

*How:* PDF downloaded today from https://whitepaper.zigchain.com/zig-tokenomics.pdf (linked from zigchain.com). sha256 d5dd82520633e0f1b67e8a452e1c5055645e66621139b28168526683af348bba. The 'fi'/'fl' ligatures were normalised in the quotes.

- <https://whitepaper.zigchain.com/zig-tokenomics.pdf> · read 2026-10-02T20:32:06Z · SHA-256 of the PDF as received `d5dd82520633e0f1b67e8a452e1c5055645e66621139b28168526683af348bba`
  `ZIG Markets does not itself create, guarantee, underwrite, or generate investment returns.`
- <https://whitepaper.zigchain.com/zig-tokenomics.pdf> · read 2026-10-02T20:32:06Z · SHA-256 of the PDF as received `d5dd82520633e0f1b67e8a452e1c5055645e66621139b28168526683af348bba`
  `Where applicable, investment management, custody, execution and other regulated activities are performed by the relevant licensed counterparties and service providers.`

## B-zigchain-docs-wme
**VERIFIED** · ZIGChain docs / Wealth Management Engine & ZIG Markets

On docs.zigchain.com the Wealth Management Engine section is a placeholder: 'The Wealth Management Engine (WME) is ZIGChain's modular stack for delegated investment management', and the v4 copy says the section 'is currently being prepared for publication'. The home tile says 'content is coming soon'. The glossary defines ZIG Markets as 'The commercial infrastructure and distribution layer...'. No other ZIG Markets content was found in the docs pages read.

*How:* The home-tile quote is from raw HTML (docs index served at /llms.txt). The WME and glossary quotes come from WebFetch extracts, which may not be exactly character-for-character. WebFetch times are ±1 minute.

- <https://docs.zigchain.com/llms.txt> · read 2026-10-02T20:30:18Z · SHA-256 of the response body as received `de975efe4b7309a43ad3ef376f9f83f65b8f9ca53032995dfe27988544608c0b`
  `Modular investment tooling for wealth managers—content is coming soon.`
- <https://docs.zigchain.com/v4/wealth-management-engine> · read 2026-10-02T20:31:00Z · read through WebFetch, a processed view of the page (not a byte copy)
  `The Wealth Management Engine (WME) is ZIGChain's modular stack for delegated investment management. This section is currently being prepared for publication and will appear when the content is ready.`
- <https://docs.zigchain.com/about-zigchain/glossary> · read 2026-10-02T20:51:20Z · read through WebFetch, a processed view of the page (not a byte copy)
  `ZIG Markets: "The commercial infrastructure and distribution layer whose activities may contribute to ecosystem development and $ZIG Market Acquisition."`

## B-zigfinance-robots-content-signal
**VERIFIED** · Source-use constraint

zig.finance's robots.txt sets 'Content-Signal: search=yes,ai-train=no,use=reference' for all user agents and disallows ClaudeBot, anthropic-ai and Claude-Web. This research used short reference quotes from a handful of user-directed fetches only.

*How:* robots.txt fetched today. Recorded so the owner can decide on any future programmatic use of zig.finance content.

- <https://zig.finance/robots.txt> · read 2026-10-02T20:33:34Z · SHA-256 of the response body as received `fefe27df9ef8caa044da6fa23a3584fb50274e67551b070dd3b62d93e74c46e4`
  ```text
  User-agent: *
  Content-Signal: search=yes,ai-train=no,use=reference
  Allow: /
  ```
