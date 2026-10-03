# Timezone design (for the later timezone project)

**Status (2026-10-02, Session N):** the owner answered the four open decisions (below), confirmed at the Session N plan approval. This session implements phases 1–2 of the QA-04 path only (owner choice T5):
- **Phase 1:** failing-first suites, registered as expected failures.
- **Phase 2:** the helpers wired into funding and plan days with zone `"UTC"`, proven identical.

Unchanged:
- **Stored formats:** no stored format, schema version, sync rule or UI changes.
- **QA-04:** Goal funding and plan days stay **UTC**, exactly as today (owner decision 2026-10-01).
- **Open items** are tracked in [TIMEZONE_BACKLOG.md](TIMEZONE_BACKLOG.md), which maps where each part of the app decides "today".

**Earlier status (2026-10-01, Session J):** design only, with the pure helpers in `packages/goal-engine/src/time/` tested but not wired into the app.

Paths are relative to `apps/web/` unless stated. Line references are to `main` at `fc906e8`.

## Principles
1. **A day is a calendar date in a named zone.** Stored days stay `YYYY-MM-DD` strings. Every computed "today" names the zone it was computed in. No "today" is derived from the device zone when a stored zone exists.
2. **Past records are never rewritten.**
   - A date that was stored keeps its meaning.
   - A zone change applies from a future day onward.
   - An instalment's `scheduledDate` and its id (`${planRevisionId}:${scheduledDate}`, enforced at `lib/positions.ts:97`) are never recomputed.
3. **The same records give the same days on every device.** A zone that decides stored days must travel with the private data and sync. The device zone may only be a default that is written down once chosen.
4. **Prefer IANA zone names.**
   - Intl also accepts fixed offsets such as `+05:30`; the current Habits and Health validators accept them too (`lib/habits.ts:61`, `lib/health.ts:87-89`).
   - New fields should store IANA names. A fixed offset has no daylight saving, so "Europe/Brussels" stored as `+02:00` would be wrong for half the year.
   - Existing values keep working.
5. **UTC stays the default.** Absent zone = UTC for plans, exactly as today. Nothing changes for a user who never chooses a zone.

## Proposed stored-format changes

### 1. Plan zone (QA-04)
- **Field:** an optional `timeZone` on the contribution plan (`contributionSchema`, `lib/positions.ts:33-38`). Revisions carry their own `terms` (a plan, `planRevisionSchema`, `:40`), so every revision records the zone its days are counted in, with no separate history.
  - **Absent = `"UTC"`.**
  - The field is not a separate goal-level setting.
- **A version bump is required.** `contributionSchema` and the finance schemas are `.strict()`, so an older build rejects an unknown key. Finance `schemaVersion` 3 → 4 (`positions.ts:81`).
  - The v3 → v4 read transform is a no-op: absent zone means UTC.
  - Nothing is rewritten on read.
