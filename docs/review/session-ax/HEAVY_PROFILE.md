# Heavy profile (Session AX, test-only)

`<SP>` below = $SCRATCHPAD. The three proof specs (zz-heavy-proof, zz-heavy-restore, zz-heavy-data) are kept in `<SP>/heavy-profile-work/`; copy one into apps/web/tests/ to rerun it (then delete it).

Two years of fictional, deterministic records in every pillar, ending on the run date, as the person's OWN local data
(not the Showcase). Generator: `scripts/heavy-profile/generate.mjs` (plain Node, seeded PRNG, no dependencies). Nothing
the app ships imports it (checked by the unit test); only the Playwright helper does.

## Use it

### In a Playwright spec (fastest: ~1-2 s)
```ts
import {seedHeavyProfile, heavyProfileRoutes} from './helpers/heavy-profile';   // from apps/web/tests/*.spec.ts
test('…', async ({page}) => {
  const profile = await seedHeavyProfile(page);          // writes localStorage + journal photo stubs (IndexedDB), welcome seen; leaves the page on /app/settings
  await page.goto('/app/wealth');
  const r = heavyProfileRoutes(profile);                 // {goal, trackedGoal, averageGoal, wealthAsset, portfolioCoin}
  await page.goto(r.trackedGoal);
});
// options: seedHeavyProfile(page, {end: '2026-11-26', seed: 20261126, photos: false})
```
Each context starts empty, so seed once per test (or per context). It clears localStorage/sessionStorage first.

### From a plain `require('playwright')` script (your own sweep.js)
```js
const {storage, photoIds} = JSON.parse(require('fs').readFileSync('<SP>/heavy/heavy-profile-2026-11-26.records.json', 'utf8'));
await page.goto('http://127.0.0.1:3101/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
await page.evaluate(s => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); }, storage);
// then page.goto(route). (Journal photos: copy the IndexedDB block from apps/web/tests/helpers/heavy-profile.ts, or skip them.)
```
Note: the records file is dated 2026-11-26 (today). For another day regenerate (below) so "today" data lines up.

### Generate / restore file
```
. <SP>/env.sh
node scripts/heavy-profile/generate.mjs --out <file.zip> [--records <file.json>] [--end YYYY-MM-DD] [--seed N]
```
Pre-generated (end 2026-11-26, seed 20261126), in `<SP>/heavy/`:
- `heavy-profile-2026-11-26.zip` (7.0 MB "Export everything": everything.json + 180 `journal/photos/*.webp`) → Settings → Your data (/app/settings/data) → Restore from a backup.
- `heavy-profile-2026-11-26.records.json` (localStorage key → string, plus ids and counts).
- `heavy-profile-2026-11-26.summary.json` (counts, chars per key, ids).
Unit test: `pnpm exec vitest run scripts/heavy-profile` (determinism, counts, every record through the app's own schemas,
private 2 MB reader, the restore reader `openBackup` + `planParts` + media matching, and the artifact check).

