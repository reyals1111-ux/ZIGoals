# Lane L5b — the three extras: My Universe, Day Timeline, Stories (Session AF, Part 9)

Branch `af/extras` from `feature/session-af-wealth-unlocked` `20572134` (the feature head with Earn, the Checklist, native
staking and wallets merged). Server port 3104 only; every build and Playwright run under `$HOME/zigoals-af/bin/with-lock.sh`
+ `tmo.sh`. Nothing pushed, nothing merged. Owner rows P9.1–P9.4 (`docs/research/session-af/PLAN_APPROVED.md` §2.14, §10),
ADR-028 D2 (a), D3, H29, H55, H72, H76–H79, H95, H104; the L5 design's Part 9 half (`docs/research/session-af/lanes/L5.md`
§9). Where the design and ADR-028 differ, ADR-028 wins (H59): a story needs **3** logged days (H78), not R7's 14/90.

## Done against the brief

### 1. My Universe (P9.1, H55, H77)
- `lib/universe/model.ts`: one planet per pillar, derived on every read from the person's records — never from the game
  layer (a unit test reads the source to prove it), so it works with Gamify off. Every count is cumulative, so a planet
  only grows: **rings** from check-ins (Habits: 1/10/30/75/150/300), days with a Health log (1/7/21/50/100/200), goals
  reached (one ring each) and contributions (1/5/15/30/60/100); **moons** from habits that held a 7-day streak, kinds of
  Health log kept, goal milestones ticked and accounts tracked; **faint rings** (dashed) are misses kept as a trace —
  missed habit days (1/7/30), quiet Health weeks (1/4/12), goals set aside — never a deletion. **Light** is today's own
  threshold per pillar (all habits due done; three kinds of Health log; a goal moved; money moved or checked), one state,
  no reward per tick. A stake tracked gives Wealth a dotted halo. Money is counts only — no amount, price, rate or return
  anywhere (unit-tested on the Showcase, including the share card).
- Never regresses: `withFloor` keeps every ring/moon a celebrated milestone says was reached, even after a record is
  corrected.
- Milestones `universe:<pillar>:ring|moon:<n>`, `universe:wealth:staked`, `universe:all-four`. **One celebration per
  milestone**: only milestones reached in the last 7 days by the records' own days (the universe of today minus the
  universe of a week ago) and not yet in `zigoals:universe:v1` — so first sight never celebrates the past, an undated
  record (an older goal without its finishing step) never celebrates; the Showcase celebrates nothing.
- The celebration uses the app's one celebration look (`.celebration-card`, symbol, the nebula particle burst once from
  `components/game/game.css`; `data-still` and no particles under reduced motion / Motion Off), drawn **in place inside the
  Universe** rather than as a page-covering dialog, so it hides nothing and needs no game layer. Only the person's
  "Lovely" writes (`zigoals:universe:v1` gets the id and the day); seeing it writes nothing.
- One cross-pillar **discovery** from `lib/insights/cross-pillar.ts` (`max: 1`), "never a cause"; while none is ready, the
  pairing closest to ready with its day counts.
- Full view `components/universe/universe-section.tsx` on `/app/journey` above the game sections (one line in
  `components/game/journey.tsx`), with Gamify on or off: an inline SVG scene (no canvas, no dependency; orbits draw and
  planets arrive once, 650 ms, via `useEntrance`; a still under reduced motion / Motion Off), a 44 px+ HTML control on
  every planet (labels 14 px+, centred by margins — a transformed button missed taps under touch emulation), the four
  planets' facts, the share button (`drawShareCard` → `shareOrSave`, 1080 × 1350, counts only).
- Compact Today card (exported, not mounted): `components/universe/today-universe-card.tsx` — one DOM root, its body a lazy
  chunk (`today-universe-body.tsx`): four small planets in a row, "n of 4 lit today", one line (the milestone waiting to
  be celebrated, else the biggest reached, else "Your universe is waiting for its first light."), the door to
  `/app/journey#universe`. One short block on a phone.

