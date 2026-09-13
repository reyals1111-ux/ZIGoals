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

Web headers: CSP restricts connections to official testnet and local preview; denies objects/frames, base-uri/form-action self; nosniff; referrer policy; no camera/microphone/geolocation. Current Next inline scripts require unsafe-inline: nonce-based production CSP and HSTS at HTTPS app ingress remain release requirements. Do not label this as a hardened mainnet frontend.

## Milestone 2 boundaries

| Added threat | Control / remaining boundary |
|---|---|
| Lost browser session during signing/broadcast | Scoped version 1 IndexedDB journal; operation ID and signed hash stored before broadcast. Persistence failure at that barrier prevents submission. A restart never automatically replays a transaction. |
| Stale pending record | Time alone cannot establish rejection/failure; stale signing/broadcast state stays unresolved until evidence. No “funds safe” inference from missing hash/receipt. |
| False confirmation / unrelated successful tx | Reconciliation must match signed TxRaw hash and decoded sender, contract, execute message and funds on the verified testnet. Verified nonzero code means included failure; unavailable/malformed/mismatched receipts stay uncertain. RPC is still trusted transport, not a consensus-proof-verifying light client. |
| Cross-wallet confusion / concurrent writes | Records retain original chain/wallet/operation ID; IndexedDB atomic transitions and terminal-state protection; account changes invalidate financial UI, preserving original operation attribution. Multiple browser tabs do not share a single mutable localStorage envelope. |
| Corrupted/unsupported history / storage denial | Strict record validation, bounded scans, damaged-record warning, no blanket deletion; unrelated valid records remain accessible. Same-origin compromise can still delete or forge local storage; chain evidence is needed for recovered receipts. Clearing site data removes the journal. |
| Malicious explorer URL | Compiled route catalogue, fixed HTTPS origins, strict tx hash, Bech32 and block validation, encoded path component, exact chain matching. Missing routes return no URL. Link presence is never confirmation. |
| Registry trust confusion | Separate research lifecycle and verified informational capabilities; execution gate always false. Mutating a lifecycle value cannot grant signing or add an explorer route. Research metadata is not an audit or endorsement. |
| Provider metadata / XSS | Bounded strict schema and HTTPS references; React text escaping; no HTML injection. Provenance requires product-specific documented source/date and unknown relationships are omitted. Evidence claims still require human/source review; a schema does not prove them. |
| Hub implicit financial action | Static links contain no wallet, amount, memo or routing instructions. Hub is a separate application which may open its own network; owner verifies there. ZIGoals does not connect, stake, vote or bridge on the owner's behalf. |
| Stale strategy/issuer claims | Product-scoped eligibility/certification and current security state are recorded separately from broad branding. FundingRoute and StrategyAdapter remain separate. No RWA, swaps, leverage, Valdora or WME execution enabled. |

Test coverage and reviewer findings are recorded in the Run 2 verification report after the final pass. This table describes controls, not an independent security audit or real-extension/live-contract validation.