## What is in it (end 2026-11-26; start 2024-11-27)
| Pillar | Records |
|---|---|
| Money | 9,800 money-log entries (5,256 "imported": bank account label + bank `ref`, as a CAMT/MT940/OFX import writes them; EUR plus some USD), salary/freelance income, 12 monthly bills, 10 budgets, a weekly room-to-spend, 6 accounts (current, savings, credit card, brokerage, mortgage, joint) with 24 monthly balances each and card/mortgage payments |
| Goals and Wealth | 6 manual positions (cash, ETF, BTC, gold, property, savings), 6 VALUE goals with monthly plans and milestones, allocations, 144 contributions, 144 valuation snapshots; 3 average goals (sleep, steps, a custom screen-time one with 365 entries) |
| Portfolio | 1 real EUR portfolio, 3 coins (bitcoin, ethereum, cardano), 72 buy/sell transactions |
| Tasks | 500 (the app's cap MAX_TASKS), 8 projects with 2 sections each, labels, due dates −40…+60 days (85 overdue, 12 due today), 150 done in the last 28 days, 60 repeating (day/week/2-week/month) with up to 60 completions each, 115 comments, a few with notes |
| Journal | 700 entries 2024-12-09 … 2026-11-26 (tags, a few starred), 180 photo stubs (1×1 WebP) on 150 entries, one "Personal" journal |
| Health | 16 foods, 5,000 food logs (diary), 105 weekly weights, 365 days of steps, 365 sleep nights (with a sleep goal), 365 mood days, targets |
| Mood/energy | 365 energy days (`zigoals:energy:v1`) and 365 Health moods |
| Workouts | 156 over the last year (push/pull/legs + runs), progressive weights |
| Habits | 8 daily habits started a year ago, 1,867 check-ins (some with a mood) |
| Notes | 300 (daily, inbox, topic); 150 in Markdown (headings, lists, quotes, `[[links]]`), 5 pinned |

## Real ids for dynamic routes
- `/app/goals/tracked/[id]`: `7001` (Emergency fund, pinned) … `7006` (7002 House renovation, 7003 Financial freedom by 50, 7004 Japan trip 2027, 7005 Master degree fund, 7006 New bike)
- `/app/goals/average/[id]`: `hp-avg-sleep`, `hp-avg-steps`, `hp-avg-screen`
- `/app/wealth/asset/[id]`: `hp-cash`, `hp-vwrl`, `hp-btc`, `hp-gold`, `hp-home`, `hp-savings`
- `/app/portfolio/coin/[id]`: `bitcoin`, `ethereum`, `cardano` (add `?portfolio=hp-portfolio`)

## NOT covered
- Tasks are 500, not ~3,000: the app keeps at most 500 (lib/tasks/schema.ts:23 `MAX_TASKS = 500`, done ones count for 30 days); a record with more is refused whole. See findings.
- Money log 9,800 (not 10,000+): the log keeps 10,000 (lib/money-log/schema.ts:12); kept a little under so adding still works.
- No market-priced positions (all manual valuation, no marketRef) so no network is needed; Portfolio coins still ask the market (api is offline in the sandbox).
- Not seeded: checklist, NOVA, ZIGi, agenda/calendar, plans/stories/goal extras, chess, music, earn/staking/governance, wallets, receipts/meal/note/task photos (only journal photos), voice notes, vision images, progress photos, recipes, water, meditation, vitals, fasting, cycle, supplements, focus, grocery.
- Not an account (cloud) profile; not the Showcase.
- `/app/goals/[id]` needs a legacy local-simulation goal (lib/local-ledger); the profile has none, so use /app/goals/tracked/[id] for its goals.

## Proof in the browser (2026-11-26, production build on :3101, desktop 1280×720, Chromium, /api/** answered 503 offline)
Seeding with the helper: 2.6 s (localStorage 4,936,084 chars in 22 keys after the visits below). Per route, ms from
navigation to: the `load` event / `html[data-app-hydrated]` / the first seeded text visible:

| Route | load | hydrated | seeded data seen | evidence |
|---|---|---|---|---|
| /app (Today) | 793 | 3,145 | yes | "5 of 8 habits · tracked wealth €462,220.00", "9 goals in motion" (slowest route) |
| /app/wealth | 564 | 1,379 | 3,855 | "Albert Heijn" (money log), "ING Current", "Rabo Savings", "Emergency cash"; 121 list items |
| /app/tasks | 654 | 1,375 | 1,430 | projects "Home", "Side project"; 109 list items |
| /app/journal | 464 | 1,636 | yes | 1,694 list items, 180 photo images in main, 113k characters of text (the whole journal is rendered at once) |
| /app/health | 506 | 1,635 | 2,125 | "Oatmeal", "Stamppot", kcal |
| /app/habits | 528 | 1,618 | 1,970 | "Meditate 10 minutes", "Practise Japanese" |
| /app/notes | 511 | 995 | yes | opens on its Today tab; "Inbox 80" badge (the notes are under the Notes/Days tabs) |
| /app/goals | 559 | 1,414 | 1,503 | "Emergency fund", "Japan trip 2027", average goal "Sleep 7.5 hours" |
| /app/goals/tracked/7001 | 1,481 | 1,744 | 1,785 | h1 "Emergency fund" (alert: automatic prices unavailable, offline) |
| /app/goals/average/hp-avg-sleep | 360 | 952 | 1,017 | h1 "Sleep 7.5 hours" |
| /app/wealth/asset/hp-cash | 423 | 842 | 905 | h1 "Emergency cash" |
| /app/portfolio/coin/bitcoin?portfolio=hp-portfolio | 409 | 825 | 928 | h1 "Bitcoin", 24 list items (prices unavailable offline) |
| /app/goals/7001 | 463 | 802 | n/a | "Goal unavailable.": this route is for legacy local-simulation goals (useGoals); private goals live at /app/goals/tracked/[id], which every app link uses. Not a bug. |

### Restore through Settings → Your data (fresh, empty context)
- "Test a backup" with the ZIP: 57 ms, "All 14 parts would restore."
- "Export everything ZIP" → preview in 845 ms (every part listed with its counts, e.g. Spending 9800 records, Habits 8 / 1867
  check-ins, Journal 701 records; all set to Merge, photos ticked) → "Restore the chosen parts": 3.1 s. Outcome: "Restored:
  Goals and Wealth, Habits, Health, Average goals, Accounts and debts, Workouts, Spending, Journal, Daily energy, Tasks,
  Bills, Budgets, Notes, Portfolio. Photos, voice notes and documents put back: 180." localStorage afterwards holds every
  key at exactly the generated size; the journal's IndexedDB store holds 180 photos. Afterwards /app/wealth showed
  "Albert Heijn" in 2.5 s, /app/habits and /app/health their data in 1.4-1.5 s. No errors.
- Evidence: `<SP>/heavy-profile-work/restore.json`, `shots/restore-preview.png`, `shots/restore-outcome.png`.

No page errors; the only console errors were the offline 503s for /api/**. Screenshots: `<SP>/heavy-profile-work/shots/*.png`;
raw numbers: `<SP>/heavy-profile-work/proof.json`.

### Storage after seeding (reload of /app/settings/data, same profile)
"Records on this device 9.4 MB" (UTF-16 bytes of 4.94 M characters). Chromium's per-origin localStorage quota measured
in this sandbox: 5,200,000 characters; after seeding, a probe write of at most 321,246 more characters succeeds (~6 % left).
The Health module is 1,885,393 bytes of its 2,000,000-byte cap: every page (/app, /app/health, /app/settings,
/app/settings/data) shows "Health on this device is nearly full (1.9 of 2.0 MB). Export everything first, then remove old
imports or photos, or keep your records in the account vault." Raw: `<SP>/heavy-profile-work/data.json`.

## Findings for the integrator (severity per HELPER_BRIEF; evidence above; nothing fixed)
| id | finding | severity | evidence |
|---|---|---|---|
| HP-1 | Two years of heavy food logging nearly fills Health's 2 MB private-store cap: 5,000 diary entries (≈7 a day) plus a year of sleep, moods, steps and 105 weights = 1.89 MB (94 %). About 300 more food logs and every Health write is refused (MODULE_LIMIT), while the Health schema itself allows 10,000 diary entries. The "nearly full" banner appears on every page. Logging food (a main flow) stops working for a daily logger after ~2 years; a long MyFitnessPal/Cronometer import would hit it sooner. | Major | lib/private-storage.ts:6 `PRIVATE_MAX_BYTES = 2_000_000` vs lib/health.ts `diary: z.array(diarySchema).max(10_000)`; one diary entry ≈ 377 bytes; data.json |
| HP-2 | The whole profile uses 4.94 M of Chromium's ~5.2 M localStorage characters per origin (95 %; 321 k characters left). The money log alone is 2.06 M characters (9,800 entries, ~210 characters each). Long before any per-pillar cap, a heavy user's next write anywhere can fail with a quota error, and Restore of such a backup onto a device with other data could not fit. Only Health warns (HP-1); the origin-wide quota is not watched. | Major | quota probe (`quota.cjs`: 5.2 M chars), headroom probe 321,246, generate summary (bytesPerKey) |
| HP-3 | Tasks keeps at most 500 tasks (finished ones for 30 days), so a ~3,000-task history cannot exist; the profile stops at 500. A user near the cap with repeating tasks and comments is ~265 k characters. The page footer says "N of 500 tasks kept on this device", so by design, but a heavy Todoist import is cut. | Minor | lib/tasks/schema.ts:23 `MAX_TASKS = 500`; lib/tasks/import.ts:196 |
| HP-4 | The money log keeps 10,000 entries: a two-year heavy user (≈13 a day, bank imports) reaches it in about two years; "Put a year away" exists for this. Not tested at the cap. | Minor | lib/money-log/schema.ts:12 `MAX_ENTRIES = 10_000` |
| HP-5 | Settings → Your data right after a successful restore still shows "Records on this device 0 B" and "Nothing yet" for every synced record (it was read before the restore and is not refreshed); after a reload it shows 9.4 MB. Could make a person think the restore did nothing. | Minor | shots/restore-outcome.png (0 B, under the "Restored: …" outcome) vs data.json after reload |
| HP-6 | /app/journal renders all 700 entries at once (1,694 list items, 180 images, 113 k characters of text in the DOM); still hydrated in 1.6 s on desktop here, but no paging. Worth a phone/low-end check by the performance reviewer. | Minor (observation) | proof.json journal row |

Not findings: /app/goals/[id] is "Goal unavailable." for private goal ids by design (legacy local-simulation goals only);
Today was the slowest route to hydrate (3.1 s), every other route 0.8-1.7 s.
