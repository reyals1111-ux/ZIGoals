# ZIGoals — ACTUAL RUN #11: complete the remaining product, not another foundation pass

Prepared 2026-09-26. Execute implementation in the existing Personal AI Lab / ZIGoals environment. This is a new major run using the owner's reported free reset, not a scheduled task. The owner will perform the eight manual owner-setup activities AFTER this run.

## 1. Outcome and authority

Complete the outstanding, locally implementable Run #10, restoration/polishing and Run #11 carryover requirements; integrate them into the real application; prove the resulting journeys; leave a tested, recoverable release candidate and a specific activation handoff. Retain the already accepted and deployed product. Do not deliver another collection of disconnected contracts, disabled buttons and partial slices described as a finished milestone.

This brief supersedes earlier run scheduling, unrestricted redesign permission, the PRE11B limit of three repair groups, arbitrary first-failure skipping, and old instructions to keep the already-merged PR #20 open. It does NOT authorize production changes, financial execution, disclosure of private data, unsupported completion claims or bypassing permission/security controls.

**The owner has accepted the restored UI, existing motion and widgets. Do not rebuild or redesign them.** Reuse them and test their integration with new account/storage features. Only finish demonstrably absent subfeatures still in scope, make minimal functional/accessibility fixes, and fix regressions you reproduce. The small known 13.44px caption defect is explicitly in this completion run: meet the existing 14px readability floor without reducing the assertion or changing the page composition.

### Realistic, strict completion boundary

The intended code outcome is **CODE COMPLETE AND LOCAL/PACKAGED INTEGRATION VERIFIED; OWNER SETUP AND REAL HOSTED/DEVICE ACCEPTANCE PENDING**. That label is permitted only when no mandatory internal implementation or local integration gap remains. It is not an alternative label for partially written code.

Since the owner intentionally postpones account creation, sender verification, infrastructure approval and physical-device gestures, do not claim real email delivery, a hosted fix to the existing Alpha, or physical phone/desktop synchronization before those occur. Implement and test the complete production adapters and user flows using controlled upstream fixtures where necessary, then supply the executable production configuration/activation path. Missing owner setup excuses the missing external observation, NOT unfinished code, missing routes, omitted migration logic or a half-implemented deletion flow.

The final report must separately state: implementation completeness; local integration; packaged Workers integration; hosted CI; live providers; real inboxes; physical devices; deployment. A passing fake identity server is never real email proof. A data model is never a functioning user feature. A green unit suite is never all 40 journeys.

## 2. Exact starting point: retain the preparation work

Repository: `reyals1111-ux/ZIGoals`.

Verified when this brief was prepared:

- Current main and deployed web Alpha: `901e2a6600fb8292b7956717d45341f050fd377c`.
- PR #20 is already merged. Run #10 plus accepted polishing is already live; do not reopen or redeploy it.
- The newer unmerged preparation branch is `codex/pre-run11-preparation`, head `3ca2f42303724ef1317aded6982c9fdd6fd8775d`.
- Preparation head includes both PRE11 and PRE11B, not just the initial scripts at `1189d76ef5ab69bd39f9ecfb50118919e108bfec`.
- Historical owner preview: `http://127.0.0.1:3111/app`. Preserve its processes, worktree and private review data.
- Preparation worktree was `/Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/ZIGoals/.superpowers/pre-run11-preparation`.
- Prior review worktree was `/Users/AIUSER/.codex/.chatgpt-projects/g-p-6a9ef321fe54819194d286235dcda765/run10-beta-reliability-foundation`; its `apps/web/next-env.d.ts` may be an intentional unstaged owner-generated file. Do not stage, discard or overwrite it.
- Actual NovaVault project directory: `/Users/AIUSER/Documents/NovaVault/30-Projects/Personal AI Lab/ZIGoals/`.

Verify these refs and worktree ownership once before editing. When they still match, create a NEW isolated `codex/run11-completion` worktree/branch descending from preparation head. Do not start from main alone and lose the eight PRE11B commits. If main has advanced, compare ancestry and incorporate both approved histories without resets/force pushes or silently choosing one. Keep old worktrees and branches intact. If this Run11 branch already exists, inspect and resume it rather than duplicating it.

One new draft PR against main is appropriate after a coherent checkpoint, subject to actual permissions; do not create repeated PRs or repeatedly ask for GitHub access. Read-only access failure does not justify a write through another route. A denied mutation is recorded once and not bypassed.

### Already completed preparation to retain

The owner-setup checker and email helper already have shared public-key classification, bounded JSONC handling, auth-only mode, bounded responses, sanitized output, controlled-recipient/target checks and ordinary Vitest integration. Do not rewrite these again. A real fixture-level defect found while using them gets a targeted regression and repair.

The browser runner already supplies named line+JSON evidence, owned loopback ports, production builds, isolated outputs, zero diagnostic retries and distinct passed/failed/skipped/not-run/interrupted counts. Reuse it; do not invent another diagnostic framework.

