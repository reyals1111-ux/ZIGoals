# Milestone 2 protocol evidence

Last verified: **2026-09-13 UTC**
Research boundary: public, primary provider, chain, repository, auditor, and regulator sources. No transaction, faucet use, wallet connection, credential use, or outreach was performed.

## Status vocabulary

- **Verified live read** means the cited primary page or ZIGChain LCD response was read on the date above. It does not approve execution.
- **Claim** means the provider makes the statement, but an independent primary source or deployment mapping was not found.
- **Announced** means a capability is described without a public executable interface.
- **Unconfirmed** means the public evidence was insufficient to establish the fact.

Every provider below remains execution-gated. `Idle` is the only executable Milestone 2 adapter.

## Decision table

| Provider | Evidence-backed role | Network availability | Public integration surface | Milestone 2 disposition |
|---|---|---|---|---|
| Valdora | `LIQUID_STAKING`, `VAULT`, `DISTRIBUTOR` | Mainnet and testnet contracts verified | Addresses and product behavior; no canonical messages/source-to-code mapping | Architecture only; await the already-requested canonical schemas |
| OroSwap | `DEX`, `LIQUIDITY_ROUTER` | Mainnet and testnet router/factory deployments verified | Public router source, execute and simulation messages, deployment manifests | Read-only quote/route design only; no trading or fund movement |
| PermaPod | `LENDING`, `ECOSYSTEM_TOOL` | Mainnet contracts and partial testnet config verified | Public read-only query client; no public core-contract repository | Read-only research only; incident/remediation provenance blocks execution |
| Nawa | `VAULT`, `CURATOR` | ZIGChain products claimed; executable deployment unconfirmed | Website product information; no public current schema or repository | Metadata/policy research only |
| ZIG Markets | `CURATOR`, `DISTRIBUTOR` | Web service; ZIGChain vault relationships documented | Website and legal terms mention infrastructure/APIs; no public API docs | Attribution metadata only |
| Zignaly | `DISTRIBUTOR` | Hosted service; no ZIGChain deployment established | Public product/help metadata and a legal API license; no suitable public integration API | Metadata only |
| WME | `ECOSYSTEM_TOOL` | ZIGChain concept documented; deployed interface unconfirmed | Architecture description only; docs state implementation content is being prepared | `WMEAdapter` boundary only |

## Valdora

**Verified live read.** Valdora publishes mainnet vault and liquid-staking addresses plus testnet liquid-staking addresses. The official ZIGChain LCD returned contract metadata for the mainnet staker (`code_id` 39), testnet staker (`code_id` 1062), and mainnet Stablecoin Yield vault (`code_id` 146). The published stZIG lifecycle is deposit ZIG, receive stZIG, and later redeem by burning stZIG and waiting for the underlying unbonding/claim flow. Valdora documents a normal wait of about 21 days plus a distribution window and distinguishes that flow from selling stZIG on a DEX.

**Verified live read.** Published contracts include:

- mainnet staker: `zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55`
- mainnet stZIG token: `zig109f7g2rzl2aqee7z6gffn8kfe9cpqx0mjkk7ethmx8m2hq4xpe9snmaam2`
- mainnet Stablecoin Yield vault: `zig1h3au5n3lsyqm32ydz3usgy7r9z7wpx4gttcxmypfecz29adtu64svluenp`
- mainnet Quant vault: `zig17vuryz6f9ndyzh4f72r8s48wgqxx5p6047flwc3urvna0f06swgqa77qp2`
- mainnet Opportunistic Credit vault: `zig1mayx7wkzensav40j3qc8c5lh6s884jlhsu0c0js058t4u9xcg0mql58gkq`
- mainnet SpaceX vault: `zig1626xrgk3qrphu3gs8dh2eewjchsjtzf2epdw3675qp4g66n7zr4sqsaks9`
- mainnet Core Income vault: `zig1m526fltgrf70qdsufx9k9fdl4x07usjlydcn32jn83fs6za9c5cswd9grk`
- testnet staker: `zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69`
- testnet stZIG token: `zig18dgnfnv0sxjn4r9wtfj2zhvfewy2tk69m9j5zlhy3xgmahcgf20s6anrnr`

