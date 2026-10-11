# ZIGChain ecosystem integration readiness — 2026-09-16

This is a dated evidence delta to `ZIGCHAIN_ECOSYSTEM_INTEGRATION_MAP.md`, not an
investment catalogue, endorsement, audit, partnership claim or execution
permission. Idle remains the only executable ZIGoals strategy.

## Readiness labels

- **VERIFIED_PRODUCT** — product/deployment facts are supported by primary sources.
- **LIVE_READ_VERIFIED** — an independently readable deployed contract was verified.
- **PARTIAL_INTERFACE** — useful public interface evidence exists, but execution prerequisites remain incomplete.
- **ATTRIBUTION_ONLY** — evidence supports role/product attribution only.
- **ARCHITECTURE_ONLY** — conceptual/platform evidence exists without a verified executable interface.
- **NOT_EXECUTION_READY** — ZIGoals must not move user funds through this surface.
- **UNVERIFIED_DEPLOYMENT** — no current executable ZIGChain deployment was verified.

No label grants signing, routing, investment or custody authority.

## Current matrix

| Surface | Evidence state | ZIGoals state | Remaining execution blockers |
| --- | --- | --- | --- |
| Valdora stZIG | LIVE_READ_VERIFIED mainnet/testnet contracts; published staker/token addresses and denom | NOT_EXECUTION_READY / FUTURE_GATED | Canonical execute/query schema; deployed checksum-to-source mapping; exact units/rounding/fees; redemption and later-claim receipts; current deployment-to-audit mapping |
| Valdora Core Income Vault | VERIFIED_PRODUCT; published mainnet contract and product terms | NOT_EXECUTION_READY / MAINNET_ONLY | No verified public testnet vault; canonical schema; checksum/source/audit mapping; eligibility; subscription/redemption receipt semantics; capacity/liquidity behavior |
| OroSwap | Existing Sep-13 evidence: public router source/deployments and live-read records; deployment repository re-observed Sep-16 | PARTIAL_INTERFACE / FUTURE_GATED | Current checksum-to-source mapping; fee/rounding/slippage/quote freshness semantics; exact simulation/receipt handling |
| PermaPod | Existing Sep-13 mainnet live-read evidence; partial testnet configuration | NOT_EXECUTION_READY / RESEARCH_ONLY | Primary incident/remediation mapping; current full-protocol audit coverage; deployed source mapping; complete testnet evidence |
| Nawa | Existing Sep-13 provider/product evidence; no verified current executable ZIGChain deployment | UNVERIFIED_DEPLOYMENT | Current ZIGChain contract/source/schema; liquidity/redemption/capacity terms; certification scope; eligibility |
| ZIG Markets | Product-specific curator/distributor attribution evidence | ATTRIBUTION_ONLY | No public executable API/schema; current responsibility, eligibility and regulatory scope must remain product-specific |
| ZIGChain WME | Official architecture exists; dedicated implementation documentation still says content is being prepared | ARCHITECTURE_ONLY / NOT_EXECUTION_READY | Public ABI/protobuf/service definition; deployment identifiers; authorization/custody model; integer amount rules; lifecycle/failure semantics; working testnet example |

## Valdora delta

Official Valdora documentation continues to publish:

- mainnet and `zig-test-2` liquid-staking staker/token contracts;
- the stZIG token-factory denom for both networks;
- the mainnet Core Income Vault contract;
- Core Income Vault product facts including ZIGChain deployment, USDC supply token,
  0% performance fee and redemption up to 120 days.

OAK Security's public CosmWasm audit index lists both a Valdora report and a
Valdora Vault Contract report. This improves security-evidence provenance but does
not establish that the currently deployed ZIGChain bytecode is identical to the
audited source. ZIGoals therefore does not upgrade Valdora to executable status.

## WME delta

ZIGChain continues to describe the Wealth Management Engine as modular delegated
investment infrastructure. The dedicated WME documentation still states that the
implementation section is being prepared for publication.

No public ABI, protobuf/service definition, contract address, message schema,
SDK method, working WME flow or verified `zig-test-2` deployment is treated as
available by ZIGoals. `WMEAdapter` remains an architecture boundary only.

## Freshness

Freshly rechecked on 2026-09-16:

- Valdora Smart Contracts
- Valdora Core Income Vault
- Valdora Security
- OAK Security CosmWasm audit index
- ZIGChain WME documentation
- OroSwap public deployment repository existence

PermaPod, Nawa and ZIG Markets detailed findings above are carried forward from
the 2026-09-13 primary-source review and are not represented as newly reverified
today.

## Primary sources

- https://docs.valdora.finance/smart-contracts
- https://docs.valdora.finance/vaults/core-income-vault
- https://docs.valdora.finance/security
- https://github.com/oak-security/audit-reports/blob/main/_tech_stacks/cosmwasm.md
- https://docs.zigchain.com/wealth-management-engine/
- https://docs.zigchain.com/about-zigchain/zigchain
- https://github.com/oroswap/oroswap-deployments

## Execution rule

Published addresses, product pages, audit reports or architecture descriptions
are insufficient by themselves to authorize fund movement.

Before any future external StrategyAdapter becomes executable, ZIGoals requires
an explicitly reviewed allowlist plus canonical message schemas, exact deployed
code provenance, amount/rounding/fee semantics, lifecycle and exit behavior,
receipt verification, current security evidence, eligibility constraints and
testnet proof.

Until those gates are satisfied, **Idle remains the only executable strategy**.
