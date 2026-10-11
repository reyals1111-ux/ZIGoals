# Run 9.1 final implementation review

Verdict: approved within the reviewed accounting, archive/history and UI mutation scope; no material correctness finding remains open. This is an independent source review and focused regression run, not full-suite or visual approval.
Original six fixes verified: Quantity funding scales manual value; explicit partial/full schedule credits and reversals affect forecasts; archive/restore history respects lifecycle; late chart refresh clears loading; quote observedAt is preserved; retries require the immutable fundingRequestKey.
Cap fix verified (`apps/web/lib/contribution-funding.ts:36`): an indivisible unit that would exceed the Goal target is rejected before persistence; the input remains unchanged. The $20,000/$2,000 regression retains $18,000 available.
Durable history verified (`apps/web/lib/asset-management.ts:6-33`, `apps/web/lib/wealth.ts:77`): Position membership survives the bounded Activity feed; restored and currently archived holdings retain the same historical totals after 241 unrelated edits, including a backup round trip.
Timestamp fix verified (`apps/web/lib/positions.ts:93-94`, `apps/web/lib/wealth.ts:75-77`): interval validation and membership compare instants. A mixed-precision half-second overlap is rejected, while equivalent ISO instants preserve correct tracking/archive boundaries.
Import invariants verified: reversed/overlapping periods, a nonfinal open interval, multiple open intervals, and archive-state disagreement are rejected; contiguous valid intervals remain accepted.
Mutation boundaries: ContributionFlow recomputes under the private lock and compares its preview fingerprint; AssetEditor compares the latest Position; wizard allocations validate latest balances and pending asset saves disable/reset the picker. Contribution and Goal locks remain at usePlatform.
Privacy: inspected contribution/asset market requests carry public marketRef/currency only; holding quantities, Goal metadata, notes and request identity remain in the private store. No new exposure found.

Independent checks: pinned Node 24.19.0 Vitest passed 36/36 across `run9-1.test.ts`, `private-storage.test.ts`, and `price-chart.test.ts`; focused test-file ESLint and diff whitespace checks passed. Full unit/browser gates remain the coordinator's responsibility.
Reviewer changes: four focused regressions in `apps/web/lib/run9-1.test.ts` and this report only; no implementation, private data, index, branch or commit changes. Backups: `/tmp/run9-1-final-review-20260920_224532`.
