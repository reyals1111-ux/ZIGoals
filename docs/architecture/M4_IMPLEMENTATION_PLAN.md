# Milestone 4 implementation plan

> For agentic workers: use subagent-driven-development for bounded implementation and independent task reviews. One implementation worker at a time. The controller handles baseline, official research, evidence collection, conditional Cloudflare UI, integration verification and current reporting.

**Goal:** Produce canonical Wasm evidence and a secure public Alpha preview path without chain deployment.
**Architecture:** Retain the existing Next.js/React client and CosmWasm contract; add fail-closed build/release boundaries, production headers and transparent evidence.
**Tech Stack:** Node24.19.0, pnpm11.19.0, Next16.3.5, Rust1.85.1, Binaryen123.0.0, cosmwasm-check2.2.2. Pin added tools and actions from verified official sources.
**Spec:** M4_DESIGN.md plus owner's Run4 request at `/Users/AIUSER/.codex/attachments/c5056531-af8b-46db-899b-5c9d2aa571af/pasted-text.txt`.

## Global Constraints

- Work on feat/m4-release-alpha from main 7d354e3c72fa671abc100facf908b247fb992cc0. No merge, force push or history rewrite. Only controller pushes/creates PR.
- No chain deployment, upload, wallet signing/broadcast, mainnet, real funds, faucet retries, private inbox/Discord, outreach or secrets. Mocks and isolated browser data are permitted.
- Idle remains the ONLY executable strategy. No new financial integration or partner/compliance claim.
- Preserve historical reports, apex landing, email/DNS and license. Back up existing edited files outside tracked source and inspect complete diff before commit.
- Keep integer money, strict deployment v2 checks, scoped metadata/journal, uncertain receipt semantics and recovery that never signs/rebroadcasts.
- Every new security behavior needs meaningful regression evidence. Do not raise totals by duplicating assertions. Record test commands and actual outcomes.
- Candidate REPRODUCIBLE does not mean APPROVED_FOR_TESTNET_UPLOAD. Only explicit owner approval may make that transition.
- No agent spawns subagents. Review is dispatched separately by controller. Never stage scratch reports or all files blindly.

## Task 1: Canonical release and supply-chain tooling

Files: create `docs/architecture/ADR-005-canonical-release-build.md`, `scripts/release/` helpers/tests, `docs/release/artifact-manifest.schema.json`, `.github/workflows/reproducibility.yml`, `.github/workflows/release-candidate.yml`, `docs/deployment/VERIFY_RELEASE_ARTIFACT.md`, `docs/release/RELEASE_PROCESS.md`; adjust `contracts/goal-manager/scripts/build-wasm.sh`, reporting helpers, CI or package scripts only when required by this deliverable. Keep contract semantics unchanged.

Interfaces: builds write a bounded manifest alongside actual `zigoals_goal_manager.wasm`; compare/verify commands take explicit files/directories and expected source commit. They exit nonzero on byte/size/source/environment/schema/validator mismatch. Use one shared validation implementation plus a strict JSON Schema. Existing development build remains supported and visibly non-authoritative.

- [ ] Read actual build/report code and M3 reproducibility evidence. Research official rustc remapping and GitHub attestation/action docs, resolve full action SHAs via GitHub. Record source URLs/decision.
- [ ] Write focused failing tests for malformed manifests, unknown/approval status, false matching hashes with changed bytes, size/source/lock/environment disagreement, single-build vs two-independent-build claims, and missing/wrong validator. For example the verifier must reject `verifyCandidate({expectedCommit, manifest, wasm: alteredBytes})` even if manifest status is REPRODUCIBLE.
- [ ] Implement deterministic canonical Linux build wrapper: pinned tool versions, clean target, remapped source/Cargo paths, fixed locale/TZ, source-date epoch from commit, measured build timestamp, no arbitrary inherited release flags. Report actual host/runner image and trust limits. The two builds must be separate fresh jobs and share no target/cache output. Preserve required CosmWasm target-feature flags and optimizer invocation.
- [ ] Implement strict candidate manifest/verification and comparison. Check actual bytes independently; record source tree, commit, Cargo.lock hash, exact versions, Wasm size/hash, validation, GitHub run/attempt/job identity and independent count. On mismatch fail closed and retain diagnostic build evidence without publishing a purported verified candidate. Never auto-approve upload or deploy.
- [ ] Add PR repeated-build CI and explicitly manually triggered release process reusing canonical scripts. Manual candidate issuance includes the complete quality gates; attest only with official supported mechanism, pinned action, job-scoped OIDC/read-contents/write-attestations and exact subject artifact. Untrusted PR code gets no privileged workflow execution (`pull_request_target` prohibited). Document any event/ref constraints preventing attestation before merge.
- [ ] Add download verification instructions checking expected source, checksum, size, validator and attestation signer workflow when present. No arbitrary executable paths read from manifest. Candidate metadata does not prove provenance without independently trusted expected commit/attestation.
- [ ] Review dependency sources/install scripts/tool downloads/permissions. Run production dependency audit and Cargo advisory review with pinned official tooling in task-local toolchain if needed; report real advisories without exaggeration. Root can finish host/network-limited checks. Evaluate native dependency review/CodeQL only from official docs; add only if concretely useful.
- [ ] Run focused red/green tests, full relevant JS checks and actual local developer/canonical-compatibility builds. Commit logical owned changes; full report to controller-designated scratch path. Root will run hosted jobs and save actual final manifests/evidence after PR creation.

