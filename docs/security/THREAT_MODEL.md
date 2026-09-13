# Milestone1 threat model

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
