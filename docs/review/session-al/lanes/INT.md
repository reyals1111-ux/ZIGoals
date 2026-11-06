# Lane INT (integrator's shared data files), Session AL

Ledger: `GROK53_LEDGER.md` § INT (12 rows) and the INT requests from lanes L1, L5 and L6. TIER 3 (auth/sync, stored format,
headers/PWA). Each change is additive and tolerant; risk and rollback are listed per change. Unit tests were run from the
repository root (`pnpm exec vitest run <files>`); the spec under `apps/web/tests/grok53/data/` is written, not run.

## Rows

| Row / request | ids | status | files | tests (unit / spec) | note |
|---|---|---|---|---|---|
| AL-BACKUP-RESTORE-003 (P-LS-36) | LS-025, LS-064 (reopens AK J6-2) | Fixed-pending-proof; UI wiring of the encrypted backup Needs-integrator (`components/private-vault-tools.tsx`) | lib/vault/backup.ts, backup-lists.ts (new), backup-preview.ts; lib/restore/plan.ts, checklist-note.ts; lib/export/everything.ts; components/restore/restore-backup.tsx, test-backup.tsx | lib/vault/backup-lists.test.ts, lib/export/al-lists-export.test.ts, lib/restore/checklist-note.test.ts / tests/grok53/data/ls-025-064-tasks-checklist-backup.spec.ts | Encrypted backup format 3 with optional `tasks` and `checklist` sections; readable export restores the Checklist (path + days with Today and Life, Health quick inputs only with Health); `tasks.csv`, `checklist.csv`, `checklist-days.csv`. Tasks were already restorable from the ZIP. Today's ticks never restore. · sweep 2: the spec's LS-025 test asserts format 3, or 4 when the unlocked inventory lists a record section (tests/grok53/data/ls-025-064-tasks-checklist-backup.spec.ts:64-79) |
| AL-IMPORT-EXPORT-006 (P-TK-13, P-MO-60) | TK-018, MO-016, MO-031, P15, C-TK-02 | Fixed-pending-proof (export part); Health page CSV stays L2 | lib/export/everything.ts | lib/export/al-lists-export.test.ts | `wealth-holdings.csv` = L1's `readableHoldingsCsv()` (Wealth import template, csv-safe); `weights.csv` gains `kg` (exact) and `lb_converted` (2 decimals). The Health page's own CSV (lib/health-daily.ts, MO-016/031) is L2's. |
| AL-BACKUP-RESTORE-005 (P-TK-14) | TK-152 | Closed with evidence + one copy line Needs-integrator | — | — | Finance v5 is read, never written (lib/vault/versions.ts); accounts and debts live in `zigoals:accounts:v1`. They are in Export everything (`device.accounts`, `accounts.csv`) and restorable there ("Accounts and debts" part). The Goals and Wealth card must say so: request 2. |
| P-LS-38 | LS-013 | Fixed-pending-proof | public/sw.js | lib/sw/install-pages.test.ts (unchanged, passes) | `/app/tasks`, `/app/agenda` kept at install; the page a first visit opened is kept on activate; a page reached in-app (RSC request, not a prefetch) also keeps its document once per build. |
| P-LS-65, P-BN-43 (bluetooth), TK-191 (bluetooth) | LS-H49, BN-010, TK-191 | Kept by design (SE13, A8_REOPENED) | — | tests/public-alpha.spec.ts pins it | `bluetooth=()` / `bluetooth=(self)` on Health is a deliberate guard (Session W Part 8). Dropping it widens Web Bluetooth where a browser recognises the feature. See open question 1. **Third pass by L2 (policy kept): lib/health-navigation.ts `documentFeatureState` + lib/bluetooth/web-bluetooth.ts:20 — a policy that does not list `bluetooth` in features() is no longer read as blocked; no API = "not supported".** · sweep 2: kept (see L5.md P-LS-65 row) |
| P-BN-43, TK-191 (manifest), B-095 | BN-010, B-095, TK-191 | Fixed-pending-proof | public/manifest.webmanifest | — | `share_target.enctype` set to its default `application/x-www-form-urlencoded`: same behaviour, no console warning. |
| N-TK-15 | — | Open | — | — | "2 console errors, not investigated" by the bot; no message text to act on. |
| AL-BACKUP-RESTORE-002 (P-DVR-82) | BUG-036 | Closed (fixed earlier) | — | — | app/app/settings/page.tsx: the "Export Goal Data" card shows only when legacy plans exist (AH Part 3, DS6/A2); everything else is in Export everything. |
| AL-BACKUP-RESTORE-001 (P-BN-31) | BN-022, BN-023, BN-105 | Needs-other-lane (components/settings/erase-everything.tsx) | — | — | Not in this lane's files. |
| AL-BACKUP-RESTORE-004 (P-BN-32/33) | BN-020/104/106, BN-021 | Already in progress in components/private-backups.tsx (uncommitted Session AL edit) | — | — | Not in this lane's files. |
| AL-HELP-006 (P-PR-30) | PR-032, PR-034, X3-27 | Needs-other-lane (lib/help, lib/whats-new.ts) | — | — | Not in this lane's files. · done in third pass by L6: components/help/help-page.tsx (z-alpha, Known limitations Lichess line, THIS_VERSION list); lib/search/help-whats-new.test.ts; spec settings/help-al-006-la-31 |
| AL-PRIVACY-007 (P-MO-84) | MO-046, MO-119 | docs part already true; landing + Markets copy Needs-other-lane · third pass: landing done (below), Markets done by P14-D:40 | — | — | docs/PRIVACY.md already names Cloudflare NEL (line 75) and market requests (line 129). landing/privacy.html and the Markets page are not this lane's. No host changed, so no egress or PRIVACY edit. |
| AL-COMPETITOR-GAP-175 | C-BN-27 | Not planned this pass | — | — | Export of a date range: a new export mode; owner decision. · **Corrected in the third pass:** "owner decision" cited no decision (not in AL_SCOPE F, O1–O7 or an ADR); built, see GAP-175 below. |
| AL-COMPETITOR-GAP-176 | C-BN-28 | Not planned this pass | — | — | "Erase one area": owner decision (erase-everything.tsx). · **Corrected in the third pass:** no owner decision exists for it; built, see GAP-176 below. |
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

