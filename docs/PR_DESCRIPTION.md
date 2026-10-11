# ZIGoals M1/M2: local alpha, durable testnet outcomes and ecosystem verification

This branch introduces the working local ZIGoals alpha and an idle CosmWasm Goal Manager, then makes known testnet transaction outcomes recoverable across page/browser restarts. Goal planning assumes zero future return for Funding Health; private plan names, targets and dates stay offchain. The guarded Keplr client remains testnet-only.

Milestone2 adds an atomic scoped transaction journal and read-only receipt reconciliation, strict explorer URL construction, sourced Hub links, an 18-provider research registry and product-role/funding-route types. Registry status never enables financial execution. Idle remains the only executable strategy; no swaps, leverage, cross-chain funding or external strategy adapter is added.

Validation and limits: see `docs/verification/M2_RESULTS.json` and `docs/RUN_2_REPORT.md` for final local commands/results. A clean isolated Wasm build reproduced M1 byte-for-byte with the same pinned toolchain. Real-extension and live-contract smoke tests remain owner-run; funding/upload permission are unresolved. No mainnet or real funds. The original landing, Worker configuration and LICENSE are unchanged.

Publication is currently blocked by GitHub integration HTTP403. This is a prepared PR description, not evidence that a remote PR or hosted CI run exists. Require actual hosted CI after push and review before merging.
