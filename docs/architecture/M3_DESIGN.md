# Milestone 3 hardening design

Continue merged main b6686ba37473e531baa223d1c72eb5162dae683d on feat/m3-readiness. The owner explicitly authorized this implementation/verification run, branch push and PR creation; no merge or deployment. Keep the existing architecture and all historical M1/M2 reports.

Use the existing checkout with the requested new branch. Node selection applies to task processes only; no global shell/toolchain edits. The only initial drift was Next-generated dev type paths, backed up before restoring the tracked generated file for the production baseline.

## Decisions

1. Add a read-only, bounded doctor with structured check results and human ERROR/WARNING output. Read pin files and known public config, never environment secrets. Missing Rust/wasm tooling and Docker are optional warnings for web work; Node/pnpm mismatch and missing required source/pin files are errors. No implicit installs or network requests.
2. Run the full PR quality checks and main pushes only. Do not require standalone feature-push checks or a PR-presence gate. Preserve every existing quality gate. Publish a pinned-toolchain Wasm plus machine-readable size/hash/environment report as a CI artifact; hash differences are observations pending investigation, not automatic release verdicts.
3. Add deterministic, seeded invariant sequences to existing contract and engine tests, using independent accounting/reference properties. No new testing framework or contract-surface change. Concrete defects found by tests require a minimal regression fix and review.
4. Review journal and multi-tab behavior empirically. Preserve v1 data/future-version refusal, atomic duplicate protection and unknown receipt states. Implement only demonstrated risk reductions; stale-tab state/review must not silently overwrite newer data. No indexer or automatic rebroadcast.
5. Formalize strict version2 deployment manifests with prepared/deployed variants. Preserve legacy v1 as historical evidence and require complete validated deployed config for financial actions. Prefer a checked-in public prepared config plus explicit owner-supplied reviewed manifest; no private env material. Verify chain identity, code ID/checksum, immutable admin, denom and cw2 metadata before accepting the configured deployment. No live IDs or addresses invented.
6. Add a read-only Settings diagnostics panel using existing wallet state, bounded RPC/REST checks and safe build metadata. Distinguish local simulation, configured expectation and live observation; show verification time and shortened account. No private plan export in diagnostics.
7. Record owner-provided Keplr results as REAL OWNER PASS, separate from AUTOMATED and NOT RUN. Publish current STATUS, alpha testing/contribution/security/privacy guidance and concise issue forms; hello@zigoals.app is the only security contact. Draft Build Log only.

## Boundaries

Idle is the only executable strategy. No mainnet, real funds, external strategies, swaps, leverage, cross-chain funding, faucet retries, private inbox/Discord access, outreach, token, mobile/AI rebuild, or secret handling. Range remains its verified entry point; no repeated ecosystem research. Registry lifecycle and eligibility never grant execution or legal approval. Real account switching and all signing/deployment tests remain unrun absent new owner evidence.

## Evidence

Fresh merged baseline: 299 JS,24 Rust,18 production browser cases and full Chrome restart pass; Mac Wasm validates at258540 bytes with SHA256090b19225a93fc191810426973001ab400452799d1925aadddadef1fc0cc6e25. PR1 push/PR web+contract jobs verified successful from GitHub. Prior hosted Linux checksum is43f7ebb8b18fc8108d64173018e6e2b37308c69e476a4edb0a9cf9b9905d6f73; investigate independently and never claim byte identity unless compared artifacts prove it.
