# ADR-006: lost confirmation of the final sync upload

Status: **PROPOSAL, awaiting the owner's decision.** Nothing here is implemented. It would change sync-journal behaviour (options A and B also change its format), so it needs explicit owner approval and its own reviewed PR, labelled TIER 3 (auth/sync). Code references are to `main` at `5dd2ee7`.

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
  - An older build that meets policy 3 shows the existing "Pending work uses a newer sync policy. Update the app; queued work was preserved and not sent." and keeps the queue.
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
