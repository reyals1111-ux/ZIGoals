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
| Planning truthfulness | Funding Wealth uses zero return; projections/demo exchange rates explicitly illustrative |
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
| Scope/corruption | Reconnect/account switch, valid+damaged history and original wallet outcomes covered in unit/browser tests; full Chrome exit/relaunch and simultaneous corruption/network warnings verified |
| Verified public links | Fixed origin/route catalogue; strict identifiers/chain matching; Range detail and asset paths remain unavailable |
| Registry authority | Strict bounded sourced records; lifecycle does not enable execution; all external fund-moving capabilities disabled |
| Public research content | Internal owner/agent coordination excluded from shipped catalogue after task review; exact contract citations and review dates checked |
| Reproducibility | Clean isolated same-toolchain Wasm build equals M1 checksum; no Docker/hosted claim |
| Owner execution | Real Keplr and 18-step tiny testnet exit checklist prepared, all live outcomes still NOT RUN |

Exact final commands/results and independent review outcomes are in `../verification/M2_RESULTS.json` and `../RUN_2_REPORT.md`. Remaining trust in browser/device, public RPC transport and reviewed deployment configuration is unchanged. This is an implementation review, not a professional security audit.

## Milestone 3 current additions

- REAL OWNER PASS A–H covers actual Keplr connection/rejection/reconnect/retained-permission/revocation/stale-approval behavior. Manual account switch and real signing/action/restart-chain tests remain NOT RUN; no second wallet is required solely for testing.
- Deterministic multi-owner contract sequences check conservation, liabilities, full rollback, pagination and paused exits; engine properties include finite horizons and exact-money/month-end regressions with deliberate mutation checks.
- Participating same-origin tabs coordinate commits and refuse stale reviews; actual two-tab browser cases cover funds, metadata, journal and per-tab mode. Old/nonparticipating app versions are outside the lock guarantee.
- Future metadata/database versions and suspicious timestamps retain data; duplicate signed hashes cannot be owned by multiple journal operations. No receipt replay/indexer/reorg proof was added.
- Strict v2 public manifest plus actual code checksum/creator/admin/cw2/denom/version checks guards financial execution. Preparation remains unsigned and revalidates actual Wasm; structural manifest validation explicitly does not establish deployment.
- Separate read-only diagnostics show network status and safe build/account context. RPC trust, local-clock assumptions, abrupt-shutdown/eviction loss and first-terminal receipt behavior remain documented limitations.
- SECURITY.md, privacy notes, alpha guide and bug form use hello@zigoals.app and prohibit sharing secrets/private backups. Mainnet, external strategies and deployment remain disabled.
- CI checks PRs and main pushes and retains validated Linux build evidence. Current M3 totals, actual hosted result and cross-host comparison are recorded in STATUS and RUN_3_REPORT after verification; earlier sections above retain historical evidence.

## Milestone 4 historical additions

| Control | Evidence / remaining gate |
|---|---|
| Canonical release authority | Two fresh Linux jobs, actual bytes/source/environment verification; developer builds rejected by preparation; NOT_APPROVED |
| Keyless provenance | Main-only manual workflow with isolated official-action OIDC job; implemented, attestation NOT RUN |
| Public financial refusal | Explicit build policy checked through preparation/signing/broadcast independently of manifest shape |
| Production browser policy | Fresh dynamic nonce CSP, frame/object denial, no-referrer/nosniff/permissions/noindex/no-store; HTTPS HSTS; CSS inline exception documented |
| Untrusted RPC | Canonical bounded integer and field validation, owner/denom/idle/state checks, bounded monotonically increasing pages |
| Private diagnostics | Safe whitelist and clipboard fallback; no full address, balance, plan, backup or arbitrary endpoint error text |
| Egress and accessibility | Production browser tests and actual local workerd checks; private sentinels, small phone/keyboard/reduced-motion flows |
| Hosting isolation | zigoals-alpha package with no apex routes/paid bindings; PREPARED_NOT_DEPLOYED; access blocked, no DNS/mail writes |
| Supply chain | Current advisory/lock/action/runtime/license review; Cargo unmaintained notices retained; no CodeQL execution claim |
| Independent review | Fresh contract/frontend and release/public task reviews, followed by branch review; engineering review, not professional audit |

Exact final evidence and unresolved hosting/real-Keplr/attestation limits are in [Run 4](../RUN_4_REPORT.md) and [M4 evidence](../verification/m4/README.md). Historical checklist sections above describe their original milestone.

## Milestone 5 current state

- Public web **PUBLIC_ALPHA_DEPLOYED / OWNER_VERIFIED_LIVE**, financial **CONTRACT_NOT_DEPLOYED**. Actual owner hosted-Keplr rejection and reconnection close the earlier M4 extension gap; no financial signing or broadcast occurred.
- First manual issuance succeeded for exact `3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72`; M5 independently verified downloaded bytes and native Wasm/manifest attestations. **ATTESTED_CANDIDATE_NOT_APPROVED** does not attest M5 or authorize upload.
- M5 keeps explicit reconnect on reload with no passive extension access. The session hint is presentation only. Lowest-level financial refusal, tab/account races, private egress, CSP and deployment-target isolation remain regression gates.
- [M5 evidence](../verification/m5/README.md) and [Run 5](../RUN_5_REPORT.md) distinguish owner/independent/local/CI results. Neither Worker nor any DNS/email/paid resource is changed during M5; private email routing remains unverified. Read-only Cloudflare metrics showed Workers Free and active median CPU30.43ms, exceeding the stated10ms allowance despite zero displayed errors; capacity remains a risk.
