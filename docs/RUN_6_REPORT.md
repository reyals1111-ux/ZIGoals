# Run 6 — CPU efficiency and repeatable measurement

**IN PROGRESS.** Use [RESUME_STATE](verification/m6/RESUME_STATE.md) for completed/current/pending work and exact next steps. Production remains read-only.

## 1. Starting main SHA

01ebf00f7a177ab86fb41b52164fa7f5320f644c

## 2. Branch

feat/m6-cpu-efficiency

## 3. Final branch SHA

IN PROGRESS; exact checkpoint identity in git and RESUME_STATE.md.

## 4. Files changed

NOT STARTED; will be filled with observed evidence, not assumptions.

## 5. Workers Paid context

OWNER_OBSERVED: Workers Paid, $5/month + usage. Free10ms is no longer the immediate availability constraint. No plan/billing changes by M6.

## 6. Production CPU baseline

Owner one-hour version-specific sample: P50~67.98ms, P90~160ms, P99/P99.9~200ms;79invocations,74assets,100%asset cache hit,0subrequests/errors. Tiny controlled samples are separate; see CPU_BASELINE.json.

## 7. Controlled route samples

/app [539,26,34,285,23] median34ms; /app/settings [32,18,19,16,18] median18ms; /icon.svg [60,29,12,9,6] median12ms. Wall data unavailable, not invented.

## 8. Privacy sanitization

No raw tail logs may enter Git. Store only whitelisted route/CPU/wall/status/outcome/version/generalized time. Owner samples supplied already sanitized.

## 9. Static paths

NOT STARTED; will be filled with observed evidence, not assumptions.

## 10. Middleware

NOT STARTED; will be filled with observed evidence, not assumptions.

## 11. Cold/warm findings

NOT STARTED; will be filled with observed evidence, not assumptions.

## 12. Startup profile

NOT STARTED; will be filled with observed evidence, not assumptions.

## 13. Server bundle

NOT STARTED; will be filled with observed evidence, not assumptions.

## 14. Heavy dependencies

NOT STARTED; will be filled with observed evidence, not assumptions.

## 15. SSR/CSP

NOT STARTED; will be filled with observed evidence, not assumptions.

## 16. OpenNext

NOT STARTED; will be filled with observed evidence, not assumptions.

## 17. vinext assessment

No migration authorized; research only if consequential to the architecture note.

## 18. Optimizations implemented

NOT STARTED; will be filled with observed evidence, not assumptions.

## 19. Optimizations rejected

NOT STARTED; will be filled with observed evidence, not assumptions.

## 20. CPU cap

NOT STARTED; will be filled with observed evidence, not assumptions.

## 21. Measurement tooling

NOT STARTED; will be filled with observed evidence, not assumptions.

## 22. Local before/after

NOT STARTED; will be filled with observed evidence, not assumptions.

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