At PRE11B's last complete Mac browser run (`2c720bc...`): 338 passed, 16 skipped, 4 failed of 358. The later `1edb037...` focused run cleared the two stale Today assertions. Two recorded remaining cases are the same 320px caption-size issue in desktop/mobile projects. Final ordinary checks reported 1,384 unit passes/one skip, typecheck pass, lint pass with one existing warning, production build pass. These source-specific results are not a final Run11 gate and must not be added together into an invented all-green count.

## 3. Source precedence and no-loss scope

Read this brief completely once. Then read the latest sections of the following files, not every historical narrative repeatedly:

1. `docs/run10/PRE_RUN11_PREPARATION.md`, `docs/run10/PRE_RUN11_RELEASE_STATE.md`, and `docs/run10/evidence/pre-run11b-browser-report.json`.
2. `docs/run10/POLISH_REVIEW.md`, `BLOCKERS.md`, relevant `OPERATING_POLICY.md` sections, and the CURRENT source corresponding to a gap.
3. `docs/run10/REQUIREMENTS.json` / `REQUIREMENTS.md`, preserving all original IDs and specifications. `docs/run10/MASTER_PROMPT.md` is a reference for exact remaining criteria, not a direction to replay the whole run.
4. The attached `ZIGoals_RUN_11_Scope_Map.json`, which preserves 290 original specifications including all 40 journeys, plus the 24 P/E polishing entries. Historical statuses are evidence snapshots, NOT this run's instructions or progress.
5. Targeted market plan, auth/storage/financial/Health evidence and project roadmap documents when their workstream is active.

Precedence: this latest owner instruction and preservation rule > freshly verified source and PRE11B results > completed polishing evidence > older Run10 statuses. In particular, old "PR20 draft / not deployed", "no dependencies", "only 11 helper tests", "motion not implemented", and "only four summary tiles" statements are historical when newer evidence supersedes them.

Use existing IDs. Make a compact closure overlay for the remaining acceptance criteria; do not author 290 new prose requirements or another brainstorm. For each meaningful item track: original IDs; retained implementation; exact remaining delta; owner of that delta; dependencies; proof command/journey; source SHA; status; external subcheck if any. Several IDs can map to one implementation and one test. A process/document row is not an excuse for more product code.

Recommended status dimensions: `implementation = retained | needs_change | implemented`; `local_proof = not_run | fail | pass`; `external_proof = not_required | owner_pending | verified | blocked`; and a specific blocker reason. Do not collapse these dimensions into "DONE". At handoff, reconcile every original ID and P/E item to a retained proof, a completed delta, an exact remaining internal defect, an explicitly conditional roadmap disposition, or a named external action. No generic "partially implemented" paragraph covering twenty unrelated omissions.

## 4. Execution discipline: finish vertical journeys

This is extended implementation, not a small diagnostic task. Continue across coherent checkpoints without asking "shall I continue?" and without terminating because a helper finished, a three-hour timer elapsed, three causes were repaired, or an arbitrary allowance percentage was reached. Do not deliberately idle to reach a duration or spend allowance simply because it remains.

Use one integration owner. Prefer one primary worker; allow at most one additional implementation helper at a time on truly disjoint files/contracts. Give helpers only their delta, relevant source and acceptance—not the entire historical prompt. Brief read-only review can replace a helper slot. Do not allow concurrent mutation of shared schema, crypto, financial or session files by independent agents. Integrate completed work promptly; remove idle helpers.

Before major data edits, choose ONE coordinated schema/protocol evolution for rotation, tombstones, synchronization, history and new Health records. Write the actual invariants and ordering decisions concisely. Preserve current crypto/storage foundations. Do not spend the run comparing vendors or inventing custom cryptography.

A workstream is implemented only after its adapter, persistent state, UI action, error/recovery path and browser/runtime acceptance work together. Do not stop at a pure function and move through the whole roadmap creating one partial slice per topic. A representative two-client Goal/Habit/Health/widget journey must be integrated early and remain runnable throughout the data changes.

### Handling failures without abandoning the work

A failure is a debugging input, not an automatic deferral. Reproduce, classify test versus product versus configuration, repair a concrete cause, and rerun focused checks. After two materially similar unsuccessful hypotheses, inspect different evidence or request a bounded independent diagnosis. Do not endlessly repeat the same call or guessed patch. Once new evidence exists, continue the repair.

Internal dependencies such as hard-coded epoch 1, missing routes, or absent conflict UI are implementation tasks for THIS run. Do not reclassify them as owner setup. A true permission, unavailable service, unavailable hardware or quota block can park its dependent external check while independent code continues. Preserve partial code in a non-active state rather than expose unsafe operations. No skipping or weakening invariants to obtain green tests.

The PRE11B three-cause limit is lifted. The goal is all remaining mandatory reachable work, not a capped number of bug fixes. Conditional providers/wearables cannot consume the effort needed to finish core journeys.

Keep planning/reconciliation proportional. Use focused tests per change, full suites at integration boundaries, and a final exact-source run. Do not execute the entire application suite for every copy/documentation edit. Reserve roughly the last quarter of planned effort for integration/review/corrections; this is not permission to stop mandatory implementation at a preset meter reading. If remaining capacity is genuinely insufficient, checkpoint and state the exact internal gaps honestly.

## 5. First checkpoint: a reliable baseline, not a new audit

