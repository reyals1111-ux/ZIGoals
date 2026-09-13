# Run 6 — CPU efficiency and repeatable measurement

**IN PROGRESS.** Use [RESUME_STATE](verification/m6/RESUME_STATE.md) for completed/current/pending work and exact next steps. Production remains read-only.

## 1. Starting main SHA

01ebf00f7a177ab86fb41b52164fa7f5320f644c

## 2. Branch

feat/m6-cpu-efficiency

## 3. Final branch SHA

IN PROGRESS; exact checkpoint identity in git and RESUME_STATE.md.

## 4. Files changed

Scaffold plus `scripts/measure-alpha-performance{,.test}.mjs`, `LOCAL_BASELINE_WALL.json`, `LOCAL_BASELINE_ANALYSIS.json`; final exact manifest pending.

## 5. Workers Paid context

OWNER_OBSERVED: Workers Paid, $5/month + usage. Free10ms is no longer the immediate availability constraint. No plan/billing changes by M6.

## 6. Production CPU baseline

Owner one-hour version-specific sample: P50~67.98ms, P90~160ms, P99/P99.9~200ms;79invocations,74assets,100%asset cache hit,0subrequests/errors. Tiny controlled samples are separate; see CPU_BASELINE.json.

## 7. Controlled route samples

/app [539,26,34,285,23] median34ms; /app/settings [32,18,19,16,18] median18ms; /icon.svg [60,29,12,9,6] median12ms. Wall data unavailable, not invented.

## 8. Privacy sanitization

No raw tail logs may enter Git. Store only whitelisted route/CPU/wall/status/outcome/version/generalized time. Owner samples supplied already sanitized.

## 9. Static paths

Baseline workerd: icon+robots200 with nonce/no-store and absent from direct asset package. Favicon404 and no nonce; social SVG/PNG200 via asset binding; _next/image400 without input; dynamic subpath404 retains nonce.29 direct assets, zero HTML.

## 10. Middleware

Implemented exact static exclusions and reserved Next endpoint boundaries. Missing favicon404 now retains CSP; loose prefix/dot bypasses removed.48 targeted static/config tests pass; browser integration pending.

## 11. Cold/warm findings

Fresh local process /app first261.595ms wall then10.934–18.831ms. Plausible lazy Next/route initialization, not causal proof for owner285/539ms CPU spikes.

## 12. Startup profile

Wrangler4.131.1 check startup is verified local Miniflare entry import, not app fetch.16 samples:19.018ms active,2.536ms GC,77.415ms idle. Too sparse for module CPU attribution.

## 13. Server bundle

Baseline dryrun9382.72KiB / gzip1759.83KiB. OpenNext global entry imports middleware/images/context; fetch lazily imports server handler. Metafile contains393 inputs, including bundled Next/React and precompiled SSR chunks.

## 14. Heavy dependencies

SSR source maps contain CosmJS, Zod, Decimal, registry and goal-engine sources (inventory in LOCAL_BASELINE_ANALYSIS.json). Signing clients already dynamically imported behind financial refusal. Bundle presence is not proof of per-request execution; no import rewrite justified yet.

## 15. SSR/CSP

See architecture/M6_SSR_CSP_ANALYSIS.md for all10 questions. Retain dynamic nonce HTML. Current16.3.5 Turbopack has SRI plumbing; external-file SRI is not a demonstrated inline-payload CSP replacement.

## 16. OpenNext

Matching public assets bypass the Worker; default server handler imports lazily after middleware. Move static metadata to public files; retain OpenNext configuration and SSR. No new storage/bindings.

## 17. vinext assessment

Current Cloudflare guidance recommends beta vinext and documents existing OpenNext maintenance. No installation/compatibility run/migration: cost and behavior unknown for this app.

## 18. Optimizations implemented

Public icon/robots; explicit same-origin icon metadata; exact matcher; static response security headers; reviewed2000ms CPU cap plus config regressions.

## 19. Optimizations rejected

No nonce removal/reuse, unsafe script sources, broad caching, import/tree-shaking hacks, library upgrades, custom Worker patches or framework migration. Source presence alone does not justify risky import changes.

## 20. CPU cap

2000ms proposed cap,3.71x owner539ms and15x below default30000ms. CPU is not wall time or a monthly spend cap;1102/exceededCpu possible. Requires exact-version owner rollout monitoring; NOT deployed.

## 21. Measurement tooling

Bounded wall CLI implemented,19 targeted tests pass. Fixed3 routes,1–20 requests each,10s timeout,2MiB body cap, no credentials/redirects/body/header/raw-error storage. Arithmetic median and nearest-rank p90/p95.

## 22. Local before/after

Baseline only: local /app median14.188ms, settings13.07ms, icon10.13ms. Matched after run pending; no production improvement claim.

## 23. Security regressions

NOT STARTED; will be filled with observed evidence, not assumptions.

## 24. Privacy regressions

NOT STARTED; will be filled with observed evidence, not assumptions.

## 25. JavaScript total

NOT STARTED; will be filled with observed evidence, not assumptions.

## 26. Rust total

NOT STARTED; will be filled with observed evidence, not assumptions.

## 27. Browser total

NOT STARTED; will be filled with observed evidence, not assumptions.

## 28. Workerd total

NOT STARTED; will be filled with observed evidence, not assumptions.

## 29. CI runs

NOT STARTED; will be filled with observed evidence, not assumptions.

## 30. PR

NOT STARTED; will be filled with observed evidence, not assumptions.

## 31. Production mutations

NONE. No deployment, rollback, billing, production limit, DNS/email, chain action or outreach.

## 32. Owner next steps

Review unmerged green PR; merge only if approved; sync exact main; build/dryrun; record rollback version; separately authorize Alpha deployment; retest security/Keplr/mobile; measure exact deployed version and compare.

## 33. Post-deploy measurement

NOT STARTED; will be filled with observed evidence, not assumptions.

## 34. Remaining risks

Spike cause unproven; tiny CPU samples and missing wall data; local timings are not Cloudflare invocation CPU. Goal Manager remains absent, wallet0ZIG, real financial signing NOT RUN.

## 35. Next three performance tasks

NOT STARTED; will be filled with observed evidence, not assumptions.
