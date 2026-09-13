# Run 5 — live Alpha hardening

**Checkpoint: IN PROGRESS.** Production is read-only. This report distinguishes completed evidence from validation/publication still pending. No deployment, release issuance, contract upload, signing, broadcast, DNS/email mutation or outreach occurred.

| Cluster | State | Evidence / next action |
|---|---|---|
| Fresh main and branch | COMPLETE | Exact start below; existing dedicated workspace retained |
| Owner evidence, existing release verification | COMPLETE | Structured M5 records; exact M4 source only |
| Independent hosted smoke, privacy, performance, DNS | COMPLETE | Completed sample with findings; no repeat needed |
| Landing deployment config fix | COMPLETE | Commit42adede, 14 targeted tests, real non-uploading dry run, independent review clean |
| Wallet reconnect | IN PROGRESS | Commit a14dd30; focused53 and browser2 pass; scoped review pending |
| Observed landing overflow and icons | NOT STARTED | Bounded local fix planned; live state unchanged |
| Rust and dependency checks | COMPLETE | Rust25, format/Clippy/schema; fresh advisory/integrity records |
| Full integrated JS/build/browser/workerd/restart | NOT STARTED | Run once after implementation; exact totals pending |
| Final independent branch review | NOT STARTED | Review all code/docs and remaining findings after checks |
| Push, PR, current CI observation | NOT STARTED | Push feature branch, create unmerged PR, observe actual runs |

## 1. Starting main

Freshly fetched clean `6be2de74f22f676e6a633ed05208decebb0dbff3`.

## 2. Branch

`feat/m5-live-alpha-hardening`, in the existing requested workspace. Main and earlier milestone branches preserved.

## 3. Branch SHA

Latest completed implementation at this checkpoint: `a14dd30`. Final publication SHA pending; obtain with `git rev-parse HEAD`. The final response/PR head identifies the report-bearing commit without a self-referential embedded hash.

## 4. Files changed

Checkpoint inventory (final inventory will be refreshed):

- `.github/workflows/ci.yml`
- `README.md`
- `apps/web/components/goal-provider.tsx`
- `apps/web/components/shell.tsx`
- `apps/web/lib/goal-provider.test.ts`
- `apps/web/tests/wallet-reload.spec.ts`
- `docs/PRIVACY.md`
- `docs/RUN_5_REPORT.md`
- `docs/STATUS.md`
- `docs/architecture/M5_IMPLEMENTATION_PLAN.md`
- `docs/deployment/CLOUDFLARE_ALPHA.md`
- `docs/deployment/KEPLR_OWNER_CHECKLIST.md`
- `docs/deployment/LANDING.md`
- `docs/deployment/LANDING_ALPHA_CTA_DRAFT.md`
- `docs/deployment/OWNER_TESTNET_CHECKLIST.md`
- `docs/deployment/PUBLIC_ALPHA_CHECKLIST.md`
- `docs/release/ALPHA_RELEASE_NOTES.md`
- `docs/release/RELEASE_PROCESS.md`
- `docs/release/SUPPLY_CHAIN_REVIEW.md`
- `docs/security/SECURITY_CHECKLIST.md`
- `docs/social/BUILD_LOG.md`
- `docs/testing/ALPHA_TESTER_GUIDE.md`
- `docs/verification/m5/CLOUDFLARE_READ_ONLY.json`
- `docs/verification/m5/DEPENDENCY_SCAN.json`
- `docs/verification/m5/HOSTED_PERFORMANCE.json`
- `docs/verification/m5/HOSTED_SMOKE.json`
- `docs/verification/m5/OWNER_LIVE_ALPHA_EVIDENCE.json`
- `docs/verification/m5/PUBLIC_DNS.json`
- `docs/verification/m5/README.md`
- `docs/verification/m5/RELEASE_VERIFICATION.json`
- `docs/verification/m5/SOURCE_INTEGRITY.json`
- `landing/.assetsignore`
- `landing/wrangler.jsonc`
- `package.json`
- `scripts/check-deployment-configs.mjs`
- `scripts/check-deployment-configs.test.ts`
- `scripts/verify-hosted-alpha.mjs`
- `vitest.config.ts`

## 5. Current Alpha status