Retain the three stale-test cause-group fixes from PRE11B. Fix the four Today captions measuring 13.44px at 320px so the existing 14px functional-text check passes. Keep the hero lines, card hierarchy, selected summary, spacing, accepted artwork and mobile layout. Prefer the smallest reusable selector/token correction; inspect 320/390/430px and enlarged text for wrapping. Do not lower the floor, hide the elements, remove assertions or bypass the failing route.

Use the existing named reporter and target the known caption tests and affected layout tests first. If a further assertion fails after that, repair its actual cause. Keep the existing source-bound successful checks; do not recreate the old 358-case failure inventory from zero.

Retain all hosted quality stages. The 15-minute job limit may need adjustment/splitting after measured healthy runtime, but failed assertions must be fixed independently. Ensure test names survive interruption and fixture-only artifacts upload on failure where the runner permits. No `continue-on-error`, broad `test.skip`, retries-until-green, excluded difficult projects, or removal of private lifecycle/security checks. Explain existing skips individually in the final coverage map.

Establish an isolated development/test command on unused local ports. Never build into the owner's active `.next` output or kill processes you do not own. Treat sandbox loopback denial as an execution-permission issue, not a product failure or permission to disable relevant tests. Checkpoint the fixed baseline and immediately continue core implementation.

## 6. Market prices and reliability: complete the real path

References: E02, MKT-01–18, AST, JRN-29–31. Preserve preparatory budget, fence, malformed-response, partial-result and circuit-breaker contracts. Complete their integration rather than rewrite them.

### 6.1 Diagnose the source/runtime failure precisely

Trace the full path: deployment input secret/config → packaged Worker binding/runtime loader → server route → provider adapter → validated cache/per-pair response → browser. Read the installed OpenNext version's actual behavior. Do not assume `process.env` is always wrong or that a secret's name in GitHub proves the live Worker has the usable value. Existing evidence already distinguishes absent local configuration from the unresolved public 503.

Implement one server-only runtime configuration boundary where warranted, with request-local binding access and explicit development configuration. Avoid cross-request/tenant leakage, secrets in build output, or accidental binding values in SSG. Exercise the production OpenNext/Workers package against controlled provider responses: secret present/absent/wrong, auth failure, timeout, malformed media/body, partial results, valid BTC/failed ZIG, catalog/history/insights and interrupted streams. Prove no anonymous provider traffic on missing configuration and no fallback that silently bypasses a configured durable coordinator.

A bounded read-only public diagnostic plan is allowed within this task only using existing owner-approved access and sanitized observations: at most 12 combined public market/provider HTTP attempts for the entire run, no live load, no new key/account, no personal records, no repeated permission requests. Do not retrieve hidden secrets through unsupported routes. If a controlled direct provider comparison requires unavailable credentials, retain the local packaged proof and an exact pending owner observation. No live configuration write or deployment is authorized. Do not call the current live incident repaired before an approved deployment and probe actually establish that.

### 6.2 Finish account-wide coordination

Route every supported charged endpoint through one durable account budget authority: coin/token quotes and documented fallback attempts, catalog partitions, history, insights and supported reference data. One physical batch is one charged attempt; retries/fallbacks are distinct attempts when they actually dispatch. Separate minute attempt limits, monthly credits, configurable operation costs and internal ceilings. Preserve the dated 100 calls/min and 10,000/month Demo observation as historical account evidence, not an entitlement that can be invented or silently changed. No fake daily provider limit and no reliance on unavailable Demo `/key` data.

Define tested synthetic policy fixtures and explicit config validation; actual production policy remains owner-approved. Missing/unconfirmed reset timezone or cost data must produce an explicit setup gate, not stop implementation of scheduling/period semantics. Implement durable queue/reservation/ownership/dispatch/settlement, protected monitoring reserve/cap, stable accepted interactive reservations, bounded endpoint priorities and starvation prevention. Waiting work cannot occupy provider dispatch concurrency.

Complete shared cache retention/eviction, coalescing, independently bounded followers, cancellation and fencing. Expired owners cannot publish over successors. Cleanup cannot erase replay protection for requests still eligible to retry. Ambiguous dispatched attempts remain conservatively charged; settlement/replay is idempotent across restart and accounting-period transitions. Test backwards clocks, exhausted capacity, leases and epoch/period rollover.

Persist scoped breaker state and recovery permits: account authentication, throttling, endpoint availability/integrity and per-pair failure stay distinct. Local queue/budget/runner-blocked conditions do not poison provider health. Recovery probes consume real budget and bounded concurrency.

Complete the public per-pair envelope through routes, transport, server cache and browser consumers. Valid Bitcoin evidence survives failed ZIG and unrelated activity. Retained data carries original freshness/provenance, never a fabricated successful refresh. No missing values filled with zero, invented prices/FX, proxy-metal substitutions or second provider to avoid the failure.

### 6.3 Done evidence

Real local Workers persistence and named binding/provider I/O; crash-before/after dispatch and publication matrix; batched and repeated concurrent clients; period transitions; all charged routes; independent valid/failed pairs through the browser; safe degraded mode; bounded aggregate telemetry; measured synthetic request fan-out, latency and budget use. Security/source/reachability and each market probe remain separate raw dimensions. Deliver executable config and acceptance commands; distinguish local proof from live provider approval.