- **A zone change is a new plan revision,** effective from the next day *in the old zone* (today's rule, `earliestPlanChange`, `lib/plan-revisions.ts:10`). Instalments before it keep their dates and ids.
- **Unchanged:** valuation capture days (`captureValuations`, `lib/goal-intelligence.ts:117`) and the history date filters (`:150-153`) stay UTC. Moving them changes history density and is a separate decision (backlog item 6).

### 2. Journal timezone (Habits and Health)
Today there are three independent zone settings:
- the Habit journal timezone (top-level `timeZone`, habits v2, `lib/habits.ts:87`);
- the Health timezone (`daily.preferences.timezone`, `lib/health.ts:103`);
- the device zone.

Goals ignore all three.

- **Proposal:** one optional account-level `journalTimeZone` in the settings section (`lib/dashboard-settings.ts:68`, `schemaVersion` 1 → 2, also `.strict()`).
- **Resolution order** for Habits and Health: the module's own stored zone (an override, kept for compatibility), then `journalTimeZone`, then the device zone.
- **Existing values keep their exact meaning.** A user who set a Habits or Health zone sees no change.
- **The device-zone fallback is the one non-deterministic step.** The backlog (item 7) notes that today two devices in different zones can compute different "today"s for the same records. The UI should offer to write the zone down the first time it matters (see UI needs).
- **Plans do not follow the journal zone automatically.** A plan's zone is chosen when the plan is created or revised, defaulting to the journal zone if set, else UTC, so a later journal-zone change never moves existing instalments.

### 3. Per-record zones that already exist (unchanged)
Body measurements (`lib/body-measurement-schema.ts:3`), Habit timers (`lib/habits.ts:62-63`) and their receipts store their own zone. They are already deterministic, and this design leaves them as they are.

## Versioning and migration
- **Lazy write.** Finance v4 is written only when a plan first gets a non-UTC zone. Settings v2 is written only when a journal zone is first chosen. A user who never chooses keeps v3/v1 bytes forever.
- **Two-release rollout: read support before write support.**
  - **Release R1** reads v4 finance and v2 settings, but never writes them, and shows the version-specific sync message below.
  - **Release R2** (at least one deploy later) adds the UI that writes them.
  - Rolling R2 back to R1 is then safe: R1 reads everything R2 wrote.
- **Migrations are read transforms in the Zod unions,** following the existing pattern: finance v1/v2 → v3 at `positions.ts:82`, habits v1 → v2 via `migrateV1`, `habits.ts:112-119`. No migrate-on-load rewrite. The first *edit* writes the current version, and `updatePrivateStore` keeps the pre-upgrade bytes as a recovery copy (`lib/private-storage.ts:36-37`).

## Rollback caveats
- **Rolling back past R1** (to a build that cannot read v4 finance or v2 settings) makes those sections unreadable on that build: "Private data is invalid or uses an unsupported version" (`private-storage.ts:15`).
  - The data is not lost: the recovery copy exists.
  - Exports from the newer build still restore once the newer build returns.
  - **So never roll back past R1 once any R2 build has been live.** The Manual Alpha rollback should be to a version at or after R1.
- **Restore across versions:** importing a v4 export into an older build is refused before anything is touched, with the same "unsupported version" message (`parsePrivateData` runs before the lock, `private-storage.ts`); `NEWER_VERSION` (`lib/vault/storage-errors.ts`) is the reverse case, a newer build refusing to replace its v4 record with an older backup. Both fail closed (proved in `apps/web/lib/vault/read-support.test.ts`, Session P). This corrects the earlier wording, which named `NEWER_VERSION` for the first case.
- **Lazy write limits the blast radius** to users who actually chose a zone.

## Sync implications
- **Validation happens before any upload.** `synchronize` validates the merged data before anything is published (`lib/vault/cloud-sync.ts:93`, with `validateData` from `lib/vault/account-data.ts:23`). An older-build device that pulls a v4 finance or v2 settings section therefore fails validation.
  - Nothing is uploaded or overwritten, and local data stays as it was.
  - Before R1 that surfaced as a **generic Zod error**. R1 maps it to a plain message: "This section was saved by a newer ZIGoals. Update the app on this device to keep syncing." (`NEWER_SECTION_MESSAGE` and `CURRENT_VERSIONS` in `lib/vault/account-data.ts`, Session P: a section whose `schemaVersion` is above this build's is refused with that message before its schema runs; nothing is uploaded and local records stay as they were.)
  - That is the one UI piece R1 needs.
- **Finance merges as one opaque string** (`cloud-sync.ts:82`). Setting a plan zone on two devices at once is a "Conflicting financial changes" review like any other concurrent finance edit. Nothing merges silently.
- **Settings merge field by field** (`mergeValue`). The same `journalTimeZone` chosen on two devices merges; two different choices become a field conflict for review.
- **Determinism:** plan days depend only on the stored `timeZone` (or UTC), never on the device, so every synced device computes the same funding state from the same records.
- **ADR-006 is independent:** the sync journal is not touched. If both land, ADR-006 goes first (see the order below).

## The QA-04 path (UTC funding days → the plan's zone)
Each step is its own PR, and every behaviour change is test-first.
1. **Failing-first suites, no behaviour change** (the backlog asks for these before any change):
   - per-case TZ suites for `fundingHealth` (`goal-intelligence.ts:57-59`), `day`/`shift`/`earliestPlanChange` (`plan-revisions.ts:5-10`), `scenarioHorizon`/`planScenario` (`positions.ts:234-265`) and `captureValuations`;
   - the QA-04 scenario as a `test.fails`: New York, a plan due 2026-10-15, at 21:30 local, before funding. It must not be "behind −€500", and "next contribution" must stay 2026-10-15.
2. **Wire the helpers with zone `"UTC"`.** Replace the UTC slices with `planDays(now, "UTC")`, `addDays` and `zonedDate`.
   - Pure refactor: the parity test in `zoned-day.test.ts` already proves equality on 10,030 instants, and step 1's suites must stay green.
   - It moves the helpers to an app-reachable place (export from `goal-engine`, or copy into `lib/`) in that PR.
3. **R1, read support:**
   - finance v4 and settings v2 in the Zod unions, absent zone = UTC;
   - the version-specific sync message;
   - funding reads `plan.timeZone ?? "UTC"`. It is still always UTC in practice, because nothing writes a zone yet.
4. **R2, write support and UI:**
   - choose a plan zone (default: journal zone, else UTC);
   - the zone in the plan copy;
   - a journal-zone setting.

   The QA-04 `test.fails` flips here. Re-run Session F's 49-day DST sweep and the Stage 8 sync rows (B2, B4, B5) on two devices in different zones.
5. **Later, a separate decision:** valuation capture days, and Health "today" on the Today card (QA-24).

## Helpers already delivered (Session J)
All live in `packages/goal-engine/src/time/`. They are not exported from the package index and not imported by the app.

| Helper | Use in the steps above |
|---|---|
| `isCalendarDate`, `addDays`, `daysBetween`, `isoWeekday`, `startOfIsoWeek` (`calendar-date.ts`) | Replace `shift` (`plan-revisions.ts:6`), `addLocalDays`/`localWeekday` (`lib/local-date.ts`) and the T12:00Z stepping in `positions.ts:234-265` |
| `zonedDate`, `zonedDateTime`, `offsetMinutes` | Replace `habitCalendarDay` (`habits.ts:120-124`), `healthDay` (`health-daily.ts:157-163`), the private `zonedDay` (`habit-actions.ts:27`) and `readingDay` (`body-measurements.ts:50`): one implementation |
| `zonedTimeToInstant` (gap/overlap: `compatible`, `earlier`, `later`, `reject`), `startOfZonedDay`, `zonedDayBounds` | Day windows for "last 7 days" and history filters; DST-correct 23/25-hour days |
| `planDays(now, zone = "UTC")` | `fundingHealth` today/tomorrow and `earliestPlanChange` |
| `isTimeZone` | Same rule as the current validators. The new fields should additionally refuse offset strings |

**Tests:** 30, covering DST gaps and overlaps, UTC±14 and −12, half-hour and 45-minute offsets, leap days, ±1 ms day boundaries, Apia's skipped 2011-12-30 and São Paulo's skipped midnight. All pass under five host TZs, and the UTC parity check runs over 10,030 instants.

## UI needs (for a later UI session; not part of this design's implementation)
1. **Plan form:**
   - a zone picker (IANA list from `Intl.supportedValuesOf('timeZone')`), defaulting to the journal zone, else UTC;
   - replace "Dates use UTC" (`components/platform/tracked-detail.tsx:133`) with "Dates use <zone>";
   - make "Next expected date" default to today *in that zone*, fixing backlog item 2's mixed default.
2. **Plan history:** "Changes apply from their effective day in <zone>" (`components/platform/plan-history.tsx:12`); show a zone change as its own revision.
3. **Goal funding:** while plans stay UTC, label "Due today (UTC)". After R2, show the plan zone next to "Planned through today" when it differs from the device zone.
4. **Settings, one "Journal timezone":**
   - It defaults to the device zone and is written down on first use.
   - Habits and Health show "follows journal timezone" unless overridden.
   - The two existing per-module controls stay as overrides.
5. **Travel notice** when the device zone differs from the journal zone: "Your journal stays in Europe/Brussels. Switch?" Never rewrite past entries.
6. **Sync message** for a newer-format section on an older build (R1, above).
7. **Today:** show the zone next to "Today" when it differs from the device (backlog items 4/QA-24).
8. **Accessibility and locale:** zone names are written out ("Europe/Brussels", not "CET"), and dates follow the existing English-for-region display rules (Session G, `lib/visual-format.ts`).

## Owner decisions (answered 2026-10-02, confirmed at the Session N plan approval)
These were the four open decisions of this design. The answers follow the design, and T4 is stricter than proposed.

| # | Decision | Answer |
|---|---|---|
| T1 | Should plans follow a journal zone by default for *new* plans, or stay UTC until the user picks one? | **New plans follow the journal zone.** The default is chosen when a plan is created or revised; existing plans keep UTC, and a later journal-zone change never moves existing instalments ("Journal timezone" above: plans do not follow the journal zone automatically). |
| T2 | One account-level journal zone with per-module overrides, or three independent settings? | **One account-level journal zone, with per-module overrides** (the resolution order in "Journal timezone" above). |
| T3 | Should valuation capture days move with the plan zone, or stay UTC (backlog item 6)? | **They stay UTC.** `captureValuations` and the history date filters keep UTC days. |
| T4 | The R1 → R2 gap? | **At least one Alpha deploy *and* at least one week** between the read-support release (R1, phase 3) and the write release (R2, phase 4). |
| T5 | Scope of the first implementation session | **Phases 1–2 only** (Session N): failing-first suites and the UTC wiring. No stored-format change and no read-support release. |
| T6 | The due-day rule: an instalment due today already counts as "planned through today", so the QA-04 case ("must not be behind −€500") cannot flip from the zone alone | **It stays as it is until phase 4** (owner decision 2026-10-03). |

### What this means for the phases
- **Phases 1–2 (Session N)** change no stored format, so they don't wait for Stage 8.
- **Phase 3 (R1, read support): delivered in Session P, PR 2 (2026-10-03),** after ADR-006 option A2 in the same PR; STATUS ("Recommended order after Stage 8", Session J) put it after Stage 8 and ADR-006, and the Stage 8 sync rows run on a build that includes it.
  - **In R1:** finance v4 and settings v2 in the Zod unions (`platformSchema`, `dashboardSettingsSchema`), absent zone = UTC, `timeZoneSchema` (IANA names only, fixed offsets refused, `lib/time-zone-schema.ts`), and the version-specific sync message. Funding, plan and revision days read `plan.timeZone ?? "UTC"` (`planZone`, `planDay(now, zone)`, `lib/plan-revisions.ts`). A record becomes v4 only when a plan carries a zone (`financeVersion`): nothing writes one, so every stored record stays v3 and every funding day stays UTC in practice. Also in R1, by owner decision: read-only support for the synced homes of PR 3's device-only records (habits v3, health v2, and `healthGoals` in finance v4, `weeklyReview` in settings v2), see SYNC_HOMES.md.
  - **What flipped:** Z1–Z15 (docs/testing/SKIPPED_TESTS.md); Z16 waits for R2.
  - **The T4 clock starts at the Alpha deploy that includes PR 2.** Phase 4 preconditions: that deploy live, at least one further Alpha deploy and at least seven days after it, Stage 8 sync rows run on an R1 build, no "newer ZIGoals" refusals reported, and the Manual Alpha rollback target at or after R1.
- **Phase 4 (R2, writes and UI):** at least one Alpha deploy **and** one week after R1 (T4).
  - **Defaults in R2:** a plan's zone defaults to the journal zone (T1). A journal-zone setting with per-module overrides (T2).
  - **What flips:** the remaining expected failures.
  - **Re-run there:** Session F's 49-day DST sweep, and Stage 8 rows B2, B4 and B5 on two devices in different zones.
- **Phase 5:** valuation capture days stay UTC (T3). Health "today" on the Today card (QA-24) remains a separate decision.

### Earlier wording of the open decisions (Session J, kept for the record)
1. Should plans follow a journal zone by default for *new* plans (this design), or stay UTC until the user picks one?
2. One account-level journal zone with per-module overrides (this design), or keep three independent settings?
3. Should valuation capture days move with the plan zone, or stay UTC (backlog item 6)?
4. The R1 → R2 gap: at least one Alpha deploy (this design), or longer?
