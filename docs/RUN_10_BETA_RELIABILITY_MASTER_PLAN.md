# ZIGoals — Run #10: Beta Reliability & Trust

## 1. Objective
Reliable Market Evidence for Beta: preserve independently verified public evidence, truthfully expose degradation, and prepare account-wide capacity control without changing financial semantics. Run #10.1 is the foundation only, with no deployment or production coordinator activation.

## 2. User value
Valid prices survive unrelated failures. Missing evidence stays missing, stale evidence stays stale, and manual valuation remains available. Reliability must not disclose a private portfolio or invent a price.

## 3. Current evidence
This plan consolidates the owner-supplied completed Run #10 Prep & Beta Hardening Audit and Run #10.0 Market Reliability Investigation findings, checked against source at `95ff4d3ea3e0d8c2c33b497bdcefaac0cc539a90`. The audits are supplied in the Run #10.1 brief; no nonexistent repository audit artifact is implied.
Run #9.2 closure PR #19 reviewed head: `2a9deead68ddd187b13f0505319cf0962f97adff`. Deployment `35702856008`: SUCCESS / VERIFIED, security/source smoke 11/11 PASS. Live Worker `768673e8-9d39-4022-b1c0-fdd805fa2318`; rollback `cca2b972-3b40-47a6-affe-1249fe260465`.
Immediate market acceptance: native ZIG 503; Bitcoin quote 200 / VERIFIED; catalog 503; Bitcoin history 503. Run #10.0's cloud client was subsequently blocked with HTTP 403 / Cloudflare Error 1010 / access_denied before usable market evidence reached it.

## 4. Known versus unconfirmed
**The original live 503 root cause is UNCONFIRMED. This implementation does not claim to resolve it.** Client access denial is not evidence of CoinGecko/provider failure. Proven source defects: later quote failures discard previous successful batches; failed ZIG fallback can discard non-ZIG recovery. Admission is process-local (12 attempts/minute, two upstream requests), not account-wide. Failed ZIG can cost two calls; mixed recovery can cost three. These constants describe source, not account entitlements.

## 5. Scope
Foundation: sanitized failures, atomic response validation with retained independent successes, internal versioned pair results, pure budget transitions, future coordinator interface, smoke classifier, server-only boundary, JSON media types, privacy correction and release documentation closure.

## 6. Explicit exclusions
No provider #2, FX, physical-metal pricing, cloud sync, Health/wearables, barcode/photo food, UI redesign, Goal Engine/accounting redesign, plan revisions, private history/storage redesign, broad IndexedDB migration, Goal Manager deployment, contract upload/instantiation, financial execution, production Durable Object binding, guessed account limits, automatic deployment or rollback. Preserve reversal semantics. No provider #2 is approved.

## 7. Existing architecture
Routes send normalized public requests through server caches to CoinGecko. Quote cache accepts `{quotes,error}`, verifies each quote and retains newer observations. Catalog replaces only after both upstream partitions validate. History retains last-good evidence; insights retains some cross-batch successes with coarse errors. Worker observability is disabled. Deployment smoke checks HTML/security/source identity, not market readiness. Cache/admission state do not span isolates.

## 8. Partial-result architecture
`coingecko.quoteResults` produces an internal v1 envelope. Each batch/recovery/fallback response validates atomically using unchanged strict parsers. Failed boundaries contribute no quotes; independent successes survive. Every deduplicated requested pair has a result. Legacy `quotes` remains all-or-nothing; server cache consumes the structured loader. Public `{quotes,error}` remains compatible. Full external pair publication needs a separate route/client schema migration. Catalog partial replacement is not added.

## 9. Provider-error taxonomy
THROTTLED, UPSTREAM_5XX, TIMEOUT, NETWORK, AUTHENTICATION, ENTITLEMENT, MALFORMED, UNSUPPORTED, LOCAL_BUDGET, LOCAL_QUEUE, UNKNOWN. HTTP 429 is throttling; 5xx upstream failure; arbitrary 403 UNKNOWN, never inferred entitlement/authentication. Missing credentials and explicit 401 can be authentication failures. Entitlement needs independently documented evidence, not body-string guessing. No raw bodies, causes, credentials, URLs/headers or private context are retained. Generic public messages remain.
Pair states: VERIFIED_FRESH, VERIFIED_STALE, PROVIDER_UNAVAILABLE, PROVIDER_THROTTLED, PROVIDER_MALFORMED, UNSUPPORTED, NOT_ATTEMPTED_BUDGET. Evidence retains canonical provider/asset/currency, exact price/decimals, observed/fetched times and source. Missing evidence has no price. Complete coverage and degradation are separate: complete stale groups remain degraded. No speculative retry time is emitted.

