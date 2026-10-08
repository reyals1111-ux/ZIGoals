# Session X Part 13: the data-safety drill (2026-10-08)

**Result: no data loss found; nothing needed fixing.** Every drill below passed on a local production build of this
branch (`ca99bf1`, `PUBLIC_ALPHA_UNDEPLOYED`, `next start`, two Playwright workers, both projects unless marked desktop),
the two-device sync drills in Miniflare (real Chrome profiles against a local `workerd` with the private-sync Worker,
writes on), the rest as unit tests. Nothing here touched a real account, a real person's data or a deployed service:
fictional records only, every `/api` either a local fixture or the local Worker. Evidence labels: local, Miniflare.

## What was drilled
| # | Drill | How | Result |
|---|---|---|---|
| D1 | Local Demo, every synced module (finance, habits, Health, Today settings) from the Showcase's records → encrypted backup through Settings → wipe the browser (local, session, every IndexedDB database) → restore each module through Settings → identical records, and identical again after a reload | `tests/export-roundtrip.spec.ts` (Session P), re-run | pass, both projects (local) |
| D2 | The current versions with Session W's sections in use: Health v4 with its sleep and meditation groups, settings v3 with its links, restored through Settings | `tests/data-safety-x.spec.ts` (new): byte-for-byte equal after restore; D1 also carries Health v4 | pass, desktop (local) |
| D3 | Older backups into this build: Health v1, v2, v3; Today settings v1, v2; finance v4. Each file made with the app's own `encryptBackup` from a record valid for its version, restored through Settings as a person does it | `tests/data-safety-x.spec.ts` (new): stored, parses with today's schema, version never lower, every fictional record present, Health's weight table shows it | pass, desktop (local) |
| D4 | A wrong recovery secret, then a file that is not a backup: a plain reason, and storage byte-for-byte unchanged | `tests/data-safety-x.spec.ts` (new) | pass, desktop (local) |
| D5 | Session W's sections meet the frozen #29–#31 readers: refused as "made by a newer version", the bytes and a recovery copy kept; writers raise a version only when a feature needs it, never lower it; sync merges W's groups and older builds refuse what they cannot read | `apps/web/lib/vault/w-formats.test.ts` (Session W), `private-storage-import-refused.test.ts`, `legacy-restore-clock.test.ts`, `vault/schema-snapshot.test.ts`, re-run | pass (local) |
| D6 | Export everything: one ZIP whose `everything.json` and CSVs carry every record of every module and the device keys; nothing written on view | `tests/export-everything.spec.ts`, re-run | pass, both projects (local) |
| D7 | Two devices with private sync, writes on: encrypted transport and reconnect (a-first and b-first), a late response from another account, an edit during an upload, another device's finance edit pausing for review, a lost acknowledgement (in page, after reload, after the profile reopened), the device's own held upload, lock and account switch, a remembered device (reload, new tab, 15 idle minutes, rotation elsewhere, sign-out, another account), a replayed funding and its correction exactly once | `scripts/run10/account-browser.test.mjs`, `scripts/run11/{account-switch,sync-inflight-edit,sync-lost-ack,sync-self-conflict}-browser.test.mjs`, `scripts/run11/stage8-rehearsal/{lock-switch,remember-device,replay}-browser.test.mjs`, one file at a time as CI runs them | pass, 8 files, 16 tests (Miniflare) |
| D8 | Import, then undo (Switch to ZIGoals, holdings CSV, nutrition CSV): undo restores the exact bytes; an undo after a later change refuses with the reason | `tests/switch-import.spec.ts`, `tests/holdings-import.spec.ts`, `tests/nutrition-import.spec.ts`, re-run | pass, both projects (local) |
| D9 | The Showcase: load, use, reset; the person's own Local Demo bytes never touched; the plaintext Local Simulation backup round trip | `tests/onboarding.spec.ts`, `tests/local-simulation-backup.spec.ts`, re-run | pass, both projects (local) |
| D10 | Account deletion clears the account's push data from any device, with or without a record on it; two accounts never see each other's push data; stale subscriptions go after 30 days | `apps/web/lib/push/forget.test.ts`, `scripts/run11/push-rehearsal.test.mjs` (the Worker's real alarm) | pass (local, Miniflare) |

Totals: browser 66 tests, 59 passed and 7 skipped by design (the new drill runs on the desktop project only; its data paths
are the same on a phone), plus the two D2 cases added afterwards (9 of 9 on desktop); unit 5 files, 36 of 36 (D5's four and D10's `forget.test.ts`); Miniflare 9 files, 19 of 19 (D7's eight and the push
rehearsal).

## Findings and fixes
None: no drill lost, changed or exposed a record. The drill spec `tests/data-safety-x.spec.ts` stays in the suite so
CI repeats D2–D4 on every push.