## 7. Accounts, access and private-state boundaries

References: AUTH, ENC, SYN, SEC, JRN-02–10. Keep Supabase email OTP + Resend SMTP + isolated ciphertext Worker as the chosen path. Do not research alternative vendors or create a second auth framework. Retain the hardened preparation helpers.

Finish the same-origin application adapter, packaged runtime exposure, secure session cookie handling, refresh/expiry, verification/resend behavior, sign-out, returning/new-device unlock and recovery explanations. Use the provider's supported validation and avoid cached private responses, wildcard callbacks, client-chosen tenant IDs, exposed admin keys or public token-bearing URLs. Add bounded persistent abuse/resend controls and verified rate/error behavior without disclosing whether another user exists.

A completed email sign-in adapter includes expired/incorrect/used code, provider unavailability, cancellation, concurrent tabs, late responses and sign-out when the upstream fails. Credentials are not decryption keys. Continue independent high-entropy client-held vault/recovery key handling. Do not derive a vault key from an email, wallet address, access token or signature exposed to the server. Losing the independent secret cannot be repaired by pretending an email reset decrypts the vault.

Finish protected Local→account attachment: per-domain choices, pre-copy encrypted backup, preview/counts, populated-destination review, transactional multi-section records/outboxes, rollback on any conflict/fence failure, and no automatic upload. Empty second device must never erase a populated vault. Preserve exact original Local bytes and return to the proper untouched Local scope on sign-out.

Every request/read/write/index/cache/event subscription must be account- and domain-scoped. Account switch, revoke or lock must fence late fetches, workers, timers, exports and source-widget updates. Clear visible private data from the prior account without deleting that account's recoverable records. Health synchronization requires separate affirmative consent; turning it off must implement explicit local-only versus cloud-deletion choices, not merely stop new writes.

Do not globally replace working widget or diary storage hooks. Extend the canonical adapters and demonstrate the same Goal, Habit, Health record and layout across two independent profiles against the actual local backend, with only unavailable provider email/identity upstream controlled.

### Wallet method and conditional identity linking

One complete email path is mandatory; two authentication methods are not prerequisites for finishing it. Preserve the original conditional wallet-auth criteria. If the already supported Keplr/chain path has documented purpose-bound authentication capability, implement nonce/origin/address/public-key/expiry verification and explicit authenticated linking after the email path is complete. No signing on page load, watch-only connect or reload. Use fixture signatures for automated tests; do not approve a real wallet prompt. Never call transaction-signing/broadcast paths, derive encryption keys from server-visible signatures, or merge accounts on a matching client-provided address. If safe support cannot be established, mark wallet-auth capability specifically unsupported/conditional with evidence; do not block or falsely claim the complete email route.

## 8. Finish deletion, key rotation and recovery-aware access

References: E04, AUTH-06, ENC-07, SYN-07, SEC-05. Keep the existing transactionally fenced cloud-deletion primitive. The missing user/server/provider lifecycle and rotation are this run's work, not an excuse to leave the feature inactive indefinitely.

### 8.1 Complete deletion semantics end to end

Provide clear user choices for deleting a domain's cloud data, deleting the private cloud vault/account and retaining/exporting separate local data where appropriate. Distinguish sign-out, disconnect, delete remote data, delete provider identity and erase a local copy. Require confirmation and protect unsynced work with preview/backup or explicit discard choice. No destructive action without user intent.

Implement authorized app→backend operations and, where needed, a narrowly scoped server-only provider-account-management adapter. Privileged provider credentials must never reuse the public-key field or reach browser/config examples/logs. Absence of that later owner credential is an external activation gate; implement the adapter and its request/denial/failure tests now using controlled provider responses.

Coordinate partial failure: if vault deletion succeeds and provider deletion fails, persistent state and the UI must say which stage remains, block stale access and offer an idempotent recovery. Do not declare account deleted while writes still succeed. Test duplicate requests, stale sessions, offline reenrollment, concurrent reads/writes and other-account isolation.

### 8.2 Survive recovery without resurrecting deletion

Choose and implement an explicit lifecycle-generation/deletion authority and restore procedure whose safety does not rely solely on an in-vault marker that a pre-delete snapshot can roll back. A second uncoordinated store that can be restored into the same stale state is not enough. Define authority, monotonic generation, offline-client denial and how recovery disables serving until lifecycle reconciliation completes. Include compaction and retention policy boundaries.

Simulate restoring pre-deletion data and marker absence against newer lifecycle decisions. Test restored vault/provider state cannot silently reenroll old clients or re-expose records. Provide an executable administrative reconciliation/dry-run path with narrow authority, not only a prose warning. Actual hosted point-in-time-recovery testing waits for approved infrastructure; local simulation must be labeled as such.

Keep erasure wording truthful: active deletion, provider recovery retention, ciphertext, local plaintext and user-held exports have different lifetimes. Do not claim immediate permanent deletion from all backups, remote wiping of a device's prior plaintext, or cryptographic erasure without the necessary key/control evidence.

### 8.3 Transactional rotation

