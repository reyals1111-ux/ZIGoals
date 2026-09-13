# ZIGoals M5 independent whole-branch review

Reviewed range: `6be2de74f22f676e6a633ed05208decebb0dbff3..03a8cffdee352b10565ed8ef04d8e58f2af16f37`.
Repository: `/Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals`.

## Strengths

- `apps/web/components/goal-provider.tsx:164`, `:388`, `:418` implement the permitted Outcome B narrowly: a strict boolean sessionStorage hint changes presentation only, is saved after the existing asynchronous connection checks succeed, and is cleared by explicit Local demo. Initial mode/owner remain local; no passive extension access, signer acquisition or new financial capability is introduced. Existing revision/account invalidation still precedes acceptance of asynchronous results.
- `apps/web/components/shell.tsx:69` and `:94` make the reconnect action and intentional reload behavior clear without claiming that Keplr permission is universally silent. The corrected owner checklist explicitly handles copied tab session storage. New provider/browser cases cover rejected/invalid/unavailable storage, local choice, reload, independent tabs, and explicit connection completion.
- `landing/wrangler.jsonc:5`, `landing/.assetsignore:1`, `scripts/check-deployment-configs.mjs:41` and `.github/workflows/ci.yml:31` address the observed config-relative path failure and add useful isolation checks. The actual retained dry-run log exits without upload; the static allowlist admits only index.html. Owner runbooks separate Worker/config/version targets and preserve rollback and approval boundaries.
- `landing/index.html:430` fixes the oversized halo using available width rather than hiding overflow. Local explicit icons add no external resource. Browser checks preserve the exact Alpha CTA, disclaimer, target/rel and responsive layout.
- Evidence separates owner extension observations, independent hosted requests, local regression tests and exact-source release provenance. Null owner observation timestamps, the retained initial browser synchronization failure, live favicon/layout findings, Google Fonts on the apex, uncaptured browser-managed favicon traffic, and unverified private email delivery are disclosed. No later-source attestation, professional audit, financial execution or M5 deployment claim was introduced.
- The Cloudflare Free-plan CPU concern is reported as a capacity risk with the actual active-version median and observation window, rather than inferred from client latency or dismissed because displayed errors are zero. Historical M1–M4 reports remain unchanged.

## Issues

### Critical — must fix

None found in the reviewed range.

### Important — should fix

None found in the reviewed range. The pending PR/CI finalization is an explicit acceptance gate, not an unreported implementation defect.

### Minor — nice to have

1. **Manual evidence probe can silently replace a previous observation.** `scripts/verify-hosted-alpha.mjs:11` accepts an existing directory with recursive mkdir; `:132` then unconditionally writes `HOSTED_SMOKE.json`, and the screenshot paths are reused too. Repeating the literal example in `docs/verification/m5/README.md:25` can therefore destroy the previous local observation, despite the instruction at `:28` not to overwrite evidence. Require a newly created output directory (fail with EEXIST), or create a unique timestamped child directory before opening Chrome. This is a local evidence-retention improvement; no production or wallet state is affected, and it does not invalidate the already committed M5 observation.

## Verification and scope

Reviewed the owner Run 5 brief, implementation plan, full changed code and current documentation, structured evidence, and the progress ledger. The large hosted capture was inspected by its actual distinct URLs/header fields, methods/bodies, sampled raw records, response headers, diagnostics, findings and provenance; repeated equivalent request headers were not needlessly reprinted. Read the unchanged build-mode parser and quote/execute/sign/broadcast guard placement directly. Contract source and lockfiles are outside the changed range; this review does not claim a new exhaustive contract audit.

Read `docs/verification/m5/LOCAL_RESULTS.json` and decisive existing log lines. They support 496 JavaScript tests across 26 files, 25 Rust tests, 44 corrected production-browser cases and 12 local workerd cases, with real non-uploading landing/Alpha dry runs. The initial 43-pass/1-fail browser run remains recorded and its connection-completion wait correction is present. Other local lint/type/build/schema/restart/secret/integrity checks are recorded with source identities. No test suite, hosted probe, research, deployment, release issuance or account mutation was rerun for this review. Checkout, index and HEAD were not changed.

## Recommendations

Complete and record the actual PR quality/reproducibility outcomes and PR URL before marking Run 5 finished; retain the distinction between local and CI test totals and the exact checked source. Carry the CPU capacity concern into the owner handoff before wider rollout. Any later Alpha/apex deployment or candidate issuance remains a separate owner decision; a merge does not approve financial execution. The minor probe-directory issue can be fixed narrowly or recorded as a nonblocking follow-up without repeating hosted evidence.

## Assessment

**Spec alignment:** The substantive Run 5 implementation and evidence requirements are met at this local acceptance checkpoint. The observed presentation fixes are justified hardening within scope. No material scope drift or production mutation was found in the reviewed changes.

**Ready to merge? Yes, conditional on green actual PR checks and completing the final report/CI evidence.** No Critical or Important code finding blocks owner review. Run 5 is not fully complete while those explicitly pending acceptance steps remain; this verdict grants no deployment, release or financial authorization.

## Scoped fix review and disposition

- **Manual probe can overwrite prior evidence — ADDRESSED.** `scripts/verify-hosted-alpha.mjs:11` now uses exclusive `mkdir(output)` before browser startup; existing empty/nonempty output directories fail before the final report or screenshots can replace prior files.
- **New breakage — Minor documentation contradiction.** `docs/verification/m5/README.md:22` says to “first create an existing parent directory and a new output directory beneath it.” Pre-creating the output causes the newly required EEXIST failure. Say “ensure the parent directory exists and choose a new, nonexistent output-directory path beneath it”; let the script create that output.
- **Out-of-scope observations — None.**
- **Checks — Read the supplied `03a8cff..cd70aba` fix package once and the targeted fix report.** The report names existing-empty/existing-nonempty CLI checks, shows nonzero/pass and sentinel-preservation outputs, and records EEXIST, syntax, lint and diff checks. The code order supports the no-browser/no-network claim. No tests or hosted checks rerun; no repository mutations or subagents.
- **Fix round — Original finding addressed; no new Critical/Important breakage.** One new Minor wording correction above. Prior whole-branch readiness remains conditional on actual green PR checks and final evidence publication.

The final script fix is `cd70aba`. Its exclusive output-directory creation prevents evidence replacement. The remaining introductory README wording is nonblocking; the following explicit must-not-exist rule is correct. Exact operating rule: ensure the parent exists, choose a nonexistent output path, and let the script create it. A mistakenly pre-created directory fails safely with EEXIST before Chrome.

Process record: [subagent-driven-development skill](/Users/AIUSER/.agents/skills/subagent-driven-development/SKILL.md) says “There is no second fix wave”. After the one final wave and scoped re-review, this residual Minor is recorded with a ruling instead of another fix wave. No security/correctness or validation gate is waived.
