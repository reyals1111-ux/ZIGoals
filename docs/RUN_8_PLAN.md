# Astra Run #8 Implementation Plan

**Goal:** connect existing wealth and supporting Habits to private Goals without requiring custody.
**Architecture:** pure VM-independent exact-integer Position/allocation/Goal engine; GET-only public staking provider; versioned browser-local state; additive V2.1 components. Preserve existing execution guards and all Health V1 code/data.
**Spec:** [complete authorized master prompt](RUN_8_ASTRA_MASTER_PROMPT.md).
**Base:** fresh origin/main 94df488cd98d2a1cdc15bd11011521d24fc8066e.

Execute inline in checkpoint order; tests precede financial/domain behavior.

- [x] A: persist full master brief, roadmap, backlog, Health future scope and corrected current state; commit before product implementation.
- [x] B: apps/web/lib/positions.ts pure platform model and allocation primitives; apps/web/lib versioned persistence; exact units, malformed/newer migration tests.
- [x] C: apps/web/lib GET-only native staking client with fixed network endpoints, pagination, validation and provenance; watch-only UI with no wallet signer path; provider/projection/safety tests.
- [x] D: pure Quantity/Value/Reward/Project progress, allocations, contribution scenarios and Funding Health; conservation/property tests, balance reductions and closed-goal release.
- [x] E: additive Goals subview and detail components using existing panel/button/field styles; Positions and manual input; browser integration checks.
- [x] F: evolve habits.ts and Habit components through deterministic V1 migration, prospective rules, period-aware metrics, controls, templates and insights; targeted tests.
- [x] G: Today, Goal-linked behavior and private backups; preserve existing Health V1 and transaction journal; regression/privacy tests.
- [ ] H: run required full validation once coherent, record individual failures/limitations, exact commits/head, screenshots and hosted CI; push review branch and stop before merge/deploy.

Each phase: write behavior tests, observe failure, implement, run targeted tests/typecheck, inspect full diff, commit/push coherent checkpoint. Retain incomplete scope explicitly in backlog and exact resume state.

Funding is solved (owner evidence); whitelist remains blocked. No unnecessary transfers or deploy candidate builds. No production deployment.
