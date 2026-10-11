# Milestone 2 review record

Task reviews and scoped fix reviews are complete. The initial final whole-branch review approved the implementation. A subsequent full-browser restart check exposed the warning interaction recorded below; the repair and scoped re-review are complete. No findings were parked or ruled out. This is an internal implementation review, not an independent security audit.

## Transaction recovery re-review

### Finding Verdicts

- **Important: receipt recovery lacked a practical aggregate attribute and text-byte budget** — ADDRESSED. `apps/web/lib/receipt-reconciliation.ts:67` caps the entire receipt at 512 attributes, while `apps/web/lib/receipt-reconciliation.ts:68` and `apps/web/lib/receipt-reconciliation.ts:72` enforce a 64 KiB aggregate UTF-8 budget across event types, attribute keys, and values. Array lengths are counted before attribute traversal at `apps/web/lib/receipt-reconciliation.ts:87`. Oversized receipts still reject and therefore reconcile as uncertain through the existing catch path. New tests cover aggregate attribute count, ASCII bytes, multibyte UTF-8 bytes, event-type bytes, and an ordinary within-budget receipt at `apps/web/lib/receipt-reconciliation.test.ts:125`.
- **Minor: definite failure copy named only deposits and withdrawals** — ADDRESSED. The message now says “The action was not applied,” which applies to create, deposit, withdraw, and close at `apps/web/lib/transaction.ts:91`; the focused assertion is at `apps/web/lib/transaction.test.ts:204`.

### New Breakage in the Fix Diff

None. The aggregate validator avoids encoding strings whose character count already exceeds the remaining budget, then checks actual UTF-8 byte length, so multibyte strings cannot bypass the cap (`apps/web/lib/receipt-reconciliation.ts:72`). The fix report names the covering red cases and shows a green 52-test targeted run plus successful typecheck, scoped lint, and diff check; tests were not rerun during this re-review.

### Out-of-Scope Observations

None. Controller-owned dependency and explorer integration was independently verified at `b2fd958` and was not reopened in this scoped round.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

## Ecosystem re-review

Important — public coordination notes: ADDRESSED. `packages/ecosystem-registry/src/providers.json:149` removes the owner-email/outreach instruction; the Zignaly owner-requested wording is also removed. Data and rendered-page absence regressions preserve the actual integration gates (`packages/ecosystem-registry/src/registry.test.ts:192`, `apps/web/lib/ecosystem-ui.test.ts:70`).
Minor — exact contract evidence: ADDRESSED. OroSwap's four records now cite the matching mainnet/testnet deployment manifests (`packages/ecosystem-registry/src/providers.json:220`, `packages/ecosystem-registry/src/providers.json:242`); every PermaPod contract cites its configuration source (`packages/ecosystem-registry/src/providers.json:361`). Representative mapping tests verify chain, URL and complete evidence record (`packages/ecosystem-registry/src/registry.test.ts:206`).
Minor — visible provenance review dates: ADDRESSED. Each displayed relationship now includes its validated date in a semantic time element (`apps/web/components/strategy-transparency.tsx:48`), with a rendered-markup assertion (`apps/web/lib/ecosystem-ui.test.ts:66`).
New breakage in fix diff: None found; no Critical, Important or Minor finding.
Out-of-scope code observations: None.
Check: fix report names the covering registry/UI tests and includes red output (9 failed/30 passed) and green output (39 passed); the added assertions correspond to the repaired behaviors. No tests rerun.
Check: reported typecheck and diff check exit 0. ESLint exits 0 with the explicitly documented React auto-detection environment warning; the controller retains the full-root lint follow-up, not treated here as source breakage introduced by these fixes.
Check: inspected only `review-fed5c84..2a9ac70.diff` once, plus requested brief/reports; citation lookup used the cached diff. No implementation, index, HEAD or branch mutation; only this requested review report was written.
Fix round: All findings addressed, no new Critical/Important breakage. Task-scoped spec compliance and code quality approved; whole-branch integration review remains separate.

Full-root lint subsequently passed without the scoped React detection warning.

## Initial final whole-branch review

# Final whole-branch integration review

**Scope:** e2c7ed14cafcad72b5cb0e9206a32eae3081a84c..029bbff, reviewed in passes against the owner specification, M2 design/plan, progress record and recorded verification; retained M1 custody/planning paths and M2 integration boundaries included.

