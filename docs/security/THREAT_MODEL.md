# Milestone 1 threat model

Assets: recorded native idle positions, withdrawal authority, private plans, signing intent and deployed-code identity. Boundaries: browser/extensions/localStorage → Keplr signer → RPC/REST → immutable Goal Manager → bank module. Local demo is a separate, untrusted simulation and has no asset custody. This review is not an audit.

| Threat | Control and remaining exposure |
|---|---|
| Unauthorized withdrawal / ownership bypass | Stored owner checked for every mutation; recipient always owner; cw-multi-test covers all calls and multiple owners. |
| Overflow, underflow, duplicate accounting | Uint128 checked arithmetic, checked ID growth, writes after validations, failed bank sends roll back; interleaved conservation tests. Direct bank transfers remain uncredited surplus. |
| Precision / rounding | Canonical base-unit BigInt/string; Decimal engine clone with explicit precision and rounding; annual exact-threshold regression. Display rounding never enters transactions. |
| Denom mismatch / v5 / multiple coins | Instantiate denom injection; exact single nonzero allowed coin; runtime bank+staking+chain validation. No in-place v5 contract migration. |
| Admin / upgrade compromise | Pause admin has no withdrawal/redirect/ownership authority. No migrate export. Client refuses chain-level migration admin. Deployment runbook requires --no-admin. |
| Strategy/share inflation, malicious adapter, external compromise | No external strategy execution; only idle. Future adapters require evidence, allowlisting, share/value accounting and independent security review. |
| Oracle/price manipulation, stale prices, slippage | No market oracle or swaps. DemoPriceProvider does not influence contract amounts. These threats become deployment gates for external strategies. |
| Slashing, insolvency, illiquidity, redemption delay | Idle is not delegated. Native token/network and contract risks remain. Future strategies require separate pending/claimable state and exit tests. |
| Malicious metadata / XSS | Zod strict bounded JSON; React text escaping, no HTML rendering; owner/network import scope; no third-party scripts. localStorage is not encrypted; compromised same-origin JS/extensions can read it. |
| Frontend spoofing / signing wrong intent | Local/testnet labels, confirmation preview, user wallet signature, no keys. User must verify trusted origin and wallet transaction. A compromised frontend can still mislead. |
| Wrong network / stale signer / account switch | Hard testnet guard, RPC chain checks, live denom checks, keystore revision invalidation before signing and before broadcast. In-flight connect results ignored after revision changes. |
| RPC outage / ambiguous broadcast | Explicit signature/broadcast/confirmation states; uncertainty never says no funds moved. No automatic retry/broadcast. Inspect hash/history before retrying. No proof-verifying light client yet. |
| Replay / sequence | Fresh CosmJS signer data; sequence enforced by chain; UI action mutex prevents duplicate concurrent submissions. Browser reload still requires user checking pending wallet history. |
| Testnet/mainnet confusion | Mainnet unavailable in code; local namespace isolated; no fiat monetary-value claim; no production deploy scripts. |
| Supply chain | Exact direct version pins + lockfiles, build-script denial by default, CI install frozen, security audit command; Rust crate versions locked. Dependencies and host toolchain remain trusted inputs. |
| Storage loss / import denial of service |1MB/1000-goal bound and strict whole-envelope validation before one write; backups recommended; financial controls do not depend on plans. Large but valid date plans fail closed at projection, not financial access. |

Historical M1 headers allowed inline scripts. M4 replaces that production policy with per-response nonce scripts and no unsafe-inline/unsafe-eval script allowance, restricted canonical RPC/REST connections, denied objects/frames/base URLs, nosniff, no-referrer and limited browser permissions. HSTS applies to HTTPS responses. Inline style attributes remain a documented CSS exception. Local runtime verification is separate from unperformed public HTTPS and real-extension checks; this is not a mainnet frontend.

## Milestone 2 boundaries