## 10. Budget-policy model
Pure `market-budget-policy.ts` is disconnected from active admission. Inject rolling window/allowance, concurrency, daily/monthly allowances, monitoring reserves, request cost, retry/fallback kind, priority, time and period boundaries. Missing/invalid mandatory configuration denies reservations. Test numbers are synthetic, never production defaults. Operation IDs are server-created opaque tokens, never wallet/user identifiers.

## 11. Future distributed coordinator architecture
One serialized durable authority per credential/account budget spanning all Worker instances and endpoints. Account selection is server configuration, never caller credentials. Operations: reserve, markDispatched, settle, cancelUndispatched, acquire/release work lease, breakerState, recordOutcome. No production persistence, network or binding now. Future implementation must prove transactional idempotency, restart recovery, fencing and safe tombstone retention. A Durable Object alone is not a shared-cache strategy.

## 12. Cache-before-admission
Future sequence: validate → shared last-good cache → fresh hits → coalesce misses → reserve → dispatch. Fresh hits cost zero provider work. Stale evidence may return with degradation. Hydration must never advance evidence timestamps. Existing cache gates remain; no distributed activation here.

## 13. Coalescing
Keys use normalized public provider/kind/id/currency/range. Bound leases and waiting; fence expired owners so they cannot overwrite successors. Followers read committed evidence, not cross-request Worker I/O promises. Queue depth, deadlines and cache topology need measured evidence and owner decisions.

## 14. Cost reservation
Reserve before I/O, durably markDispatched before network send. RESERVED → DISPATCHED → SETTLED or RESERVED → CANCELLED. Holds consume rolling/concurrent/period capacity. Expired or previous-period holds require cancellation and a new reservation before dispatch. IDs cannot be reused after cancellation. Production pruning waits for an explicit idempotency-retention policy.

## 15. Retry/fallback accounting
Every retry/fallback needs a separate reservation and injected cost. Dispatched failures are never refunded. Uncertain dispatch remains charged. Only proven undispatched work can cancel; double settlement is rejected. Explicit nonoverlapping periods and monotonic time prevent recreating allowance. Settlement does not reset totals. Existing fallback attempt bounds remain.

## 16. Priorities
Interactive, refresh, optional and monitoring classes. Future scheduler makes optional/prefetch yield under pressure and bounds fairness/starvation. All non-monitoring work respects protected monitoring reserves inside each total allowance. Foundation enforces reserve protection, not distributed queue ordering.

## 17. Circuit breakers
Future closed/open/half-open state per public operation class. Separate upstream signals from local admission and runner blocking. Inject thresholds/cooldowns after measurement; bound half-open probes within monitoring reserve. No breaker activation, unlimited retries or provider substitution now.

## 18. Privacy model
Provider/coordinator state contains public asset identities/currencies/ranges and server-generated opaque work tokens only. Never wallet/user ID, quantities, allocations, goal names, notes, Health or Habits. No raw exception, URL, body, credential/header logging. Asset combinations can be sensitive in aggregate: avoid client correlation and unnecessary raw-key retention.

## 19. Observability model
Future bounded counters/histograms: sanitized outcome, operation class, cache hit/miss, admission reason, reserved/dispatched units, wait/duration buckets, breaker transitions and release identity. Define sampling, retention and access before activation. No individual/client identifiers or private payloads. Foundation adds no telemetry or observability binding.

## 20. Market-aware release acceptance
Security/source smoke remains mandatory and separate. Approved runner validates Bitcoin quote, native ZIG quote, catalog validity/completeness and supported Bitcoin history using canonical identity/freshness/parsers, never exact prices. Outcomes: APPLICATION_SECURITY_FAILURE, DEPLOYMENT_IDENTITY_FAILURE, PROVIDER_UNAVAILABLE, PROVIDER_THROTTLED, PROVIDER_MALFORMED_RESPONSE, MARKET_PARTIAL, VERIFIED, BLOCKED. No mandatory deployment gate wired now.

