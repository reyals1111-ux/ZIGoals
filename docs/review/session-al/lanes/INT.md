# Lane INT (integrator's shared data files), Session AL

Ledger: `GROK53_LEDGER.md` § INT (12 rows) and the INT requests from lanes L1, L5 and L6. TIER 3 (auth/sync, stored format,
headers/PWA). Each change is additive and tolerant; risk and rollback are listed per change. Unit tests were run from the
repository root (`pnpm exec vitest run <files>`); the spec under `apps/web/tests/grok53/data/` is written, not run.

## Rows

| Row / request | ids | status | files | tests (unit / spec) | note |
|---|---|---|---|---|---|
| AL-BACKUP-RESTORE-003 (P-LS-36) | LS-025, LS-064 (reopens AK J6-2) | Fixed-pending-proof; UI wiring of the encrypted backup Needs-integrator (`components/private-vault-tools.tsx`) | lib/vault/backup.ts, backup-lists.ts (new), backup-preview.ts; lib/restore/plan.ts, checklist-note.ts; lib/export/everything.ts; components/restore/restore-backup.tsx, test-backup.tsx | lib/vault/backup-lists.test.ts, lib/export/al-lists-export.test.ts, lib/restore/checklist-note.test.ts / tests/grok53/data/ls-025-064-tasks-checklist-backup.spec.ts | Encrypted backup format 3 with optional `tasks` and `checklist` sections; readable export restores the Checklist (path + days with Today and Life, Health quick inputs only with Health); `tasks.csv`, `checklist.csv`, `checklist-days.csv`. Tasks were already restorable from the ZIP. Today's ticks never restore. |
| AL-IMPORT-EXPORT-006 (P-TK-13, P-MO-60) | TK-018, MO-016, MO-031, P15, C-TK-02 | Fixed-pending-proof (export part); Health page CSV stays L2 | lib/export/everything.ts | lib/export/al-lists-export.test.ts | `wealth-holdings.csv` = L1's `readableHoldingsCsv()` (Wealth import template, csv-safe); `weights.csv` gains `kg` (exact) and `lb_converted` (2 decimals). The Health page's own CSV (lib/health-daily.ts, MO-016/031) is L2's. |
| AL-BACKUP-RESTORE-005 (P-TK-14) | TK-152 | Closed with evidence + one copy line Needs-integrator | — | — | Finance v5 is read, never written (lib/vault/versions.ts); accounts and debts live in `zigoals:accounts:v1`. They are in Export everything (`device.accounts`, `accounts.csv`) and restorable there ("Accounts and debts" part). The Goals and Wealth card must say so: request 2. |
| P-LS-38 | LS-013 | Fixed-pending-proof | public/sw.js | lib/sw/install-pages.test.ts (unchanged, passes) | `/app/tasks`, `/app/agenda` kept at install; the page a first visit opened is kept on activate; a page reached in-app (RSC request, not a prefetch) also keeps its document once per build. |
| P-LS-65, P-BN-43 (bluetooth), TK-191 (bluetooth) | LS-H49, BN-010, TK-191 | Kept by design (SE13, A8_REOPENED) | — | tests/public-alpha.spec.ts pins it | `bluetooth=()` / `bluetooth=(self)` on Health is a deliberate guard (Session W Part 8). Dropping it widens Web Bluetooth where a browser recognises the feature. See open question 1. **Third pass by L2 (policy kept): lib/health-navigation.ts `documentFeatureState` + lib/bluetooth/web-bluetooth.ts:20 — a policy that does not list `bluetooth` in features() is no longer read as blocked; no API = "not supported".** |
| P-BN-43, TK-191 (manifest), B-095 | BN-010, B-095, TK-191 | Fixed-pending-proof | public/manifest.webmanifest | — | `share_target.enctype` set to its default `application/x-www-form-urlencoded`: same behaviour, no console warning. |
| N-TK-15 | — | Open | — | — | "2 console errors, not investigated" by the bot; no message text to act on. |
| AL-BACKUP-RESTORE-002 (P-DVR-82) | BUG-036 | Closed (fixed earlier) | — | — | app/app/settings/page.tsx: the "Export Goal Data" card shows only when legacy plans exist (AH Part 3, DS6/A2); everything else is in Export everything. |
| AL-BACKUP-RESTORE-001 (P-BN-31) | BN-022, BN-023, BN-105 | Needs-other-lane (components/settings/erase-everything.tsx) | — | — | Not in this lane's files. |
| AL-BACKUP-RESTORE-004 (P-BN-32/33) | BN-020/104/106, BN-021 | Already in progress in components/private-backups.tsx (uncommitted Session AL edit) | — | — | Not in this lane's files. |
| AL-HELP-006 (P-PR-30) | PR-032, PR-034, X3-27 | Needs-other-lane (lib/help, lib/whats-new.ts) | — | — | Not in this lane's files. · done in third pass by L6: components/help/help-page.tsx (z-alpha, Known limitations Lichess line, THIS_VERSION list); lib/search/help-whats-new.test.ts; spec settings/help-al-006-la-31 |
| AL-PRIVACY-007 (P-MO-84) | MO-046, MO-119 | docs part already true; landing + Markets copy Needs-other-lane | — | — | docs/PRIVACY.md already names Cloudflare NEL (line 75) and market requests (line 129). landing/privacy.html and the Markets page are not this lane's. No host changed, so no egress or PRIVACY edit. |
| AL-COMPETITOR-GAP-175 | C-BN-27 | Not planned this pass | — | — | Export of a date range: a new export mode; owner decision. |
| AL-COMPETITOR-GAP-176 | C-BN-28 | Not planned this pass | — | — | "Erase one area": owner decision (erase-everything.tsx). |
| AL-COMPETITOR-GAP-177 | C-DVG-83 | Partly met | lib/export | — | Readable export now restores Tasks and the Checklist and round-trips Wealth holdings; importers from other apps not built. |
| AL-COMPETITOR-GAP-178 | C-DVG-90 | Needs-other-lane (lib/whats-new.ts) | — | — | |
| L4 requests (lib/positions.ts guard, lib/numbers/counts.ts, use-unsaved-changes, plan-revisions, themes) | P-DV-09/22/31/36/44–47, P-DVR-* | Not this lane (task: lib/positions.ts is L4's; the rest are outside these files) | — | — | |

## Stored-format changes (TIER 3)
- **Encrypted backup format 3** (`lib/vault/backup.ts`): optional sections `tasks` and `checklist`, sealed under the
  `extras` record context; the authenticated inventory binds each part's section. A file has them only when this device
  holds Tasks or a Checklist with something in it, so other files stay format 1/2 byte-compatible. Older apps refuse a
  format 3 file with their "newer app version" message before restoring anything. The version check now asks
  `backupFormatVersion(sections)`, which gives exactly the old answer for format 1 and 2.
- **`checklist` section** (`lib/vault/backup-lists.ts`): `{format:'zigoals-checklist-backup', version:1, health, checklist?, days?}`;
  `healthItems` only with the Health tick, `today` never. No new storage key; restore writes `zigoals:tasks:v1`,
  `zigoals:checklist:v1`, `zigoals:checklist-days:v1` with a recovery copy `<key>:recovery:<uuid>` (the existing pattern).
- **Restore plan**: three new device parts (`device:checklist`, `device:checklistHealth` (Health), `device:checklistDays`)
  on the existing two keys; `RESTORE_KEYS` gains those two keys.
- **Export everything**: four new CSVs and two new `weights.csv` columns (appended); `everything.json` unchanged.
