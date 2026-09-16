# ZIGChain ecosystem integration map

Evidence reviewed 2026-09-13 UTC. This is a dated research snapshot, not an investment catalogue, audit or partnership claim. Role classifications are evidence-based research interpretations. Idle remains the only executable strategy. The typed registry separates provider lifecycle from authority: DISCOVERED → RESEARCHED → VERIFIED → INTEGRATED, with DISABLED available at any stage; none grants financial execution. INTEGRATED here means verified informational links only.

## Integration order

1. **Implemented:** ZIGScan tx/account/block/contract links; Range official testnet homepage; canonical Hub information links; strict typed provider registry and product-role metadata.
2. **Architecture only:** external strategy descriptors, product-specific attribution and FundingRoute. No swaps, bridge, lending, leverage, RWA, Valdora or WME execution.
3. **Future gate:** canonical schema and deployed checksum, eligibility, fee/amount/quote/redemption semantics, current security review and testnet receipts before any adapter can be enabled.

## Product and funding boundaries

FundingRoute answers how an asset arrives; StrategyAdapter answers what a Goal does with it. An open IBC channel does not prove relayer health, issuer continuity, safe fees, a usable return path or completed settlement. Circle announced Noble USDC minting ends 2026-10-13 and USDC/CCTP pause 2027-01-12; a new Noble-based funding design must resolve that lifecycle first. [Issuer notice](https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble).