| Added threat | Control / remaining boundary |
|---|---|
| Lost browser session during signing/broadcast | Scoped version 1 IndexedDB journal; operation ID and signed hash stored before broadcast. Persistence failure at that barrier prevents submission. A restart never automatically replays a transaction. |
| Stale pending record | Time alone cannot establish rejection/failure; stale signing/broadcast state stays unresolved until evidence. No “funds safe” inference from missing hash/receipt. |
| False confirmation / unrelated successful tx | Reconciliation must match signed TxRaw hash and decoded sender, contract, execute message and funds on the verified testnet. Verified nonzero code means included failure; unavailable/malformed/mismatched receipts stay uncertain. RPC is still trusted transport, not a consensus-proof-verifying light client. |
| Cross-wallet confusion / concurrent writes | Records retain original chain/wallet/operation ID; IndexedDB atomic transitions and terminal-state protection; account changes invalidate financial UI, preserving original operation attribution. Multiple browser tabs do not share a single mutable localStorage envelope. |
| Corrupted/unsupported history / storage denial | Strict record validation, bounded scans, damaged-record warning preserved alongside reconciliation errors, no blanket deletion; unrelated valid records remain accessible. Same-origin compromise can still delete or forge local storage; chain evidence is needed for recovered receipts. Clearing site data removes the journal. |
| Malicious explorer URL | Compiled route catalogue, fixed HTTPS origins, strict tx hash, Bech32 and block validation, encoded path component, exact chain matching. Missing routes return no URL. Link presence is never confirmation. |
| Registry trust confusion | Separate research lifecycle and verified informational capabilities; execution gate always false. Mutating a lifecycle value cannot grant signing or add an explorer route. Research metadata is not an audit or endorsement. |
| Provider metadata / XSS | Bounded strict schema and HTTPS references; React text escaping; no HTML injection. Provenance requires product-specific documented source/date and unknown relationships are omitted. Evidence claims still require human/source review; a schema does not prove them. |
| Hub implicit financial action | Static links contain no wallet, amount, memo or routing instructions. Hub is a separate application which may open its own network; owner verifies there. ZIGoals does not connect, stake, vote or bridge on the owner's behalf. |
| Stale strategy/issuer claims | Product-scoped eligibility/certification and current security state are recorded separately from broad branding. FundingRoute and StrategyAdapter remain separate. No RWA, swaps, leverage, Valdora or WME execution enabled. |

Test coverage and reviewer findings are recorded in the Run 2 verification report after the final pass. This table describes controls, not an independent security audit or real-extension/live-contract validation.

## Milestone 3 controls and limits

| Threat | Change / remaining exposure |
|---|---|
| Lost updates or duplicate intent in participating tabs | Scoped Web Locks, fresh durable revisions under the lock and external-event invalidation stop stale local-ledger/metadata commits and stale testnet confirmations. Modes are per tab. Old/nonparticipating code, other origins/devices and hostile same-origin scripts are outside this cooperative guarantee; reload old tabs. |
| Future schema or duplicate signed hash | Future metadata/IndexedDB versions are refused without replacing active bytes. Atomic journal hash ownership rejects another operation claiming the same normalized signed hash, including retained future-schema claims. Storage denial stops the send barrier; no fallback silently sends. |
| Timestamp starvation / impossible local history | Future or reversed journal times remain stored with warnings and are excluded from receipt priority. Local ledger chronology/plausibility fails closed. This uses the local clock with tolerance, not trusted network time; fix a wrong device clock before relying on ordering. |
| Forged or partial deployment configuration | Strict v2 states keep prepared IDs null. Actual preflight checks code ID/creator/checksum, cw2 identity/version, denomination, software version and both admin expectations. A reviewed clean build and owner-observed receipts remain external prerequisites. Structural validation alone cannot prove chain activity. |
| Misleading diagnostics / stale account result | Read-only separate RPC/REST observations, freshness checks, public build identity, shortened account and account-scoped result cancellation. RPC/REST operator responses remain trusted; a healthy endpoint is not deployment approval. |
| First terminal receipt / reorg disagreement | The first terminal journal result is retained. No light-client proof, finality quorum or reorg reversal is implemented. Conflicting evidence requires investigation; never auto-rebroadcast to resolve it. |
| Abrupt shutdown / eviction / quota | Persisted hash before send improves recovery but cannot guarantee browser durability under OS crash, eviction or profile deletion. Preserve known public hashes and inspect chain evidence. Missing data or missing receipts never proves no funds moved. |

The seeded contract and engine tests improve regression detection but are finite deterministic examples, not exhaustive fuzzing or an independent audit. Real owner Keplr A–H connection evidence is recorded separately; real signer/deployed-action tests remain NOT RUN. Private reporting: hello@zigoals.app.

