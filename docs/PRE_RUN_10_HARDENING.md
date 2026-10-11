# PRE-RUN #10 — RELIABILITY HARDENING / P2 CLOSURE

Actual Run #10 has not started. Owner request is the implementation specification.
Starting PR #20: OPEN/DRAFT, head 43abfc780555e2daa3b0aa2a1a0ad5524147b5f3,
base 95ff4d3ea3e0d8c2c33b497bdcefaac0cc539a90. Clean checkout and hosted checks verified.

## Implementation checkpoints
- [x] A: independent minute calls/month credits, operating ceilings, monitoring reserve/cap,
  optional cutoff; bounded queue, reservation, dispatch ownership, dispatch and settlement.
  Test budget policy with synthetic limits, both admission orders, cancellation and rollover.
- [x] B: typed expected validation failures; transport/programming separation; rejected-body
  cleanup. Test real synthetic streams and preserve the provider-to-browser P1 regression.
- [x] C: pure generation/fence/deadline publication and follower semantics; one provider
  attempt associated with many work keys, one charge/settlement and per-work publication.
- [x] D: retain acceptance dimensions with derived summary; pure scoped breaker transitions.
- [x] E: account facts, semantic contracts, limitations, focused and complete verification.

Each checkpoint runs focused tests, commits and pushes the existing draft branch, then
checks local/remote HEAD and worktree. No new PR, merge, deployment, production activation,
UI work or public Alpha market requests. No claim that the original 503 incident is fixed.

## Budget design
One provider attempt counts as one minute request; configurable cost counts monthly credits.
All accepted holds count toward capacity. Non-monitoring usage has its own ceiling below
reserved monitoring capacity; monitoring has an independent cap below the total ceiling.
Reservations do not own concurrency. A bounded queue costs nothing. Ownership acquires a
slot before durable dispatch. Only dispatched attempts charge; canceled holds release budget.
Policy changes and expired holds require a fresh reservation; monitoring cannot revoke a hold.
Calendar-month boundaries are explicit caller inputs; there is no provider daily limit.

Checkpoint A: 12 focused budget/coordinator tests and typecheck passed.

Checkpoint B: 158 focused market/provider tests and typecheck passed. Cleanup has a
250ms best-effort grace; cancellation failure cannot mask the original sanitized failure.

Checkpoint C: 42 focused budget/fence/coordinator/pending/route tests passed; typecheck passed.
Publication requires the current token, generation and fence, with now strictly before both
work deadline and lease expiry. Earlier completion does not authorize a later commit.
Previously committed complete evidence remains usable; partial evidence survives timeout
with degradation. A successor fences out its predecessor. Dispatched uncertainty stays charged.
One provider attempt contains multiple public work associations and one cost reservation;
settlement occurs once independently of per-work canonical validation and fenced publication.
No durable backend exists. The existing process-local caches now report late completion
as degradation instead of silently returning apparent success; successor state is untouched.

Checkpoint D: acceptance reports retain reachability, security, identity and all four probe
values alongside a deterministic summary. Security/identity failure takes precedence once
the application is reached; BLOCKED retains untested dimensions. Mixed failures remain visible.
Breaker state is scoped to account authentication, proven account throttle, endpoint availability,
endpoint integrity or a public pair. Local budget/queue, blocked and unknown outcomes do not
increment provider failure counters, including half-open probes. Windows, thresholds, cooldown,
maximum cooldown and probe counts are injected. Issued permits fence late/duplicate settlement.
No breaker activation or deployment-gate integration. Focused tests and typecheck passed.

## Checkpoint E / verification and review

Independent review identified a follower-deadline bypass: complete evidence published at/after
that follower's deadline could be called VERIFIED. Two regressions failed before the correction;
publication must now precede the follower deadline. Late evidence is retained with TIMEOUT.
Reviewer found no additional actionable defects; production adapter limitations remain explicit.

Pinned toolchain: Node 24.19.0 / pnpm 11.19.0. At checkpoint D, all 1,118 unit tests in 86
files passed, lint passed, deployment configs passed, tracked-source credential pattern scan
passed. Final post-review verification is recorded below when run. The permanent P1 regression
(provider → server cache → route → transport → browser cache) passed throughout.

Owner account facts are recorded in the canonical master plan: Demo, 100 calls/minute,
10,000 monthly credits, observed 171 used / 9,829 remaining (1.7%) on 2026-09-22,
calendar replenishment with October 1, 2026 displayed, ZIGoals-only key, Demo /key 401/10005.
Dashboard is authoritative; internal accounting is conservative. No daily provider cap and
no fixed future endpoint credit weight. Runtime process-local 12/min admission is unchanged.

## Remaining activation work and owner action