**Strengths:** The durable barrier precedes broadcast (`apps/web/lib/transaction.ts:53`); recovered receipts bind signed bytes/hash and operation identity (`apps/web/lib/receipt-reconciliation.ts:44`). Account changes preserve original transaction scope, corrupt storage remains recoverable, and funding/strategy research cannot grant execution (`packages/ecosystem-registry/src/index.ts:139`).

**Critical:** 0 findings.
**Important:** 0 findings.
**Minor:** 0 findings.

**Spec compliance:** PASS. M1 history and custody/planning behavior are retained; private metadata stays separate; missing receipts remain uncertain; idle-only execution, validated evidence links, landing and LICENSE preservation align with the requirements. No parked findings or unexplained scope deviations found.
**Code quality / ready to merge:** APPROVED / Yes. Journal, receipt validation, registry and UI boundaries are coherent; targeted persistence, corruption, scope-switch and trust-boundary tests support the implemented behavior.
**Evidence:** Inspected `docs/verification/M2_RESULTS.json`: 297 JavaScript/component tests, 24 Rust tests and 18 production browser cases passed, with install/lint/typecheck/build/schema/validator checks and matching clean same-toolchain Wasm. Reported suites were not rerun on unchanged code.
**Recommendations:** Complete the documented owner-controlled publication/hosted-CI, real-Keplr and testnet deployment checks before claiming those results; independent-host/container reproducibility remains unproven. These disclosed external gates are not unresolved code-review findings.
**Handoff:** Final review/report fields and artifact packaging may now be closed from this verdict; no code, index, HEAD or branch mutation was performed by this review.

## Additional verification finding

The controller then closed and relaunched Chrome with the same isolated test profile against the production app. The journal retained account-scoped records and the uncertain transaction hash, but a failed RPC connection replaced the warning about an unsupported journal row. The assertion for `Unreadable or unsupported` failed and the page displayed only `Failed to fetch`. Source inspection traced this to the provider catch handler replacing the warning array after a successful journal read. This was a warning-preservation defect; no transaction was sent. Commit `78331c1` repairs the warning interaction and adds two provider regressions plus a reusable full-browser restart verifier. The rebuilt production app subsequently passed 299 JavaScript tests, 18 browser cases and the full process-restart scenario, with zero signer calls or broadcast requests.

## Final scoped fix re-review

### Finding Verdicts

- **Damaged-history warning was replaced by a thrown known-receipt lookup failure; preserve both within original scope and reset prior account warnings when switching, including new-scope storage failure** — ADDRESSED. After a successful scope load, `firstLoad` is cleared and the reconciliation catch merges the lookup error with the warnings already loaded for that scope (`apps/web/components/goal-provider.tsx:190`, `apps/web/components/goal-provider.tsx:215`). If the new scope's initial journal load itself fails, the captured `firstLoad` value instead replaces prior-account warnings with only that scope's storage error (`apps/web/components/goal-provider.tsx:223`). The parameterized regression verifies original-scope corruption plus lookup warnings, retained unknown hash/record data, available new-scope reset, unavailable new-scope reset, and no execution call (`apps/web/lib/goal-provider.test.ts:338`).

### New Breakage in the Fix Diff

None. The warning change does not alter records, reconciliation state, signer access, or broadcasting. The reusable browser script restricts its target to a local origin, fulfills or aborts every nonlocal request, blocks service workers, closes and relaunches the same isolated persistent Chrome profile, verifies four retained records and both warnings, checks account scoping, and asserts zero signer calls, broadcasts, and page errors (`scripts/verify-browser-restart.mjs:8`, `scripts/verify-browser-restart.mjs:35`, `scripts/verify-browser-restart.mjs:143`, `scripts/verify-browser-restart.mjs:225`). Its temporary browser profile is removed in `finally` while the JSON result remains in the isolated output directory (`scripts/verify-browser-restart.mjs:284`).

### Out-of-Scope Observations

The controller's full web/build verification and actual production execution of `scripts/verify-browser-restart.mjs` were still running and are correctly outside this scoped code re-review. The fix report contains exact red output for 2 failing regressions, exact green output for 35 passing targeted tests, and successful typecheck, scoped lint, script syntax, and diff checks. Those completed checks were not rerun.

### Verdict

**Fix round:** All findings addressed, no new Critical/Important breakage.

The controller subsequently completed the full verification described above. No findings remain open, parked or deferred; no rulings were made. [Captured final regression commands/results](M2_FIX_TESTS.md).