## 21. Edge-client BLOCKED classification
Inability to reach the application or explicit edge denial (including Error 1010) means BLOCKED. It is not application market failure or provider unavailability/throttling. Arbitrary 403 alone does not prove who denied access. Preserve reachability and identity evidence separately. BLOCKED leaves market acceptance outstanding and calls for runner review, never automatic rollback.

## 22. Capacity targets
Invariant targets: zero unreserved dispatch after activation; zero double charge; zero private fields; every pair classified; no stale-as-fresh; bounded concurrency/queues; protected monitoring reserve. Numerical throughput/latency/active-user targets remain unset until account limits and workload are known. Measure synthetic cold/warm cache, correlated misses, large public sets, mixed fallback and outages first; bounded approved live sampling later.

## 23. Security hardening
Next `server-only` poisoning plus negative regression, retaining runtime guard. Reject unsupported POST media before expensive work. Preserve schema/byte bounds; validate upstream JSON media with harmless charset support. No speculative body timeout. Preserve CSP, deployment approvals, exact identity/decimal/time validation.

## 24. Migration / rollout phases
1. Foundation, tests, docs, draft PR; no merge/deploy.
2. Owner supplies account/reset/consumer limits, cache and runner decisions.
3. Implement durable coordination, leases/coalescing, bounded queues/breakers and restart/fault tests.
4. Migrate public v1 pair envelope with compatible clients and route/cache integration tests.
5. Synthetic capacity measurement, privacy/security review and approved runner acceptance.
6. Owner-approved exact-source release with separate security/market evidence and preserved rollback; no automatic rollback.

## 25. Test matrix
| Area | Proof |
| --- | --- |
| Partial | earlier batch survives; non-ZIG recovery survives; fallback success; all fail; stale retained |
| Trust | wrong/duplicate/unexpected IDs reject affected response; decimal/time/provenance unchanged |
| Errors | safe categories; arbitrary 403 unknown; local admission distinct; no raw text |
| Budget | injected limits; no double charge/settle/refund; cancellation; uncertain dispatch; retries/fallbacks; reserve; rollover |
| Contract | every pair; fresh/stale/missing; complete/degraded; unsupported/local budget |
| Smoke | four probes; partial; failures; identity/security; BLOCKED |
| Boundaries | server-only negative import; JSON media/charset; existing body/schema limits |
| Release | lint, typecheck, full unit, Alpha build/dry-run, deploy regressions, secret scans |

## 26. Failure-mode matrix
| Failure | Behavior |
| --- | --- |
| Later batch / fallback | retain independent evidence, missing pairs degraded |
| Wrong/duplicate identity | reject affected whole response only |
| Refresh failure | retain last-good timestamps; stale never fresh |
| 429 | sanitized throttle, no free retry |
| Generic 403 | unknown unless separate reachability proves BLOCKED |
| Missing budget / queue full | local denial, no provider-throttle claim |
| Uncertain dispatch / crash | future durable charge retained; bounded lease recovery |
| Clock/period regression | deny, never recreate allowance |
| Catalog partition failure | retain last-good catalog |
| Unsupported media | reject before parse/provider work |

## 27. Risk register
Local limits still permit aggregate account overuse; this is not distributed quota protection. Generic public errors limit diagnosis pending migration. Strict media checks need realistic fixtures. Complete stale results must not imply healthy acceptance. Pure ledger retains tombstones without pruning; production needs bounded retention/replay design. No deployment may be inferred from source tests.

## 28. External dependencies
Real CoinGecko account entitlements/reset boundaries; all credential consumers; approved runner reaching Alpha; shared-cache choice; Cloudflare persistence/lease semantics; owner release/security review. No second provider approved.

## 29. Owner decisions still required
Actual minute allowance, daily/monthly allowances, billing/reset boundaries/timezone, other credential consumers, monitoring reserve, activation policy, cache backend, account entitlement, approved market-smoke runner. Also measured workload/SLOs, operational retention/access and idempotency retention. Never substitute illustrative planning numbers.

