# ADR-006: lost confirmation of the final sync upload

Status: **PROPOSED / DRAFT**. This records a design question. Nothing here is implemented. It needs an owner decision before any sync-journal format change.

## Context
PR #25 fixed the self-conflict race. When the cloud acknowledges this device's catalog head, the journal write that clears `pending` also advances `base` for every section the sync published unchanged (`apps/web/lib/vault/cloud-sync.ts`, `send(..., confirmed)`). A local edit made during that sync is then a plain local change the next time, not a conflict.

**The remaining gap.** The cloud can apply the head write while its acknowledgement never reaches the browser: the tab closes, the network drops, or the device sleeps.
1. `transport.write` throws, so the journal still holds `pending: <head operation>`. `base`, `headRevision` and `headDigest` stay at their pre-sync values.
2. On the next sync, `if(state.pending) await send(state.pending)` replays the operation with **no** `confirmed` fields. Replay is idempotent on the server, but the prospective base is lost.
3. If the user edited a published section in the meantime, the three-way merge sees base B (old), local L′ (edited) and remote S (this device's own publication). Both sides differ from B, so the next sync shows a false "Unlinked local and cloud records differ" or a financial conflict. It needs a manual review, even though nothing conflicts.

Data is never lost: both copies are preserved and the review is explicit. The cost is a confusing review for the user and a support burden. The window is small (one network round trip) but real on mobile.

## Constraints
- `syncStateSchema` is `.strict()`. An older app build rejects a journal with unknown keys, so any added field is a **format change**. It needs a `PENDING_POLICY` (or journal version) bump and a defined downgrade story.
- Replay must stay idempotent. A replayed `pending` may already be applied, or may be superseded by another device's head (`RevisionConflict`).
- Conflict detection must not weaken. We may only advance `base` to bytes this device provably published *and* the cloud provably holds.

## Options
**A. Persist the prospective confirmation with `pending` (recommended).**
- When `send` writes `pending` for the head operation, also write `pendingConfirmed: {base: {<section>: sha256(bytes)}, headRevision, headDigest}`. Store digests, not the section bytes, to keep the journal small.
- On replay, apply it only if (a) the server's answer is exactly `operation.base+1`, or it reports the same operation as already applied, and (b) the fresh `cloudSnapshot` head digest equals `pendingConfirmed.headDigest`.
- For each section whose current *remote* bytes hash to the stored digest, set `base[section] = remote bytes`. Local bytes are not needed, and a local edit then shows as a plain local change.
- **Format:** a new optional key, plus `PENDING_POLICY` 2 → 3. Older builds refuse the newer pending work with the existing "newer sync policy" error and keep the queue, so the failure is safe and visible.
- **Risk:** low. It changes only when `base` advances, and only to bytes the cloud holds and this device published.

**B. A separate "published by this device" digest log.**
- A new IndexedDB store (`zigoals-account-sync-v1` version 3) keeps recent `{headDigest → section digests}`.
- The sync journal record is unchanged, but the database schema changes, which also needs an upgrade path.
- It helps even when `pending` was cleared some other way (manual recovery). It needs pruning, and it is more moving parts than A.

**C. Content equality only (no format change).**
- Advance `base[section]` whenever the remote section bytes equal the local ones.
- This is safe, but it does **not** cover the reported case, where the local copy was edited after publication. It only removes the easier false positives.
- Worth doing on its own as a small improvement.

**D. Keep the current behaviour, improve the review copy.**
- Explain in the review that one side is "published from this device earlier" when the remote head digest matches one this device recently sent. That needs B's log anyway.

## Migration
- **A:** new builds read journals without `pendingConfirmed` as today, then replay without confirmation (the current behaviour).
  - Writers set the new policy only when they write `pendingConfirmed`.
  - A downgrade with pending work shows the existing "newer sync policy" error and preserves the queue. Document "update the app" as the recovery path.
  - No cloud or server change is needed. Encrypted records, catalog and protocol stay the same.
- **B:** IndexedDB `onupgradeneeded` creates the store. Older builds opening version 3 get a `VersionError`, so B needs the same downgrade note, and also affects builds without pending work.

## Reproduction harness (design)
1. **Unit (`cloud-sync.test.ts`).**
   - A fake transport forwards the head `write` to the in-memory cloud, then throws `TypeError('network')` before returning.
   - Then: edit a published section locally, call `synchronize` again, and assert no `Unlinked` or conflict error and that the local edit is uploaded.
   - Also assert that the sections are unchanged when the replay meets `RevisionConflict`, and that another device's head in between still produces a real conflict.
   - Today the main case fails deterministically. After option A it must pass.
2. **Browser (`scripts/run11/sync-lost-ack-browser.test.mjs`), same shape as `sync-self-conflict-browser.test.mjs`.**
   - Route `/api/private-account` through `privateAccountRequest` into Miniflare.
   - When armed, forward the head `POST /v1/vault` to Miniflare, then answer the browser with `route.abort('failed')`.
   - Edit a Goal, press "Sync now", and require a fresh completion (`armSyncCompletion`) with no alert.
   - Run 20 sequential times, max 2 workers.
3. **Crash variant.** Close the page right after the forwarded head write, reopen the same profile, and repeat step 2's assertions. This covers the "tab closed" path, where no in-memory state survives.

## Decision needed from the owner
Approve option A, including the `PENDING_POLICY` bump and the downgrade message, or choose B, C+D, or no change. Until then this stays a documented limitation. The current behaviour is safe but can show an unnecessary review.
