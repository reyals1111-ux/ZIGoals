# Milestone 3 implementation plan

> For agentic workers: use subagent-driven-development for bounded invariant and browser hardening work and independent review. The controller owns doctor/CI, deployment/diagnostics integration and current documentation. One implementation subagent at a time; read-only review/research can run independently.

**Goal:** Harden the merged alpha, improve safe operator/tester tooling, and obtain actual hosted release evidence without deploying.
**Architecture:** Existing app and custody contract retained; read-only tooling, strict manifests, scoped diagnostics and evidence-led browser concurrency improvements.
**Tech Stack:** Node24.19.0, pnpm11.19.0, Next16.3.5, Rust1.85.1, Binaryen123.0.0, cosmwasm-check2.2.2; existing test libraries only.
**Spec:** M3_DESIGN.md and the owner's Run3 request supplied 2026-09-13.

## Global constraints

- Start from merged main b6686ba; keep work on feat/m3-readiness; no force push, history rewrite or automatic merge.
- No mainnet, real funds, signing/broadcast, faucet retries, private email/Discord, duplicate outreach or secrets.
- Idle remains the ONLY executable strategy. No invented Valdora/WME interfaces, new partnerships or eligibility approval.
- Historical M1/M2 reports remain unchanged; current status must acknowledge actual merged/hosted evidence.
- Money uses integer strings/BigInt/Decimal; metadata remains private/browser-local and separately scoped.
- Missing/unindexed/disagreeing receipts remain uncertain. Recovery never signs or rebroadcasts.
- Back up existing files, add meaningful behavioral tests, inspect actual diffs and commit logical scopes. Preserve landing and LICENSE.

## Task 1 — Current evidence, doctor and CI (controller)

Files: scripts/doctor.mjs, scripts/lib/doctor.mjs, scripts/*.test.mjs, package.json, .nvmrc, .github/workflows/ci.yml, scripts/wasm-build-report.mjs, docs/STATUS.md and M3 evidence.
- [x] Verify merged state and baseline suites, generated-only drift and primary testnet facts.
- [ ] Implement a pure check evaluator plus bounded read-only command probes; mismatch/missing-input tests precede implementation. `node --test scripts/doctor.test.mjs` covers ERROR/WARNING and no secret/config mutation behavior. Add `pnpm doctor`; preserve .node-version.
- [ ] Preserve PR checks and add main push behavior; pin upload-artifact revision, record raw Wasm size/hash/toolchain and publish actual artifact. Syntax/quality check before publishing.
- [ ] Record REAL OWNER PASS A–H and NOT RUN account/signing rows; current status links actual PR1 jobs.
- [ ] Independent task review; fix Important findings.

## Task 2 — Contract and engine invariants (implementation agent)

Files: contracts/goal-manager/tests/invariants.rs; packages/goal-engine/src/properties.test.ts. Existing source/test helpers may be read; no source changes unless a reproduced defect needs repair and controller coordination.
- [ ] Use deterministic seeded sequences, multiple owners/goals, independent expected positions/lifetime totals/bank deltas. Assert solvency after each valid operation and complete state equality after invalid operations. Include paused exits, closed goals and nontrivial pagination/large integers.
- [ ] Add engine metamorphic properties: deterministic output, nonnegative/clamped results, completion at target, contribution and required-payment monotonicity, finite outputs and valid month-end dates across bounded varied inputs. Identify the real production regression each assertion detects; no mirror implementation.
- [ ] Run focused Rust/engine tests and existing relevant suites, format/clippy/types as appropriate; report seeds, coverage, actual counts and limits. Commit owned files.
- [ ] Independent spec/quality review and scoped fixes.

## Task 3 — Journal and multi-tab hardening (implementation agent after Task2)

Files: apps/web/lib/{transaction-journal,storage,local-ledger} modules/tests, components/goal-provider.tsx/tests, apps/web/tests/multitab.spec.ts. Controller owns wallet deployment validation/Settings.
- [ ] Audit schema upgrade refusal, collision/hash behavior, duplicate receipts, quota/unavailable IndexedDB, timestamps and stale tabs; demonstrate gaps with targeted failing tests before changes.
- [ ] Exercise two real same-origin tabs for metadata/local ledger/journal/mode/review state; prevent demonstrated stale overwrite/send behavior with smallest compatible revision/notification/locking change.
- [ ] Add explicit retained-data and scope tests; no journal redesign, complete indexer or rebroadcast. Document reorg/RPC trust and abrupt shutdown limits.
- [ ] Focused tests/typecheck/lint/browser evidence, owned commit, independent review and scoped fixes.

## Task 4 — Manifest and diagnostics (controller)

Files: packages/shared-types/src/deployment.ts/tests and export; scripts/prepare-deployment.mjs, scripts/validate-deployment.mjs; apps/web/config/deployment.json; apps/web/lib/deployment-config.ts/diagnostics.ts/tests; apps/web/lib/wallet.ts/tests; Settings diagnostics component; next.config.ts.
- [ ] Add strict prepared/deployed v2 schema: exact environment/network/denom/version/build/identity/tx/admin/verification fields, no unknown keys or secrets; reject missing or fake-looking malformed deployment evidence. Test prepared cannot enable execution and legacy/invalid/partial config fails closed.
- [ ] Read-only preparation hashes actual artifact, verifies network facts and emits PREPARED_NOT_DEPLOYED with null live values. Deployed validation is structural plus actual runtime code checksum/admin/cw2/denom checks. No signer/wallet helper.
- [ ] Add manual-refresh read-only diagnostics with separate RPC/REST outcomes, timestamp, safe build version/commit, short account, expected config and NOT DEPLOYED state; errors preserve app usability. Test malicious/incomplete transport responses and stale account refresh.
- [ ] Production/mobile checks and independent task review.

## Task 5 — Release documentation, security and publication (controller)

Files: README.md, CONTRIBUTING.md, SECURITY.md, docs/testing/ALPHA_TESTER_GUIDE.md, docs/PRIVACY.md, .github/ISSUE_TEMPLATE/*.yml, current deployment docs, threat model/checklist, Build Log, docs/RUN_3_REPORT.md, M3 verification JSON.
- [ ] Audit actionable registry/disabled-provider behavior and financial copy, fixing demonstrated gaps with tests. Do not redo M2 research.
- [ ] Prepare concise tester/privacy/security/bug-report docs with public contact and safe sharing guidance; preserve historical reports.
- [ ] Full local verification and whole-branch review; single final fix wave if needed.
- [ ] Push feature branch, open PR without merging, inspect/fix actual hosted CI. Download Linux artifact and compare size/hash/sections/toolchains with local artifact; explain differences honestly.
- [ ] Complete 33-part final report, current STATUS and reviewed PR description; preserve branch and verified handoff.
