# Milestone 1 security checklist

This records implementation and local evidence, not an independent security audit or permission to accept real assets.

| Control | Evidence / status |
|---|---|
| Stored-owner authorization | Contract tests cover every mutation; no owner transfer or admin withdrawal |
| Native financial accounting | Uint128 checked arithmetic, exact single-coin deposits, liabilities, real bank rollback and surplus tests |
| Withdrawal availability | Pause blocks deposits; owner withdrawals and empty-goal closure remain available |
| Administrative scope | Optional pause admin only; no arbitrary messages, sweep or migrate entry point |
| Deployment immutability | Runbook requires no chain-level migration admin; frontend rejects an admin-bearing deployment |
| Public/private data | Rust schema excludes names, targets, dates and notes; private metadata stored separately by wallet/network |
| Metadata loss | Local browser flow withdraws after metadata removal; backup schema rejects malformed/version/network/owner mismatch |
| Financial precision | BigInt/Decimal, configurable denomination exponent, no floating-point token balances |
| Planning truthfulness | Funding Health uses zero return; projections/demo exchange rates explicitly illustrative |
| Network identity | Hard testnet-only configuration, fresh REST identity/denom verification and RPC identity check |
| Transaction freshness | Fee TTL, account/revision checks before signing and broadcast, one action at a time |
| Ambiguous delivery | No automatic retry; post-broadcast uncertainty warns funds may have moved |
| Keplr integration | Documented APIs implemented; real extension, account switch and onchain smoke test pending |
| Local UI safety | Distinct simulation labels, explicit action review, native modal and keyboard containment |
| Dependency exposure | Production dependency audit returned no known vulnerabilities on the execution date; this is not an exhaustive audit |
| CI permissions | Read-only token permissions, immutable GitHub Action references, no deployment or secrets required |
| Wasm validation | Binaryen-normalized artifact passed cosmwasm-check 2.2.2; Docker optimizer and live VM execution pending |
| External strategies | Valdora and WME deferred; no unverified financial execute/query messages |
| Existing production assets | Landing and Worker configuration retained; no production deployment |

Independent engine and contract code reviews passed. The final integration review approved all five Important and two Minor repairs, with 145 focused tests independently rerun. The parent verification passed 220 unit/component and 14 production-build browser cases. See ../verification/M1_RESULTS.json.

Remaining boundaries: browser storage is private by location, not encrypted against device compromise/XSS; backups need private storage. Public RPC responses are trusted transport inputs, not independently verified light-client proofs. Contract identity checks rely on the reviewed code ID/address configured by the operator; a deployment must separately verify its onchain checksum. Contracts can retain accidental direct transfers as unsweepable surplus. An immutable contract requires a new deployment for future upgrades. No assurance extends to private SDKs, unimplemented strategies, fiat, mainnet or production operations.


## Milestone 2 additions

| Control | Evidence / scope |
|---|---|
| Durable send boundary | Scoped version 1 IndexedDB journal; signed hash persisted before broadcast; blocked storage prevents submission |
| Receipt identity | TxRaw hash and decoded sender/contract/message/funds match the recorded operation; missing/mismatch stays uncertain |
| Recovery bounds | Bounded records/receipt passes/deadlines; aggregate event attributes and text bytes capped after review |
| Scope/corruption | Reconnect/account switch, valid+damaged history and original wallet outcomes covered in unit/browser tests |
| Verified public links | Fixed origin/route catalogue; strict identifiers/chain matching; Range detail and asset paths remain unavailable |
| Registry authority | Strict bounded sourced records; lifecycle does not enable execution; all external fund-moving capabilities disabled |
| Public research content | Internal owner/agent coordination excluded from shipped catalogue after task review; exact contract citations and review dates checked |
| Reproducibility | Clean isolated same-toolchain Wasm build equals M1 checksum; no Docker/hosted claim |
| Owner execution | Real Keplr and 18-step tiny testnet exit checklist prepared, all live outcomes still NOT RUN |

Exact final commands/results and independent review outcomes are in `../verification/M2_RESULTS.json` and `../RUN_2_REPORT.md`. Remaining trust in browser/device, public RPC transport and reviewed deployment configuration is unchanged. This is an implementation review, not a professional security audit.
