# Health V1

Health is a private journal at `/app/health`. It works without a wallet or account. Entries belong to this browser, independently of the active wallet. Nothing is seeded on first use.

## Available workflows

- **Diary:** select a local calendar date, food or recipe, one of Breakfast/Lunch/Dinner/Snacks, and a quantity of servings. Inspect calorie and macro totals, correct the date/meal/quantity of an entry, or remove it. A seven-day chart distinguishes days without entries and excludes them from its average.
- **Foods:** create, search by name or brand, edit and remove foods. Each food stores the serving weight and nutrition copied from the user's own label. All four nutrients must be entered explicitly; zero is accepted.
- **Recipes:** combine one or more saved foods and their serving quantities, specify recipe servings, inspect the calculated nutrition per serving, then save or edit the recipe. Saved constituent snapshots are visible. Removed ingredients must be replaced before rebuilding a recipe.
- **Weight:** enter or correct one reading per local date, set a personal goal under Targets, view a 30-day trend and the most recent 100 history rows, select a row's date for correction, or remove it. All older readings remain in backups and can be selected by date.
- **Activity:** record a named activity with manual steps, minutes, or both. Entries sum for the selected date and can be removed. Activity never modifies calorie targets.
- **Targets:** explicitly set or clear calorie, protein, carbohydrate, fat, weight and step targets. Targets are current reference values for every selected date; changing one does not rewrite logged nutrition. No default targets, calorie recommendations or medical interpretation are provided.

Photo recognition, connected scales, wearable integration, remote food lookup and automated coaching are outside V1. There are no inactive controls for these capabilities.

## Storage contract

`lib/health.ts` exports `healthSchema`, `createEmptyHealth`, `HealthData` and `HEALTH_STORAGE_KEY`. The strict versioned envelope is `{schemaVersion:1, kind:"zigoals-health", targets, foods, recipes, diary, weights, activity}` at `zigoals:health:v1`. All record IDs are locally generated `health_` UUIDs and must be globally unique within the envelope. Record creation/update timestamps are UTC instants; journal dates are validated local calendar strings from 1900 through 2199.

All stored quantities are finite bounded integers: kcal, macro milligrams, serving-weight grams, body-weight grams, steps, minutes and thousandths of a serving. Decimal form parsing accepts at most three fractional digits for macros, kilograms and servings; exponent notation, implicit defaults, negatives and silent input rounding are rejected. Serving weight uses whole grams. The numeric limits are data-integrity limits, not suggested personal values.

Food records retain up to 1,000,000 kcal and 1,000,000,000 mg per nutrient; serving weight is 1–100,000 g. Serving quantities and recipe portions are 0.001–1,000. Body weight is 1–1,000,000 g. Targets are nullable and positive when present. Activity entries allow up to 1,000,000 steps and 1,440 minutes. Collections are bounded at 1,000 foods, 500 recipes (100 ingredients each), 10,000 diary entries, 5,000 weights and 10,000 activities, subject to the shared store's 2 MB limit.

Recipe calculations sum exact constituent integer products using `BigInt`, divide by the recipe's servings, and round half-up once per kcal or milligram. Recipe serving weight is the sum of recorded ingredient weights divided by portions, rounded to whole grams; it does not estimate cooking-related weight changes. Out-of-range calculated servings or nutrition are rejected.

Recipes keep ingredient nutrition snapshots. Diary entries keep an independent snapshot of name, serving weight and per-serving nutrition plus their serving quantity. Editing or deleting a food/recipe cannot rewrite existing recipe or diary nutrition. Correcting a diary quantity scales its original snapshot with deterministic half-up rounding.

`components/health/use-health.ts` exports `useHealth()`, directly using the shared `usePrivateStore` contract. Atomic updates re-read the current envelope under its Web Lock and publish only after durable validation and writing. Malformed, oversized and future-version input fails closed. The common Settings workflow exports original bytes and validates separate Health imports before replacement; Health never accesses the Goal store.

`HealthToday()` is a compact truthful local preview. `getHealthActivities(data)` projects diary, weight and movement records into `{id, category:"HEALTH", title, detail, at, href:"/app/health"}`. No personal values are encoded in URLs. Neither the module nor its projections make network, logging or analytics calls.

## Verification

`apps/web/lib/health.test.ts` covers integer arithmetic, exact decimal parsing, recipe and diary snapshots, corrections/removal, explicit/cleared targets, weights, local calendar/leap/DST boundaries, malformed data and collection limits. `apps/web/tests/health.spec.ts` exercises real food/recipe/diary/target/weight/activity forms, reload, damaged storage and the 320-pixel historical workflow on desktop and mobile projects. Shared store tests cover atomic writes and import/export behavior; the aggregate privacy gate covers outbound traffic.
