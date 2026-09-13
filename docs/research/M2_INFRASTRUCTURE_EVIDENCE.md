# M2 infrastructure evidence

Verified 2026-09-13 UTC. Companion: [structured evidence](M2_INFRASTRUCTURE_EVIDENCE.json), with individual source URLs and response timestamps. Research is documentation-only; all entries remain execution-gated and idle remains the sole executable strategy. `FundingRoute` and `StrategyAdapter` are separate concepts.

Status labels: **claim** = primary publisher assertion; **announced** = release or declared plan; **verified live read** = an observed document/config/chain response, within the stated scope; **unconfirmed** = not established by the inspected material, not proof of absence. Role classifications and proposed ZIGoals uses below are research interpretations, not provider API promises.

## Product, origination and service evidence

| Provider | Proposed roles | Current primary evidence and access boundary |
| --- | --- | --- |
| **Zamanat** | CURATOR, DISTRIBUTOR, ECOSYSTEM_TOOL | **Announced:** September 10 ZM1 fund launch; token issuance on ZIGChain is described but no deployment was independently verified. Zamanat sponsors, Truleum manages, Apex administers. **Claim:** Professional Clients, limited DIFC distribution and whitelisting; no onshore UAE transactions. The release explicitly excludes Islamic Fund / Shariah-compliant marketing for this product. The $100M figure is a target. [Release](https://www.zamanathq.com/news/zamanat-fund-launch); [broader platform positioning](https://www.zamanathq.com/). |
| **DeFa / InvoiceMate** | ORIGINATOR, LENDING, CURATOR | **Claim:** limited-access ZIGChain private-mainnet invoice pools. The current site describes USDC deposits/DLP receipts and marks Docs/Audit as coming soon. **Unconfirmed:** canonical deployed pool interface, investor jurisdiction terms, insurance coverage and current audit scope. Page descriptions overlap; no advertised return or tenor became a canonical parameter. [Provider launch](https://www.linkedin.com/posts/defaprimitive_our-first-pools-are-now-live-on-zigchain-activity-7445092712699277312-hA9E); [DeFa](https://imdefa.com/); [InvoiceMate origination](https://invoicemate.net/). |
| **Beehive** | ORIGINATOR, LENDING, SERVICING | **Announced:** partnership exploring programmable GCC private credit; **unconfirmed:** live ZIG product, contract or testnet. Existing financing is between investors and businesses; default, delays and exit liquidity matter. Investor selection and local restrictions apply. Islamic Window/certification statements remain attributed to Beehive; they do not certify an unidentified ZIG product. [Partnership](https://www.linkedin.com/posts/beehivefintech_smes-we-hear-you-access-to-funding-should-activity-7452647245906255872-JBo9); [platform](https://www.beehive.ae/); [investors](https://www.beehive.ae/investors); [Islamic finance](https://www.beehive.ae/islamic-finance). |
| **Ondo** | ORIGINATOR, DISTRIBUTOR | **Verified live read:** public Stocks REST/OpenAPI and gRPC documentation, onboarding and whitelisted primary-purchaser flow. Docs list Ethereum, BNB Chain and Solana. **Announced:** ZIG integration; **unconfirmed:** direct ZIG contract/wrapper. Stocks eligibility includes US/Canada prohibitions and professional/qualified criteria for EEA/UK issuance; product-specific rules control. [API](https://docs.ondo.finance/api-reference/overview); [address directory](https://docs.ondo.finance/addresses); [eligibility](https://docs.ondo.finance/ondo-stocks/eligibility); [ZIG announcement](https://www.linkedin.com/posts/zigchain_ondo-finance-did-the-hard-work-of-bringing-activity-7470083640316747776-QfeJ). |
| **Taurus** | CUSTODY, ECOSYSTEM_TOOL | **Announced/claim:** Taurus-PROTECT native ZIG custody. **Verified live read:** mainnet support list and Taurus-CAPITAL Zigchain TokenFactory support. These establish documented vendor support, not access to a tenant API, a vault interface, or ZIG testnet support. Institutional onboarding and custody permissions remain unresolved. [Release](https://www.taurushq.com/stories/taurus-integrates-zigchain-to-expand-digital-asset-wealth-generation-opportunities-for-financial-institutions/); [networks](https://docs.taurushq.com/protect-capital/docs/supported-networks); [assets/tokenisation](https://docs.taurushq.com/protect-capital/docs/supported-assets-stablecoins-and-tokenisation). |
| **Apex Group** | SERVICING | **Announced:** ZIG tokenized-fund alliance; the ZM1 release names Apex as administrator. **Claim:** fund administration, transfer agency and institutional services. **Unconfirmed:** public ZIG product API. Servicing is distinct from origination, fund management and custody; the alliance does not establish one shared vault across partners. [Apex services](https://www.apexgroup.com/); [ZIG-issued alliance release](https://www.globenewswire.com/news-release/2025/07/25/3121771/0/en/Apex-Group-and-ZIGChain-Forge-Strategic-Alliance-to-Launch-Tokenized-Fund-Infrastructure.html); [ZM1](https://www.zamanathq.com/news/zamanat-fund-launch). |

Proposed use: retain provider, product, issuer/originator, manager, administrator, custodian, eligibility and underlying exposure as separate records. No common product or custody relationship was inferred from logos. None of the inspected RWA materials establishes a ready ZIGoals execution adapter. Published security or religious claims require a matching product, scope and current deployment before promotion.

## Funding-rail evidence

**Noble — FUNDING_RAIL.** **Verified live read:** the official ZIG registry identifies Noble-origin USDC and the ZIG-side IBC channels are open. **Announced sunset:** Circle's September 10 notice ends new Circle Mint minting on **2026-10-13**, schedules the Noble USDC/CCTP pause for **2027-01-12**, and rules out Noble CCTP V2. Open channels do not override the issuer's lifecycle. Treat this as blocked new funding infrastructure pending a sunset/replacement design, not a durable default rail. [Circle notice](https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble).

Native Noble USDC and IBC-transferred USDC are distinct locations of the asset. Circle Mint support is not direct support for every appchain voucher. Eligibility, issuer controls and exit availability require separate review. [Circle IBC explanation](https://help.circle.com/support/en/a-closer-look-at-usdc-on-noble-and-the-ibc-protocol?id=kb_article_view&sysparm_article=KB0010582); [Mint support](https://developers.circle.com/circle-mint/supported-chains-and-currencies).

**Axelar — BRIDGE, FUNDING_RAIL.** **Verified live read:** Axelar's published mainnet and testnet configs independently match the ZIG channel and `unit-zig` asset mappings. Its testnet key `zigchain-3` maps to chain ID `zig-test-2`; do not use the key as the wallet chain ID. Current config supports the documented ZIG asset path, not an inferred arbitrary-asset bridge. [Config documentation](https://docs.axelar.dev/resources/static-configs/static-configs/); [mainnet JSON](https://axelar-mainnet.s3.us-east-2.amazonaws.com/configs/mainnet-config-1.x.json); [testnet JSON](https://axelar-testnet.s3.us-east-2.amazonaws.com/configs/testnet-config-1.x.json).

The ZIG.axl representation has 18 decimals; native gas conversion remains a separate unverified step. Validator security and gateway rate limits are documented; no route-specific security or transfer test was performed. [ZIG.axl registry](https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/zig-axl.mainnet.json); [Axelar security](https://docs.axelar.dev/learn/security/).

**Verified live read: connectivity only.** At approximately 02:53:08 UTC, the following ZIG-side channel queries returned `STATE_OPEN`, unordered `ics20-1`, at response heights `1-12081344` / `2-7741160`. Counterparty chain IDs below come from the [official channel list](https://docs.zigchain.com/integration-guides/ibc-channel-list). The queried LCD nodes appear in the official [mainnet](https://raw.githubusercontent.com/ZIGChain/networks/main/zigchain-1/api-nodes.txt) and [testnet](https://raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/api-nodes.txt) node lists.

| Rail | Mainnet `zigchain-1` → counterparty | Testnet `zig-test-2` → counterparty |
| --- | --- | --- |
| Axelar | [channel-1](https://public-zigchain-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-1/ports/transfer) → `axelar-dojo-1/channel-182` | [channel-0](https://public-zigchain-testnet-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-0/ports/transfer) → `axelar-testnet-lisbon-3/channel-612` |
| Noble | [channel-3](https://public-zigchain-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-3/ports/transfer) → `noble-1/channel-175` | [channel-44](https://public-zigchain-testnet-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-44/ports/transfer) → `grand-1/channel-704` |
| Cosmos Hub, additional context | [channel-4](https://public-zigchain-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-4/ports/transfer) → `cosmoshub-4/channel-1555` | [channel-43](https://public-zigchain-testnet-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-43/ports/transfer) → `provider/channel-566` |

**Verified live read: canonical metadata.** The official registry published these mainnet traces; exact destination denomination strings are preserved in the companion JSON. This is asset evidence, not a completed transfer.

| Asset | Published ZIG trace | Decimals | Canonical source |
| --- | --- | --- | --- |
| Noble USDC | `transfer/channel-3/uusdc` | 6 | [USDC metadata](https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/usdc.mainnet.json) |
| ZIG.axl | `transfer/channel-1/unit-zig` | 18 | [ZIG.axl metadata](https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/zig-axl.mainnet.json) |
| ATOM | `transfer/channel-4/uatom` | 6 | [ATOM metadata](https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/atom.mainnet.json) |

**Unconfirmed:** independent live denom-trace queries returned HTTP 501; the JSON records the exact attempted URLs. Counterparty client freshness, relayers, route fees, timeouts, return path and destination receipt were not verified. No wallet, faucet, transfer or redemption was used. A missing receipt remains uncertain; it is not evidence of transaction failure.

## Gates before any future execution

The following are proposed diligence/implementation gates inferred from the evidence above, not claims that the provider already supplies each capability.

| Entry | Required evidence or decision |
| --- | --- |
| Zamanat | Final offering/eligibility terms; canonical deployed token and subscription/redemption interface; product security and servicing scope. |
| DeFa / InvoiceMate | Canonical pool/interface; investor terms; deployed-code audit; insurance exclusions; default and withdrawal accounting. |
| Beehive | Actual ZIG product and operator; contracts/API; product eligibility/certification scope; recovery and liquidity terms. |
| Ondo | Specific product and ZIG wrapper; permitted API access; canonical execution/security; investor and redemption restrictions. |
| Taurus | Contractual client access, tenant signing controls, exact asset/transaction support and product-specific custody arrangement. |
| Apex Group | Named fund service agreement, authoritative NAV/register/reporting source and permissions. |
| Noble | Resolve issuer sunset first; exact asset/route; current clients/relayers; fees/timeouts; destination receipt. |
| Axelar | Origin/gateway/native-conversion route; decimals/gas; current security and limits; fees/timeouts; destination receipt. |

The proposed product flow keeps funding arrival separate from goal allocation. An infrastructure partner is not itself a yield-bearing strategy. No funding or RWA integration is enabled by this report.