### 2. Day Timeline (P9.2, D2 (a), H76)
- `lib/timeline/build.ts`: today in four parts (Night, Morning, Afternoon, Evening) plus an Anytime shelf — habits due today
  at the time the person moved them to → their reminder time → their part of the day (08:00/14:00/19:00; "anytime" on the
  shelf), length from the move → a duration target → 20 min; meals by slot (planned meals, else what was logged in the
  slot; 08:00/12:30/16:00/19:00, 30 min); last night's sleep (to the morning, across midnight) and tonight's bedtime from
  the reminders plan; a running fast and running habit/meditation timers on their own clocks; reminders at their HH:MM
  (water, wind-down, meditation time, the weekly review on its weekday, the goal check-in on its weekday); the now line;
  the Checklist's dots through the registered source; the day's-end leftovers.
- `lib/timeline/store.ts`: `zigoals:day-timeline:v1 = {version: 1, times: {'habit:<id>' | 'meal:<slot>': {time: 'HH:MM',
  minutes?: 5–600}}}`, loose, ≤ 300; only those keys move (a fast, a timer, sleep, a reminder or a Checklist dot refuses);
  15-minute snapping inside 00:00–23:45; Undo restores the earlier time. The synced habit schema is untouched (a test
  checks the habit record is byte-equal after every kind of move).
- `lib/timeline/sources.ts`: `registerTimelineSource(id, loader)` — a loader only (no imports, the shell pays nothing);
  the timeline loads registered sources when shown, one that fails is left out. `lib/timeline/checklist-source.ts` derives
  the dots with the Checklist's own `deriveDots` from its two records, read-only (never seals a day or writes a receipt);
  a dot that is a habit marks the habit's block ("on your Checklist") instead of a twin.
- **The one line in the Checklist** (recorded as asked): `components/checklist/checklist-launcher.tsx` gains
  `import {registerTimelineSource} from '../../lib/timeline/sources';` and
  `useEffect(() => registerTimelineSource('checklist', () => import('../../lib/timeline/checklist-source').then(m => m.checklistTimelineSource)), []);`
  beside its `registerNavExtra` (every device; the launcher is shell-mounted). The chunk is fetched only by the timeline.