Remove epoch-1-only assumptions through a versioned compatible evolution rather than resetting the vault. Implement actual key rotation/rewrap with authenticated epoch/context binding, staging, atomic activation, concurrent-writer checks, resumed interrupted work and an updated recovery secret/manifest policy. Decide whether a case requires re-encrypting data or only rewrapping and state the security difference. Retain current authenticated-encryption primitives; do not invent a cipher or rely on predictable secrets.

Old online/offline devices cannot write under a retired epoch after rotation. An authorized recovering device obtains the correct new state only through the chosen explicit unlock/enrollment path. Wrong keys/tampered catalogs fail without destructive resets. Stage failures before and after manifest activation, prove no split-brain unreadable vault, and ensure cleanup never deletes chunks needed for an allowed recovery.

Close these operations through browser controls, persistent backend behavior and fault tests. A backend endpoint without a usable application flow does not satisfy E04.

## 9. Incremental storage, conflicts and long-lived history

References: E05/E06, DAT, SYN. Build these together with the lifecycle evolution above.

Retain original migration bytes, transactional records/outboxes, account/domain indexes and encrypted pending-journal export. Implement bounded indexed entity reading and incremental cloud changes/cursors instead of retransmitting full account snapshots for each edit. Define stable entity/operation IDs, revision/epoch binding, pagination snapshots, staging/publication/acknowledgement and resumable limits. Large bounded batches must not be mistaken for atomic multi-domain operations unless that invariant is actually preserved.

Conflict semantics depend on the data: independent additions can merge; two edits to one record retain both versions; deletion/tombstone versus stale edit follows the documented lifecycle; financial aggregates require conservation. Implement a clear conflict review UI showing the competing facts without leaking another account. Resolution makes a new explicit operation and revalidates against current state. No last-write-wins for money, silent overwrite of accepted evidence or undocumented automatic deletion.

Implement forward recovery for old/incompatible queued operations: inspect/preview, prove schema compatibility or transform explicitly, preserve original journal, validate referenced entities/units/evidence and apply idempotently. Unrecoverable operations remain exportable with a specific reason, not silently dropped. Test lost acknowledgements, reverse delivery, replay, concurrent correction and reload/account change during review.

For each paged reader/selector, prove account/domain/index bounds and snapshot revision behavior. Replace silent pruning with usable paged history, not just larger caps. Implement safe receipt/tombstone/orphan cleanup tied to the documented retry, offline and recovery horizons. Clients outside a supported horizon must resynchronize safely, not resurrect deleted content. Backpressure must be visible; a rejected save must not show success.

Demonstrate all-domain data above the former 2MB boundary, at least the previously tested 6,000-entry Health fixture, plus a representative larger mixed ledger. Measure bytes, changed-entity payloads, query counts, memory and latency. Exact financial strings, dates, relationships, plan revisions and selected layout survive export/restore. A >2MB export alone does not close efficient delta synchronization or lifetime history.

Finish migration interruption, old-client writes, multi-tab coordination, storage pressure, corrupted input, partial section restore and a safe upgrade path. Code rollback and data rollback differ; incompatible older writers must not be allowed over new data. Test forward recovery rather than recommending a destructive reset.

## 10. Financial, Goal and Wealth completion

References: FIN-01–15, GOAL, AST, E07, JRN-15–20. Preserve exact accounting and accepted design. Existing manual tracking remains separate from live execution.

Complete the missing whole-owned-wealth change explanation: separate contributions/withdrawals, quantity corrections, supported transfers, recorded fees/income, valuation movement and unclassified differences. Reallocating between Goals does not change owned wealth. Incomplete evidence must leave a visible reconciliation gap. Provide navigation to the actual contributing records and paginated exact-value history.

Complete immutable plan revisions/effective dates, revision-specific installments, partial payments, unmatched contributions, future pause/resume, target changes, duplicate receipts and concurrent edits. Do not fabricate legacy history. Corrections preserve originals and support equal/opposite evidence without double/over reversal or silent observed-balance editing. Retain existing reviewed performance calculations and their eligibility/work limits; do not rebuild the return engine or add XIRR solely because the original spec mentioned it conditionally. Missing cash-flow/valuation data stays ineligible.

Prove the existing 20,000 USD contribution into a 2,000 USD Goal: one contribution, 2,000 allocated, 18,000 available, one completion; all views agree after replay, conflict, reconnect and restore. Test two clients competing for the same availability and revising a plan concurrently. Revalidate stale previews without duplicating actions. Habit completion and market appreciation never create funding or income.

Finish current attainment versus historical completion/reopen/closure. A 99.6% presentation cannot create a completion event. A later Value decline does not erase the earlier milestone. Archived/restored assets and allocation deficits remain truthful. Quantity, Value, Reward and Project maintain their own units/meaning.

Finish only genuinely missing advanced creator/source/funding controls and unsaved-change/validation/cancel/reload paths using the existing design system. Keep the accepted short path. Stablecoins, physical metals and token references preserve canonical identity and units. USD/EUR remain separate unless explicit dated FX evidence is chosen; no new automatic FX provider or invented historical rate.

