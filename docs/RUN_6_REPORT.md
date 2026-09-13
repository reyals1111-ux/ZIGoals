# Run 6 — CPU efficiency and repeatable measurement

**Local work complete; PR #6 opened and left unmerged.** [Resume state](verification/m6/RESUME_STATE.md) identifies the checkpoint. Final exact-head CI is recorded in the PR description/checks without changing the commit being checked. Production mutations = **NONE**.

## 1. Starting main SHA

01ebf00f7a177ab86fb41b52164fa7f5320f644c

## 2. Branch

feat/m6-cpu-efficiency

## 3. Final branch SHA

Reviewed/tested implementation: `0380e6a6b8b667709c5674c7abb22089674bc509`. The final branch tip including evidence-only documentation is recorded as `headRefOid` in [PR #6](https://github.com/reyals1111-ux/ZIGoals/pull/6) and in the final handoff. A commit cannot embed its own SHA; no application/test changes follow this tested source.

## 4. Files changed

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

## 6. Production CPU baseline

Owner one-hour version-specific sample: P50~67.98ms, P90~160ms, P99/P99.9~200ms;79invocations,74assets,100%asset cache hit,0subrequests/errors. Tiny controlled samples are separate; see CPU_BASELINE.json.

## 7. Controlled route samples

/app [539,26,34,285,23] median34ms; /app/settings [32,18,19,16,18] median18ms; /icon.svg [60,29,12,9,6] median12ms. Wall data unavailable, not invented.

## 8. Privacy sanitization

Owner data and local wall evidence are sanitized. Tested trace helper constructs only whitelisted scalar fields and rounded UTC hour;13 synthetic privacy/parser tests pass. No live tail opened. Owner recipe disables Wrangler disk logs and pipes directly into sanitizer, never raw files.

## 9. Static paths

Baseline icon/robots200 carried nonce/no-store and were absent from29direct assets. After: direct public files,200 without nonce/no-store, static security headers preserved;30assets, zeroHTML. Hashed Next assets remain immutable, social cards direct, _next/image exact handler. Explicit icon resolves; legacy favicon remains404.

## 10. Middleware

Exact filename and reserved-path boundaries replace loose prefix/dot exclusions. HTML/favicon404/lookalikes retain nonce/no-store; matcher, production-browser and workerd tests pass. Encoded /icon%2Esvg307 is asset normalization; encoded subpaths404 retain CSP.

## 11. Cold/warm findings

First fresh-process /app wall261.595→249.302ms with much cheaper later requests. Generated entry imports Next server handler lazily during fetch. Next/React/route/module initialization plausibly contributes; middleware/JIT/SSR costs not separately quantified. Owner539/285ms CPU spikes remain unattributed.

## 12. Startup profile

Local Wrangler startup sampled19.018→17.429ms active,16→15samples. Imports Worker entry without calling app fetch. Sparse/hardware-specific evidence, not invocation CPU or a proven startup win. Deployed startup_time_ms NOT obtained; upload forbidden.

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

Public icon/robots, explicit icon metadata, tighter matcher, static security headers, proposed2000ms cap/config tests, bounded wall CLI and trace sanitizer. No business logic/contract/dependency/UX changes.

## 19. Optimizations rejected

No nonce removal/reuse, unsafe script sources, broad caching, import/tree-shaking hacks, library upgrades, custom Worker patches or framework migration. Source presence alone does not justify risky import changes.

## 20. CPU cap

2000ms proposed cap,3.71x owner539ms and15x below default30000ms. CPU is not wall time or a monthly spend cap;1102/exceededCpu possible. Requires exact-version owner rollout monitoring; NOT deployed.

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

Exact final-head Milestone quality and Canonical reproducibility run IDs/URLs/job outcomes/head are recorded in [PR #6 description/checks](https://github.com/reyals1111-ux/ZIGoals/pull/6/checks) after the evidence checkpoint push. This avoids a documentation commit changing the SHA whose CI it reports. Verify `gh pr view 6 --repo reyals1111-ux/ZIGoals --json headRefOid,statusCheckRollup`. Local commands/results: [LOCAL_VERIFICATION.json](verification/m6/LOCAL_VERIFICATION.json).

## 30. PR

[PR #6: Milestone 6 — reduce Alpha Worker CPU overhead](https://github.com/reyals1111-ux/ZIGoals/pull/6), main target, unmerged. Connected app creation returned403; existing authenticated GitHub CLI succeeded.

## 31. Production mutations

NONE. No deployment, rollback, billing, production limit, DNS/email, chain action or outreach.

## 32. Owner next steps

Owner: review PR #6 and exact-head CI; merge only if approved; sync clean exact main; run `pnpm check:deploy-configs`, `pnpm --filter @zigoals/web build:alpha`, `pnpm --filter @zigoals/web check:alpha`; inspect alpha-build.json; record current rollback version; separately approve Alpha deployment; retest CSP/real Keplr/reload/reconnect/mobile/no financial signing; perform CPU_OWNER_CHECKLIST. No apex/contract/billing changes.

## 33. Post-deploy measurement

Exact-version one-hour dashboard and15 controlled GET procedure in deployment/CPU_OWNER_CHECKLIST.md. Baseline vs M6 placeholders remain PENDING until owner separately deploys and measures. No live result inferred.

## 34. Remaining risks

Production CPU/cap enforcement awaits owner rollout. Tiny CPU/wall samples and sparse profile limit attribution. Dynamic HTML remains SSR; local dynamic medians did not improve. A2s cap may terminate legitimate outliers and does not bound monthly spend. Goal Manager/code ID absent; wallet0ZIG; real financial signing NOT RUN.

## 35. Next three performance tasks

1. Owner exact-version postdeploy dashboard/tail comparison, including failures and first requests.
2. If spikes persist, one targeted invocation profile separating lazy Next/React/route initialization from middleware; change imports only with attribution.
3. If costs justify it, a separate strict static-shell/hash/SRI or vinext feasibility milestone with equivalent security and matched CPU evidence.
