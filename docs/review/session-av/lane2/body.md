# Lane 2 — body (sleep, workouts and body): builder registry

Branch `lane2/body`, from `feature/session-av-2` at `fbeb3e54`. One section per commit. Every stored change is listed
under "Stored changes" for the lead's TIER 3 (stored formats) label.

## Stored changes (TIER 3 (stored formats), all additive)

| record | change | readers of #37–#57 |
|---|---|---|
| `zigoals:workouts:v1` (existing, device-only, loose) | routine (`templates[]`): `folder?` (1–40 chars), `note?` (≤ 500), `guideId?` (the library routine it came from), `progression?` `{kind: 'double' \| 'linear', minReps?, maxReps?, stepKg}`; log: `pinnedNotes?` (exercise id → note, ≤ 300), `distanceGoals?` (≤ 12 `{id, sport: run\|ride\|swim\|walk\|any, period: week\|month\|year, km, createdAt}`). Each `.optional().catch(undefined)` on loose objects. | Loose objects keep the keys untouched; nothing they read changed. |
| `zigoals:evening-plan:v1` (NEW, device-only, loose, versioned) | `{version: 1, plan?: {bedtime, windDown, hindrances[], steps[1–8]: {id, label, minutesBefore, habitId?}, updatedAt}, days: {evening date → ticked step ids} (≤ 120)}` | New key; older builds never read it. |

Registries the lead needs for `zigoals:evening-plan:v1` (personal, Health): device-key list (`lib/av-device-keys.ts`),
data catalogue (`lib/data-health/catalog.ts`, area Health, "Evening plan"), Export everything `DEVICE_KEYS`
(`eveningPlan`), the restore plan (`lib/restore/plan.ts` `dev('eveningPlan', 'Evening plan', 'Health', EVENING_PLAN)`), and
erase (`lib/erase-everything.ts`). Once `DEVICE_KEYS` holds it, the skipped round trip in
`lib/workouts/av2-stored.test.ts` runs (it is `skipIf(!registered)`, nothing else changes). The workout log's new fields
ride on the existing key, so export, restore and erase need nothing new; the round trip is tested.

Commit: `TIER 3 (stored formats): …` — files `apps/web/lib/workouts/schema.ts`, `apps/web/lib/evening-plan/schema.ts`,
test `apps/web/lib/workouts/av2-stored.test.ts`.