For transparency, product/vault, curator, originator, servicer and custodian are separate fields. [Valdora’s Stablecoin Yield product page](https://docs.valdora.finance/vaults/stablecoin-yield-vault) explicitly names ZIG Markets as curator. That supports this product-specific attribution, not a relationship with every originator or custodian. [ZM1’s release](https://www.zamanathq.com/news/zamanat-fund-launch) separately names Zamanat sponsor, Truleum manager and Apex administrator and explicitly excludes Shariah-compliant marketing for ZM1. No such external relationship is populated in the active idle strategy.

## Valdora

**Roles:** LIQUID_STAKING, VAULT, DISTRIBUTOR. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (LIVE_READ_VERIFIED): Published addresses; staker and a vault returned live LCD contract metadata. zig-test-2 (LIVE_READ_VERIFIED): Published staker/token addresses; staker returned live LCD contract metadata.

**Contract/API and integration surface:** ZIG Markets curator attribution is explicit for named Valdora vaults, but no shared-vault or broader responsibility is inferred. Integration surface: Non-executable liquid-staking and vault descriptors. Canonical execute/query messages, units, rounding, fees, delayed redemption/claim states, and receipt semantics are required for an adapter. API/contracts: addresses available; canonical message schemas and public API not found in reviewed sources

**Risk and security:** No public canonical message schema or deployed checksum-to-source mapping was found. Normal liquid-staking redemption is delayed and includes a later claim step. Provider security claims were not backed by a public audit report tied to current deployments. Vault roles must not collapse curator, originator, custodian, servicer, and distributor responsibilities.

**Eligibility/KYC/jurisdiction:** No public eligibility, KYC, or jurisdiction rules were found in the reviewed documentation.

**Potential ZIGoals use / phase:** Model stZIG and vault opportunities as read-only descriptors; later implement lifecycle-aware adapters only from canonical provider schemas. FUTURE_GATED.

**Primary sources:** [Valdora Smart Contracts](https://docs.valdora.finance/smart-contracts); [Liquid Staking Architecture](https://docs.valdora.finance/liquid-staking/architecture); [Unstaking and Redemption](https://docs.valdora.finance/liquid-staking/unstaking-and-redemption); [Valdora Security](https://docs.valdora.finance/security); [Stablecoin Yield Vault](https://docs.valdora.finance/vaults/stablecoin-yield-vault); [ZIGChain mainnet contract record: Valdora staker](https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55); [ZIGChain testnet contract record: Valdora staker](https://testnet-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69)

## OroSwap

**Roles:** DEX, LIQUIDITY_ROUTER. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (LIVE_READ_VERIFIED): Published deployment and live LCD router record. zig-test-2 (LIVE_READ_VERIFIED): Published deployment and live LCD router record.

**Contract/API and integration surface:** Do not reimplement generic AMM quote math; Halborn documents an acknowledged formula difference. Future execution needs asset/pair allowlists, minimum receive, max spread, quote freshness, failure classification, and receipt verification. Integration surface: Read-only route discovery and router simulation design. No trading UX and no fund-moving execution. API/contracts: public CosmWasm router source, execute/query surface, and deployments available

**Risk and security:** Current deployed checksum-to-source mapping was not established. Exact fee, decimals, rounding, price impact, quote freshness, and simulation response semantics require pinning. The audited snapshot predates current repository/deployment state. A documented CW20 response-data caveat affects receipt interpretation. Mainnet deployment-manifest chain metadata conflicts with current official ZIGChain chain ID.

**Eligibility/KYC/jurisdiction:** OroSwap says the protocol is non-custodial and does not require KYC, with access restricted in OFAC-sanctioned regions; implementation must still apply application policy and jurisdiction review.

**Potential ZIGoals use / phase:** Future read-only SwapAdapter/LiquidityRouter quote and route comparison using canonical router simulation. FUTURE_GATED.

**Primary sources:** [OroSwap Router](https://github.com/oroswap/oroswap-core/tree/main/contracts/router); [OroSwap ZIGChain mainnet deployment](https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/mainnet.json); [OroSwap ZIGChain testnet deployment](https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/testnet.json); [OroSwap Swap Guide](https://docs.oroswap.org/docs/getting-started/swap/); [OroSwap FAQ](https://docs.oroswap.org/docs/oroswap_faq/); [Halborn OroSwap CosmWasm Contracts Audit](https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648); [ZIGChain mainnet contract record: OroSwap router](https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy); [ZIGChain testnet contract record: OroSwap router](https://testnet-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig1g00t6pxg3xn7vk0vt29zu9vztm3wsq5t5wegutlg94uddju0yr5sye3r3a)

## PermaPod

**Roles:** LENDING, ECOSYSTEM_TOOL. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (LIVE_READ_VERIFIED): Public client configuration and live LCD records for configured contracts. zig-test-2 (DOCUMENTED): Public client configuration is partial; several contract fields are empty.

**Contract/API and integration surface:** The repository security self-check covers the query client and is not a smart-contract audit. Neither remediation nor continued deployment of affected code can be inferred from provider silence or live address existence. Execution requires primary incident facts, affected-contract mapping, remediation provenance, current full-protocol audit coverage, and testnet evidence. Integration surface: Read-only protocol, rates, position health, rewards, and vault metadata queries after schema pinning. No fund-moving or leverage path. API/contracts: public read-only query client and configured addresses; public core-contract source unavailable

**Risk and security:** An unresolved non-primary incident alert exists, while no provider postmortem or remediation mapping was found. The public client predates that alert and cannot prove whether affected code remains deployed. The Halborn audit scope was the Oracle suite, not all currently deployed contracts. No public core-contract repository or deployed checksum-to-source mapping was found. The testnet configuration is incomplete.

**Eligibility/KYC/jurisdiction:** No current public eligibility, KYC, or jurisdiction policy was verified in the accessible primary sources.

**Potential ZIGoals use / phase:** Read-only lending-market and position-risk research metadata only; never automate borrowing, collateral changes, or leverage loops in this phase. FUTURE_GATED.

**Primary sources:** [PermaPod GitHub organization](https://github.com/permapod-zigchain); [PermaPod read-only skills](https://github.com/permapod-zigchain/permapod-skills); [PermaPod public client configuration](https://raw.githubusercontent.com/permapod-zigchain/permapod-skills/main/src/config.ts); [PermaPod client security self-check](https://raw.githubusercontent.com/permapod-zigchain/permapod-skills/main/SECURITY_CHECK.md); [Halborn PermaPod audit](https://www.halborn.com/audits/permapod/permapod-core-contracts-zigchain-54eb8c); [ZIGChain mainnet contract record: PermaPod Red Bank](https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig1s3frrzltqaxvuzffvxg89uuad6nkcyqe3ucvrahynznaek3mhe4s75puyu); [DefiLlama PermaPod protocol page](https://defillama.com/protocol/permapod?events=false&fees=true&tvl=false)

## Nawa

**Roles:** VAULT, CURATOR. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (UNCONFIRMED): Provider site shows ZIGChain products; no executable deployment was verified. zig-test-2 (UNCONFIRMED): No public testnet deployment evidence found.

**Contract/API and integration surface:** Required attribution: Nawa states that Amanie Advisors reviewed/certified the strategies; certifier confirmation remains unverified. Liquidity, redemption, capacity, eligibility, and deployment evidence remain open blockers. Integration surface: Attributed certification and product metadata only; possible future GoalPolicy input after certifier verification. No vault execution. API/contracts: no current public ZIGChain contract, schema, API, or source repository verified

**Risk and security:** No Amanie-hosted certificate or current certifier confirmation was found. Hosted Halborn audits concern older EVM/CoreDAO code and are not mapped to a current ZIGChain deployment. The first audit's detailed matrix includes partially solved, acknowledged, and risk-accepted findings despite an overall addressed summary. No current public source repository, contract address, schema, liquidity terms, or code mapping was found.

**Eligibility/KYC/jurisdiction:** The provider markets to institutions and individuals, but current eligibility, KYC, and jurisdiction rules were not verified.

**Potential ZIGoals use / phase:** Store exact certifier/provider attribution as policy metadata once the certificate and product scope are verified; do not make an independent Shariah determination. FUTURE_GATED.

**Primary sources:** [Nawa](https://www.nawa.finance/); [Nawa GitHub organization](https://github.com/Nawa-Finance); [Nawa Halborn Audit 1](https://www.nawa.finance/audits/Nawa_Audit_1.pdf); [Nawa Halborn Audit 2](https://www.nawa.finance/audits/Nawa_Audit_2.pdf)

## ZIG Markets

**Roles:** CURATOR, DISTRIBUTOR. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (UNCONFIRMED): Provider and ZIGChain describe ecosystem/distribution roles; no executable deployment was found. zig-test-2 (UNCONFIRMED): No public testnet interface found.

**Contract/API and integration surface:** The provider claims Merritt Administrators Pty Ltd holds South African FSP 46517 Category II. An FSCA notice verifies the entity/number and a 2022 lifting of suspension, but it is not a current full-scope license-register check. Do not infer ORIGINATOR, CUSTODY, SERVICING, or shared-vault responsibility. Integration surface: Product-level curator and distributor attribution where a primary source identifies ZIG Markets. No executable API. API/contracts: legal terms mention APIs and vault interfaces; no public API documentation or contract schema found

**Risk and security:** Legal references to APIs do not establish a usable public integration surface. Current live regulator status, exact activity scope, and crypto-asset authorization were not independently confirmed. Originator, custodian, servicer, curator, and distributor roles must remain distinct.

**Eligibility/KYC/jurisdiction:** Terms target a restricted/sophisticated audience and permit KYC/AML, sanctions screening, local eligibility controls, and geoblocking; regulated services may be supplied by licensed partners/entities.

**Potential ZIGoals use / phase:** Display verified curator/distributor attribution for specifically evidenced products and retain responsibility boundaries. FUTURE_GATED.

**Primary sources:** [ZIG Markets](https://zigmarkets.com/); [ZIG Markets Terms and Conditions](https://zigmarkets.com/legal/terms-and-conditions); [FSCA FAIS Notice 93 of 2022](https://www.fsca.co.za/Notices/FSCA%20FAIS%20Notice%2093%20of%202022.pdf); [Valdora Stablecoin Yield Vault](https://docs.valdora.finance/vaults/stablecoin-yield-vault); [ZIGChain Glossary](https://docs.zigchain.com/about-zigchain/glossary)

## Zignaly

**Roles:** DISTRIBUTOR. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** eip155:56 (DOCUMENTED): Provider product documentation. zigchain-1 (UNCONFIRMED): No contract, WME object, or executable ZIGChain integration was found.

**Contract/API and integration surface:** Zignaly is modeled as a distribution provider. The API license agreement proves legal API terms exist, not that a suitable public integration API is available. Integration surface: Human-readable product and strategy-composition metadata only. Exchange API keys are outside the ZIGoals integration boundary. API/contracts: public human-readable product metadata; legal API agreement exists; no suitable documented product API or ZIGChain contract found

**Risk and security:** No stable public Z-Index/strategy metadata API schema or identifiers were verified. No WME or ZIGChain deployment relationship was established. Hosted custody, withdrawal, liquidity, KYC, and regional restrictions apply. A stable provider URL for 2026 incident notices was not recovered, so no incident conclusion is used.

**Eligibility/KYC/jurisdiction:** KYC is mandatory to deposit and invest. The current restricted-residence list includes Canada, the United States, Cuba, Iran, North Korea, Myanmar, Syria, Venezuela, and named occupied regions.

**Potential ZIGoals use / phase:** Reference external product/distribution metadata after stable identifiers and terms are supplied; do not connect trading keys or execute allocations. FUTURE_GATED.

**Primary sources:** [Zignaly Z-Indexes](https://zignaly.com/z-indexes); [How Z-Indexes Work](https://zignaly.com/z-indexes/basics/how-z-indexes-work); [Understanding Z-Indexes Services Composition](https://help.zignaly.com/en/articles/13731033-understanding-z-indexes-services-composition); [Zignaly Wealth Manager FAQ](https://help.zignaly.com/en/articles/6885234-faq-s-for-wealth-managers); [Zignaly API License Agreement](https://zignaly.com/legal/api-agreement/); [Zignaly KYC Guide](https://help.zignaly.com/en/articles/9044409-kyc-how-to-verify-your-account); [Zignaly Legal](https://zignaly.com/legal)

## ZIGChain Wealth Management Engine (WME)

**Roles:** ECOSYSTEM_TOOL. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (ANNOUNCED): WME is described as ZIGChain infrastructure; no public deployed interface was verified. zig-test-2 (UNCONFIRMED): No public testnet deployment or example was found.

**Contract/API and integration surface:** General token-factory and IBC SDK examples do not establish a WME API. Remain non-executable until official schemas and testnet evidence are published and verified. Integration surface: Architecture boundary for a future WMEAdapter only. API/contracts: no public ABI, protobuf/service definition, contract address, message schema, SDK method, or example flow found

**Risk and security:** Implementation documentation explicitly remains in preparation. No public authorization, custody, strategy-object, amount, lifecycle, or failure semantics were found. Public repository absence does not prove a private or forthcoming interface does not exist.

**Eligibility/KYC/jurisdiction:** No WME-specific eligibility, KYC, or jurisdiction interface was found.

**Potential ZIGoals use / phase:** Reserve an adapter boundary and descriptor type without inventing a protocol interface. FUTURE_GATED.

**Primary sources:** [ZIGChain Wealth Management Engine](https://docs.zigchain.com/wealth-management-engine/); [ZIGChain Glossary](https://docs.zigchain.com/about-zigchain/glossary); [ZIGChain JavaScript SDK Introduction](https://docs.zigchain.com/v2/builders/js-sdk/introduction); [ZIGChain GitHub organization](https://github.com/ZIGChain); [ZIGChain Examples](https://github.com/ZIGChain/zigchain-examples)

## Zamanat

**Roles:** CURATOR, DISTRIBUTOR, ECOSYSTEM_TOOL. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (ANNOUNCED): ZM1 launch announced for ZIGChain; on-chain issuance not independently verified. Testnet unconfirmed.

**Contract/API and integration surface:** Zamanat sponsors; Truleum manages; Apex administers. USD 100 million is a target, not verified assets raised. Integration surface: Product metadata and sponsor provenance; subscription integration requires the fund manager and final terms. API/contracts: No canonical ZM1 contract, ABI or subscription API identified in the inspected release.

**Risk and security:** Private-credit losses, illiquidity and fund/token legal mapping need product diligence.

**Eligibility/KYC/jurisdiction:** ZM1: Professional Clients, limited DIFC distribution, whitelist; not offered for onshore UAE transactions. Explicitly not an Islamic Fund or marketed as Shariah-compliant.

**Potential ZIGoals use / phase:** Keep sponsor, fund manager and administrator separate in product records. FUTURE_GATED.

**Primary sources:** [Zamanat platform](https://www.zamanathq.com/); [Zamanat launches tokenized private credit fund](https://www.zamanathq.com/news/zamanat-fund-launch)

## DeFa / InvoiceMate

**Roles:** ORIGINATOR, LENDING, CURATOR. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (UNCONFIRMED): Provider claims limited-access invoice pools live on ZIGChain private mainnet; independent deployment verification and testnet remain unconfirmed.

**Contract/API and integration surface:** The inspected page contains overlapping product descriptions and tenors; no marketing terms were promoted to canonical execution parameters. Integration surface: Origination and pool metadata candidate, pending an authenticated product specification. API/contracts: Site describes USDC deposits and DLP receipts; Docs and Audit links are marked Coming Soon. No canonical pool address/schema identified.

**Risk and security:** Page markets insurance/protection; coverage, exclusions and recoveries were not independently verified. Invoice defaults, servicing, lockups and loss allocation require explicit terms.

**Eligibility/KYC/jurisdiction:** Investor access is by application; investor KYC and jurisdiction terms remain unconfirmed. Borrower onboarding is distinct from investor eligibility.

**Potential ZIGoals use / phase:** Display provenance of underlying receivables and manager; no yield forecast from marketing rates. FUTURE_GATED.

**Primary sources:** [DeFa by InvoiceMate](https://imdefa.com/); [DeFa: first pools now live on ZIGChain](https://www.linkedin.com/posts/defaprimitive_our-first-pools-are-now-live-on-zigchain-activity-7445092712699277312-hA9E); [InvoiceMate](https://invoicemate.net/)

## Beehive

**Roles:** ORIGINATOR, LENDING, SERVICING. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (ANNOUNCED): ZIGChain partnership explores programmable GCC private credit. A deployed ZIG product and testnet are unconfirmed.

**Contract/API and integration surface:** Business-investor financing is direct; provider says it does not select businesses for investors. Do not assume a pooled curator role. Integration surface: Originator/servicing evidence and future product eligibility; existing marketplace is not a verified ZIG vault. API/contracts: No public ZIG contract or execution schema identified in inspected provider pages.

**Risk and security:** Provider warns of borrower default, capital loss and delays; transfer/sale of financing is not guaranteed.

**Eligibility/KYC/jurisdiction:** Investor application and local restrictions apply. Islamic Window, Murabaha and Shariyah Review Bureau oversight are provider-attributed claims; no new ZIG product certification was verified.

**Potential ZIGoals use / phase:** Attach originator and servicing disclosures to a separately verified future product. FUTURE_GATED.

**Primary sources:** [Beehive: partnership with ZIGChain](https://www.linkedin.com/posts/beehivefintech_smes-we-hear-you-access-to-funding-should-activity-7452647245906255872-JBo9); [Beehive](https://www.beehive.ae/); [Beehive investors](https://www.beehive.ae/investors); [Beehive Islamic finance](https://www.beehive.ae/islamic-finance)

## Ondo Finance

**Roles:** ORIGINATOR, DISTRIBUTOR. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (ANNOUNCED): Ondo Stocks docs list Ethereum, BNB Chain and Solana. ZIGChain announces integration; direct ZIG deployment and testnet are unconfirmed.

**Contract/API and integration surface:** A ZIGChain integration announcement does not override Ondo product eligibility or prove native CosmWasm execution. Integration surface: Metadata/price integration only after access and terms review; ecosystem wrapper must be verified separately. API/contracts: Published REST OpenAPI and gRPC schema; whitelisted mint/redemption flow. API access requires onboarding. No ZIG address found in inspected canonical directory.

**Risk and security:** Underlying market risk, custody, issuer rights and trading/redemption windows are product-specific. Do not treat stock exposure as cash yield.

**Eligibility/KYC/jurisdiction:** Ondo Stocks prohibits US persons and specified jurisdictions including Canada; EEA/UK issuance requires professional/qualified status. Other product rules differ; KYC and complete current list govern.

**Potential ZIGoals use / phase:** Underlying-asset reference for a verified ZIG distributor; distinct product, issuer and wrapper records. FUTURE_GATED.

**Primary sources:** [ZIGChain: Ondo integration](https://www.linkedin.com/posts/zigchain_ondo-finance-did-the-hard-work-of-bringing-activity-7470083640316747776-QfeJ); [Ondo Stocks API overview](https://docs.ondo.finance/api-reference/overview); [Ondo smart contract addresses](https://docs.ondo.finance/addresses); [Ondo Stocks eligibility](https://docs.ondo.finance/ondo-stocks/eligibility); [Ondo Stocks](https://ondo.finance/ondo-stocks)

## Taurus

**Roles:** CUSTODY, ECOSYSTEM_TOOL. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (DOCUMENTED): Taurus-PROTECT announces native ZIG custody; mainnet network list includes ZIG. ZIG testnet support not established by inspected list.

**Contract/API and integration surface:** Published support is a vendor statement; no custody account, API call or transaction was performed. Integration surface: Institutional custody/issuance infrastructure metadata; client-tenant integration would be a separate project. API/contracts: Taurus-CAPITAL documents Zigchain TokenFactory support. Public support tables do not establish a ZIGoals client API entitlement or arbitrary vault support.

**Risk and security:** Custody permissions, operational controls and supported transaction types require tenant-specific verification.

**Eligibility/KYC/jurisdiction:** Announcement targets banks, financial institutions and professional investors; ZIGoals eligibility and onboarding are unconfirmed.

**Potential ZIGoals use / phase:** Custodian provenance when a specific product names Taurus; custody itself is not a yield source. FUTURE_GATED.

**Primary sources:** [Taurus integrates ZIGChain](https://www.taurushq.com/stories/taurus-integrates-zigchain-to-expand-digital-asset-wealth-generation-opportunities-for-financial-institutions/); [Taurus supported networks](https://docs.taurushq.com/protect-capital/docs/supported-networks); [Taurus supported assets and tokenisation](https://docs.taurushq.com/protect-capital/docs/supported-assets-stablecoins-and-tokenisation)

## Apex Group

**Roles:** SERVICING. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (ANNOUNCED): ZIGChain alliance announced; Apex named ZM1 administrator. A chain-native product API and testnet remain unconfirmed.

**Contract/API and integration surface:** Alliance participants and Tokeny technology do not establish a compatible ZIG execution ABI. Integration surface: Administrator and servicing provenance for explicitly identified funds. API/contracts: Public fund-service and portal descriptions found; no canonical ZIG vault contract or open product API established.

**Risk and security:** NAV, reconciliations, investor register and reporting responsibilities require a product-specific service agreement.

**Eligibility/KYC/jurisdiction:** Institutional service engagement is distinct from fund-investor eligibility; ZM1 terms govern that fund.

**Potential ZIGoals use / phase:** Named administrator metadata, never an inferred common vault spanning ecosystem partners. FUTURE_GATED.

**Primary sources:** [Zamanat launches tokenized private credit fund](https://www.zamanathq.com/news/zamanat-fund-launch); [Apex Group](https://www.apexgroup.com/); [ZIGChain-issued Apex alliance release](https://www.globenewswire.com/news-release/2025/07/25/3121771/0/en/Apex-Group-and-ZIGChain-Forge-Strategic-Alliance-to-Launch-Tokenized-Fund-Infrastructure.html)

## Noble

**Roles:** FUNDING_RAIL. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (LIVE_READ_VERIFIED): Documented zigchain-1 channel-3 to noble-1 channel-175, and zig-test-2 channel-44 to grand-1 channel-704; both ZIG-side channels observed OPEN. Circle announces Noble USDC/CCTP sunset; current open IBC state does not remove issuer dependency. zig-test-2 (LIVE_READ_VERIFIED): Documented zigchain-1 channel-3 to noble-1 channel-175, and zig-test-2 channel-44 to grand-1 channel-704; both ZIG-side channels observed OPEN. Circle announces Noble USDC/CCTP sunset; current open IBC state does not remove issuer dependency.

**Contract/API and integration surface:** Do not present the historical native-USDC support page as assurance of continuing availability after the issuer sunset. Testnet asset mapping was not verified. Integration surface: Funding-route research only; exclude from an enabled new USDC route until sunset/replacement design is resolved. API/contracts: IBC channel query works. Official registry identifies Noble USDC; denomination-trace RPC verification was unavailable (HTTP 501).

**Risk and security:** New Circle Mint minting ends 2026-10-13. Noble USDC/CCTP pause is scheduled for 2027-01-12; Noble receives no CCTP V2. Relayers, client freshness, issuer controls and destination receipt remain unverified.

**Eligibility/KYC/jurisdiction:** Circle Mint and APIs support native Noble USDC, not arbitrary IBC vouchers. Product onboarding and compliance still apply.

**Potential ZIGoals use / phase:** Document source asset and verified destination arrival separately from goal allocation; no automatic investment. FUTURE_GATED.

**Primary sources:** [Circle: USDC on Noble and IBC](https://help.circle.com/support/en/a-closer-look-at-usdc-on-noble-and-the-ibc-protocol?id=kb_article_view&sysparm_article=KB0010582); [Circle discontinues Noble USDC and CCTP V1](https://www.circle.com/blog/circle-is-discontinuing-support-for-usdc-and-cctp-v1-on-noble); [Circle Mint supported chains and currencies](https://developers.circle.com/circle-mint/supported-chains-and-currencies); [ZIGChain IBC channel list](https://docs.zigchain.com/integration-guides/ibc-channel-list); [ZIGChain mainnet API nodes](https://raw.githubusercontent.com/ZIGChain/networks/main/zigchain-1/api-nodes.txt); [ZIGChain testnet API nodes](https://raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/api-nodes.txt); [ZIGChain Noble USDC asset metadata](https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/usdc.mainnet.json); [ZIG-side live IBC channel state](https://public-zigchain-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-3/ports/transfer); [ZIG-side live IBC channel state](https://public-zigchain-testnet-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-44/ports/transfer)

## Axelar

**Roles:** BRIDGE, FUNDING_RAIL. **Registry status:** RESEARCHED; PRIMARY_SOURCES_REVIEWED. **Last verified:** 2026-09-13.

**Network:** zigchain-1 (LIVE_READ_VERIFIED): Canonical configs match mainnet zigchain-1 channel-1/182 and testnet zig-test-2 channel-0/612; both ZIG-side channels observed OPEN. zig-test-2 (LIVE_READ_VERIFIED): Canonical configs match mainnet zigchain-1 channel-1/182 and testnet zig-test-2 channel-0/612; both ZIG-side channels observed OPEN.

**Contract/API and integration surface:** Testnet config key zigchain-3 maps externalChainId zig-test-2. Never use the config key as the wallet network id. Registry and Axelar config agree on ZIG.axl metadata; direct denom-trace RPC returned HTTP 501. Integration surface: Separate FundingRoute for a verified source-to-destination asset path; no strategy classification. API/contracts: Public typed config maps unit-zig and its Ethereum/Sepolia origins. Bridge execution and native conversion were not tested.

**Risk and security:** Axelar documents validator security and gateway rate limits; current deployed route security and receipt handling remain unverified. 18-decimal ZIG.axl is not interchangeable with native gas denomination without a verified conversion.

**Eligibility/KYC/jurisdiction:** No provider account/eligibility flow tested; source venue and route restrictions remain product-specific and unconfirmed.

**Potential ZIGoals use / phase:** Describe money arrival and gas needs before a separate goal action; no auto-bridge or auto-invest. FUTURE_GATED.

**Primary sources:** [Axelar static configs](https://docs.axelar.dev/resources/static-configs/static-configs/); [Axelar security overview](https://docs.axelar.dev/learn/security/); [ZIGChain IBC channel list](https://docs.zigchain.com/integration-guides/ibc-channel-list); [ZIGChain mainnet API nodes](https://raw.githubusercontent.com/ZIGChain/networks/main/zigchain-1/api-nodes.txt); [ZIGChain testnet API nodes](https://raw.githubusercontent.com/ZIGChain/networks/main/zig-test-2/api-nodes.txt); [ZIGChain ZIG (Axelar) asset metadata](https://raw.githubusercontent.com/ZIGChain/zigchain-registry/main/assets/ibc/zig-axl.mainnet.json); [Axelar mainnet configuration](https://axelar-mainnet.s3.us-east-2.amazonaws.com/configs/mainnet-config-1.x.json); [Axelar testnet configuration](https://axelar-testnet.s3.us-east-2.amazonaws.com/configs/testnet-config-1.x.json); [ZIG-side live IBC channel state](https://public-zigchain-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-1/ports/transfer); [ZIG-side live IBC channel state](https://public-zigchain-testnet-lcd.numia.xyz/ibc/core/channel/v1/channels/channel-0/ports/transfer)

## Range

**Roles:** EXPLORER, ECOSYSTEM_TOOL. **Registry status:** INTEGRATED; READ_ONLY_ROUTES_VERIFIED. **Last verified:** 2026-09-13.

**Network:** zig-test-2 (DOCUMENTED): Official testnet homepage only. Detail routes and public API schemas unconfirmed; browser policy verification unavailable. No portfolio or full-history integration.

**Contract/API and integration surface:** Official testnet homepage only. Detail routes and public API schemas unconfirmed; browser policy verification unavailable. No portfolio or full-history integration.

**Risk and security:** Third-party service availability and accuracy; opening an explorer does not prove inclusion.

**Eligibility/KYC/jurisdiction:** No wallet/account required by ZIGoals for these links.

**Potential ZIGoals use / phase:** Public information and onchain verification navigation only. READ_ONLY.

**Primary sources:** [Official ZIGChain block explorers](https://docs.zigchain.com/users/tools/block-explorers)

## ZIGScan

**Roles:** EXPLORER. **Registry status:** INTEGRATED; READ_ONLY_ROUTES_VERIFIED. **Last verified:** 2026-09-13.

**Network:** zig-test-2 (DOCUMENTED): Public source confirms tx/account/contract route shapes; homepage emits block links. Asset route unconfirmed. Link navigation is not receipt verification.

**Contract/API and integration surface:** Public source confirms tx/account/contract route shapes; homepage emits block links. Asset route unconfirmed. Link navigation is not receipt verification.

**Risk and security:** Third-party service availability and accuracy; opening an explorer does not prove inclusion.

**Eligibility/KYC/jurisdiction:** No wallet/account required by ZIGoals for these links.

**Potential ZIGoals use / phase:** Public information and onchain verification navigation only. READ_ONLY.

**Primary sources:** [Official ZIGChain block explorers](https://docs.zigchain.com/users/tools/block-explorers)

## ZIGChain Hub

**Roles:** ECOSYSTEM_TOOL. **Registry status:** INTEGRATED; READ_ONLY_ROUTES_VERIFIED. **Last verified:** 2026-09-13.

**Network:** external-network-selection (DOCUMENTED): Canonical overview/validators/governance/staking/bridge information links only. Hub may retain its own network and offers financial actions; no automatic wallet connection or routing. Direct HTTP access returned403; routes verified in official docs.

**Contract/API and integration surface:** Canonical overview/validators/governance/staking/bridge information links only. Hub may retain its own network and offers financial actions; no automatic wallet connection or routing. Direct HTTP access returned403; routes verified in official docs.

**Risk and security:** Verify the network in Hub; ZIGoals does not perform staking, voting or bridging.

**Eligibility/KYC/jurisdiction:** No wallet/account required by ZIGoals for these links.

**Potential ZIGoals use / phase:** Public information and onchain verification navigation only. READ_ONLY.

**Primary sources:** [Official ZIGChain block explorers](https://docs.zigchain.com/users/tools/block-explorers)

## Detailed evidence and unresolved gates

- [Protocol evidence](M2_PROTOCOL_EVIDENCE.md) and [structured protocol records](M2_PROTOCOL_EVIDENCE.json): exact published addresses, API/source leads, audits and remaining execution gates.
- [Infrastructure evidence](M2_INFRASTRUCTURE_EVIDENCE.md) and [structured infrastructure records](M2_INFRASTRUCTURE_EVIDENCE.json): exact channels/assets/decimals, observed responses, product eligibility and issuer lifecycle.
- [Explorer/Hub route evidence](M2_EXPLORER_EVIDENCE.md): exact observed route shapes, browser/HTTP limits and network scope.

PermaPod incident/remediation provenance is unresolved: a non-primary alert was investigated but no primary postmortem or deployment-to-remediation mapping was found. This does not prove absence of an incident, that affected code remains deployed, or that remediation succeeded. A fresh current-contract security review is mandatory. Nawa certification remains attributed provider claims, with no independently established current ZIGChain certificate or deployment. Valdora’s already-sent schema request should not be duplicated. WME remains architecture only.

These sources do not establish universal retail eligibility, guaranteed yield or a single RWA pipeline connecting all named firms. Unknown claims remain explicit, and no lifecycle/status can enable an investment integration.

## ZIGChain EVM execution lane

**Status:** `RESEARCH_ONLY / FUTURE_GATED / NOT_EXECUTION_READY`. **Last verified:** 2026-09-17.

ZIGChain v5's 18-decimal `azig` design explicitly references Cosmos/EVM/IBC alignment, and the Token Wrapper already documents Ethereum/Axelar/native-ZIG funding semantics. However, no canonical public ZIGChain EVM JSON-RPC, EVM chain ID, wallet configuration, address mapping, gas model or public EVM testnet deployment flow was verified.

Future ZIGoals design keeps one deterministic VM-agnostic Goal Engine with separate `CosmosExecutionAdapter`, `EvmExecutionAdapter` and `FundingRoute` boundaries. Potential ERC-20/EVM/cross-chain goal funding remains research only.

Hard gates include official network/RPC/wallet identity, amount/decimal/gas rules, receipt/finality/error semantics, allowance/revocation behavior, bridge recovery, exact deployed contract provenance, security review, testnet availability and end-to-end receipts.

No signing, approvals, routing, bridge, swap, custody or contract-deployment authority is granted. Idle remains the only executable strategy.
