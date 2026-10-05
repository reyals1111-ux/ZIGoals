# Sync homes for Session P's device-only records

**Status:** read support shipped in Session P, PR 2 (2026-10-03, R1, live since Alpha deploy #27 on 2026-10-04). Session U
Part 9 built the writes, the merge and Health v3 (read support included). **The write switch ships OFF** (Session U
follow-up F1, 2026-10-05, `apps/web/lib/vault/sync-writes.ts`, `SYNC_WRITES = false`): the four records below stay in
their device keys, exactly as on #28, until the one-line switch-ON PR (docs/product/SYNC_WRITES_ON.md) writes them into
their synced homes.

Session P's PR 3 added four kinds of record that had no place in the synced formats: habit-health links with their
automatic check-in markers (H7), health goals (G3), weekly reviews (G1) and fasting sessions (HE6). PR 3 kept each in a
device-only key (`zigoals:<name>:v1`, per account, in `getAppStorage()`), because every synced module is `.strict()` and a
key an older build does not know is refused as "invalid or unsupported version".

## The homes (owner review of Session U, change 8)

**Rule: data that describes a person's health syncs only inside Health, under the Health consent.**

| Record (device key) | Synced home | Version | Field |
|---|---|---|---|
| Fasting session, `zigoals:fasting:v1` | Health | **v2** | `fasting` (`{version: 1, sessions[]}`) |
| Weekly review, `zigoals:weekly-review:v1`, without its Health note | Settings | **v2** | `weeklyReview` |
| The weekly review's Health note | Health | **v3** | `reviewNotes` (`{version: 1, notes: {weekStart: text}}`) |
| Health goal, `zigoals:health-goals:v1` | Health | **v3** | `healthGoals` (`{version: 1, goals[]}`) |
| Habit-health link and its automatic check-in markers, `zigoals:habit-health-links:v1` | Health | **v3** | `habitLinks` (`{version: 1, links, applied[]}`) |

Each group is byte-for-byte its device key's record. Habits stay at v2: an automatic check-in is an ordinary habit entry
(no `entries[].source`), and the marker that says it was automatic lives in `habitLinks.applied`. The homes Session P
first planned (`habits[].healthLink` in habits v3, `healthGoals[]` in finance v4) stay readable and are never written.

Health v3 is new in Session U Part 9 (`healthV3Schema`, `apps/web/lib/health.ts`). **Builds #27 and #28 (R1) read Health
v2 and settings v2 but refuse Health v3**; builds before R1 refuse all of them.

### Lazy versions

A module changes version only when a group it did not hold gets content (`apps/web/lib/vault/sync-homes.ts`): the first
fast makes Health v2; the first health goal, Health link, automatic check-in or Health note makes Health v3; the first
review or review day makes settings v2. An empty record where there was none changes nothing, and nothing ever goes back
down a version. Every version raise keeps the record it replaced as a recovery copy, in browser storage
(`private-storage.ts`) and, since Part 9, in the durable database too (`vault/local.ts`, same transaction). Someone who
never uses the four features keeps Health v1 and settings v1, byte for byte.

## Migration: merge by id, on every load

On every load (once the module has loaded), `ensureDeviceRecordsMerged` (`apps/web/lib/sync-homes-store.ts`) copies what
the device keys hold into the homes, record by record (a fast or a goal by id, a link by habit, a marker by habit and day,
a review by week):

- a marker on this device, `zigoals:sync-homes:v1`, holds one short digest per record merged. A record already merged
  and unchanged is skipped, so the merge is idempotent and a record deleted here never comes back from the device key;
- a record never merged is added; if the home already has one with the same id (another device's, through sync), the
  newer goal or link by `updatedAt` stays, the marker already here stays (an undo on either side holds), and a review keeps
  its status while empty note fields take this device's words;
- a record the device key changed since it was merged (an older build edited it after a rollback) is merged again, and
  the device's copy wins. A record an older build deleted stays in the home (nothing is lost; delete it again);
- a fast an older build started while another fast runs here waits, unmerged, until that one ends;
- **the device keys are never rewritten**: they stay readable (an older build keeps working from them after a rollback),
  and "Export everything" still includes them. The only writes are the homes and the marker, in that order, so a failure
  is merged again on the next load.

## Sync

The homes travel with their modules: Health only when the person turned on Health sync (the Health consent), settings
with the account. Three merge rules keep two devices from conflicting over these records (`apps/web/lib/vault/cloud-sync.ts`):

- a section's version: two devices that each raised it merge at the higher version (each version's fields include the
  lower one's);
- automatic check-in markers merge to their union: the first application of a day stays, an undo on either side holds;
- weekly reviews merge week by week and field by field; the same field of the same week changed on both sides still stops
  for the conflict review.

## Behaviour on every build

- **This build, switch on** reads and writes all of the above. A record it reads at a newer version is written back at that version.
- **This build as shipped (switch off)** reads all of the above and writes only what #28 writes (above).
- **Builds #27 and #28 (R1)** read Health v2 and settings v2 and write them back unchanged. They **refuse Health v3**:
  locally "Private data is invalid or uses an unsupported version. Original data was preserved." with the bytes kept; an
  import of a v3 export is refused, nothing touched; a sync that pulls a v3 Health section stops with "This section was
  saved by a newer ZIGoals. Update the app on this device to keep syncing." before any upload. Their four features keep
  working from the device keys, which this build never rewrote.
- **Builds before R1** refuse Health v2/v3 and settings v2 the same way (a generic validation error in sync).
- **This build holding a newer record** refuses to replace it with an older backup (`NEWER_VERSION`).

### Rollback note

Rolling the public Alpha back to #28 makes a Health section that reached v3 unreadable there until the roll-forward: the
bytes and the recovery copies are kept, and the roll-forward reads them again and merges whatever #28 wrote to the device
keys meanwhile. Never roll back below R1 (#27) once this build has been live: settings v2 and Health v2 would be refused
too.

**Once the switch-ON PR has shipped** (Session U follow-up F1), the Alpha's rollback floor is the build that first carried
v3 read support (PR #74's merge, switch off): it reads every section the switched-on build writes. Rolled back to it, the
four features show their device-key copies (the homes are kept, untouched, and merged again on the roll-forward).

## The write switch

`SYNC_WRITES` in `apps/web/lib/vault/sync-writes.ts`. Off, every store reads and writes its device key exactly as before
(tests cover both states, `apps/web/lib/sync-homes-store.test.ts`; the switch-off guarantees, `apps/web/lib/sync-writes-off.test.ts`).

**Shipped off (Session U follow-up F1, 2026-10-05).** With the switch on, the public Alpha would write Health v3 into the
browser's own storage; no deployed build reads v3 yet, so a rollback to #28 would leave that person's Health section
unreadable there until the roll-forward. Shipping off puts the v3 **read** support live first. Off, this build:

- reads Health v2 and v3 and settings v2 wherever they appear (local, import, sync), and writes a section back at the
  version it already has (a Health edit keeps the v3 groups byte for byte). The four features themselves read their
  device keys, so records a switched-on build put in the homes are kept but not shown until the switch is on;
- writes exactly what #28 writes: the four device keys, and Health and settings only through their own screens; no
  version is raised, no marker or recovery copy is written;
- never converts device data: no merge runs, nothing moves into the homes;
- writes nothing #28 cannot read.

(Unrelated to this switch, Part 5's remembered-device record v2 is still written; a rollback to #28 asks remembered
devices for the recovery secret once. See FINAL_ACCTEST_REDEPLOY.md, "Rollback, Session U specifics".)

**Switching on** is its own one-line PR, merged at least 7 days after the first Alpha deploy that carries this read
support and on or after 2026-10-11, and included in the 22–24 October final acceptance redeploy. After it ships, the
Alpha's rollback floor is the build that first carried v3 read support. Step by step: docs/product/SYNC_WRITES_ON.md.

The T4 preconditions (TIMEZONE_DESIGN.md) and where they stand on 2026-10-05:

| Precondition | State |
|---|---|
| The Alpha deploy with PR 2 (R1) is live | yes: #27, 2026-10-04 |
| At least one further Alpha deploy | yes: #28 |
| At least seven days since | **no: 2026-10-11** (and 7 days after the first Alpha deploy carrying v3 read support) |
| The Stage 8 sync rows ran on a build with PR 2 | **no**: the acceptance redeploy of 22–24 Oct carries this PR; Stage 8 row B13 checks the homes |
| No "newer ZIGoals" refusals reported | owner to confirm |
| The Manual Alpha rollback target is at or after R1 | yes while #27/#28 are the rollback targets |

The public Alpha has no account or sync path (its config binds only the market service; no sync host in its CSP), so
there the switch changes only where a device stores its own records; but those records are in the browser, and a
rollback is what makes v3 matter there.

## Tests

- `apps/web/lib/vault/sync-homes.test.ts`: lazy writers, the two homes of the weekly review, the merge (first load,
  idempotent, deletions stay deleted, rollback and forward, records already here through sync, a waiting fast).
- `apps/web/lib/sync-homes-store.test.ts`: both switch states over browser storage, recovery copies on a version raise,
  #27/#28 refusing v3 and keeping the bytes, the merge once per load, the rollback to #28 and forward again.
- `apps/web/lib/vault/read-support.test.ts`: Health v3 new reads new, #27/#28 refuse it locally, on import and in sync,
  and two devices that raised Health differently merge at v3; Session P's proofs for the other versions.
- `apps/web/lib/vault/cloud-sync.test.ts`: the three merge rules. `apps/web/lib/vault/durable-recovery-copies.test.ts`:
  the recovery copy on a version raise in the durable database.
- Browser: `fasting.spec.ts`, `health-goals.spec.ts`, `weekly-review.spec.ts`, `auto-checkins.spec.ts` check the homes
  and that the device keys stay unwritten; Stage 8 row B13 checks two devices through account sync.