Complete useful asset/market search, filtering/paging, favorites and selection preservation for large collections where source shows a gap. Test observed versus manual sources and missing price coverage. Implement permitted receipt interpretation only from actual validated receipts/fixtures through a concrete consumer—never turn a user note into verified chain income. Optional scenario/compounding comparisons must be explicitly separate from zero-return Funding Wealth; maintain their original conditional scope.

## 11. Health, Habits and food-lookup completion

References: HLT, HAB, FOOD, E08/E09 and JRN-23–28. Preserve Habits as the accepted visual reference. Do not rework saved meal/water/timer code that already meets its criteria.

### Health and shared observations

Finish nullable/unknown nutrient handling and truthful partial totals, per-meal/daily presentation, serving/per-100g/per-100mL conversions and recipe yield/version snapshots. Changing a recipe must not rewrite historic diary facts. Provide supported nutrient fields with clear units and provenance; never infer missing nutrients as zero or infer grams from millilitres without a stated source relation.

Finish detailed manual body measurements, observation timestamps versus date-only diary labels, original units/source, corrections and sparse trend/table/export behavior. Use a concrete normalized observation consumer with stable source IDs and deduplication so future imports cannot silently double-count manual records. That is not an Apple Watch integration.

Complete saved-meal/copy idempotency, multi-day preview, favorites/recent ordering, grocery edits/checkoff and unit-incompatible ingredient handling. Planned meals do not become consumed until explicit logging. Water and manual activity corrections remain correct across offline merge, repeat clicks, midnight/DST and Today metrics. Date/time policy must keep historical days stable across different-device zones and travel.

Finish Health-consent keep/delete behavior and account-switch privacy, including quick picks and widget summaries. Exports preserve units/dates/unknown fields and neutralize spreadsheet-formula injection. Test actual app food→recipe→saved meal→dated copy→correction→second profile→export→restore. Do not create separate duplicate stores to get a green fixture.

The optional fasting log, when implementable within the now-completed observation/timer model, is neutral opt-in start/end/history with no recommended fasting targets, guilt or punitive streaks; preserve duplicate/conflict/date correctness. It may remain a specifically documented conditional item if it threatens mandatory data work, not an enabled dead button.

### Habits

Finish recurrence/timezone and historical rule semantics, future-effective edits, pause/end/reopen, contribution-linked behavior and documented stack/end policies where originally required. Prove two-client rule/timer conflicts, reload, explicit reviewed logging and idempotent completion. Do not turn a Habit action into a financial transaction or contribution. An unsupported background reminder must say what is actually supported; no native/background claim from a webpage. Preserve the existing color, layout, depth and simplicity.

### Barcode and real food adapter

Retain the pinned local ZXing fallback, native-format probe, repeated-frame confirmation, leading-zero barcode strings, rear-camera selection, session/account fencing and track cleanup. Do not recreate a scanner.

Complete the food lookup service's application identity/contact configuration, named binding and shared persistent admission/cache in the real local packaged app. Use the verified no-subscription provider path, strict barcode/endpoints, validated response shape/provenance and explicit review before one diary write. Cache public product facts only; no private diary frequency or frames to the provider. Unknown food, missing nutrients, malformed body, timeout, throttle and cancel must leave manual entry usable.

Local test flows must include a decoded fixture barcode → real app lookup route → local service binding → controlled provider response → review → one saved entry, not only a decoder unit test. Provide an exact ready-to-configure isolated path for subsequent live provider/camera acceptance. No paid scanning API, additional subscription or automatic real email/account setup.

## 12. Residual product, mobile, support and conditional roadmap

Keep Today hero/whole-life card/rail/activity, all accepted presets/placement, selected-widget summary, source menus, motion, gradients, Goal short flow and full-width ecosystem cards. Old "owner visual pending" statuses do not authorize another broad review or redesign now.

Close integration/eligibility gaps using the existing widget registry: food-entry/per-meal pins and other explicitly recorded missing sources; locked/missing/deleted/consent states; cross-device conflicting layout edits; backup/restore; live binding to canonical selectors. No arbitrary-code widgets, copied financial calculations, ghost staking selection or silent rebind by name. Add absent functionality without changing accepted composition.

Reuse current motion code. Do not replay the old animation project. Check reduced/off/settled behavior as regression. Only if source proves a requested line-chart entrance is still absent, connect that caller to the existing shared policy without new choreography or blanket animation changes. Preserve exact values, visible immediate content and no perpetual motion.

Complete remaining ecosystem source/use evidence and finance/staking contextual links through existing cards/menus. Sixteen processed site icons and WME/Hub fallbacks are already present; do not redownload/redesign all cards. Obtain only genuinely missing safe official assets when available, keep explained fallbacks otherwise, and do not infer partnership/audit/execution authority from a logo or link. Health-only Today must not acquire financial promotions.

Perform the required all-route mobile/keyboard/zoom and long-value checks, including dialogs and recovery screens created this run. Desktop-emulated iPhone is not physical Safari. Install a pinned compatible WebKit test binary only when supported/authorized; record it as engine coverage, not real device proof. Preserve screenshots of unchanged accepted modules as regression references; no need for the owner to upload the same 12 images again.