Review this draft and the final CI evidence; approve a single ACTUAL Run #10 master prompt
before starting that major product/platform milestone. Choose operating ceilings, reserve/cap,
optional cutoff, endpoint costs and reset timezone; specify workload/SLOs, shared cache,
durable transaction/recovery/tombstone retention and privacy/operational access policy.
Implement and fault-test the durable adapter before global admission, scheduling or breakers
are activated; migrate per-pair public outcomes before claiming per-request refresh health.
Obtain an approved runner investigation/market acceptance for the still-unconfirmed live 503
incident, separately from security/deployment identity checks. Any merge/release/deployment
needs explicit owner authorization. Run #9.2 baseline, rollback, undeployed Goal Manager/Code ID,
disabled signing/broadcast and PUBLIC_ALPHA_UNDEPLOYED boundaries remain unchanged.

## Final local verification

Verified implementation/documentation head: `ce5f19a5a64316bc6ddcbe403705f6bccc5b639e`.
The final verification-record commit changes documentation only; the build attests to that
implementation head, not a deployment or a later commit identifier.

| Check | Result |
| --- | --- |
| Focused market/provider/budget/fence/coordinator/acceptance/breaker/pending/media/server-boundary | 26 files / 200 tests PASS |
| P1 provider → server cache → route → transport → browser cache | PASS in focused and full suites |
| Full unit suite after review correction | 86 files / 1,120 tests PASS |
| Lint / typecheck / diff whitespace | PASS |
| Deployment configuration checks | PASS, isolated and internally consistent |
| Alpha build | PASS, clean ce5f19a source, PUBLIC_ALPHA_UNDEPLOYED |
| Wrangler dry-run | PASS; existing WORKER_SELF_REFERENCE and ASSETS only; no deployment |
| Source/diff/deployable credential scans | PASS limited patterns; 962 source / 1,384 deployable files; zero findings |
| Independent review | One follower-deadline P2 found and fixed; reviewer confirmed all 10 fencing tests PASS |

The initial dry-run completed but could not write Wrangler's log outside the sandbox.
It was repeated cleanly with WRANGLER_LOG_PATH pointing into /private/tmp. No config change.
No named secret values were available locally for exact-value comparison (count zero).
The scan therefore establishes pattern checks, not proof against a known production key;
the existing Alpha build sanitizer also completed. No exhaustive security audit is claimed.
No credentials, raw provider bodies or private user data were added to operational state.
No product UI, contracts, financial execution, production bindings or deployment gate changed.
No public Alpha market requests, merge, ready-for-review action, new PR or deployment occurred.

## Durable checkpoints

| Phase | Pushed commit |
| --- | --- |
| A — budget/fairness/queue | 1c32478e75c0d43bce8278b5ce3dc4177125e284 |
| B — provider errors/cleanup | 0a88e6d313e3465770dd225693515cec9c3e21ec |
| C — leases/fences/multi-key attempt | 1b57c5e2a1b6b2b90b3605d3019c88638f4b3887 |
| D — acceptance/breaker semantics | 572c76be5257fd6f853bca430d73b4b1c7acbdc2 |
| E — account facts/docs/review correction | ce5f19a5a64316bc6ddcbe403705f6bccc5b639e |

Local HEAD, remote branch HEAD and clean worktree were checked after every pushed phase.
Final hosted CI state is reported in the owner handoff after the final documentation push;
no repeated CI polling is needed. PR #20 must remain OPEN / DRAFT.

## Changed files

- `apps/web/lib/exact-market-json.ts`
- `apps/web/lib/market-acceptance.test.ts`
- `apps/web/lib/market-acceptance.ts`
- `apps/web/lib/market-assets.ts`
- `apps/web/lib/market-history.ts`
- `apps/web/lib/market-insights-cache.ts`
- `apps/web/lib/market-insights.ts`
- `apps/web/lib/market-quote-cache.ts`
- `apps/web/lib/market-quotes.ts`
- `apps/web/lib/pending-work.test.ts`
- `apps/web/lib/provider-validation.ts`
- `apps/web/lib/server/coingecko.ts`
- `apps/web/lib/server/market-breaker.test.ts`
- `apps/web/lib/server/market-breaker.ts`
- `apps/web/lib/server/market-budget-policy.test.ts`
- `apps/web/lib/server/market-budget-policy.ts`
- `apps/web/lib/server/market-coordinator.test.ts`
- `apps/web/lib/server/market-coordinator.ts`
- `apps/web/lib/server/market-work-fence.test.ts`
- `apps/web/lib/server/market-work-fence.ts`
- `apps/web/lib/server/provider-boundary.test.ts`
- `apps/web/lib/server/provider-failure.ts`
- `docs/PRE_RUN_10_HARDENING.md`
- `docs/RUN_10_BETA_RELIABILITY_MASTER_PLAN.md`
- `docs/verification/run10-1/README.md`
