# Run 6 — CPU efficiency and repeatable measurement

**COMPLETED + MERGED + DEPLOYED + OWNER-VERIFIED LIVE.** [PR #6](https://github.com/reyals1111-ux/ZIGoals/pull/6) merged at live source `0c953a00d9f3e615289ae286549c74298b95dbdc`; the owner deployed Worker version `00799604-7999-4ef4-b75f-268d8a459f6f` at 100% traffic. [Post-deploy evidence](verification/m6/OWNER_POST_DEPLOY.json) and [resume state](verification/m6/RESUME_STATE.md) close the rollout. Historical implementation/local results below retain their original source scope; this documentation housekeeping performs no production action.

## 1. Starting main SHA

01ebf00f7a177ab86fb41b52164fa7f5320f644c

## 2. Branch

feat/m6-cpu-efficiency

## 3. Final branch SHA

Reviewed/tested implementation: `0380e6a6b8b667709c5674c7abb22089674bc509`. Final implementation branch tip including evidence-only documentation: `1ed639df909cf2f8c2f17241fc91264920e570c0`, confirmed by [PR #6](https://github.com/reyals1111-ux/ZIGoals/pull/6). Merged/live source: `0c953a00d9f3e615289ae286549c74298b95dbdc`. The separate housekeeping branch does not change the deployed source identity.

## 4. Original implementation files changed

- `README.md`
- `apps/web/app/layout.tsx`
- `apps/web/app/robots.ts`
- `apps/web/lib/public-safety.test.ts`
- `apps/web/middleware.ts`
- `apps/web/next.config.ts`
- `apps/web/public/_headers`
- `apps/web/public/icon.svg`
- `apps/web/public/robots.txt`
- `apps/web/tests/public-alpha.spec.ts`
- `apps/web/wrangler.alpha.jsonc`
- `docs/RUN_6_REPORT.md`
- `docs/STATUS.md`
- `docs/architecture/M6_CPU_PLAN.md`
- `docs/architecture/M6_SSR_CSP_ANALYSIS.md`
- `docs/deployment/CLOUDFLARE_ALPHA.md`
- `docs/deployment/CPU_OWNER_CHECKLIST.md`
- `docs/verification/m6/CPU_BASELINE.json`
- `docs/verification/m6/LOCAL_AFTER_ANALYSIS.json`
- `docs/verification/m6/LOCAL_AFTER_ROUTES.json`
- `docs/verification/m6/LOCAL_AFTER_WALL.json`
- `docs/verification/m6/LOCAL_BASELINE_ANALYSIS.json`
- `docs/verification/m6/LOCAL_BASELINE_WALL.json`
- `docs/verification/m6/LOCAL_VERIFICATION.json`
- `docs/verification/m6/README.md`
- `docs/verification/m6/RESUME_STATE.md`
- `scripts/check-deployment-configs.mjs`
- `scripts/check-deployment-configs.test.ts`
- `scripts/measure-alpha-performance.mjs`
- `scripts/measure-alpha-performance.test.mjs`
- `scripts/sanitize-alpha-tail.mjs`
- `scripts/sanitize-alpha-tail.test.mjs`

## 5. Workers Paid context

OWNER_OBSERVED: Workers Paid, $5/month + usage. Free10ms is no longer the immediate availability constraint. No plan/billing changes by M6.

## 6. Historical M5 production CPU baseline

Owner one-hour version-specific sample: P50~67.98ms, P90~160ms, P99/P99.9~200ms;79invocations,74assets,100%asset cache hit,0subrequests/errors. Tiny controlled samples are separate; see CPU_BASELINE.json.

## 7. Historical M5 controlled route samples

/app [539,26,34,285,23] median34ms; /app/settings [32,18,19,16,18] median18ms; /icon.svg [60,29,12,9,6] median12ms. Wall data unavailable, not invented.

## 8. Privacy sanitization

Owner data and local wall evidence are sanitized. Tested trace helper constructs only whitelisted scalar fields and rounded UTC hour;13 synthetic privacy/parser tests pass in the implementation gate. No live tail was opened during implementation. The owner subsequently supplied ten sanitized production records, rechecked from the saved capture during housekeeping. Owner recipe disables Wrangler disk logs and pipes directly into sanitizer, never raw files.

## 9. Static paths

Baseline icon/robots200 carried nonce/no-store and were absent from29direct assets. After: direct public files,200 without nonce/no-store, static security headers preserved;30assets, zeroHTML. Hashed Next assets remain immutable, social cards direct, _next/image exact handler. Explicit icon resolves; legacy favicon remains404.

## 10. Middleware

Exact filename and reserved-path boundaries replace loose prefix/dot exclusions. HTML/favicon404/lookalikes retain nonce/no-store; matcher, production-browser and workerd tests pass. Encoded /icon%2Esvg307 is asset normalization; encoded subpaths404 retain CSP.

## 11. Cold/warm findings

First fresh-process /app wall261.595→249.302ms with much cheaper later requests. Generated entry imports Next server handler lazily during fetch. Next/React/route/module initialization plausibly contributes; middleware/JIT/SSR costs not separately quantified. Owner539/285ms CPU spikes remain unattributed.

## 12. Startup profile

Local Wrangler startup sampled19.018→17.429ms active,16→15samples. Imports Worker entry without calling app fetch. Sparse/hardware-specific evidence, not invocation CPU or a proven startup win. Deployment startup timing was not obtained during implementation, which did not upload. These local values are not production startup measurements.

## 13. Server bundle

Bundle9382.72→8740.99KiB (~6.84% smaller), gzip1759.83→1621.67KiB (~7.85%). Server metafile393→382inputs. Next app-route runtime disappears when the metadata handlers are removed. No generated Worker patch.

## 14. Heavy dependencies

SSR source maps contain CosmJS, Zod, Decimal, registry and goal-engine sources (inventory in LOCAL_BASELINE_ANALYSIS.json). Signing clients already dynamically imported behind financial refusal. Bundle presence is not proof of per-request execution; no import rewrite justified yet.

## 15. SSR/CSP

See architecture/M6_SSR_CSP_ANALYSIS.md for all10 questions. Retain dynamic nonce HTML. Current16.3.5 Turbopack has SRI plumbing; external-file SRI is not a demonstrated inline-payload CSP replacement.

## 16. OpenNext

Matching public assets bypass the Worker; default server handler imports lazily after middleware. Move static metadata to public files; retain OpenNext configuration and SSR. No new storage/bindings.

## 17. vinext assessment

Current Cloudflare guidance recommends beta vinext and documents existing OpenNext maintenance. No installation/compatibility run/migration: cost and behavior unknown for this app.

## 18. Optimizations implemented

Public icon/robots, explicit icon metadata, tighter matcher, static security headers, 2000ms cap/config tests, bounded wall CLI and trace sanitizer. These changes are merged and owner-deployed. No business logic/contract/dependency/UX changes.

## 19. Optimizations rejected

No nonce removal/reuse, unsafe script sources, broad caching, import/tree-shaking hacks, library upgrades, custom Worker patches or framework migration. Source presence alone does not justify risky import changes.

## 20. CPU cap

The **2000ms** CPU limit is present in the config deployed from `0c953a00d9f3e615289ae286549c74298b95dbdc`, but **not separately confirmed by dashboard/version view**. It was chosen at3.71x the historical owner539ms sample and15x below the documented30000ms default. CPU is not wall time or a monthly spend cap;1102/`exceededCpu` remains possible. The exact-version last-1h owner window recorded zero `exceededCpu` events; this does not independently prove cap enforcement or future headroom.

## 21. Measurement tooling

Bounded wall CLI (19 tests) plus streaming offline trace sanitizer (13 tests). See CPU_OWNER_CHECKLIST for exact commands, version filtering, limits, metric distinctions and missing/asset-only evidence handling.

## 22. Local before/after

[Matched local evidence](verification/m6/README.md): /app median wall14.188→22.834ms; settings13.070→14.626ms; icon10.130→7.946ms. Dynamic medians did not improve. Five samples/route, fresh processes, identical CLI/order/spacing. Static bypass and smaller bundle are supported; production CPU improvement is NOT established.

## 23. Security regressions

All local gates pass: nonce/injected-script refusal/production script policy/canonical connect-src/frame/nosniff/referrer/noindex/no-store, HTTPS middleware HSTS, static headers and financial refusal. One independent security/performance code review found0Critical/Important/Minor issues at0380e6a (not a professional audit). Actual encoded workerd probes also preserve HTML boundaries.

## 24. Privacy regressions

13sanitizer privacy/parser tests and browser egress/backup/diagnostic/reload checks pass. No raw traces collected; private goals remain local. Chrome restart preserves scoped/damaged history without replay; signerCalls0/broadcastRequests0. Existing local-profile and infrastructure path-visibility risks remain documented.

## 25. JavaScript total

**559 passed**,28files (496baseline +63new). One full final local JS gate; targeted red/green tests preceded it.

## 26. Rust total

**25 passed** (6+18+1),0failures. Rustfmt/Clippy/schema/generated drift pass. No contract/package/lockfile diff; Rust suite run once.

## 27. Browser total

**46 passed**, desktop/mobile (44baseline +2static cases), plus full Chrome restart/recovery. Hosted real-extension evidence remains owner-supplied and distinct from mocks.

## 28. Workerd total

**14 passed** local workerd (public-alpha,diagnostics,wallet-reload). CI subset expected12(public-alpha+diagnostics). Production/Alpha builds, Alpha/landing dryruns, config/lint/types/secret checks pass. No dependency changes; CI retains existing supply-chain checks.

## 29. CI runs

Final implementation-head CI for `1ed639df909cf2f8c2f17241fc91264920e570c0` is recorded in [PR #6 description/checks](https://github.com/reyals1111-ux/ZIGoals/pull/6/checks): [Milestone quality 34789167639](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34789167639) and [Canonical reproducibility 34789167630](https://github.com/reyals1111-ux/ZIGoals/actions/runs/34789167630), both successful. These are historical implementation checks, not new housekeeping test runs. Local commands/results: [LOCAL_VERIFICATION.json](verification/m6/LOCAL_VERIFICATION.json).

## 30. PR

[PR #6: Milestone 6 — reduce Alpha Worker CPU overhead](https://github.com/reyals1111-ux/ZIGoals/pull/6), merged into main at `0c953a00d9f3e615289ae286549c74298b95dbdc`. GitHub records merge time `2026-09-13T23:27:53Z`. The separate documentation housekeeping PR remains unmerged.

## 31. Production mutations

Implementation originally performed none. The owner subsequently deployed the reviewed M6 Alpha, including its configured 2000ms CPU limit, as version `00799604-7999-4ef4-b75f-268d8a459f6f`. This housekeeping performs no deployment, rollback, Cloudflare, billing, DNS/email, contract or chain change.

## 32. Owner rollout checks completed

Owner verified the exact deployed version, CSP/security headers, real Keplr connection, Local Demo after refresh, explicit reconnect, Testnet diagnostics and 320px layout. `icon.svg` and `robots.txt` are direct static assets. Current Alpha remains simulation + wallet connection only; Goal Manager/Code ID **NOT DEPLOYED**, no financial signing/broadcast. Duplicate HSTS and X-Robots-Tag values on dynamic `/app` are a minor cleanup candidate, not a rollback issue.

## 33. Post-deploy measurement

Completed owner observations are retained in [OWNER_POST_DEPLOY.json](verification/m6/OWNER_POST_DEPLOY.json) and the [CPU comparison/checklist](deployment/CPU_OWNER_CHECKLIST.md). `/app` CPU [524,42,33,28,42], median **42ms** (baseline34ms); `/app/settings` [25,29,26,37,27], median **27ms** (baseline18ms). All ten dynamic records are HTTP200/outcome `ok`. `/icon.svg` has no Worker invocation and five HTTP200 client requests with cache-hit corroboration: **asset bypass / Worker CPU N/A**, not0ms.

Cloudflare exact-version **last 1 hour**: CPU P50 **120ms**, P90 **229ms**, P99 **428ms**, P99.9 **428ms**; **61 invocations**, **12 asset requests**, **100% cache hit**, **0 subrequests**, **0 errors**, **0 exceededCpu events**. The absolute dashboard window was not supplied; the controlled capture records only the rounded UTC hour `2026-09-14T19:00:00.000Z`.

**Static-routing optimization succeeded; dynamic Next/OpenNext SSR CPU did not improve in this window.** Bundle remains **~6.84% smaller**. Neither the controlled medians nor dashboard percentiles demonstrate a dynamic CPU improvement; these are separate small observations, not matched production distributions or causal attribution.

## 34. Remaining risks

Tiny CPU/wall samples and sparse profiles limit attribution; the `/app`524ms spike persists. Dynamic HTML remains SSR and dynamic CPU did not improve in this window. Dashboard/version view did not independently confirm the deployed-config cap; a2s cap may terminate legitimate outliers and does not bound monthly spend. Goal Manager/Code ID absent; wallet last owner-observed0ZIG; real financial signing NOT RUN. Duplicate dynamic HSTS/X-Robots-Tag values remain a minor cleanup candidate.

## 35. Next roadmap gate; performance work deferred

The post-deploy dashboard/tail comparison is complete. No numbered M7 is currently defined. The next documented product gate is [owner testnet readiness and first idle-contract deployment/exit proof](deployment/OWNER_TESTNET_CHECKLIST.md): obtain test funds and confirmed upload permission, approve the exact attested artifact, then separately authorize deployment and the tiny deposit/partial withdrawal/full withdrawal/close checks. The existing candidate is still **ATTESTED_CANDIDATE_NOT_APPROVED** for its own source, not for M6. This identifies the gate without starting it. Simulation-only feedback can use the existing [Alpha tester guide](testing/ALPHA_TESTER_GUIDE.md).

Astra Run #7 is deferred. If separately prioritized later, the next CPU investigation should attribute persistent lazy Next/React/route initialization versus middleware costs before changing imports. A static-shell/hash/SRI or vinext experiment remains a separate feasibility decision requiring equivalent security and matched CPU evidence.
