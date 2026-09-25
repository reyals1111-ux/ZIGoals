# Actual Run 10 verification — local, not released

Current application and clean packaged artifact source: `85cbb34016376f79204a138bd0f8cddd6c3d6b77`. Latest affected evidence: [source-specific receipts](evidence/post-attach-verification.json), [local copy](LOCAL_ATTACH_EVIDENCE.md). Earlier source-specific runs remain historical; do not add overlapping cases.

| Gate | Actual result and boundary |
|---|---|
| Toolchain | Node24.19.0 / pnpm11.19.0; project doctor passed. Optional local Rust/Docker toolchain unavailable; no speculative install. |
| Lint / types | Full lint and TypeScript passed after browser corrections. Earlier hook-ref warnings were recorded; no rule/test suppression introduced. |
| Latest full unit coverage |1341 distinct passes/1explicit opt-in skip:1337pass with4sandbox-loopback failures, then only those4 Worker tests rerun with permission and passed. Tests of atomic rollback and source copying included. [Receipts](evidence/post-attach-verification.json). |
| Earlier full units |1333 passed,1 opt-in two-profile browser skip,115 files passed/1 skipped on8924625; opt-in real-backend browser separately passed14.80s. Later app changes were recovery rendering/focus/fonts, verified by browser/type/build checks. |
| Full browser then affected rerun | First312-case run:219 passed/77 failed/16 historical opt-in capture skips,8.2min. Failures preserved. Updated actual changed display/selector contracts and fixed recovery/focus/font regressions; all154 cases in affected file families passed2.5min on2bf6f91. No tests disabled to get green. |
| New complete journey | JRN01 empty Health-only first use: food/meal/water/chosen metric, reload, keyboard/touch/no financial requests.2 local cases passed9.9s; final socket audit also passed in packaged suite. |
| Next / OpenNext | Latest production and OpenNext builds passed; final OpenNext build clean85cbb34, `PUBLIC_ALPHA_UNDEPLOYED`, `dirty:false`. No runtime auth/sync configuration added to public Alpha. |
| Deployment preparation | Deployment-config check and landing dry-run passed; private-sync, food-lookup and market-coordinator isolated dry-runs passed. Latest Alpha dry-run passed:12206.25KiB /2331.60KiB gzip. No publish. |
| Latest packaged affected checks |28passed23.9s on clean85cbb34: security, diagnostics, account isolation, Health-only, durable cross-tab writes and >2MB Health backup/export. No real phone or email. |
| Earlier packaged security browser |14 passed11.9s on local Wrangler8788: CSP/nonces/script rejection/private lifecycle/diagnostics/financial gates/Health-only including WebSocket audit. Mock public chain responses; no owner signature or live action. |
| Scans | Production dependency audit: no known vulnerabilities at high threshold. Changed-source credential-pattern scan passed. [1476 current built files](evidence/post-attach-artifact-scan.json): zero checked five-marker/pattern hits. No configured secret values/files available in actual/original worktree; exact-value scan unavailable, not implicitly passed. |
| Canonical / contract | [Canonical35925474426](https://github.com/reyals1111-ux/ZIGoals/actions/runs/35925474426) succeeded; both real validator paths and compare succeeded. [Exact merge/artifact record](CI_EVIDENCE.md); NOT_APPROVED. Contract job35925474513 succeeded. Newer final-head workflow status must be reported separately. |
| Performance | [Nine loopback samples](evidence/local-performance.json), all200. `/app` median14.109ms; Settings12.603ms; icon4.284ms. Three per route, no warmup, concurrent local browser activity. Request wall time only; no hosted CPU/large-scale claim. |
| Independent review | Account/UI, financial-method and final persistence/sync reviews corrected status logout, stale outcome, immutable-history overwrite, expensive exact arithmetic and Health receipt merge. [Final review](FINAL_SAFETY_REVIEW.md), [financial](FINANCIAL_METHOD_REVIEW.md), [account](ACCOUNT_INTEGRATION_REVIEW.md). Limited reviews, not a cryptographic audit or full milestone pass. |
| Recovery / inventory | Source-only ZIP restore/hash drill66 files passed; owner browser data not backed up. All290 original IDs/specifications and40 journeys retained; validator checks structural evidence/dependencies, not semantic completion. |

Required lifecycle, incremental/paged storage, conflict-resolution, larger-history, remaining financial and device journeys remain incomplete in [BLOCKERS](BLOCKERS.md). Hosted email, actual phone camera/keyboard and friends-ready sync have not been exercised. Existing historical failed CI/browser runs retain their original outcomes. No live market/food load was used to force acceptance.

Latest hosted CI snapshot for85cbb34: canonical35929563763 and quality35929563728 were in progress. Prior8bde332 canonical35928516072 succeeded; quality35928515988 was cancelled by the newer push. No final-head green result is inferred.
