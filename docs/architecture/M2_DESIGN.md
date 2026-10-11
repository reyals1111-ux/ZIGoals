# Milestone 2 design

Run 2 extends the verified local Milestone 1 branch at b87cbe86e5b07641621b7db358ddcba9caa1cdc9. The owner's Run-2 specification authorizes implementation, research, a feature-branch publication attempt and PR preparation, but no merge, force push, mainnet, real funds or unverified execution adapters. Existing M1 bundles remain untouched.

## Durable transaction journal

Use a versioned IndexedDB journal rather than one mutable localStorage array: IndexedDB provides atomic record updates across tabs and avoids unrelated operations overwriting each other. Existing private Goal metadata and local simulation storage stay separate. Records bind chain, wallet, operation ID, action/amount/goal/contract and an optional transaction hash; no names, notes, seed material or signing credentials enter the journal.

Persist AWAITING_SIGNATURE before starting a real action. Persist BROADCASTING and, where available, the locally computed signed-transaction hash before calling broadcast. Failure to preserve this boundary must stop broadcast. After possible broadcast, storage/transport failure cannot become proof of financial failure. CONFIRMING, CONFIRMED, FAILED, REJECTED and UNKNOWN_AFTER_BROADCAST distinguish receipt evidence, wallet cancellation and uncertainty. Verified terminal outcomes cannot be downgraded by stale updates. A browser restart does not imply rejection or a failed chain transaction; stale entries stay explicitly interrupted/uncertain until evidence resolves them.

Reconciliation is read-only, bounded, network checked and scoped to known transaction hashes. Check receipt identity and the stored operation's sender, contract and message before claiming its outcome. A null/not-indexed/timeout response does not prove failure. Account changes must not move history into another wallet's scope. Keep original-scope in-flight outcomes visible, and reload their journal when the original wallet reconnects. Corrupt/unknown records must not crash the UI or be silently erased. Distinguish LOCAL_SIMULATION activity from TESTNET_CHAIN known receipts; an indexer interface may describe complete history but no completeness is assumed.

## Evidence-backed ecosystem layer

Add an independent typed registry with explicit provider lifecycle, roles, network claims, evidence URLs, contracts when verified, risks, eligibility, audit references and observation dates. Lifecycle does not grant spending authority. Static research records are not executable strategies; only deliberately verified read-only capabilities become actionable links. Expand strategy metadata with distinct product, curator, originator, servicer, custodian, underlying source, assets, liquidity, eligibility and certification evidence. Idle is the only executable strategy; unknown relationships remain absent.

An ExplorerProvider validates identifiers and builds only observed provider/network routes. Range and ZIGScan capabilities can differ; missing routes yield no link. A common component renders their verified links in Goal details and transaction outcomes. Verified ZIGChain Hub links give credit to ecosystem tools without reproducing staking, governance or bridge flows. Rich provenance is read-only; no logo or announcement establishes an executable integration or endorsement.

## Readiness and release evidence

Re-run the M1 baseline, retry connected GitHub publication once, and observe hosted CI only if publication succeeds. If access remains denied, preserve local commits, record the exact error and continue. Recheck live chain/version/denom, real browser wallet availability where safely inspectable, and a clean isolated Wasm build. Use Docker only if available; otherwise report same-toolchain clean builds distinctly from container reproducibility. Improve owner-run wallet/deployment procedures and abort criteria without signing or broadcasting.

## Validation

Regression tests cover restart, account switching, corrupt/unsupported journal data, stale updates, pre-broadcast persistence failure, hash/receipt mismatch, definite rejection/failure and uncertain delivery. Registry/link tests reject unsafe origins, identifiers and trust promotion. Browser tests exercise journal recovery, scoped activity and verified links while retaining every M1 financial/metadata flow. Review the complete change for false confirmation, URL injection and unverified actionability before final reporting.