## Milestone 4 public exposure and release boundaries

These are the publication controls and remaining trust assumptions. Actual execution evidence and deployment status belong in [current status](../STATUS.md) and `docs/verification/m4/`; a checklist or source review alone is not a passing hosted test.

| Threat | Required control and remaining exposure |
|---|---|
| Hostile same-origin code, imported backup or XSS | Bounded whole-envelope validation and text rendering; per-response production script nonce; no arbitrary HTML sinks or remote scripts. CSP reduces injection paths but does not make a compromised allowed bundle, service worker, origin or extension trustworthy. Private browser storage is not encrypted. |
| Nonce reuse, caching or CSP bypass | Fresh nonce on each dynamic HTML response, matching request/runtime scripts, no shared cache of nonce HTML; real production navigation and injection-rejection tests. Browser startup mocks bypass parts of page CSP and cannot establish real extension compatibility. |
| Clickjacking and unnecessary browser permissions | Deny framing and objects, restrict base/form destinations, deny camera/microphone/geolocation and test actual response headers. Headers do not stop a malicious installed extension. |
| Fake domain, phishing or hostile Wi-Fi | Verify `zigoals.app`; recognize `alpha.zigoals.app` only after an actual verified publication. Use HTTPS and HSTS at HTTPS ingress. Never enter a seed phrase or wallet key into ZIGoals. A certificate proves control of a hostname, not safety of another lookalike domain. |
| Public Alpha environment confusion | Explicit build mode plus checks at preparation/signing/broadcast boundaries, independent of deployed-manifest shape. An undeployed public build permits simulation and optional read-only connection only. A healthy RPC, connected wallet or reproducible Wasm cannot authorize financial execution. |
| Compromised RPC or malformed query data | Verify expected chain/configuration, reject malformed or oversized fields and nonprogressing pagination, retain receipt uncertainty. RPC/REST operators remain trusted transport sources; no consensus-proof-verifying light client is present. They can withhold data or deny service. |
| Malicious explorer/provider links | Fixed reviewed HTTPS destinations, strict path identifiers and safe new-tab relations. Informational links do not transfer planning metadata, certify partners or authorize transactions; external sites apply their own policies. |
| Private plan leakage through hosting or feedback | Keep plan text and backup bodies local; inspect request URLs, headers and bodies with sentinel data. The host sees public request paths, including goal IDs, and ordinary network/browser information. Use a whitelist diagnostic summary; no full account, plan, amount, backup or arbitrary endpoint error body. Screenshots and user-shared files can still disclose data. |
| Crawlers and public discovery | Alpha noindex/robots metadata and honest social descriptions. Robots instructions are advisory and cannot authenticate users or make a public URL private. |
| Denial of service or free-plan exhaustion | Bound imported data, RPC pages and recovery work; test runtime limits before publication. Hosting quotas, endpoint availability and browser storage remain external limits, with no availability guarantee. Disable the isolated Alpha if necessary. |
| Dependency, action or build-host compromise | Locked dependencies, exact action/tool versions, minimized install scripts and permissions, current advisory review. Two independent builds compare measured bytes and environment; a matching digest does not prove code safety or exclude a common compromised compiler/dependency. GitHub's moving runner image is recorded, not claimed immutable. |
| Forged candidate or confused source commit | Validate actual downloaded bytes, size, trusted expected git commit/tree/lock and pinned Wasm validator. Inspect actual two-job run; PR metadata alone is unsigned. Main-only manual issuance attests exact Wasm and manifest with isolated OIDC authority. A PR synthetic merge SHA is distinct from its feature head and later main merge. |
| Unsafe release or rollback | Reproducible is never upload-approved. Contract upload, real signing and testnet deployment require a later explicit owner decision. Web rollback touches only the isolated Alpha Worker/domain; preserve apex/email and browser data. Future deployed-contract frontends need separate compatibility and exit review. |

Fresh contract/frontend engineering reviews are independent of implementation but are not professional audits. External strategies, mainnet and real funds remain outside this Alpha. Report suspected compromise to **hello@zigoals.app** and stop using the affected build; do not repeatedly retry financial actions to investigate.
