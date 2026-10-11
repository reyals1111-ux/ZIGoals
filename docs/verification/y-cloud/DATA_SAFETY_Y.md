# Session Y: the data-safety drill (2026-10-09/10)

**Result: no data loss found.** X-Cloud's ten drills (`docs/verification/x-cloud/DATA_SAFETY.md`) were run again on this
branch, plus seven new ones for Session Y's sync rules (Part 5) and stored bytes (Parts 2, 8). Three defects in Y's own
first versions were found on the way (CI on `c40475e`, then the local runs) and fixed before this record; none lost,
changed or exposed a record (below). Nothing touched a real account, a real person's data or a deployed service:
fictional records only, every `/api` a local fixture or the local Worker. Evidence labels: local, Miniflare, CI.

Builds: a local production build of this branch (`PUBLIC_ALPHA_UNDEPLOYED`, `next start`, two Playwright workers, both
projects unless marked), the tree of `e0bc2eb` (Part 7's records on top of the radio fix `55283c3`); the two-device drills in
Miniflare (real Chrome profiles against a local `workerd` with the private-sync Worker); #34's own readers from a
worktree of `e30b7c6`.

## X-Cloud's ten, again
| # | Drill | How | Result |
|---|---|---|---|
| D1 | Every synced module from the Showcase's records → encrypted backup → wipe the browser → restore → identical, and after a reload | `tests/export-roundtrip.spec.ts` | pass (local) |
| D2–D4 | Current versions restored; older backups (Health v1–v3, settings v1–v2, finance v4) into this build; a wrong secret and a non-backup change nothing | `tests/data-safety-x.spec.ts` | pass, desktop (local) |
| D5 | Session W's sections meet the frozen #29–#31 readers; versions never lowered | `lib/vault/w-formats.test.ts`, `private-storage-import-refused.test.ts`, `legacy-restore-clock.test.ts`, `vault/schema-snapshot.test.ts` (digests unchanged) | pass (local) |
| D6 | Export everything: one ZIP with every record and the device keys; nothing written on view | `tests/export-everything.spec.ts` | pass (local) |
| D7 | Two devices with private sync: transport and reconnect (a-first, b-first), a late response from another account, an edit during an upload, another device's edit pausing for review, lost acknowledgements, a held upload, lock and account switch, a remembered device, Health consent, the sync offer, replay, camera, sign-in codes | CI's integration list, one file at a time (17 files) | pass (Miniflare, local: 17 of 17 after the B4 follow-up below; CI on `df436a1`: green) |
| D8 | Import, then undo (Switch to ZIGoals, holdings CSV, nutrition CSV) | `tests/switch-import.spec.ts`, `holdings-import.spec.ts`, `nutrition-import.spec.ts` | pass (local) |
| D9 | The Showcase: load, use, reset; the person's own bytes never touched; the Local Simulation backup round trip | `tests/onboarding.spec.ts`, `local-simulation-backup.spec.ts` | pass (local) |
| D10 | Account deletion clears push data; two accounts never see each other's; stale subscriptions go after 30 days | `lib/push/forget.test.ts`, `scripts/run11/push-rehearsal.test.mjs` | pass (local, Miniflare) |

Browser: 70 tests, 61 passed, 9 skipped by design (desktop-only drills on the phone project), 2.6 min. Unit and
Miniflare: 19 files, 169 of 169 (with the new drills below).

## Session Y's new drills
| # | Drill | How | Result |
|---|---|---|---|
| D11 | B4: a Health restore completes and asks; nothing syncs until the person ticks the box, then that tick syncs; a device whose consent is already on is not asked | `lib/vault-sync-rules-y.test.ts` (B4, three cases), `scripts/run10/account-browser.test.mjs` (two profiles) | pass (local, Miniflare) |
| D12 | A7: a revoked session or a deleted account drops the remembered device, never the records: they stay readable and Export everything works | `lib/vault-remember.test.ts`, `lib/account-access.test.ts`, `lib/server/private-account.test.ts` | pass (local) |
| D13 | B6: a cloud without a vault, while this device synced before, offers no "Create"; the journal and records are untouched until the confirmed start-over | `lib/vault-sync-rules-y.test.ts` (B6) | pass (local) |
| D14 | B3: an older vault or revision is refused with nothing read or written; storage restored from an earlier copy, a new vault enrolled, the rotated device refused, then re-linked | `lib/vault/cloud-sync.test.ts`, `scripts/run11/older-vault-recovery.test.mjs` (2 cases) | pass (local, Miniflare) |
| D15 | B5: sync never depends on the outbox (turning sync on later uploads every record with an empty outbox) on this build and on `e30b7c6`; the sweep removes only unconsumed spaces' entries, is idempotent, never runs on a read; receipts and archives within bounds | `lib/vault/outbox-independence.test.ts` (this build and the `e30b7c6` worktree: 1 of 1 each), `database.test.ts`, `database-lifecycle.test.ts`, `outbox-sweep-write.test.ts`, `forward-recovery.test.ts`, `scripts/run11/historical-client.test.mjs`; `tests/private-read-delay.spec.ts` (viewing writes nothing) | pass (local) |
| D16 | B7: every nonce, iv and ciphertext is canonical base64url; everything any build since #29 wrote still reads | `lib/vault/crypto.test.ts`, the frozen readers and digests of D5 | pass (local) |
| D17 | #34 reads what this build writes: a metal whose weight unit changed, a habit after "−" and a cleared vacation, B3's journal after a rotation, B5's archive entry | build #34's own `platformSchema`, `habitDataSchema`, `syncStateSchema` and `SyncJournal.recoveryHistory` in a worktree of `e30b7c6`, on bytes generated by this build | pass, 2 of 2 (local) |

## Found on the way (all in Session Y's own first versions; fixed before this record)
- **B4** (CI's two-profile test on `c40475e`): after a Health restore the consent tick switched Health on but left the
  sync to "Sync now", and a device whose consent was still on was asked anyway. Both fixed in `4b15ff1`; no record was
  changed, the restore had only been held.
- **B5** (CI's `private-read-delay` specs on `c40475e`): the first sweep opened a read-write transaction just by viewing
  a page. It now runs after the person's first write and looks read-only first (`646572c`).
- **Fasting** (CI on `c40475e`, desktop): a fast's start time was taken when its save ran, not at the tap (`53b68ff`).
  Stored format unchanged; a fast started on a busy storage had begun late.

None of these reached a deployed build.