## Task 2: Public Alpha safety and production browser security

Files: `apps/web/lib/app-environment.ts` and tests, `apps/web/lib/wallet.ts`/tests, provider/shell/diagnostics, `apps/web/next.config.ts`, request CSP helper and proxy/middleware as supported, layout metadata/robots/local social assets, targeted CSS, browser tests, `docs/deployment/CLOUDFLARE_ALPHA.md`, isolated Alpha deployment config/build scripts if compatible. Do not change root marketing assets.

Interfaces: `APP_ENVIRONMENT` is validated build-time public mode; `assertFinancialExecutionAllowed()` rejects unless explicitly TESTNET_DEPLOYED and existing strict config permits execution. It is called at actual preparation/signing/broadcast boundaries, not only UI. Safe diagnostic summary builder accepts explicit safe fields and returns text; it never serializes whole state/errors/address/metadata. Later deployment consumes PUBLIC_ALPHA_UNDEPLOYED output only.

- [ ] Read Next package-local docs before implementation and actual wallet/provider flows. Verify Cloudflare choices against official current docs and build capabilities; propose a concrete minimal supported configuration to controller before adding a framework adapter.
- [ ] Add failing tests proving public/invalid modes block signer and broadcaster even with a structurally valid mocked deployed manifest; local simulation still works and connection/read-only checks work. Implement separate mode and manifest checks without weakening either.
- [ ] Add clear persistent simulation vs wallet-connection-only banners, unavailable financial-action copy, version/commit/mode identity, noindex metadata, safe bug/contact links and user-copyable diagnostic summary excluding full account/goal/backup data. Tests cover adversarial strings, stale state and unavailable clipboard fallback.
- [ ] Implement tested CSP/security headers using actual Next runtime behavior. Nonces must be unpredictable per response and applied to runtime scripts without caching nonce HTML. No production unsafe-eval or broad unsafe-inline scripts. Narrow connect origins to canonical RPC/REST, frame denial, no sniff, conservative referrer/permissions, HSTS on HTTPS; document any narrowly necessary style exception. Validate no unexpected fonts/remote page dependencies.
- [ ] Add real production-browser assertions for headers, render/navigation, wallet injection boundary, diagnostics, external-link safety, private sentinel egress and script injection rejection. Existing tests using mocked financial drivers must select explicit test-only deployed mode through test stubs, not production bypass flags.
- [ ] Perform small-phone/keyboard/reduced-motion polish, preserve visual identity. Measure routes/assets and basic performance without synthetic score promises. Save screenshot paths and measurements; controller independently inspects images.
- [ ] If compatible, add pinned Cloudflare packaging + local Workers preview tests and dry-run config validation with isolated worker name/no routes/no mail changes. No live deployment by worker. If alternatives require unsafe framework churn or unsupported semantics, record exact blocker and minimal owner path; root decides after evidence.
- [ ] Run focused tests, lint/types/production build, relevant browser cases. Commit owned changes and report actual tests/limits. Independent spec/quality review follows.

## Task 3: Reviews, release readiness and verified publication (controller)

Files: current README/STATUS, threat/security docs, alpha guide/privacy/disclaimer, PUBLIC_ALPHA_CHECKLIST, release notes, draft landing CTA, Build Log, `docs/verification/m4/`, `docs/RUN_4_REPORT.md`.

- [ ] Independent fresh contract review and frontend security review; prioritize material findings with regressions via bounded fix dispatch. Record exact severity and evidence, no professional audit claim.
- [ ] Document public threats/privacy exceptions/anti-phishing/rollback and explicit release owner approval. Correct current M3 merged/main-push status; preserve historical reports. Draft landing CTA separately, never publish automatically.
- [ ] Verify full local suites, browser restart, production audit, advisory review, schema/type drift, Wasm validation and tracked secret patterns. Save measured totals and trustworthy time.
- [ ] Push branch/open PR, run actual GitHub checks and download both independent Linux artifacts; recompute bytes/hash/size locally and inspect metadata. Record failures and fixes. Verify attestation if actually issued. No invented manual run if GitHub requires default-branch workflow first.
- [ ] Once local+hosted+review/security gates pass, inspect Cloudflare account/DNS available access and optionally publish isolated preview; test actual HTTPS and protect apex/email. Only after verified preview consider exact isolated alpha subdomain change. Otherwise exact owner UI steps and PREPARED_NOT_DEPLOYED status.
- [ ] Whole-branch review, fix material findings, final checks after changes, open unmerged PR and clean checkout. Complete 38-part report with real evidence, remaining risks, owner steps and five next tasks; draft social posts only.