Finish privacy-safe support diagnostics and useful status visibility: build/source, local save, sync pending/conflict, provider unavailable. Preview before copy; no personal names, emails, balances, food, keys or tokens in the default report. Measure comparable cold/warm app and packaged-runtime behavior, bundle/render/query/network work and representative mixed collections. No claim of massive consumer scale from localhost samples.

Evaluate installability/offline shell only under the original conditional scope. Implement when it can be safe and useful after the core is stable; no shared caching of private responses, forced destructive update, unconditional `skipWaiting`, or native HealthKit claim. Safe outbox/schema-aware updates remain required whether or not a PWA is added.

Apple Watch/wearables remain explicitly deferred. Photo/voice, new chains, new providers and execution integrations retain their original conditional or prohibited status. Close useful normalized interfaces through a real consumer, not unused enums. Do not convert "everything" into an App Store rewrite or another market provider. Record conditional dispositions once, after mandatory work—not as replacement deliverables.

## 13. Testing and closure plan

Use the original JRN-01–40 as the acceptance map. Reuse good existing tests and fixtures; implement absent assertions rather than create forty redundant suites. For each journey record the complete criterion, exact test source/command, covered modes, outcome, and any genuinely external portion. Keep skipped/not-run/interrupted distinct from passing.

For unavailable providers, run actual app adapters against narrow controlled upstream fixtures; use actual WebCrypto, IndexedDB, local persistent Workers and independent browser profiles. A mock of the whole sync coordinator is not end-to-end evidence. Exercise local-only, account, locked and Showcase namespaces. Preserve normal owner data by using fictional disposable profiles only.

Priority fault matrix: independent offline additions and same-record conflicts; empty device; cross-tenant denial; lock/account switch with late response; lost acknowledgements; concurrent financial funding/reversal; old policy queue; migration interruption; deleting while another device is offline; restored old cloud data versus deletion authority; interrupted epoch rotation; large-data paging/cleanup; missing market setup and partial evidence; scanner cancel/account-switch; no private data in artifacts/logs.

Every mandatory internal code defect must be fixed or explicitly remain a failed completion criterion. Obtain bounded independent review for crypto/lifecycle/concurrency boundaries and one final cross-workstream review. Review changed assertions for lost coverage; current UI locators are allowed, removal of conservation/privacy checks is not. Reproduce reviewer defects before patching where practical and keep the test.

At final implementation source run full unit, lint/typecheck, deployment-config checks, normal production build, the complete desktop/mobile browser plan, OpenNext Alpha build/dry-run and applicable packaged security/account/Health checks. Run dedicated local Worker integration/fault tests and map them to the 40 journeys. Keep canonical policy regression and the real hosted result when available; do not rebuild contract logic or claim candidate signing authority.

Ensure the final hosted Linux quality job has named test output and enough justified bounded execution capacity. If GitHub permissions or external scheduling block observation, supply the exact run/ref and local proof without repeated requests or indefinite polling. One final fetch after the known job is expected to have completed is preferable to frequent polling. Local green is not hosted green; successful current Alpha deployment is not a pass for the new branch.

Publish neither a clean full-suite count made by adding disjoint-source reruns nor a success badge for skipped security checks. After late code changes, rerun affected tests and the necessary integration gate at that exact source. A trailing documentation-only commit may retain an earlier artifact only with explicit unchanged application-tree evidence and separate commit identities.

## 14. Owner setup comes afterward: make it executable, not another blocker essay

The owner deliberately intends to perform the eight manual activities after this run. Do not repeatedly ask whether Supabase/Resend accounts exist. No service creation, real OTPs, DNS writes, deployment or migration is authorized now. A real credential or device gesture may remain pending, but every preceding implementation step should be complete and tested.

Reuse the setup checker and email helper. Deliver a single updated activation package with:

- A variable/binding matrix by app server, private Worker, lifecycle authority, market coordinator and food service; classify public versus privileged/server-only values and show their actual consuming modules. No real values in Git/chat/vault/examples.
- Exact isolated sample configs matching the IMPLEMENTED topology, sanitized templates with obvious placeholders, compatibility/migration declarations, local packaged integration fixtures, dry-run validators and missing-config errors. Do not hand off filenames that exist only in prose.
- One staged activation/check script or existing-command sequence that is read-only/dry-run by default, verifies intended source and nonproduction targets, and requires explicit owner approval for any provisioning/migration/write. Normal secret prompts must avoid shell-history leakage.
- A lifecycle/provider-admin prerequisite when genuinely needed; the public anon/publishable key is not enough for admin deletion. Keep this separate from ordinary public-key setup validation.
- A real email/device test checklist linked to the now-implemented acceptance harness, not a fresh coding task. Mark hosted PITR/physical camera/live provider observations explicitly.
- Measured friends-Alpha cost/load assumptions and conservative configurable limits, with current official sources and no unlimited-free promise or unapproved paid upgrade.
- Version/rollback compatibility, encrypted user-backup coverage and forward-recovery instructions. A source archive does not recover someone's private data.

Any proposed change to the existing protected live Alpha configuration/deployment checker is code-review material only. Preserve the current live service and its working secret publication. Keep new services isolated until explicit activation. Do not weaken release validation merely to fit a new binding.

