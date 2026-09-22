# PRE-RUN #10 — RELIABILITY HARDENING / P2 CLOSURE

Actual Run #10 has not started. Owner request is the implementation specification.
Starting PR #20: OPEN/DRAFT, head 43abfc780555e2daa3b0aa2a1a0ad5524147b5f3,
base 95ff4d3ea3e0d8c2c33b497bdcefaac0cc539a90. Clean checkout and hosted checks verified.

## Implementation checkpoints
- [x] A: independent minute calls/month credits, operating ceilings, monitoring reserve/cap,
  optional cutoff; bounded queue, reservation, dispatch ownership, dispatch and settlement.
  Test budget policy with synthetic limits, both admission orders, cancellation and rollover.
- [ ] B: typed expected validation failures; transport/programming separation; rejected-body
  cleanup. Test real synthetic streams and preserve the provider-to-browser P1 regression.
- [ ] C: pure generation/fence/deadline publication and follower semantics; one provider
  attempt associated with many work keys, one charge/settlement and per-work publication.
- [ ] D: retain acceptance dimensions with derived summary; pure scoped breaker transitions.
- [ ] E: account facts, semantic contracts, limitations, focused and complete verification.

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
