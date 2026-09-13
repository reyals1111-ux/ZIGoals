# Milestone 2 implementation plan

> For agentic workers: use subagent-driven-development for the transaction subsystem and independent review; research tasks have separate file ownership. The controller handles independent registry/explorer/readiness work.

**Goal:** Preserve M1 and implement durable transaction recovery plus a verified read-only ecosystem layer.
**Architecture:** Versioned scoped IndexedDB journal; bounded known-receipt reconciliation; typed research registry and validated explorer/Hub adapters; immutable existing custody contract.
**Tech Stack:** Existing Node24.19.0/pnpm11.19.0, Next16.3.5/React19.3.0/TypeScript5.9.3, CosmJS0.38.1, Zod4.6.2, Rust1.85.1/CosmWasm2.2.2. Add test-only IndexedDB emulation if necessary.
**Spec:** M2_DESIGN.md and the owner's Run-2 execution request supplied 2026-09-13.

## Global constraints

- Preserve feat/m1-foundation and its M1 history; no reset to public main, force push or main merge.
- No secrets, real-money/mainnet transaction, faucet retry or external outreach.
- Idle is the only executable strategy; Valdora, WME, swaps, leverage and funding rails remain execution-gated.
- New links require current primary evidence; unknown routes/capabilities/relationships remain absent or explicitly unconfirmed.
- Financial amounts remain integer strings/BigInt/Decimal. Private plans never become chain messages or public registry data.
- Never call a missing, timed-out or unindexed receipt a failed transaction; preserve original wallet scope and uncertainty.
- Back up existing files, use targeted red/green tests, inspect diffs and commit logical changes. Preserve landing and LICENSE.

## Task 1 — Baseline/publication/reproducibility (controller)

- [x] Verify branch/head, clean tree, full M1 commit history; re-run install/lint/typecheck/unit/Rust/build/checksum/validator.
- [x] Attempt connected GitHub write once; publish/prepare PR and observe CI if enabled; otherwise record exact blocker.
- [x] Fresh live testnet evidence; check Docker and clean isolated Wasm artifact/toolchain equality.

## Task 2 — Durable transaction and activity subsystem (implementation agent)

Files: apps/web/lib/{transaction-journal,receipt-reconciliation,transaction,wallet} modules/tests, provider and transaction/activity components, dedicated browser tests. Controller owns dependency manifests, lockfile and explorer module.

- [x] Write targeted failing persistence/restart/account/corruption/uncertainty tests before implementing.
- [x] Implement validated version1 IndexedDB records, atomic transitions and pre-broadcast durable barrier.
- [x] Compute/retain signed transaction hash when possible and verify known receipts against operation identity.
- [x] Integrate provider/outcome/activity UI, preserving M1 behavior and explicit history completeness.
- [x] Cover browser restart and damaged/scoped history; typecheck/test/lint, self-review and commit only owned files.
- [x] Independent task review; repair Important findings and re-review.

## Task 3 — Primary ecosystem research (bounded research agents + controller)

Files: docs/research/M2_PROTOCOL_EVIDENCE.md/.json; M2_INFRASTRUCTURE_EVIDENCE.md/.json; controller consolidates ZIGCHAIN_ECOSYSTEM_INTEGRATION_MAP.md.

- [x] Protocol leg: Valdora, OroSwap, PermaPod, Nawa, ZIG Markets, Zignaly, WME; execution schemas, security/eligibility and explicit gates.
- [x] Infrastructure leg: Zamanat, DeFa/InvoiceMate, Beehive, Ondo, Taurus, Apex, Noble, Axelar; actual ZIGChain relationship versus announcement, roles and funding/strategy distinction.
- [x] Controller: Range, ZIGScan and Hub, observed route evidence and network scope.
- [x] Consolidate each participant's role/network/API/risk/eligibility/status/date/use/phase with primary links; never infer integrations from logos.

## Task 4 — Registry, explorer/Hub and strategy transparency (controller)

Files: packages/ecosystem-registry, packages/strategy-types, apps/web/components/explorer-links and ecosystem transparency components/page, targeted tests, chain-config legacy-link replacement.

- [x] Write failing unsafe URL/identifier/unknown-capability/trust-promotion tests.
- [x] Implement provider schema/data, per-capability verified route builders and safe Hub link catalogue.
- [x] Expand StrategyDescriptor compatibly, FundingRoute separately and evidence-only provenance display.
- [x] Integrate verified read-only links after Task2-owned UI files are stable; responsive/browser checks.
- [x] Independent review of package/interface boundaries and actionable links.

## Task 5 — Readiness/security/handoff (controller)

- [x] Add precise human Keplr and testnet deployment checklist with immutable admin/checksum/receipt/event/abort gates.
- [x] Update threat model/checklist and draft-only Build Log; prepare local PR description if access blocked.
- [x] Final full verification, diff/secret/landing checks, whole-branch review and Important fixes.
- [x] Produce 29-part Run-2 report, separate local/hosted/live evidence and prepare the updated source/history bundle. Final package validation is recorded in the accompanying M2 HANDOFF.