## Third pass (CROSS_LANE §b1 INT 14 asks, §b2 INT 3 gaps, plus the brief's extras)

TIER 3 (stored format, PWA, headers/config). Every change additive and tolerant. Unit tests run alone per file group; specs written, not run.

| Row / ask | ids | status | files | tests (unit / spec) | note |
|---|---|---|---|---|---|
| Encrypted backup: other device records | LS-025 follow-up, P-TK-14 (TK-152) | Fixed-pending-proof | lib/vault/backup-records.ts (new), backup.ts, backup-lists.ts (`write` exported), backup-preview.ts; components/private-vault-tools.tsx, private-backups.tsx | lib/vault/backup-records.test.ts (6) / tests/grok53/data/int3-backup-records-erase-range.spec.ts #1 | Format 4: optional `wealthRecords`, `habitRecords`, `lifeRecords`, `healthRecords`. The record set is exactly DEVICE_PARTS of lib/restore/plan.ts (what Restore from a backup restores), minus Tasks/Checklist (own sections); what that plan never restores stays out (linked wallets and their names, Earn, staking journal, display choices, ZIGi settings/usage/chats, keys). Every Health part (workouts and energy too) and ZIGi's health/diet notes only with the Health tick. Empty records make no section, so other files stay format 1–3. Restore = the readable restore's Replace rules, recovery copy kept, unknown/newer record ids skipped and counted. |
| Data catalog: recovery copies | — | Fixed-pending-proof (lib) + request (view) | lib/data-health/catalog.ts `recoveryCopyEntry`, `recoveryCopies` | lib/data-health/catalog.test.ts (+1) | They were not listed at all. `zigoals:tasks:v1:recovery:<uuid>`, `zigoals:checklist:v1:…`, `zigoals:checklist-days:v1:…` (and every other catalogued key's copies) now name "Recovery copy: <label>", this device only; a non-uuid suffix or unknown base key is null. Erase (prefix `zigoals`) already removes them; Export never reads them. · view done in sweep 2: components/data-health/data-health-view.tsx:42,72-76 ("Recovery copies" under Kept on this device, with sizes; "None on this device"; unreadable said so); spec data/sweep2-recovery-copies |
| Manifest Checklist shortcut | DV-162 (L10a wording) | Fixed-pending-proof | public/manifest.webmanifest | lib/sw/install-pages.test.ts, public-safety (pass) | "Today's short list: the few things you starred" = lib/ui-prefs/apps.ts:24 (committed). |
| AL-PRIVACY-007 landing (P-MO-84) | MO-046 | Fixed-pending-proof; **owner must redeploy the landing** | landing/privacy.html (Last updated 5 Nov) | scripts/landing-al-nel.test.mjs (new) + landing-ak-claims/p5-review/z1c-l4 (pass) | "Loading the app" names Cloudflare's NEL failure reports; "no trackers" kept. |
| L10a req P-NB-08 top level | NB-002, NB-033 | Fixed-pending-proof | apps/web/next.config.ts `redirects()` | lib/top-level-redirects.test.ts / tests/grok53/data/nb-002-top-level-welcome.spec.ts | /welcome, /onboarding, /start, /setup → /app/welcome (307). |
| GAP-175 (P-BN-92) | C-BN-27 | Built (Fixed-pending-proof) | lib/export/everything.ts `readDateRange`, `rangeCsv`, `buildRangeZip`; components/export-everything.tsx (+css) | lib/export/range-export.test.ts (3) / spec #3 | Optional From/To on Export everything; CSV tables only (no everything.json, no photos), dated rows in range, lists of things whole; says it cannot be restored. |
| GAP-176 (P-BN-93) | C-BN-28 | Built (Fixed-pending-proof) | lib/restore/erase-area.ts (new); components/restore/restore-backup.tsx (+css) | lib/restore/erase-area.test.ts (4) / spec #2 | Settings → Your data → "Erase one area instead": a Replace-with-empty through applyRestore, so it is fenced, keeps recovery copies, announces like a page save and has the 7-day Undo. Today's preferences and photos are never erased. |
| GAP-010 (P-DVG-53, P-TK-88) | C-DVG-53, C-TK-20 | Needs-other-lane (L1, Markets) with the stored design | — | — | `watchlist` max(8) sits in the synced finance module: raising it makes older builds (rollback, #53) refuse the whole module. Additive design: keep max 8 there; extra favourites and column choices in a new device key `zigoals:markets-watchlist:v1` (`{version:1, more: Favourite[] (max 200), columns?: string[]}`), registered in lib/al-device-keys.ts; Markets UI is L1's (components/platform/markets-view.tsx). |
| L1 P-TK-04 1Y | TK-033/156/215 | Already fixed | components/platform/price-chart.tsx:28-31 (30ad598b, L1) | — | — |
| L10a AL-THEME-007 Health charts | P-MO-34 | Already fixed | L2.md:46 (d3694de3) | spec health/p-mo-34-light-contrast | — |
| L6 P-BN-36 | BN-019 | Already fixed | ccfad605 (TIER 3 API) | — | — |
| P14-A Z1B-9 | Z1B_SECURITY 9 | Already fixed | 30ad598b INT-2 (showcase-photos.test) | — | — |
| L6 P-PR-39 | PR-080, BUG-041 | Already fixed | L1.md:154 (bottom-sections.tsx ValueSources) | — | — |
| L2 P-PR-25 (Goals part) | PR-022, N-PR-04 | Needs-other-lane (showcase owner) | — | — | lib/goal-extras/showcase.ts:38 "Sleep 7 hours a night" target 7 vs lib/sleep/showcase.ts:29 goal 480 min: set target 8 and name "Sleep 8 hours a night" (template id stays). Not this lane's file. · done in sweep 2: lib/goal-extras/showcase.ts:40 (target 8, "Sleep 8 hours a night"; template id kept); tests/goals-best-aa.spec.ts:25,38 deliberate |
| L3 P-NB-65 (copy) | NB-029 | Needs-other-lane (showcase owner) | — | — | components/showcase-controls.tsx:17 "Showcase uses separate storage in this tab." → "The Showcase is a separate copy, in this tab only; your own data is untouched." · done in sweep 2: components/showcase-controls.tsx:17 ("The Showcase is a separate copy, in this tab only; your own data and wallet records are untouched.") |
| L5 P-LS-20 | LS-057 | Needs-other-lane (L5) | — | — | components/checklist/value-stepper.tsx → validateValue (PRIMITIVES 3d); Checklist is L5's (protected pins). |
| L5 P-LS-41 | LS-067 | Needs-integrator | — | — | Route-size measure on the production build (builds are the integrator's). |
| L6 P-PR-09 | PR-009, PR-108, BUG-037 | Needs-other-lane (showcase owner) | — | — | lib/skills/chess/showcase.ts:10 `at(d, h)`: for d = today return min(that time, now). · done in sweep 2: lib/skills/chess/showcase.ts:13-14 (`now` parameter; open-day times clamped to now; other days and not-yet-begun days unchanged) |
| L6 P-PR-38 | PR-079 | Needs-other-lane (showcase owner) | — | — | lib/showcase-data.ts: date the staking snapshot by the Showcase's open day. · done in sweep 2: lib/showcase-data.ts:139 (every holding's observedAt is the open day; the reserve stays the STALE-sync example) |
| L8 The bar | AL_SCOPE B | Needs-integrator | — | — | Design critic done (NOVA_HUD_REVIEW.md, 614ac43d); the first-time-viewer agent runs after L8d. |

Owner-decision honesty: this file's two "owner decision" rows (GAP-175, GAP-176) cited no decision; both are corrected and built. "Kept by design (SE13)" (bluetooth) is not an "Owner decision" row.

### Third-pass stored-format changes (TIER 3)
- **Encrypted backup format 4** (lib/vault/backup.ts): four optional sections, each `{format:'zigoals-device-records-backup', version:1, records:{<restore part id>: <record>}}`, sealed under `extras` (`healthRecords` under `health`). Older apps refuse a format 4 file with their "newer app version" message before restoring anything. No new storage key; restore writes the existing device keys with `<key>:recovery:<uuid>` copies.
- **Range export**: a new ZIP shape `zigoals-export-<from>-to-<to>.zip` (README + CSVs). Restore from a backup refuses it (no everything.json).
- No new localStorage/IndexedDB key. Rollback: revert the commit; files made in format 4 then need this build to read (the older app says so and changes nothing).

