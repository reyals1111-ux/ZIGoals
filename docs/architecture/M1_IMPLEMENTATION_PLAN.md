# ZIGoals Milestone 1 Implementation Plan

> For agentic workers: use subagent-driven-development for isolated package tasks, with explicit ownership and task review. Controller carries out independent research/integration alongside each bounded task.

**Goal:** A tested local idle Goal application with researched testnet configuration and prepared deployment.
**Architecture:** Independent deterministic engine, one custody contract, schema-derived messages and a wallet-aware Next.js application. Preserve the current Worker landing.
**Tech Stack:** Node 22.23.1, pnpm 11.19.0, TypeScript 5.9.3, Decimal.js 10.6.0, React/Next.js, CosmWasm 2.x matching live wasmvm 2.2.4.
**Spec:** M1_DESIGN.md and the owner's execution prompt supplied 2026-09-13.

## Global Constraints
- No mainnet transactions, production deployment, secrets, or external contact.
- Preserve landing/index.html, landing/wrangler.jsonc and LICENSE. Extend README without deleting its original identity.
- Financial amounts use integer strings/BigInt or Decimal; only testnet and explicit local simulation.
- Funding Health uses 0%; scenario returns are illustrative. User controls signing.
- Back up before edits, use small logical commits; no unrelated repository changes.

### Task 1: Goal engine
**Files:** packages/goal-engine/{package.json,src/index.ts,src/index.test.ts,README.md}.
**Interface:** evaluateGoal({targetValue,currentValue,currentDate,targetDate,plannedMonthlyContribution,annualReturnAssumption}) returns decimal strings for progressPct, amountRemaining, requiredContribution, projectedValueAtTargetDate, shortfallAtTargetDate, surplusAtTargetDate; integer contributionPeriodsRemaining; ISO/null projectedCompletionDate; fundingHealth and explanation. Annual assumption is fractional (0.05 = 5%).
- [ ] Write known-answer tests including all user date/return/health/precision cases; watch a meaningful failing assertion against a minimal stub.
- [ ] Implement decimal monthly simulation and zero-return funding health independently of scenario result. Reject malformed, unbounded and nonfinite input explicitly.
- [ ] Run tests/typecheck and document rounding, date convention, horizon; commit only engine files.

### Task 2: Goal Manager
**Files:** contracts/goal-manager, Cargo.toml, Cargo.lock, rust-toolchain.toml, .cargo/config.toml.
**Interface:** snake_case owner-only execute surface from design; Uint128 amounts, u64 IDs encoded as strings at frontend boundary; schemas generated from Rust messages.
- [ ] Verify compatible Rust/CosmWasm toolchain, install locally if missing.
- [ ] Write contract tests and run to fail before implementing each financial behavior.
- [ ] Implement state/messages/queries/events and cw-multi-test bank/authorization/atomicity matrix.
- [ ] Run fmt, clippy, tests, Wasm build, schema generation and cosmwasm-check; document optimizer result separately.

### Task 3: Chain/wallet/data foundation
**Files:** packages/chain-config, packages/shared-types, packages/strategy-types, apps/web/lib, scripts.
**Interfaces:** testnet config; parseUnits/formatUnits; validated metadata envelope; generated Goal/ExecuteMsg; client create/deposit/withdraw/close operations, explicit lifecycle states.
- [ ] Persist timestamped primary network evidence and contradiction list; research SDK, WME and Valdora.
- [ ] Test amount round trips, wrong network/denom, metadata imports, wallet account changes, rejection and ambiguous confirmation before implementation.
- [ ] Implement isolated local ledger and guarded Keplr client with fresh signer checks and fee simulation; no automatic financial action.

### Task 4: Consumer flows
**Files:** apps/web/app, apps/web/components, apps/web/tests.
- [ ] Test creation validation and local lifecycle; implement wizard, dashboard, detail, funding/withdrawal, activity, verification, metadata recovery/settings.
- [ ] Run browser flows at desktop/mobile widths plus keyboard checks. Test rejection/error boundaries via injected wallet transport where practical.
- [ ] Run lint/typecheck/unit/build and fix concrete failures.

### Task 5: Release readiness
**Files:** .github/workflows, docs/{architecture,product,research,security,deployment,roadmap,social}, README.md.
- [ ] Complete threat model/checklist, ADRs, runbook, pending whitelist draft, roadmaps and evidence-based build log.
- [ ] Review financial/permission/network/privacy invariants and fix Critical/High findings.
- [ ] Verify unchanged landing hashes, clean staged diffs, small commit history, no secrets; report exact command outcomes and external blockers.
