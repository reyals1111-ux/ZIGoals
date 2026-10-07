# ADR-013: Opt-in encrypted sync for the Portfolio

- **Status:** accepted (owner-approved Session U plan, 2026-10-04); built in Session U Part 9 (2026-10-05), behind the
  sync-writes switch (`apps/web/lib/vault/sync-writes.ts`). Shipped off (Session U follow-up F1); **available since
  Session W Part 1 (2026-10-06, owner decision W1)**: with the switch on, "Also sync my Portfolio (optional)" appears under
  account sync, unticked by default, with its Help question, and transfers run only for people who tick it.
- **Context:** the Portfolio (PORTFOLIO_V1.md) is a device record (`zigoals:portfolio:v1`): never synced, never in the
  private backups, never read by Wealth, Goals or anything else. People with two devices asked to see the same Portfolio on
  both. The four synced sections (finance, habits, health, settings) have a fixed catalog that every older client reads,
  compacts and validates; a fifth section there would be refused or, worse, compacted away by an older client.

## Decision

1. **Opt-in, per account, per device.** "Also sync my Portfolio (optional)" sits beside the Health choice in Settings →
   account sync, unticked by default. The choice is kept in the account's storage on this device
   (`zigoals:portfolio-sync-choice:v1`), not in the remembered-device record. Unticking stops transfers here and does not
   delete the copy; "Delete the Portfolio's encrypted copy" deletes it for every device.
2. **Its own keyspace in the same vault object** (`workers/private-sync/portfolio.mjs`, route `/v1/portfolio`): a head
   (`portfolio`: revision, deletion generation, epoch, part count, bytes), the sealed parts (`portfolio-part:<n>`) and
   receipts (`portfolio-receipt:<operation>`, the newest 64 kept). The vault's reads, writes, compaction, domain deletion
   and rotation touch `record:` and `rotation-row:` keys only, so **today's and older clients never see or remove it**
   (tested with today's client against the real Worker). The account erase, in the app and the owner's recovery-admin
   path, removes every key of the object, this one included.
3. **One sealed snapshot, compare-and-swap.** The Portfolio's canonical JSON is cut into parts of at most 48,000
   characters (at most 14, and at most 1,000,000 bytes once sealed, checked on the device before any upload: about
   670,000 characters of plain Latin text, fewer when it needs escaping or uses other scripts; one snapshot then fits one
   relay request of the existing bound),
   each sealed with the vault key for its own place: the `portfolio` record label (crypto.ts, Session U Part 5 item 8), a
   fixed object id per index, the snapshot's revision and the active epoch. Each part says how many parts there are, so the
   server cannot drop, reorder or replay a part from another revision unnoticed. A write replaces the snapshot only if
   its base is the current revision; replays of an operation id answer as before.
4. **Three-way merge on the whole Portfolio.** Each device keeps a base (revision, deletion generation, SHA-256 of the
   canonical text, and the digest of an upload whose answer has not arrived) under `zigoals:portfolio-sync:v1`. One side
   changed: take it. Both changed: the person chooses "Keep this device's Portfolio" or "Keep the encrypted copy" (the
   replaced local Portfolio is kept as a recovery copy here). An upload whose answer was lost is recognised by its digest.
5. **Deletion generation.** Deleting the copy counts a generation; a device that synced before sees the change, stops
   (its choice is turned off, its Portfolio kept) and says so, instead of uploading the copy again.
6. **Rotation.** Writes are refused while a key rotation is staged and must be sealed at the active epoch. Rotation
   (vault code, unchanged) leaves the Portfolio parts at the old epoch; the next sync on a device that has a Portfolio
   reads the copy as stale and uploads its own; a device with none says to open ZIGoals where the Portfolio is (Help).
7. **Never feeds Wealth or Goals.** The sync reads and writes `zigoals:portfolio:v1` only (tested: the other keys are
   untouched). Prices stay the market service's, unchanged.
8. **After the four sections.** It runs after the account records synced, under the same account lock; its outcome shows
   beside its choice, and a Portfolio failure never undoes or pauses the account sync.

## Consequences

- One more encrypted object per account, bounded at 1,000,000 bytes, outside the vault's 32 MB quota and its receipts.
- The relay gains `GET ?action=portfolio` and the POST action `portfolio`, relayed to `/v1/portfolio` like the vault's.
- No change for anyone who leaves the box unticked; the public Alpha has no account path at all.
- Rollback: a build without this code ignores the keyspace (it never lists it); the copy stays until the account erase
  or a later build deletes it. Builds #27/#28 cannot open it and do not try.
- Owner decision recorded: the whole-Portfolio merge asks the person on any two-sided change, rather than merging
  transaction by transaction. A finer merge is possible later without a format change (the base digest stays valid).

## Tests

- `apps/web/lib/vault/portfolio-sync.test.ts`: the plan table; two devices through the Worker's own rules (upload,
  first download, both changed with each choice, a lost answer after a further edit, deletion, rotation); the parts'
  guarantees; nothing else on the device touched.
- `scripts/run11/portfolio-keyspace.test.mjs`: the real Worker in Miniflare: compare-and-swap, replay, refusals, today's
  client and its compaction leaving the copy in place, a staged rotation, a deletion generation, the account erase.