**Claim.** Valdora says its contracts were audited by OAK Security and protected by multisig and circuit breakers. No linked report with scope, commit, findings, or deployed-code mapping was available on the public security page, so this is not current deployment assurance.

**Unconfirmed.** No canonical `ExecuteMsg`/`QueryMsg`, public source repository tied to the deployed code IDs/checksums, precise amount units and rounding rules, complete fee representation, delayed redemption state machine, or transaction receipt semantics were found. Eligibility, KYC, and jurisdiction rules were also not found in the reviewed public documentation. The owner already emailed the requested canonical schemas; no further outreach is required.

**ZIGoals use and gate.** Model liquid staking and vault products as non-executable descriptors. Do not infer that Valdora, ZIG Markets, an asset originator, custodian, or servicer share one vault role. A future adapter needs the canonical schemas, checksum/version pinning, integer amount units, rounding and fee rules, delayed claim states, eligibility rules, and testnet evidence before review.

Primary sources:

- [Valdora smart contracts](https://docs.valdora.finance/smart-contracts) — published network addresses.
- [Liquid-staking architecture](https://docs.valdora.finance/liquid-staking/architecture) — stZIG exchange-ratio model.
- [Unstaking and redemption](https://docs.valdora.finance/liquid-staking/unstaking-and-redemption) — burn, queue, and claim lifecycle.
- [Valdora FAQs](https://docs.valdora.finance/faqs) — minimums, redemption timing, cancellation, and general risk descriptions.
- [Economics and incentives](https://docs.valdora.finance/economics-and-incentives) — provider fee and liquidity claims.
- [Security](https://docs.valdora.finance/security) — provider security claims only.
- [Vault introduction](https://docs.valdora.finance/vaults/introduction) — vault deposit/deployment/redemption model.
- [Stablecoin Yield vault](https://docs.valdora.finance/vaults/stablecoin-yield-vault) — product details and explicit ZIG Markets curator attribution.
- [Opportunistic Credit vault](https://docs.valdora.finance/vaults/opportunistic-credit-vault) — product details and explicit ZIG Markets curator attribution.
- [Mainnet staker LCD record](https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig18nnde5tpn76xj3wm53n0tmuf3q06nruj3p6kdemcllzxqwzkpqzqk7ue55) — live contract metadata.
- [Testnet staker LCD record](https://testnet-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig19a8klywtvkfvh03sdna4vd4h8dq6yp9vyjh2u4skuwft95ejtpuq6lqy69) — live contract metadata.

## OroSwap

**Verified live read.** OroSwap publishes source for its CosmWasm router and factory plus mainnet and testnet deployment manifests. The router exposes `execute_swap_operations` with ordered operations, `minimum_receive`, recipient, and `max_spread`; it also exposes `simulate_swap_operations` for a proposed offer amount and route. The public deployment manifests publish router and factory addresses. The official ZIGChain LCD returned live contract records for the mainnet router (`code_id` 14) and testnet router (`code_id` 562).

Published deployments:

- mainnet factory: `zig1xx3aupmgv3ce537c0yce8zzd3sz567syaltr2tdehu3y803yz6gsc6tz85`
- mainnet router: `zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy`
- testnet factory: `zig17a7mlm84taqmd3enrpcxhrwzclj9pga8efz83vrswnnywr8tv26s7mpq30`
- testnet router: `zig1g00t6pxg3xn7vk0vt29zu9vztm3wsq5t5wegutlg94uddju0yr5sye3r3a`

**Verified live read.** Halborn audited a 2025 snapshot of the public contracts. Its report records 19 findings, including one medium and five low findings marked solved. An acknowledged informational finding documents a small formula difference from Uniswap V2 fee treatment. This makes generic constant-product quote math unsuitable as canonical OroSwap quoting evidence. The repository and deployment state have changed since the assessed commits, so the historical audit does not establish current deployed-code assurance.

**Unconfirmed.** The deployment manifest labels the mainnet `chain_id` as `zig-mainnet-1`, while current official ZIGChain chain information uses `zigchain-1`. Treat the manifest field as stale metadata and rely on the LCD network/address response for live existence. Exact simulation response semantics, pair selection, decimals, fees, price-impact calculation, quote freshness/deadline behavior, native versus CW20 funding paths, and current deployed checksum-to-source mapping still need to be pinned and tested.

**ZIGoals use and gate.** Scope OroSwap to a future `SwapAdapter`/`LiquidityRouter` for read-only route discovery and canonical simulation. There is no trading UX and no fund-moving execution. Any later testnet gate must enforce an asset/pair allowlist, canonical simulation, `minimum_receive`, `max_spread`, integer units, rounding, fee disclosure, quote freshness, failure classification, receipt verification, and the documented CW20 response-data caveat.

Primary sources:

- [OroSwap](https://www.oroswap.org/) — provider product and mainnet claims.
- [OroSwap documentation](https://docs.oroswap.org/) — provider documentation root.
- [Router contract source and README](https://github.com/oroswap/oroswap-core/tree/main/contracts/router) — execute and simulation surfaces.
- [Deployment repository](https://github.com/oroswap/oroswap-deployments) — provider deployment records.
- [Mainnet deployment manifest](https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/mainnet.json) — mainnet addresses and recorded chain metadata.
- [Testnet deployment manifest](https://github.com/oroswap/oroswap-deployments/blob/main/zigchain/testnet.json) — testnet addresses.
- [OroSwap swap guide](https://docs.oroswap.org/docs/getting-started/swap/) — provider UI slippage and price-impact description.
- [OroSwap FAQ](https://docs.oroswap.org/docs/oroswap_faq/) — provider non-custodial, KYC, and regional restriction claims.
- [Halborn CosmWasm audit](https://www.halborn.com/audits/oroswap/cosmwasm-contracts-632648) — assessed commits, scope, findings, and status.
- [Mainnet router LCD record](https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig10jc4vr9vfq0ykkmfvfgz430w8z6hwdlqhmjdy9jypts8wfrrwnnqvp8sgy) — live contract metadata.
- [Testnet router LCD record](https://testnet-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig1g00t6pxg3xn7vk0vt29zu9vztm3wsq5t5wegutlg94uddju0yr5sye3r3a) — live contract metadata.

## PermaPod

**Verified live read.** PermaPod publishes a read-only query client that directly queries configured CosmWasm contracts for protocol status, rates, wallet health, rewards, and vault configuration. Its current mainnet configuration names ZIGChain `zigchain-1` and publishes address-provider, Red Bank, oracle, parameters, incentives, health, credit-manager, account-NFT, rewards-collector, and zapper addresses. Official LCD reads returned contract metadata for those addresses. The testnet configuration is partial: address provider, Red Bank, oracle, and credit manager are populated, while several other fields are empty.

Mainnet addresses in the public client include:

- address provider: `zig1jy2amze7fxcmessewv65jq5kupsxae2n96yech9g8d8rp5vnv74qxlddqk`
- Red Bank: `zig1s3frrzltqaxvuzffvxg89uuad6nkcyqe3ucvrahynznaek3mhe4s75puyu`
- oracle: `zig1nr48m8vv6kutnse3scxsg96pxmeyzj8hkn6rf9mstdtmmcn8h2tsm54kmz`
- parameters: `zig1ma6e2dgkuu62fc66rn4msrnv89tyws75jpzz5kkk5pn4uf2cat5quevjw0`
- incentives: `zig17etzyt9qu5dlga2d09ql34rcnkxgtwx544pp9reuqp9fmcp2lkjqdjf754`
- health: `zig172v7euptv09z2pvj2khntlzel2fq5pcpp9g7lxpc889hvp74mjmsa5ev2p`
- credit manager: `zig1jul327luptcp9vcl6x4ws9xh6c3seuzsmmzj8n6e6qqgdplrvnzsh4t3ky`
- account NFT: `zig1kpeynqhd0qlq5v2yg2chja0lcakqkzvmpdl4eq573sdnh6vh7dnspd5zv9`
- rewards collector: `zig1m6rezhkz28d2kk4ge25kcexzc244cses9a4d6jfqln26zqvzk80syqe6ke`
- zapper: `zig1s36zdllvn4fvxzlq4uvsm42stt5rqz6dqsmy2l3rdu3rqjvc90kqrvw0wj`

**Verified live read.** The public repository's `SECURITY_CHECK.md` is a self-check of the read-only client and explicitly addresses its lack of signing or transaction execution. It is not an audit of the lending contracts. Halborn's 2025 engagement is also narrower than its title suggests: its stated scope is the Oracle contract suite at named commits, not all currently deployed PermaPod contracts. The report recorded five findings, with four solved and one not applicable. It recommends further review after material changes.

**Unconfirmed incident blocker.** A non-primary protocol registry search result labels a 2026-08-29 PermaPod protocol-logic incident, but no provider postmortem, certifier notice, incident transaction list, affected component, remediation commit, or replacement deployment was found in the public primary sources. That alert is not treated as a verified incident fact. Equally, continued existence of the configured contracts does not prove that affected code remains deployed or that it was remediated. The public client repository predates the alert and cannot answer that question.

**ZIGoals use and gate.** A read-only monitoring/research descriptor may use the published query client after schema pinning. Lending, borrowing, collateral modification, leverage loops, and every fund-moving path remain disabled. Execution requires a provider-signed incident account or equivalent primary evidence, affected-contract identification, remediation provenance, deployed checksum-to-source mapping, a current full-protocol audit, and testnet behavior evidence.

Primary sources:

- [PermaPod GitHub organization](https://github.com/permapod-zigchain) — current public repository inventory.
- [PermaPod read-only skills repository](https://github.com/permapod-zigchain/permapod-skills) — supported query functions and no-signing boundary.
- [Current network and contract configuration](https://raw.githubusercontent.com/permapod-zigchain/permapod-skills/main/src/config.ts) — published mainnet and partial testnet addresses.
- [Client security self-check](https://raw.githubusercontent.com/permapod-zigchain/permapod-skills/main/SECURITY_CHECK.md) — scope-limited read-only client review.
- [Halborn PermaPod audit](https://www.halborn.com/audits/permapod/permapod-core-contracts-zigchain-54eb8c) — Oracle-only scope, commits, findings, and caveats.
- [Mainnet Red Bank LCD record](https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig1s3frrzltqaxvuzffvxg89uuad6nkcyqe3ucvrahynznaek3mhe4s75puyu) — live contract metadata.
- [Mainnet credit-manager LCD record](https://public-zigchain-lcd.numia.xyz/cosmwasm/wasm/v1/contract/zig1jul327luptcp9vcl6x4ws9xh6c3seuzsmmzj8n6e6qqgdplrvnzsh4t3ky) — live contract metadata.

Non-primary alert retained only as an unresolved research lead: [DefiLlama PermaPod page](https://defillama.com/protocol/permapod?events=false&fees=true&tvl=false).

## Nawa

**Claim.** Nawa's site describes structured onchain vaults, including ZIGChain products, and says its strategies are reviewed and certified by Amanie Advisors. It also claims Halborn and OAK Security audits. These statements are provider attribution only.

**Verified live read.** Nawa hosts two Halborn reports. Both concern EVM/CoreDAO vault code from 2025, not a mapped current ZIGChain deployment. The first report recorded 38 findings and its detailed matrix included a partially solved medium issue, one risk-accepted informational issue, and several acknowledged informational issues. The later diff review recorded five lower-severity findings marked addressed. Their referenced public repository is no longer visible in the current Nawa GitHub organization, preventing current source and deployment mapping.

**Unconfirmed.** No Amanie-hosted certificate, certificate identifier, scope, product list, validity period, or current certifier confirmation was found. No current ZIGChain contract address, ABI/schema, public source, code checksum, redemption/liquidity terms, capacity, eligibility/KYC policy, or jurisdiction list was verified. The site tiles alone do not establish a live executable ZIGChain product.

**ZIGoals use and gate.** Preserve Nawa's own certification statement as attributed metadata only: “Nawa states that Amanie Advisors reviewed/certified the strategies.” ZIGoals must make no independent Shariah or compliance determination. A future `GoalPolicy` may reference verified certification facts after certificate validation; vault execution remains disabled until current deployment, schema, liquidity, eligibility, and audit-to-code evidence exists.

Primary sources:

- [Nawa](https://www.nawa.finance/) — provider products, certification attribution, and audit claims.
- [Nawa GitHub organization](https://github.com/Nawa-Finance) — current public repository inventory.
- [Nawa Halborn audit 1](https://www.nawa.finance/audits/Nawa_Audit_1.pdf) — EVM/CoreDAO scope and detailed findings.
- [Nawa Halborn diff review](https://www.nawa.finance/audits/Nawa_Audit_2.pdf) — later EVM/CoreDAO remediation review.

## ZIG Markets

**Verified live read.** ZIG Markets describes itself as infrastructure for matching, structuring, compliance, and distribution of yield products. Its legal terms govern website, technology infrastructure, APIs, vault interfaces, and digital distribution, but the public site supplies no API base URL, authentication documentation, schema, SDK, or ZIGChain contract interface. Valdora explicitly names ZIG Markets as curator for certain documented vaults; that establishes curator attribution for those products, not ownership of the vault, underlying asset, custody, or servicing.

**Claim with partial regulator corroboration.** The site says Merritt Administrators Pty Ltd is a South African Category II financial-services provider under FSP 46517. An FSCA notice verifies the entity/number and records that a prior suspension was lifted effective 2022-07-27. A current live-register status, exact activity scope, and any crypto-asset authorization were not independently established from the reviewed regulator material.

**Verified live read.** The terms describe a restricted, sophisticated audience and say access may require KYC/AML, sanctions screening, local eligibility, and geoblocking. They state that regulated services may be supplied by licensed partners or entities.

**ZIGoals use and gate.** Use ZIG Markets only as `CURATOR`/`DISTRIBUTOR` attribution where a primary product source identifies it. Do not infer `ORIGINATOR`, `CUSTODY`, `SERVICING`, a shared vault, or a usable API. Execution remains disabled until a documented API or contract interface, access terms, schemas, product identifiers, and responsibility boundaries are supplied and verified.

Primary sources:

- [ZIG Markets](https://zigmarkets.com/) — provider role and license claims.
- [ZIG Markets terms and conditions](https://zigmarkets.com/legal/terms-and-conditions) — service scope, audience, eligibility, KYC/AML, sanctions, and partner boundaries.
- [FSCA FAIS Notice 93 of 2022](https://www.fsca.co.za/Notices/FSCA%20FAIS%20Notice%2093%20of%202022.pdf) — regulator notice lifting Merritt Administrators' suspension.
- [Valdora Stablecoin Yield vault](https://docs.valdora.finance/vaults/stablecoin-yield-vault) — explicit product-level curator attribution.
- [ZIGChain glossary](https://docs.zigchain.com/about-zigchain/glossary) — ecosystem description of ZIG Markets and WME.

## Zignaly

**Verified live read.** Zignaly's Z-Indexes are hosted, rules-based portfolio products. Public product/help pages expose human-readable performance, risk, allocation, strategy-composition, fee, and withdrawal information. Current product documentation says funding uses USDT on BNB Smart Chain and that backend systems allocate and rebalance; no ZIGChain contract or WME object is identified.

**Verified live read.** Zignaly publishes an API license agreement, but no public endpoint/schema discovered in this pass provides stable Z-Index or strategy metadata suitable for ZIGoals. Help-center references to API keys concern exchange trading access for wealth managers, not a public ZIGoals strategy/WME integration surface.

**Verified live read.** All accounts must complete KYC to deposit and invest. Zignaly's current KYC page publishes a restricted-residence list including Canada, the United States, Cuba, Iran, North Korea, Myanmar, Syria, Venezuela, and named occupied regions. Product availability remains subject to regional rules and platform liquidity.

**Unconfirmed.** A current official incident statement was not recovered through a stable provider URL during this pass, despite search-index references to 2026 account activity notices. No incident conclusion is used here. Current strategy identifiers, machine-readable API stability, service-level terms, custody flow, and a WME relationship remain unconfirmed.

**ZIGoals use and gate.** Treat Zignaly as `DISTRIBUTOR` metadata only. Do not connect exchange API keys, create trading capability, or infer WME integration. Any future integration needs a provider-documented product API, stable identifiers, authorization model, KYC/jurisdiction handling, liquidity and withdrawal semantics, incident resolution evidence where applicable, and clear custody/responsibility boundaries.

Primary sources:

- [Zignaly](https://zignaly.com/) — provider service overview.
- [Z-Indexes](https://zignaly.com/z-indexes) — product, funding, withdrawal, and metadata description.
- [How Z-Indexes work](https://zignaly.com/z-indexes/basics/how-z-indexes-work) — allocation, rebalancing, and oversight model.
- [Z-Indexes services composition](https://help.zignaly.com/en/articles/13731033-understanding-z-indexes-services-composition) — public human-readable allocations and strategy composition.
- [Wealth-manager FAQ](https://help.zignaly.com/en/articles/6885234-faq-s-for-wealth-managers) — exchange API-key context.
- [Zignaly API license agreement](https://zignaly.com/legal/api-agreement/) — legal existence of an API without a discovered usable schema.
- [Zignaly KYC guide](https://help.zignaly.com/en/articles/9044409-kyc-how-to-verify-your-account) — mandatory KYC and current restricted-residence list.
- [Zignaly legal page](https://zignaly.com/legal) — provider entity and regulatory claims.

## ZIGChain Wealth Management Engine (WME)

**Announced.** ZIGChain describes WME as modular infrastructure for delegated investment management and as a liquidity layer intended to simplify DeFi access. The dedicated documentation page says its implementation content is being prepared.

**Verified live read.** The public ZIGChain GitHub organization and examples repository expose token-factory and IBC examples but no WME ABI, protobuf/service definition, contract addresses, message schemas, SDK methods, example flow, or deployment registry. General ZIGChain SDK documentation does not fill that gap. Public absence does not prove that no private or forthcoming interface exists.

**ZIGoals use and gate.** Preserve a `WMEAdapter` architecture boundary only. Do not invent a contract, API, account model, or strategy object. WME remains non-executable until official schemas, deployment/network identifiers, authorization and custody semantics, integer amount rules, lifecycle states, failure behavior, and testnet evidence are public and verified.

Primary sources:

- [ZIGChain WME documentation](https://docs.zigchain.com/wealth-management-engine/) — architecture description and explicit documentation-preparation status.
- [ZIGChain glossary](https://docs.zigchain.com/about-zigchain/glossary) — current ecosystem definitions.
- [ZIGChain JavaScript SDK introduction](https://docs.zigchain.com/v2/builders/js-sdk/introduction) — general SDK scope.
- [ZIGChain GitHub organization](https://github.com/ZIGChain) — current public repository inventory.
- [ZIGChain examples](https://github.com/ZIGChain/zigchain-examples) — current public example scope.

## Cross-provider implementation constraints

1. Provider records are evidence descriptors, not execution permission. Every non-Idle integration remains disabled.
2. A `FundingRoute` moves funds to an approved venue or network path; a `StrategyAdapter` expresses a strategy lifecycle. One must not silently stand in for the other.
3. RWA roles remain separate: `ORIGINATOR`, `CURATOR`, `DISTRIBUTOR`, `CUSTODY`, and `SERVICING` require independent evidence. None of the reviewed pages proves all five for one provider or one shared vault.
4. All financial amounts cross the application boundary as integer strings with explicit denomination/decimals. Quotes must identify fee, rounding, expiry/freshness, and minimum receive semantics.
5. A historical audit proves only the named scope and commit snapshot. It does not establish that current deployed code is identical, that later changes are safe, or that an incident was remediated.
6. Provider claims about certification, regulation, compliance, or security stay attributed unless the named certifier or regulator supplies current corroboration for the exact product and scope.
7. Noble/Axelar funding-route verification is a separate infrastructure research leg. No asset/channel/route conclusion is inferred from these provider sources.
