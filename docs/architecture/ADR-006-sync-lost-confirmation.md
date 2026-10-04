# ADR-006: lost confirmation of the final sync upload

Status: **Accepted (option A2), implemented** in Session P, PR 2 (2026-10-03, branch `sync/session-p-2026-10-03`, labelled [Tier 3] (auth/sync)). The owner approved A2 at the Session P plan approval. The [implementation plan](#implementation-plan-option-a) below is the one built, with A2's companion record; the [implementation record](#implementation-record-session-p-2026-10-03) at the end says what landed and how it was proven. X1–X4 are plain tests now. The sections between were written as a proposal on 2026-10-01 (Session J) and are kept as the record of the decision; their code references are to `main` at `5dd2ee7`.

## Decision requested
Choose one:
- **A** (recommended);
- **B**;
- **no change** (keep it as a documented limitation). Identical content already resolves without a review (see C).

The recommendation and the reasoning are at the end.

## Mechanism
PR #25 fixed the self-conflict race. When the cloud acknowledges this device's catalog head, the journal write that clears `pending` also advances `base` for every section this sync published unchanged (`own`). A local edit made during that sync is then a plain local change the next time, not a conflict.

The remaining gap is a head write that the cloud applies but whose acknowledgement never reaches the browser (tab closed, network drop, device asleep):
1. **Send.** `send()` (`apps/web/lib/vault/cloud-sync.ts:91`) writes `pending: <head operation>` to the journal, then calls `transport.write`. The cloud applies it, but the response is lost, so `transport.write` throws. `base`, `headRevision` and `headDigest` stay at their pre-sync values; the `confirmed` fields passed at `:109` are never written.
2. **Replay.** On the next sync, `if(state.pending) … await send(state.pending)` (`:92`) replays the operation with no `confirmed` fields. The server treats the replay idempotently, but the prospective base is gone.
3. **Merge.** `cloudSnapshot` returns this device's own publication P as remote. `mergePrivateData` (`:81–82`) compares base B (old), local L′ (edited after publishing) and remote P:
   - a section never synced before (`b===undefined`) with `l!==r` throws "Unlinked local and cloud records differ";
   - finance with `l!==b && r!==b && l!==r` throws "Conflicting financial changes";
   - other sections merge, but against the wrong base.
4. **Result.** Automatic sync pauses (`apps/web/components/vault-sync-controls.tsx:66` surfaces the error) and asks for a manual review of a conflict that does not exist.

Data is never lost: both copies are kept, and the review is explicit.

## Likelihood and user impact
- **Needs two things together:**
  1. the acknowledgement of the *head* write is lost, a window of about one network round trip at the very end of a sync; and
  2. the user edits a published section before the next sync completes.
- **Most exposed:** mobile use (backgrounding or closing the tab mid-sync, flaky networks) and a user who keeps editing straight away. It has not been observed in the field; no hosted sync is active yet. For a ~20-person friends Alpha, expect it to be rare but occasional, not a daily event.
- **Impact:** no data loss or corruption. The user sees an alarming error ("Unlinked…" or a financial conflict), auto-sync pauses, and they must export or review to continue. That is a trust and support cost, and the financial wording is the most alarming.

## Constraints
- `syncStateSchema` (`cloud-sync.ts:20`) is `.strict()`, so an older app build rejects a journal with unknown keys. Any added field is a **format change**: it needs a `PENDING_POLICY` bump (`:8`, currently 2) and a defined downgrade story.
- Replay must stay idempotent. A replayed `pending` may already be applied, or may be superseded by another device's head (`RevisionConflict`).
- Conflict detection must not weaken. `base` may only advance to bytes this device provably published **and** the cloud provably holds, and only for sections this device published unchanged (`own`). Advancing `base` for a section that merged another device's edits would make a stale local copy look like a deliberate revert and overwrite those edits.

## Options

### A. Persist the prospective confirmation with `pending`
- **What:** when `send` writes `pending` for the head operation, also write `pendingConfirmed: {base: {<own section>: sha256(bytes)}, headRevision, headDigest}`. Store digests, not bytes, to keep the journal small.
- **On replay**, apply it only if all of these hold:
  - the server answers exactly `operation.base+1`, or reports the same operation already applied;
  - the fresh `cloudSnapshot` head digest equals `pendingConfirmed.headDigest`;
  - for each listed section, the current remote bytes hash to the stored digest.
  Then set `base[section] = remote bytes`. The later local edit becomes a plain local change.
- **Format and migration:**
  - A new optional key and `PENDING_POLICY` 2 → 3, written only when `pendingConfirmed` is present, i.e. only while a head write is in flight.
  - Journals without it behave as today.
  - An older build that meets policy 3 shows the existing "Pending work uses a newer sync policy. Update the app; queued work was preserved and not sent." and keeps the queue. **Corrected 2026-10-01:** the journal reader is strict, so an older build refuses the whole journal as damaged first. See [the correction](#correction-to-as-downgrade-note).
  - No cloud, protocol or encrypted-record change.
- **Rollback:** reverting the client is safe for users with no pending work. A user caught mid-head-write by the rollback sees the "newer sync policy" error until the newer build returns, or can follow forward recovery. The window is small because policy 3 is written only during the final write.
- **Test plan:**
  - Unit (`cloud-sync.test.ts`):
    - a fake transport forwards the head write to the in-memory cloud and then throws `TypeError('network')`;
    - after a local edit, the next `synchronize` must not throw, must upload the edit and must keep real conflicts. The main case fails today and must pass after the change.
  - Variants:
    - replay hitting `RevisionConflict` leaves `base` unchanged;
    - another device's head in between still yields a real conflict;
    - a merged (not `own`) section never advances;
    - an old build meeting policy 3 refuses safely.
  - Browser (`scripts/run11/sync-lost-ack-browser.test.mjs`, same shape as `sync-self-conflict-browser.test.mjs`):
    - forward the head `POST /v1/vault` to Miniflare, then `route.abort('failed')` to the page;
    - edit, "Sync now", and require a fresh completion with no alert;
    - 20 sequential runs.
  - Crash variant: close the page after the forwarded write, reopen the same profile, repeat.
- **Effort:** about 1.5–2 days including tests. **Risk:** low. It changes only *when* `base` advances, and only to bytes the cloud holds that this device published.

### B. A separate "published by this device" digest log
- **What:** a new IndexedDB store (`zigoals-account-sync-v1` version 3) keeps recent `{headDigest → own section digests}`. On sync, a remote head found in the log proves this device published it.
- **Format and migration:** the journal record is unchanged, but the database version changes. `onupgradeneeded` creates the store. Older builds opening version 3 get a `VersionError` **even with no pending work**, which is a wider downgrade impact than A. It needs pruning.
- **Rollback:** harder than A. Any user who opened a v3 build cannot open the old one until they update again.
- **Test plan:** A's plan, plus upgrade and pruning tests. **Effort:** about 2.5–3 days. **Benefit over A:** it also covers a `pending` cleared some other way (manual recovery) and enables option D.

### C. Resolve sections whose content is provably identical (no format change): already the behaviour
- **Checked against the code:** when local and remote bytes are identical (`l===r`), `mergePrivateData` already returns that value with no error. That holds for a never-synced section (`:81`) and for finance (`:82` throws only when `l!==r`). The next normal commit (`:112`) then sets `base` to it.
- **So:** a lost acknowledgement *without* a later edit already syncs quietly today.
- **Limit:** the reported case has `l!==r` (the user edited after publishing). Content equality cannot tell "I published P and then edited" from "someone else wrote P", so it cannot fix that case without a record of what this device published. That record is A or B.
- **Worth adding regardless:** a unit test pinning the identical-content behaviour. Effort: under 0.5 day; no format change.

### D. Keep the behaviour and improve the review wording
- Say in the review that one side "was published from this device earlier". To be truthful this needs B's log, so it is not independent of B. Effort: about 1 day on top of B.

### Considered and rejected: E. Derive the confirmation from the replayed operation (no format change)
- **Idea:** the pending head row carries its `revision` in plain metadata, and its sealed catalog holds each section's digest. If the replayed head is the current remote head and its `revision` is `state.headRevision+1` (no other writer since our last confirmed head), treat every published section as this device's own.
- **Why rejected:** it is sound only if `base` always equals the data at `headDigest`. PR #25 deliberately advances `headRevision`/`headDigest` while leaving `base` behind for merged sections, so that invariant does not hold. E could then advance `base` for a merged section and turn a stale local copy into an overwrite. Making E safe needs extra persisted state, which is A.

## Recommendation
**A**, in one reviewed TIER 3 (auth/sync) PR, together with the identical-content unit test from C.
- **Why A:** it fixes the reported case at the root. Its format change is one optional key under a policy bump that is written only during the final head write, and the downgrade path already exists and is safe ("newer sync policy", queue kept).
- **No format-free fix exists:** identical content already resolves (C), and deriving the proof from the replayed operation (E) is unsafe with the current base semantics.
- **Not B:** its wider downgrade impact is not justified until a second use (D) is wanted.
- **Until approved:** the current behaviour stays. It is safe, can show an unnecessary review, and is recorded in docs/STATUS.md.

## Implementation plan (option A)
Added 2026-10-01 by Session J. It is a plan only: no sync, encryption or Worker code changed. Line references are to `main` at `fc906e8`. The failing-first tests already exist (below).

### Correction to A's downgrade note
- **The reader is strict.** `SyncJournal.read` (`cloud-sync.ts:118`) parses the stored record with `syncStateSchema`, which is `.strict()` (`:20`), *before* `synchronize` looks at `pendingPolicy` (`:92`).
  - An older build that meets **any** journal key it does not know therefore rejects the whole journal: "Sync journal is damaged. Export before recovery."
  - It never reaches "Pending work uses a newer sync policy…". Nothing is written or sent, so no data is lost, but the message is more alarming than the ADR says.
  - Pinned by the guard "a stored journal with a key this build does not know is refused as damaged…" in `scripts/run11/sync-lost-ack.test.ts`.
- **The recovery file embeds the same schema.** The encrypted pending-recovery file (`pending-recovery.ts:5`) contains a `syncStateSchema` journal, so a new `SyncState` key also changes that file's format.

### Where to keep the confirmation
| | **A1**: a key in `SyncState` (as the ADR wrote it) | **A2**: a companion record (recommended) |
|---|---|---|
| Stored as | `pendingConfirmed` in the journal record. `PENDING_POLICY` 2 → 3, written only with it | A second value in the same IndexedDB object store `state` (database `zigoals-account-sync-v1`, version stays 2), keyed by account + `confirm`. Written in the **same transaction** as the journal record that sets `pending`: `{operation, headRevision, headDigest, base:{<own section>: sha256}}` |
| An older build meets it | "Sync journal is damaged…" during the in-flight window. Its pending-recovery export refuses too | Ignores it and replays exactly as today. The false conflict is still possible there, but there is no new error |
| Stale values | Cleared with `pending` | Used only when `operation === pending.operation`; deleted when `pending` clears |
| Format change | Journal key, policy 3 and the recovery-file payload | None to `SyncState`, the policy or the recovery file: one extra key in an existing store |
| `Journal` interface | Unchanged | Gains an optional confirmation read/write, which the test `MemoryJournal`s implement too |

**Recommendation: A2.** It has the same proof rule as A, with a downgrade that degrades to today's behaviour instead of a new alarming error. The owner decides in the fix PR.

### Steps
1. **Schema:** a strict `confirmationSchema`: operation UUID, `headRevision`, `headDigest` (64 hex) and `base` as a partial record of domain → SHA-256. For A1, add it to `syncStateSchema` and accept policies 2 and 3.
2. **Write:** the head call (`:109`) passes the `own` sections' digests with the head revision and digest. `send` (`:91`) stores them with `pending` in one transaction.
3. **Clear:** on an acknowledged write and on `RevisionConflict` (both in `send`, `:91`), together with `pending`.
4. **Verified apply on replay** (`:92`):
   - Replay through `send`.
   - If the answer is `base+1` or the stored receipt, read a fresh `cloudSnapshot`.
   - Apply only if its head digest equals the confirmation's **and** every listed section's remote bytes hash to the stored digest.
   - Then set `base[section]` to the remote bytes and `headRevision`/`headDigest` from the confirmation, in one journal write.
   - Otherwise change nothing. A section missing from the confirmation (one that merged another device's edits) never advances.
5. **Journal replacements** clear the confirmation in the same transaction:
   - forward recovery (`forward-recovery.ts:27`);
   - conflict review (`conflict-review.ts:69`), both through `SyncJournal.recover` (`cloud-sync.ts:119`).

   A2 does not export the confirmation in the pending-recovery file: it is advisory, and losing it only means today's behaviour.
6. **Flip the tests:** X1–X4 in [SKIPPED_TESTS.md](../testing/SKIPPED_TESTS.md#expected-failures-testfails-known-bugs) become plain `test`. The six guards stay unchanged.
7. **Browser test:** `scripts/run11/sync-lost-ack-browser.test.mjs`, the same shape as `sync-self-conflict-browser.test.mjs`, plus its line in the `web integration` Vitest list in `ci.yml`.
8. **Corpus:** add the new schema to the jitless corpus (`apps/web/lib/vault/zod-jitless.test.ts`).

### Affected files
- `apps/web/lib/vault/cloud-sync.ts`: schema `:20`, `send` `:91`, replay `:92`, head write `:109`, `SyncJournal` `:114–121`.
- `apps/web/lib/vault/forward-recovery.ts` `:27` and `apps/web/lib/vault/conflict-review.ts` `:69`: clear the confirmation on replacement.
- `apps/web/lib/vault/pending-recovery.ts` `:5`: A1 only.
- Tests:
  - `apps/web/lib/vault/cloud-sync.test.ts`;
  - `forward-recovery.test.ts`;
  - `zod-jitless.test.ts`;
  - `scripts/run11/sync-lost-ack.test.ts` and `sync-lost-ack-runtime.test.mjs` (flip);
  - the new browser test.
- `.github/workflows/ci.yml`: one line.
- Docs: this ADR's status, SKIPPED_TESTS (remove X1–X4), STATUS.
- **Unchanged:** `workers/**`, the sync protocol, encrypted records, the cloud catalog, and the sync UI (`vault-sync-controls.tsx`).

### Data and compatibility impact
- **Cloud:** none. Only the per-device journal changes; it lives in IndexedDB and is not synced or backed up.
- **When it exists:** the confirmation is written only while the final head write is in flight, and cleared when it is acknowledged.
- **Upgrade:** journals without a confirmation behave exactly as today.
- **Downgrade:** see the table. A2 keeps today's behaviour, while A1 shows "damaged" in the in-flight window.
- **Conflict detection does not weaken.** `base` advances only to bytes the cloud provably holds, that this device published unchanged (`own`), behind an unchanged head digest.

### Test plan
- **In memory** (`scripts/run11/sync-lost-ack.test.ts`):
  - X1–X3 flip, and the guards stay green.
  - Add these cases:
    - a merged section never advances;
    - a stale confirmation for another operation is ignored (A2);
    - a receipt whose head has since changed applies nothing;
    - crash and reopen: a new `SyncJournal` instance (fake-indexeddb) reads the persisted state between the lost acknowledgement and the replay.
- **Downgrade:**
  - A2: a reader without the code ignores the companion record and replays as today.
  - A1: the existing guard shows the "damaged" refusal.
- **Miniflare** (`sync-lost-ack-runtime.test.mjs`): X4 flips; add the crash variant.
- **Browser** (CI `web integration`):
  - Forward the head `POST /v1/vault` to the Worker, then `route.abort('failed')` for the page. Edit, Sync now, and require a fresh completion with no alert.
  - 20 sequential local runs, plus a close-and-reopen-profile variant.
- **Stage 8 re-acceptance** ([STAGE8_ACCEPTANCE.md](../run11/STAGE8_ACCEPTANCE.md), fictional data, desktop ↔ phone):
  - re-run B4 (offline edits), B5 (a real conflict still pauses) and B6 (a replay applies once, with no duplicate);
  - add one row: drop the connection, or close the tab, as the final write leaves; edit; reconnect. The sync completes with no conflict review.

  Record receipts as for the other rows.

### Rollback
- **Client only:** revert the PR and redeploy through the Manual Alpha workflow. The Worker needs no rollback.
- **A2:** the reverted build ignores leftover companion records. No user action is needed.
- **A1:** a user caught mid-head-write sees "Sync journal is damaged" until they update again or use the existing export and forward-recovery path. The window is small.

### Estimate check
- **The ADR said 1.5–2 days. Now about 2–2.5 days, A2 included:**
  - code and in-memory tests: 0.5–0.75 day;
  - A2's companion record (journal interface, one-transaction write, pruning, recovery paths): about 0.5 day;
  - the browser test and its 20-run stability check: about 0.5 day;
  - the Stage 8 rows and docs: 0.25–0.5 day.
- **A1 alone** stays near 1.5–2 days, with the worse downgrade.

## Implementation record (Session P, 2026-10-03)
Built as planned, option **A2**, in `apps/web/lib/vault/cloud-sync.ts`:
- **The confirmation record.** `confirmationSchema` (strict): `{version: 1, operation, headRevision, headDigest, base: {<own section>: sha256}}`. The head write stores it with `pending` in **one IndexedDB transaction** (`SyncJournal.write(state, confirmation)`), under the key `<account>:confirm` in the existing `state` store; the database version stays 2, the journal record keeps today's shape and `PENDING_POLICY` 2, and the pending-recovery file is unchanged. Every other journal write clears it (`write(state, null)`), as does `SyncJournal.recover` (forward recovery and conflict review) in its own transaction.
- **The verified apply on replay** (`replay()` in `synchronize`). A pending write is replayed as before. When the cloud answers `base + 1` and the stored confirmation names exactly that operation and it carries the head: a fresh `cloudSnapshot`; only if its head revision and digest are the confirmation's, and every listed section's remote bytes hash to the recorded digest, the base advances to those bytes, with `headRevision`/`headDigest`, in the same journal write that clears `pending` and the confirmation. A section that merged another device's edits is not listed and never advances. Anything else (a stale or missing confirmation, a head that moved on, a digest that differs) leaves the base as it was: today's behaviour. Until that one write the replay stays pending and idempotent, so a crash in between changes nothing.
- **Downgrade.** An older build reads the account's record only, so it ignores the companion record and replays as it always did; the only thing it keeps is the false conflict the fix removes. No new error. A `Journal` without `readConfirmation` (the test's `OlderJournal`) proves it.
- **Unchanged:** the Workers, the sync protocol, the encrypted records, the catalog and the sync UI.

**Tests.**
- `scripts/run11/sync-lost-ack.test.ts`: X1–X3 flipped to plain tests; new: the head write stores the confirmation and an acknowledged write clears it; a merged section is not listed and never advances; a stale confirmation for another operation is ignored and cleared; a head that changed since applies nothing and the real conflict shows; a rejected replay never keeps a confirmation; crash and reopen (a new `SyncJournal` on fake-indexeddb between the lost acknowledgement and the replay, with the journal record still parsing under the strict schema); old reads new (`OlderJournal`); recovery clears the confirmation. The six guards are unchanged.
- `scripts/run11/sync-lost-ack-runtime.test.mjs` (Miniflare, the real Worker): X4 flipped; a crash variant with a new journal instance.
- `scripts/run11/sync-lost-ack-browser.test.mjs` (real Chrome, the production app, the real route handler and Worker, in CI's `web integration` list): the head write's reply is dropped after the Worker applied it, a Goal is created afterwards, and "Sync now" completes with no review; three variants (the same page; reload and unlock; close and reopen the profile); a phone-sized second device then sees every Goal.
- `apps/web/lib/vault/zod-jitless.test.ts`: the schema is in the corpus.
- Repeat runs and the Stage 8 rows (B4–B6 re-run on this build; the new row B12) are recorded in `docs/STATUS.md` (Session P, PR 2) and `docs/run11/STAGE8_COVERAGE.md`.

**Rollback:** revert the PR. Leftover companion records are ignored by the reverted build; no user action is needed.