The handoff should let the owner supply credentials/approve exact infrastructure/run real tests later without discovering an omitted basic route or known unfinished rotation implementation. Do not call it "only setup remains" unless that is actually true.

## 15. Checkpoints, budget and honest stopping rules

Use the selected Astra effort; High is recommended for this coupled data/runtime work, Medium is acceptable without reducing scope. Standard speed; no automatic Fast/Extra High/max escalation, billing changes, purchases or credit reload. The owner reports a reset; verify visible meter only if the execution environment actually exposes it. Do not invent a live budget or reuse the old 1% reading. Last reported backup balance was about 64 credits, not the earlier 222/205; actual current usage is account-wide and must be labeled.

The owner permits a substantial multi-hour run and existing authorized allowance/credits for useful implementation. Minimize duplicate context, idle helpers, repeated full-suite runs and journal verbosity. Do not stop voluntarily at the first checkpoint while reachable mandatory work and usable capacity remain. Do stop when requirements are complete; budget is not a target to exhaust.

Commit/push coherent completed slices. During longer work preserve local recovery every roughly 20–30 minutes and before context compaction, dependency migration or reviewer handoff. Keep partial source recoverable without claiming it is verified. Do not force-push or reset owner changes. If a remote action is denied, keep the local archive and exact error once rather than repeating approval prompts. Permissions are boundaries, not problems to bypass.

Keep a concise current `docs/run11/STATE.md` with branch/head, working-tree exceptions, active task, last good tests, exact next action and blockers. Keep the requirement closure overlay machine-readable and incrementally updated. Avoid copying all historic prose into every checkpoint. Record code/build/test/config/hosted identities separately.

Create one final source-only recovery archive, verify its integrity and restore representative critical files in an isolated location; include an interruption/restart drill through the saved state. No secrets, owner browser profiles, email inboxes or raw Health data. Preserve pre-existing archives rather than deleting them to save space.

Update the ACTUAL NovaVault Project Map and a Run11 checkpoint after backup/read-back/hash verification, retaining Run10's true deployed history. Do not create a fake vault if access is absent; record the precise missing access and provide the sanitized note. Do not claim vault writes based only on this prompt or a Git file.

Before ending, check for locally actionable mandatory gaps. A dependency that you have not coded is not a reason to label an otherwise active project externally blocked. If interrupted by a real runtime/context/permission/budget limit, report `PARTIAL — INTERNAL GAPS REMAIN` with the current recoverable source, exact remaining criteria, and why execution stopped. A length/context stop should preserve a continuation command, not falsely claim one more prompt was the planned finish.

## 16. Final deliverables and response

Required outputs are working application changes and tests, not documents alone. Keep documentation limited to current state/closure, concise decisions/evidence, activation, and final outcome.

The final response must begin with a verified local review URL from the NEW owned worktree, or state plainly that the run cannot keep a preview alive and give one tested restart command. Do not present the unchanged live Alpha as the new branch preview. Include:

1. A plain-language table of each completed end-to-end outcome, the retained existing work, and what genuinely remains—not just the last two commits or the total unit count.
2. Exact final branch/head, draft PR when available, application/build source, remote equality and intentional worktree exceptions.
3. Complete test counts with source/runtime, failures/skips/blocked stages and hosted versus local distinctions. Include the 40-journey coverage map and final cross-workstream review limitations.
4. Internal implementation gaps listed separately from owner/provider/device actions. None of the former may be hidden under "setup pending".
5. Source archive integrity/restore receipt and actual NovaVault receipt; private-data coverage stated separately.
6. A concise activation handoff reference, without requiring the owner to repeat the eight setup activities inside this run or redo accepted visual review.
7. Confirmation of no merge, production deployment, real migration/deletion, DNS change, new subscription, financial signature or transaction.

Successful code completion means all mandatory reachable implementation and local/packaged acceptance is closed and the explicit external acceptance package is ready. It does not make an unconfigured hosted Alpha friends-ready. If unfinished code remains, say so and preserve the continuation; never substitute the number of hours, commits, tests or requirements mapped for delivered functionality.

## Reference sources and interpretation

Project sources are the original 290 specifications, 40 journeys, polishing P/E ledger, current repository and PRE11/PRE11B evidence. The companion scope map preserves exact original wording and provenance. This brief supplies execution ordering, refreshed source identity, preservation rules and acceptance separation; it does not assert the historical implementation is already complete.

Public implementation references, checked while preparing this brief; recheck version-specific details when using them:

- OpenAI model/effort: https://developers.openai.com/api/docs/models/gpt-6-astra and https://developers.openai.com/api/docs/guides/reasoning
- OpenNext request bindings: https://opennext.js.org/cloudflare/bindings
- Supabase server-side identity guidance: https://supabase.com/docs/guides/auth/server-side/advanced-guide
- Cloudflare storage/recovery: https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- Playwright reporter/CI: https://playwright.dev/docs/test-reporters and https://playwright.dev/docs/ci

Use source evidence for provider behavior, not assumptions or a memory of another framework version. No live service terms, credentials or private configuration are established by these links.

**END OF AUTHORITATIVE RUN #11 COMPLETION MASTER PROMPT**
