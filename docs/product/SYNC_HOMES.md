# Read-only sync homes for Session P's device-only records

**Status:** read support shipped in Session P, PR 2 (2026-10-03), together with timezone phase 3 (R1). Nothing writes these fields yet.

PR 3 adds four kinds of record that have no place in today's synced formats: habit-health links (H7), health goals (G3), weekly reviews (G1) and fasting sessions (HE6). PR 3 keeps each in a device-only key (`zigoals:<name>:v1`, per account, in `getAppStorage()`), because every synced module is `.strict()` and a key an older build does not know is refused as "invalid or unsupported version". The two-release rule (TIMEZONE_DESIGN.md, "Versioning and migration") says read support must be live on every device before anything writes a new field.

This PR ships the read support for all four at once, so that each feature's later "write switch" needs no further read-support release: once the T4 gap after this PR's Alpha deploy has passed (at least one Alpha deploy **and** one week, TIMEZONE_DESIGN.md T4), a later PR may move a record to its synced home.

## The homes

| PR 3 record (device-only key) | Synced home | Module version that carries it | Field |
|---|---|---|---|
| Habit-health link, `zigoals:habit-health-links:v1` | Habits | **habits v3** | `habits[].healthLink` (one per habit), and `habits[].entries[].source` |
| Health goal, `zigoals:health-goals:v1` | Finance | **finance v4** | `healthGoals[]` (≤ 200) |
| Weekly review, `zigoals:weekly-review:v1` | Settings | **settings v2** | `weeklyReview` |
| Fasting session, `zigoals:fasting:v1` | Health | **health v2** | `fasting.sessions[]` (≤ 2,000) |

Finance v4 and settings v2 are the versions timezone phase 3 introduced (`plan.timeZone`, `journalTimeZone`); the homes ride on them. Habits v3 and health v2 are new with this PR.

### Exact fields (the schemas are the source of truth)

- **`habitHealthLinkSchema`** (`apps/web/lib/habits.ts`): `{version: 1, measure: "water" | "steps" | "activeMinutes" | "weight" | "exercise", rule: "at-least" | "recorded", target?: number (0 … 1e9, in the measure's own unit: mL, steps, minutes, a reading, a count), exerciseId?: string ≤ 100, updatedAt: ISO instant}`, strict. An entry's `source?: "manual" | "health"` says whether a check-in was made automatically.
- **`healthGoalSchema`** (`apps/web/lib/positions.ts`): `{version: 1, id: uuid, name: 1–100 chars, measure: "weight" | "steps" | "water" | "exercise" | "activeMinutes", direction: "down" | "up" | "at-least", target: {value: integer string, decimals: 0–18}, unit: 1–24 chars, window: {kind: "by", date} | {kind: "rolling", weeks: 1–104}, exerciseId?, status: "active" | "done" | "closed", notes?: ≤ 2,000, createdAt, updatedAt}`, strict; ids unique. Progress is never stored: it is computed from the Health records.
- **`weeklyReviewSchema`** (`apps/web/lib/dashboard-settings.ts`): `{version: 1, weekday: 0–6, reviews: [{weekStart: date, completedAt?: instant, skipped?: boolean, notes?: {wentWell?, goals?, habits?, health?, wealth?, intention?: each ≤ 2,000 chars}}] ≤ 520}`, strict; one review per `weekStart`. The numbers of the week are never stored, they are recomputed from the records.
- **`fastingSessionSchema`** (`apps/web/lib/health.ts`): `{id: 1–100 chars, startedAt: instant, endedAt: instant | null, targetHours: 1–24, timeZone: IANA name, habitId?: uuid, note?: ≤ 500, stoppedBy?: "person" | "limit"}`, strict; `endedAt ≥ startedAt`; `fasting: {version: 1, sessions: [...] ≤ 2,000}`, ids unique. Hours and a target only: no streaks, no "longest fast", no calories (owner decision P5).

## The version rule
A record carries only fields its version knows, so an older build is refused by the `schemaVersion` literal alone and never by a surprising key:
- finance v3 with a plan zone (or health goals) is refused ("A plan time zone needs finance version 4."); `financeVersion()` says which version a record must carry;
- habits v2 with a Health link or an entry source is refused ("Automatic check-ins from Health need habits version 3."); `needsHabitsV3()`;
- settings v1 and health v1 are strict and refuse the new keys.

Today's writers never produce the new versions: `emptyPlatform`, `emptyHabitData`, `createEmptyHealth` and `presetSettings` start at 3, 2, 1, 1, and an edit keeps a record's version (`apps/web/lib/vault/read-support.test.ts`, "an edit on this build still writes today's version").

## Behaviour on every build
- **This build (R1) reads** all of the above and writes none of it. A record it reads at a newer version is written back at that version (never downgraded).
- **A build before R1** refuses a newer record: locally "Private data is invalid or uses an unsupported version. Original data was preserved." (`private-storage.ts`), bytes kept; an import of a newer export is refused the same way, nothing touched; a sync that pulls a newer section fails validation before any upload, so the cloud and the local records stay as they were (on R1 that is the plain message "This section was saved by a newer ZIGoals. Update the app on this device to keep syncing.", `NEWER_SECTION_MESSAGE`; before R1 it is a generic validation error, with the same outcome).
- **This build holding a newer record** refuses to replace it with an older backup (`NEWER_VERSION`).

## The write switch (a later PR, per feature)
1. Preconditions: the Alpha deploy that includes PR 2 is live, at least one further Alpha deploy **and** at least seven days have passed (T4), the Stage 8 sync rows have run on a build that includes PR 2, no "newer ZIGoals" refusals were reported, and the Manual Alpha rollback target is at or after PR 2 (never roll back past R1 once a writer has been live).
2. The feature's store writes the field into its synced module through `updatePrivateStore`, bumping `schemaVersion` on the first write (the pre-upgrade bytes are kept as a recovery copy, as for every version bump), and migrates the device-only key once (read, write into the module, then delete the key).
3. The device-only key stays readable one release longer (read-tolerant, never rewritten), then is retired.
4. Tests: old-reads-new and new-reads-old for the moved field already exist here; the feature adds the migration test (device key → module, idempotent, nothing lost) and a two-device Stage 8 row.

## Tests
- `apps/web/lib/vault/read-support.test.ts`: new reads old (byte-identical), new reads new, the version rule, old reads new (local read, import, and sync with an older validator), the sync message, mixed devices through sync.
- `apps/web/lib/vault/format-fixtures.ts`: the smallest valid record of every version.
- `apps/web/lib/vault/zod-jitless.test.ts`: the new versions are seeds of the JIT/jitless parser comparison.
