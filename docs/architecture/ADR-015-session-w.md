# ADR-015: Session W, "Your whole life, one app": session decisions

Status: **In progress** on `feature/session-w-whole-life` ([PR #77](https://github.com/reyals1111-ux/ZIGoals/pull/77), draft), from `main` `1063765` (Merge #76, Alpha deploy #31). Not merged or deployed. This record holds every decision Session W took without asking the owner (the brief asks for the safest option that keeps every promise), and the owner's own decisions verbatim.

## Owner decisions (2026-10-06)
- **W1.** Sync writes ON now (implement SYNC_WRITES_ON.md; overrides its "from 2026-10-12" wait). Testers may lose test data; never design a data-losing migration; keep reads tolerant. Rollback floor: the Alpha must never roll back past #29. New synced records follow SYNC_HOMES. FINAL_ACCTEST_REDEPLOY and the Stage 8 run-sheet carry "Session V changes" and "Session W changes".
- **W2.** Timezone phase 4 per TIMEZONE_PHASE4_DECISIONS' recommendations.
- **W3.** Keep the single Revoke; add a separate "Sign out all other devices" (scope=others) with a confirmation.
- **W4.** Any page or button can be hidden except Settings and Help.
- **W5.** The meditation breathing visual may loop only while visible; static under reduced motion and Motion Off.
- **W6.** Browser-direct PKCE where allowed; features that need an owner registration are built but OFF, with an honest state and an activation doc; no registrations.
- **W7.** ZIGi integration of the new data is in scope, under the existing gates.
- **Plan review (approved with defaults):** Chess and the music player are hidden for existing people until switched on or picked in the first run; Showcase shows everything.
- **Additions A–F (owner, plan revision 2):** A — dependency alerts (proxy-addr, source-map-js, sharp; narrowest in-range updates or overrides; "Do not touch secrets or the GitHub security settings."); B — the post-upload smoke must first confirm the new version (exact source SHA), bounded waits, then the exact header/CSP assertions; "Never weaken an assertion; keep 'no auto-retry of the upload' and 'no auto-rollback'."; C — record deploys #30 and #31; D — imports estimate their size against the 2 MB browser cap and summarise, never silently truncate; E — measure server CPU per route and explain the ~737 ms median; F — the music panel's NOVA "Your soundtrack" look.

## Session decisions
| # | Part | Decision | Why it is the safest option |
|---|---|---|---|
| S1 | 1 | `SYNC_WRITES = true` exactly as SYNC_WRITES_ON.md describes; rollback floor #29 written into the switch's comment and both acceptance docs. | W1; #29 is the first build that reads every section the switch writes. |
| S2 | 1b | Finance is not written at v5 in this release: accounts/debts and milestone target dates live in device keys with their home's exact fields; finance v5 ships as read support; a later switch PR moves them. | A finance v5 write plus a rollback to #31 would make Goals, Wealth, Staking and Activity unreadable at once (finance merges as one record). |
| S3 | 1b | No "opaque newer group": every new group is a strict `version: 1` record held only by a new module version. | An opaque group could be merged across versions by `mergeValue`; a strict version fails closed and keeps bytes. |
| S4 | 1b | Inside Session W's groups only, stamped values (`at`, `updatedAt`) both devices changed settle by the later stamp (equal stamps: fixed text order); everything else merges exactly as before. | Sync never stops over a switch, a mood or an edited night, and no existing behaviour changes. |
| S5 | 1b | Several running nights may exist (two devices started one while apart); the latest is tonight's, the others ask for an end time. | Refusing would stop sync; closing one would invent sleep data. |
| S6 | 1b | A version raised by sync keeps the replaced section as a recovery copy (`applyData`), as a local raise always did. | A rollback can then recover the exact earlier bytes. |
| S7 | 1b | One wide TypeScript type per module; the readers of #29–#31 kept as exported objects (`healthR3Schema`, `dashboardSettingsR2Schema`, `platformR4Schema`); every stored format's JSON Schema pinned by digest; the six frozen digests equal main `1063765`. | Proves no shared sub-schema was edited in place. |
| S8 | 1b | Writers compute `max(current, needed)`; `withWeeklyReview` and the device-key merge no longer write settings `schemaVersion: 2` over a v3 record; a sleep or meditation habit link needs Health v4. | A hard-coded version would downgrade or refuse Session W's records. |
| S9 | 1b | The backups panel's "newest version" table now derives from `CURRENT_VERSIONS` (it said finance 3, habits 2, health 1, so a damaged Health v2/v3 backup was called "newer"). | One table for sync and backups; correct refusal reasons. |
| S10 | 1b | Linked services' tokens: their own sealed IndexedDB store (`zigoals-link-tokens-v1`), forgotten with ZIGi's keys and chats when an account is erased. | Same protection and hygiene as AI keys (ADR-012). |
| S11 | 1b | The chess cache is classified personal (public ratings, but of the username the person typed); the music choices and the visible-pages mirror are display preferences. | A device with a chess username is not "new". |
| S12 | 1b | "Export everything" CSVs copy stored fields only (no computed sleep length); accounts rows name their home (device or synced). | T4's rule: the export computes nothing new. |

## Assertions changed (deliberate, listed)
Each is a "next unknown version" or catalog pin that moves because this build reads one more version; none is weakened (the next unknown version is still refused):
- `apps/web/lib/vault/read-support.test.ts`: `CURRENT_VERSIONS` pin `{finance:5,habits:3,health:4,settings:3}`; the "newer section" fixture uses finance 6.
- `apps/web/tests/honesty-banners.spec.ts`: Today settings from a newer build use version 4.
- `apps/web/lib/run9-1.test.ts`, `apps/web/lib/positions.test.ts`: finance 6 is refused.
- `apps/web/lib/health.test.ts`: Health 5 is refused.
- `apps/web/lib/dashboard-settings.test.ts`: settings 4 is refused.
- `apps/web/lib/deploy12-compat.test.ts`: the catalog entries deploy #12 cannot read include Session W's five kinds (they live only in settings v3, which #12 refuses as a whole).