## 30. Definition of Done
Foundation: retained evidence regression proof without weakened trust; deterministic policy invariants; unbound coordinator/classifier; server/media checks; accurate release/privacy docs; required full verification and diff review; pushed draft PR. No merge/deploy. Full Run #10 additionally requires owner decisions, durable coordination, measured capacity and approved market acceptance/release.

## 31. Run #11 boundary
Candidate Run #11 — Durable Local History & Recovery: 240-snapshot retention, 600 KB history, 2 MB private-store redesign, recovery lifecycle, IndexedDB migration and long-term private history.

## 32. Run #12 boundary
Run #12 — Explainable Funding & Financial History: immutable plan revisions, revision-specific installments, funding corrections, wealth attribution, transaction/performance ledger, FX accounting and completion semantics. Preserve current reversals.

## 33. Later / deferred tracks
Provider #2, FX/metals, cloud sync, wearables and food capture remain unapproved. Owner UI review is separate: Landing, Today, Goals/create/detail, Funding Wealth, Wealth, Markets/detail, Stake/Positions, Habits, Health, Activity, Ecosystem, Settings, Showcase, 390px/320px and real Keplr connect/reload/reconnect. Goal Manager/Code ID NOT DEPLOYED; financial signing/broadcast DISABLED; environment PUBLIC_ALPHA_UNDEPLOYED.

## Run #10.3 review dispositions and activation gates

P1-01 correction: public quote responses derive coverage from the current deduplicated requested pairs and validated matching cached evidence, independently of the cache's last global refresh error. Missing or stale selected evidence produces a generic degradation error; unrelated failure does not contaminate fully covered fresh requests. Browser fail-closed completeness validation remains unchanged. No external API version or per-key persistence is introduced.

`complete` means every deduplicated requested pair has evidence, not that every quote is fresh, the provider is healthy, or a refresh just succeeded. Internal `degraded` includes stale/missing evidence and associated failure. The legacy route exposes coverage/freshness degradation; it cannot attribute the cache's global refresh failure to an individual pair, and a null error is not a refresh-success or provider-health attestation. Per-pair attempt outcomes remain a future migration requirement.

| Review item | Explicit disposition / activation gate |
| --- | --- |
| P2-01 — lease expiry / accumulated results | DEFER TO RUN #10 COORDINATOR/CACHE PHASE. Require deadline-aware stopping/publication and truthful timeout state while preserving fencing. Never remove fencing merely to retain late results. |
| P2-02 — monitoring reserve/fairness | DEFER TO SCHEDULER/BUDGET ACTIVATION. Queue normally precedes dispatch-slot reservation. Define monitoring consumption caps and fairness in addition to protected reserve. |
| P2-03 — body/parser misclassification | REQUIRED BEFORE BREAKER ACTIVATION. Introduce explicit validation-error conventions so programmer defects do not automatically become provider MALFORMED; body transport/network failures need a separate classification path. |
| P2-04 — response-body cancellation | REQUIRED BEFORE HIGH-CONCURRENCY ACTIVATION. Explicitly own/cancel rejected non-OK, wrong-media and early-size-rejected bodies where runtime APIs allow. No speculative cancellation changes in the P1 correction. |
| P2-05 — coordinator interface | REQUIRED BEFORE PRODUCTION COORDINATOR IMPLEMENTATION. Define fenced result publication and reservation/attempt association for multi-key provider batches. |
| P2-06 — acceptance model | REQUIRED BEFORE MAKING MARKET ACCEPTANCE A DEPLOYMENT GATE. Preserve reachability/execution, security, deployment identity and per-probe market evidence separately; a summary outcome must not erase them. |
| P2-07 — privacy disclosure | ADDRESSED IN RUN #10.3: PRIVACY describes public market requests and selection/timing linkability without claiming anonymity. |

P3 documentation notes: duplicate failure categories currently use last-entry precedence, whose external semantics must be defined before pair-result publication. Results follow deduplicated request order; quote collection follows successful provider work and must not be assumed parallel. `isJsonMediaType()` checks media-type essence/compatibility, not full RFC Content-Type grammar. The custom server-boundary scanner is a regression supplement; Next's native server-only compiler boundary remains authoritative.

These are explicit activation gates. No coordinator, breaker, high-concurrency admission, deployment gate, merge or deployment is authorized by this correction. The original live 503 incident remains UNCONFIRMED.