**PUBLIC_ALPHA_DEPLOYED / OWNER_VERIFIED_LIVE / CONTRACT_NOT_DEPLOYED.** [Official Alpha](https://alpha.zigoals.app/app); [fallback](https://zigoals-alpha.reyals1111.workers.dev/app). Worker `zigoals-alpha`, owner version `c3843317-2105-4a18-bfb3-53067e81999b`, source `3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72`, app0.1.0. `PUBLIC_ALPHA_UNDEPLOYED` intentionally means the public web exists while Goal Manager/code ID/checksum remain absent. M5 code is not live.

## 6. Current apex status

[Live landing](https://zigoals.app), Worker `zigoals`, owner version `c1b16589-ea0a-4a11-a314-4b2454e6ce5b`, source6be2de7. Exact **Explore the Alpha →** URL `https://alpha.zigoals.app/app`, `_blank`, `noopener noreferrer`. Preserve **Public Alpha · Simulation + wallet connection only.** and **Goal Manager is not deployed. No blockchain transaction will be sent.**

## 7. Owner evidence

[OWNER_LIVE_ALPHA_EVIDENCE.json](verification/m5/OWNER_LIVE_ALPHA_EVIDENCE.json) labels OWNER_OBSERVED separately from independent checks. Unknown observation times are null, not invented. Real hosted Keplr rejection and subsequent connection under production CSP at both origins are OWNER_VERIFIED_HOSTED_EXTENSION_EVIDENCE. Truncated account `zig1dlw2...2yn7`,0ZIG, no fee/arbitrary-message/financial signature or broadcast. This closes the M4 hosted-extension evidence limitation; automated provider tests remain mocks.

## 8. Independent hosted checks

[HOSTED_SMOKE.json](verification/m5/HOSTED_SMOKE.json): fresh ephemeral Chrome, actual origins and endpoints, fictional local create/deposit/withdraw/close, backup import/export, diagnostics, reload/navigation and landing CTA/social links. All five stages completed. Seven sampled HTTPS responses200; five fresh Alpha nonces. Alpha dashboard/detail/settings fit320/390/768/1280. Actual live findings: landing335px at320 viewport and implicit favicon404 on both origins. No JavaScript page errors or failed/captured HTTP-error application requests in the completed sample. Earlier locator/wait corrections are harness history, not app fixes. Local M5 fixes require later owner deployment before these live findings close.

## 9. Keplr reload decision

Outcome B: Local Demo on reload with an explicit **Reconnect Keplr** action after a prior successful connection. A versioned tab-scoped boolean is a presentation hint only; no account, balance, financial mode or wallet permission is persisted. Mount/reload performs no extension access. Explicit Local Demo clears the hint. Keplr permission may be remembered but its APIs do not establish a universal prompt-free restoration guarantee. Existing connect cancellation/account-change isolation remains; no signer acquisition is added. Targeted provider/wallet53 and mocked browser2 checks passed; integrated production checks pending.

## 10. Landing config root cause and fix

Wrangler resolves `assets.directory` relative to its config. `./landing` inside `landing/wrangler.jsonc` resolved nonexistent `landing/landing`. Changed to `.` and restricted static assets with `.assetsignore`; fixed names/config paths and hostname isolation are checked automatically.

## 11. Landing dry run

**LOCAL_VERIFIED:** pinned Wrangler4.131.1 reproduced the failure and then passed `pnpm check:landing` from repository root without upload. At Task1, only index.html survived the asset allowlist; dry run reported0.37KiB upload estimate/0.25KiB gzip and exited without publishing. [LANDING.md](deployment/LANDING.md) is the canonical dry-run, separate owner-only deployment and rollback runbook. Recheck after any icon asset adjustment.

## 12. Alpha/apex isolation

`pnpm check:deploy-configs` and14 regression tests assert Worker names, config-relative assets, valid routes and hostnames, Alpha self-binding and static-only apex. CI runs the non-uploading landing check. Apex `zigoals`/`zigoals.app` and Alpha `zigoals-alpha`/`alpha.zigoals.app` remain separate. Repository validation supplements explicit owner target review; it cannot establish future account state.

## 13. Release/attestation state

**ATTESTED_CANDIDATE_NOT_APPROVED:** existing owner [run34772005556](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34772005556), source `3645b489e4bc2a31ef16d39bdc27f7c00e2ecd72`, all nine jobs successful. Independently downloaded candidate, ran strict repository/source/validator verification, and verified both GitHub native attestations with exact source/signer digest, main ref, expected workflow and GitHub-hosted runner requirement. M5 did not issue a candidate. Neither6be2de7, M5 nor future main inherits this attestation.

## 14. Exact artifact observations

Downloaded Wasm255532bytes: `9ac9fec2941db7be4db13b4f6d7f8512b3d4fb87165e0284eaa10385782bea10`. Attested manifest1993bytes: `300c68e3c052d88e10e16d4a813ea209b2bec70c6b8a81e3fb940415a254741a`. [RELEASE_VERIFICATION.json](verification/m5/RELEASE_VERIFICATION.json) records policy, provenance and timestamps. Future PR reproducibility bytes will be recorded separately; matching bytes alone do not attest another source.

## 15. Privacy

83 captured application/page/resource requests inspected for full headers, URLs and bodies; zero tested fictional goal-name/target/date/note matches. Alpha used self and canonical RPC/REST only. Apex existing Google Fonts requests were separately identified. Implicit favicon requests surfaced in console outside the captured request events; this is bounded tested-flow evidence, not universal traffic proof. IP/hosting visibility, route goal IDs, public RPC identifiers, unencrypted local storage/backups, extensions and same-origin compromise remain boundaries. Private mail forwarding destinations were neither inspected nor published.

## 16. Security headers

Actual Alpha HTTPS200, private/no-store, HSTS31536000, fresh nonce script CSP with strict-dynamic and no script unsafe-inline/unsafe-eval; fixed self/RPC/REST connections, frame/object/base denial, form-self, camera/microphone/geolocation denial, no-referrer, nosniff, DENY, noindex. Existing style unsafe-inline is a separate scoped allowance. Cloudflare cf-nel is infrastructure reporting, not application analytics. No application analytics added.

## 17. Hosted performance

Small sequential response sample: official Alpha129/50/53ms, fallback120/62ms, apex121/45ms. Initial Alpha12scripts300063encoded bytes; one DOM-content-loaded212.4ms/load276.4ms sample. These are not Core Web Vitals/load-test results.

**Operational capacity risk:** read-only Cloudflare dashboard established Workers Free, stated10msCPU/request allowance. Active versionc3843317 at100%traffic showed **median CPU30.43ms**,0.2req/sec,0%errors. Last24h/all-versions showed947invocations,0errors,428asset requests,91.36%cache hits and0CPU-limit errors. Headline19msCPU aggregation was not established. A median above the stated allowance needs owner capacity investigation before wider rollout; zero displayed errors is not sustainable headroom proof. No outage, upgrade, observability toggle or production optimization is claimed. [CLOUDFLARE_READ_ONLY.json](verification/m5/CLOUDFLARE_READ_ONLY.json) preserves scope.

## 18. Dependencies and source integrity

Fresh pnpm production/full scans:0vulnerabilities; Rust119dependencies:0vulnerabilities. Residual maintenance notices: derivative2.2.0/RUSTSEC-2024-0388, paste1.0.15/RUSTSEC-2024-0436. RustSec refresh returned databaseb50980aad8b8f14f77e25a97b32dd94bf008b0af dated2026-09-09. Existing official download-artifact DEP0005 Buffer warning remains in successful issuance logs. Frozen offline install/store integrity passed; locks/contract source unchanged. No broad upgrades or warning suppression. [DEPENDENCY_SCAN.json](verification/m5/DEPENDENCY_SCAN.json), [SOURCE_INTEGRITY.json](verification/m5/SOURCE_INTEGRITY.json).

## 19. Contract review

No contract code changed. Fresh Rust25 tests, format, Clippy, schema and generated types passed. Idle remains the only executable strategy; funding/upload permission and later explicit financial approval remain gates. Final focused M5 review pending. This is not a professional security audit.

## 20. Frontend/security review

Task1 spec and quality review approved with no findings. Task2 scoped review in progress; presentation fix and final whole-branch review pending. Mode guards continue to refuse unknown/missing/public/local financial preparation and execution at low-level boundaries. Final integrated checks will confirm the unchanged protections.

## 21. JavaScript

Final total **PENDING**. Starting baseline476 passed; Task1 full suite490 passed; Task2 focused53 passed. Final lint/typecheck/full suite and production build remain required. Use Node24.19.0/pnpm11.19.0.

## 22. Rust

**LOCAL_VERIFIED:25passed**,0failed (6+18+1). Format/Clippy/schema/generated drift checks passed. No source changes since these checks; do not rerun unnecessarily.

## 23. Browser

Final total **PENDING**; required prior baseline36. Task2 mocked-provider reload desktop/mobile2 passed against a local development server. Full production suite and process-restart recovery still required; mocks do not replace real owner extension evidence.

## 24. Workerd

Final total **PENDING**; required prior baseline8. Build Alpha, dry-run and run workerd gates plus relevant reconnect/icon coverage locally. No live deployment.

## 25. GitHub CI

**NOT STARTED** for M5; no green-CI claim. Existing owner release run verification is separate. Push/open PR and observe actual quality and reproducibility runs before completion.

## 26. PR

**NOT CREATED** at checkpoint. Create against main and leave open/unmerged; do not guess PR number.

## 27. Blockers

Test wallet0ZIG; funding/upload permission pending; Goal Manager/code/checksum absent; real financial signing NOT RUN; Valdora canonical interface pending; WME executable interface unverified. Private email routing/forwarding/delivery uninspected. No contract deployment is required or authorized in M5.

## 28. Risks

Free CPU capacity concern above; live320px overflow/favicon findings remain until reviewed deployment; bounded privacy/performance samples; two unmaintained dependencies and upstream tool warnings; independent code review is not an audit. Public DNS/dashboard confirmed active domains, proxied separate Workers, MX/SPF and DKIM presence. DMARC lookup failed and dashboard suggests adding it; no DNS change authorized. No mail delivery test was performed.

## 29. Exact owner next steps

After M5 validation: review the actual PR/diff/evidence and green CI, then decide whether to merge. Separately authorize/review any clean exact-source Alpha and apex builds/deployments using [CLOUDFLARE_ALPHA.md](deployment/CLOUDFLARE_ALPHA.md) and [LANDING.md](deployment/LANDING.md); capture previous versions and rollback target first. Investigate Free CPU capacity before wider exposure. Optionally issue a new candidate only from a reviewed exact main SHA through the manual workflow. Wait for funding/upload permission; first contract upload needs separate explicit approval. Do not infer financial approval from any web or attestation step.

## 30. Next five highest-value tasks

1. Complete integrated checks, final review and unmerged green PR.
2. Owner review/merge and separately approved web deployment/retest of reconnect, small-screen layout and icons.
3. Investigate measured Free CPU capacity with controlled evidence, without paid changes by default.
4. Archive exact attested M4 candidate and optionally issue a later reviewed exact-main candidate.
5. Resolve funding/upload permission and canonical external interfaces before proposing further execution.

## 31. Evidence-backed content drafts

[BUILD_LOG.md](social/BUILD_LOG.md) contains four M5 drafts: public web Alpha/simulation-only status, hosted headers and owner Keplr evidence, exact-source attested candidate, and deployment/reconnect hardening. Drafts only; nothing posted. No partnership/audit/users/TVL/funding/mainnet claims.

### Decisions carried forward

- Existing requested checkout/branch: owner preference; cost if wrong is later worktree isolation.
- Explicit reconnect Outcome B: avoids assuming universal silent permission; cost if wrong is one unnecessary click.
- Bounded320px/icon fixes: observed hosted defects within hardening scope; cost if wrong is a small reversible presentation diff.

### Resume instructions

Read this checklist, `git status --short`, current branch log and `.superpowers/sdd/M5_IMPLEMENTATION_PLAN/progress.md` if present. Do not restart M1–M5 or repeat completed hosted/dependency evidence. Finish Task2 review, then Task3, then one full acceptance gate. Runtime PATH starts `/Users/AIUSER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin`. Commands from root: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `NEXT_PUBLIC_APP_ENVIRONMENT=PUBLIC_ALPHA_UNDEPLOYED pnpm build`, local production browser tests/restart, `pnpm --filter @zigoals/web build:alpha`, `pnpm --filter @zigoals/web check:alpha`, local workerd tests, `pnpm check:deploy-configs`, `pnpm check:landing`, `node scripts/check-secrets.mjs`, `git diff --check`. Use separate owned local ports, preserve other servers. Update exact results, commit logical work, push this branch and create PR against main; observe quality/reproducibility CI without issuance. Never merge/deploy/sign.