- `/app/timeline` (`app/app/timeline/page.tsx`, title "Timeline"; `components/timeline/*`): the shared page header; tap
  **Done** = the Habits page's own smart Done with Undo (the day back exactly as it was); **Log it** = Health's own
  `logMealPlan` (no Undo: Health has none; the toast says how to remove it); **Open** for everything else; **move** by
  dragging the ⇅ handle (pointer capture, `touch-action: none`, 12 px per 15-minute step, the new time shown live), by
  keyboard on the handle (↑/↓ 15 min, Enter saves, Escape or leaving puts it back) and by **Change time** (a time picker
  with a length; "Put it back at …" clears the move) — every move works without a drag (WCAG 2.5.7). Fasts and running
  timers show "A running fast/timer keeps its own clock." and have no move control. From the wind-down time (else 20:00)
  a **Replan** card lists what is still open (habits not done or skipped, planned meals not logged): Done / Log it, Skip
  today (the habit's own skip), Later today — "Nothing moves to tomorrow by itself." A quiet day says so.
- Compact Today card (exported, not mounted): `components/timeline/today-timeline-card.tsx` — one DOM root, lazy body:
  "Now · 10:30 AM", the next three blocks (two on a phone), the door. It loads no registered source.

### 3. Stories (P9.3, H78)
- `lib/life-review/engine.ts`: `EnginePeriod = Period | 'year'`; `reviewPeriod('year', today)` = 1 January → today beside
  last year's same span (28 February for a 29th). `Period` stays `'week' | 'month'` and the Life review's stored enum is
  untouched (a test proves `zigoals:life-review:v1` still refuses a year); the Life review page is unchanged.
- `lib/stories/days.ts` (logged days, per-pillar active days, the best day; no engine import, for Today's door),
  `lib/stories/build.ts`: cards in a fixed priority — opener (n logged days + the person's **style** from their own
  strongest pillar: Rhythm keeper / Body listener / Goal mover / Steady contributor, never a comparison), streaks, best
  day, goals moved (counts and finishes), Health beside the period before, money working (contributions, accounts and
  stakes tracked — counts only), wins, closing (with the "this story changes tomorrow / grows until it ends" note). A card
  with nothing true to say is left out. Every line passes `shareSafe` (no money sign, %, price, rate, return, balance…),
  so the card and its image say the same. Under 3 logged days: one honest card.
- `lib/stories/store.ts`: `zigoals:stories:v1 = {version: 1, seen: {'week:…' | 'month:YYYY-MM' | 'year:YYYY': day}}`,
  written only when the person presses Open. `lib/stories/door.ts`: Today's door shows while the week's story is ready
  (≥ 3 logged days in 7) and no week story was opened in those 7 days.
- `/app/stories` (`app/app/stories/page.tsx`, title "Stories"): three covers (days, cards, style, opened when); the
  player (`components/stories/story-player.tsx`, a portal on `document.body` so the phone's bars never cover it): progress
  strip, tap right/left zones, Next/Previous, ←/→, Escape and ×, focus back on the cover's button; **never advances by
  itself** (no timer: nothing loops, nothing to catch); each card comes in once (400 ms slide + fade), a still under
  reduced motion / Motion Off; a **Share** on every card → `drawShareCard` → `shareOrSave` (file
  `story-<key>-<card>.png`), feedback inside the player.
- Today door (exported, not mounted): `components/stories/today-stories-card.tsx` — `useTodayStoriesCard({habits, health,
  platform, today})` (reads only `zigoals:stories:v1`) and `<TodayStoriesCard loggedDays/>`, one DOM root.

### Settings, keys
- `lib/af-extras-keys.ts` (no imports): the three keys and every registry row; `lib/af-extras-keys.test.ts` (never synced
  or restored, no sync module or Worker names them, the habit record keeps no clock time).
- `components/settings/af-extras-section.tsx` (+ `components/universe/extras-setting.css`): what each record holds on this
  device and a clear for each (Forget celebrated milestones / Put every time back / Forget opened stories), each with Undo.

### Viewing writes nothing (checked for each key)
- `zigoals:universe:v1`: written only by the person's "Lovely" on a milestone actually reached (the celebration itself,
  the full view, the Today card and the Showcase write nothing). `zigoals:day-timeline:v1`: only by a move the person makes
  (drag release, Enter on the handle, Save time, Put it back, a Replan "Later today"). `zigoals:stories:v1`: only by the
  person's Open. The Checklist's timeline source reads its two records and never seals a day (the Checklist's own hook
  does; the timeline does not use it). Each spec snapshots localStorage and sessionStorage, reloads and compares bytes.
- Not this lane's key, said for completeness: `useFasting` (read by the Universe and the Timeline, as by Today and Health)
  still applies its own 24-hour auto-stop and the legacy device-fast merge when one is due; with no such fast nothing is
  written (the specs prove it).

## Commits (on `af/extras`, base `20572134`)
| Commit | Subject |
|---|---|
| `c1ef9f1f` | TIER 3 (storage): the three extras' device keys, registry rows in `lib/af-extras-keys.ts`, never-synced guard |
| `fc3d1cb5` | Part 9.1 — My Universe (model, scene, celebration, Journey mount, Today card, universe-af.spec) |
| `1aa364cd` | Part 9.2 — Day Timeline (`/app/timeline`, the Checklist's one line, Today card, timeline-af + webkit-timeline specs) |
| `0e4c5df7` | Part 9.3 — Stories (`/app/stories`, the engine's year window, Today door, stories-af.spec) |
| `d7510c30` | Part 9 — the extras' Settings section |
| (this file) | Session AF (L5b) — lane file |

## Evidence (production build of this branch on 127.0.0.1:3104 via `rebuild.sh`, Chrome channel headless, 2 workers, locked)
- **Unit** (vitest from the repo root): new — `lib/universe/model.test.ts` 10, `lib/timeline/build.test.ts` 12,
  `lib/stories/build.test.ts` 10, `lib/af-extras-keys.test.ts` 4 (36); the whole `apps/web/lib` tree + `scripts/themes`:
  **4372 passed, 2 skipped, 1 failed** — the one failure is `build-themes.test.mjs` "the generated theme sheets are what
  the generator builds from today's CSS": this branch adds CSS and, by the README, never commits the regenerated sheets
  (the lead regenerates after the merge; locally, with the sheets regenerated, it passes). `pnpm typecheck` clean;
  `pnpm lint` 0 errors (the 19 warnings are the baseline's).
- **Browser, Chrome** (the final build, the committed code): `universe-af`, `timeline-af`, `stories-af` (26 tests, both
  projects) plus the regressions `journey`, `life-review-aa`, `today-earn-card-af`, `today-empty-copy`, `today-folds-memory`,
  `today-phone-folds`, `today-scene`, `today-screens`, `today-v2`, `aa-a11y` (axe, includes Journey), `layout-fixes-ae`,
  `header-art-ae` (Journey's header), `checklist-launcher`, `checklist` (the launcher's one line): **113 passed, 13 skipped**
  (project-specific skips), **0 failed**. Earlier runs on earlier builds found and fixed: the planet buttons under the SVG
  (now `pointer-events: none` on the scene, buttons centred by margins — a transformed button missed taps under touch
  emulation), the share sheet in headless Chrome (specs tell the browser it cannot share files, as goals-best-aa does),
  a phone drag (the phone project drives the handle with a finger's pointer events), the player under the phone's bars (a
  portal on `document.body`).
- **WebKit**: `webkit-timeline.spec.ts` ran **once** locally (WebKit set, before the owner's new rule): 2 passed (phone),
  2 skipped (desktop). Under the owner's rule (no Playwright WebKit or headed browser on this Mac) it was not run again;
  it is **left to CI's WebKit job**.
- **Captures** (headless Chrome, Showcase, nebula; scratch `$HOME/zigoals-af/L5b/cap1`, `cap2`, `cards`): the Universe at
  1440 and 390, the timeline (390: 3780 px tall after the one-row actions fix, from 4458), the Stories covers and player.
- **Today cards' heights** (mounted only for a capture on a local dev server, never committed): at 390 px **Universe
  224 px, Timeline 164 px, Stories door 131 px**; at 1440 px 280 / 228 / 186 px.
- **Weight** (gzip as `check-weight-budget.mjs` counts it, this build): `/app/journey` **442.3 kB** (26 scripts; the
  Universe is one 31.4 kB first-load chunk), `/app/timeline` **427.4 kB**, `/app/stories` **432.3 kB**, `/app` 526.8 kB
  (this lane mounts nothing on Today; the card bodies are lazy and not built until mounted), shell 402.0 kB (the timeline
  registry adds a few hundred bytes to two shared chunks; the Checklist source's chunk loads only on `/app/timeline`).
  Proposed lines for the owner-approved budgets commit (measured + 10 %, rounded up): **`/app/journey` 487000,
  `/app/timeline` 471000, `/app/stories` 476000** — re-measure on the merged build (H96).

## Assertions changed
None. No existing test or spec was edited. New specs only.

## What the lead must wire (nothing below was edited by this lane)
1. **Today** (H29, H104; the 5.8-screen phone ceiling): all three as **For you cards** — each is one DOM root and compact
   on a phone (heights above), so on a phone they wait behind "Show more" like every For you card and no ceiling moves:
   - `components/for-you/today-for-you.tsx`: `import {TodayStoriesCard, useTodayStoriesCard} from '../stories/today-stories-card';`
     `const stories = useTodayStoriesCard({habits, health, platform, today});` and
     `if (stories.state === 'shown') cards.push({id: 'stories', priority: 4.6, node: <TodayStoriesCard loggedDays={stories.loggedDays}/>});`
     (shown only while the week's story is ready and unopened);
   - `cards.push({id: 'timeline', priority: 3.5, node: <TodayTimelineCard/>})` (`components/timeline/today-timeline-card.tsx`)
     and `cards.push({id: 'universe', priority: 6.5, node: <TodayUniverseCard/>})` (`components/universe/today-universe-card.tsx`);
     both always (each has its own quiet/empty line); their bodies are lazy chunks. Priorities are suggestions.
   - If the lead prefers device cards instead: the ids `AF_EXTRAS_TODAY_CARD_IDS` (`universe`, `timeline`, `stories`) in
     `lib/today-cards/store.ts` `TODAY_CARD_IDS` with the `off` list (H29), and the frozen fixture's today-cards record.
   - Re-run `today-screens.spec.ts` (sweep the hours: Morning is the tallest Today) after mounting.
2. **Navigation** (H72: not hideable): `/app/timeline` "Timeline" and `/app/stories` "Stories" in the sidebar/More (e.g.
   `registerNavExtra([TIMELINE_ROUTE, 'Timeline', <icon>])`, or rows next to Journey/Life review); `phone-chrome.tsx`
   `MORE_NOTES` ("Today on one line", "Your week, month and year as cards") and `phoneRoute()` titles with back to Today.
   Journey stays game-gated in the nav (H77); the Universe's doors are the Today card and search.
3. **Search** `lib/search/static.ts` `PAGES`: `{id: 'page:timeline', title: 'Day timeline', href: '/app/timeline', keywords:
   ['timeline', 'day', 'schedule', 'plan', 'now', 'time', 'move', 'replan']}`, `{id: 'page:stories', title: 'Stories', href:
   '/app/stories', keywords: ['stories', 'recap', 'week', 'month', 'year', 'share', 'wrapped', 'review']}`, `{id:
   'page:universe', title: 'My universe', href: '/app/journey#universe', keywords: ['universe', 'planets', 'rings', 'moons',
   'stars', 'light', 'milestones']}`.
4. **`tests/page-titles.spec.ts` `EVERY_ROUTE`**: `['/app/timeline', 'Timeline']`, `['/app/stories', 'Stories']` (its page
   count check needs a row per page file; it is already short of the Earn, Checklist and Add-money rows on the base).
   Both titles are asserted in timeline-af/stories-af.
5. **Settings**: mount `<AfExtrasSection/>` (`components/settings/af-extras-section.tsx`) under "Your data" (or beside
   "Your pages & buttons").
6. **Storage registries** (from `lib/af-extras-keys.ts`): `lib/onboarding.ts` `DEVICE_RECORD_KEYS += AF_EXTRAS_PERSONAL_KEYS`,
   `NON_PERSONAL_KEYS += AF_EXTRAS_DISPLAY_KEYS`; `lib/export/everything.ts` `DEVICE_KEYS += AF_EXTRAS_EXPORT_KEYS`
   (`universe`, `dayTimeline`, `stories`); `lib/data-health/catalog.ts` `DEVICE_LABELS += AF_EXTRAS_CATALOG_LABELS` (areas
   Journey, Today, Life review; home device); `lib/aa-device-forget.ts` `+= AF_EXTRAS_ERASE_KEYS` (all three);
   `lib/restore/plan.ts` `NEVER_RESTORED += AF_EXTRAS_NEVER_RESTORED`; `lib/af-lead-registries.test.ts` a lane row
   `{lane: 'Extras (L5b)', personal: [...AF_EXTRAS_PERSONAL_KEYS], display: [...AF_EXTRAS_DISPLAY_KEYS], exportKeys:
   AF_EXTRAS_EXPORT_KEYS, labels: AF_EXTRAS_CATALOG_LABELS, erase: [...AF_EXTRAS_ERASE_KEYS]}`; `lib/vault/frozen-fixtures.test.ts`
   records `UNIVERSE_KEY: {version: 1, celebrated: {'universe:habits:ring:1': '2026-10-17'}}`, `DAY_TIMELINE_KEY: {version: 1,
   times: {'meal:Lunch': {time: '12:30'}}}`, `STORIES_KEY: {version: 1, seen: {'week:2026-10-11': '2026-10-17'}}` with checks
   on `./universe/store` `UNIVERSE`, `./timeline/store` `DAY_TIMELINE`, `./stories/store` `STORIES`, then
   `node scripts/frozen-readers.mjs` (ABSENT on #37–#44). The guard in `lib/af-extras-keys.test.ts` already lets that one
   test file name the keys.
7. **Help / What's new / Known limitations** (drafts): `af-universe` "My universe: one planet for each part of your life,
   growing from your own records — rings, moons and today's light. Nothing is ever taken away; a missed day leaves a faint
   ring. On Journey, with the game layer on or off. Kept on this device: only which milestones were celebrated."
   `af-timeline` "Day timeline: today on one line — habits, meals, sleep, a running fast, timers, reminders and your
   Checklist's dots. Tap to complete; drag, use the arrow keys or Change time to move a habit or a meal. Times you move stay
   on this device; your habits and reminders keep their own." `af-stories` "Stories: your week, month and year as a few
   cards from your own records, each shareable as an image made on this device, with counts only — never an amount, a
   price or a return. A story needs three logged days." Known limitations: "Timeline times stay on this device; a running
   fast or timer cannot be moved, and sleep, reminders and Checklist dots move on their own pages."
8. **Doors (optional, the lead's files)**: a "Stories →" action on the Life review header (`app/app/review/page.tsx`
   `PageHeader actions`); "Today on the timeline →" on the Habits hero.
9. **Themes**: regenerate the sheets after the merge (`node scripts/themes/build-themes.mjs`). No `ISLANDS` were added: the
   generator maps the Universe stage, the Stories player and the cards like any page (neutral dark grounds turn light in
   Light, text turns ink). If the space scene and the player should stay dark in Light, add `.universe-stage`,
   `.universe-row`, `.story-player`, `.today-stories-mark` to `ISLANDS` — a call for the parity test (L5a) and the owner.
10. **Budgets**: the three lines above.
11. **PRIVACY.md** (after **Linked wallets**): "**My Universe, Day Timeline and Stories** (Session AF, ADR-028 H76–H78):
    three device-only records — the milestones already celebrated, the times you moved on the timeline, the stories you
    opened. Everything else is derived from your records each time. Nothing is sent anywhere; share images are drawn on
    this device. In Export everything, erased with the account, never synced or restored." THREAT_MODEL: no new
    route, origin, CSP entry or dependency.

## Decisions taken (for ADR-028 rows)
- **Universe celebration in place** (H55, H77): the app's celebration look and particles, drawn inside the Universe rather
  than CelebrationHost's page-covering dialog (that host is game-gated and would cover Journey/Today in every spec that
  reaches a milestone); a milestone celebrates only if its records date it within the last 7 days, so first sight never
  celebrates the past; the Showcase celebrates nothing; only "Lovely" writes.
- **Universe counts** (thresholds above); a celebrated milestone is a floor, so a corrected record never takes a ring away.
- **What moves on the timeline**: habits and meals only (H76's keys); sleep (Health → Sleep), reminders (Settings →
  Reminders) and Checklist dots (the Checklist) say where they move; fasts and running timers never move.
- **Log it has no Undo** (Health has no un-log); the toast says how to remove the diary entry.
- **Stories never auto-advance** (H55: no timer, nothing that loops); tap-through only.
- **Stories' threshold is 3 logged days** (H78), not R7's 14/90.
- **The Checklist seam** is a loader registered from the shell-mounted launcher; its chunk loads only on the timeline.

## Open items
- `build-themes.test.mjs` fails on this branch alone until the lead regenerates the sheets (as for every lane).
- The Universe's planet labels sit close at 390 px (Wealth/Health); readable — a critique-round candidate.
- No Light/Dark capture of the final build (the session stopped during it); the parity test decides the Light mapping.
- WebKit: `webkit-timeline.spec.ts` is left to CI's WebKit job (owner's rule).
- Alt B (Focus Sessions) not built (D3: only if the lane finished early).
