# ZIGi can do everything (Session Z-Local Part 5): every action in the app and its ZIGi path

Every action a person can take in the app, and how ZIGi reaches it: an existing card kind, a new kind added in this
session, a navigation intent, or a deliberate, explained "no". Rules the owner set (ADR-020): money signing is a
pre-filled form only, never automatic; a deletion is a card that opens the app's own confirmation; auto-accept never
covers money, weight, fasting or deletions. Every new kind goes through the same path as the forms (the store's own
mutator, Undo through the same path, the whitelist schema, the generic proposal card). Effects only the runner can
perform (open a page, open a delete confirmation, write ZIGi's own device record) are specified for Z-Cloud's
`use-proposals.ts` in `docs/handoff/Z_LOCAL_TO_CLOUD.md` (decision L8); until they land, the card renders and its Add
shows the route to take. Evidence labels as docs/STATUS.md; the tests named are unit (`lib/ai/actions/*.test.ts`) and
browser (`tests/zigi-accept-correct.spec.ts`, `tests/zigi-act.spec.ts`).

Legend: **existing** = a kind from Sessions V–Y; **new** = added in Part 5; **AA** = added in Session AA-Local Part 5 (ADR-022 B37–B39; device-record kinds have no Undo card, the page's own control sets the value back); **nav** = `open-page`; **no** = refused with
the reason in the reply; **form** = a pre-filled form the person submits; **effect** = needs the runner (Z-Cloud).


**When there is nothing to change (ADR-020 L50).** A card the app would refuse is not a proposal: when the records show no fast running to stop, a goal to reopen that is already active, or a unit, target, bell or look already set as asked, ZIGi says so in one line and sends no card. A second log entry for a day is different: that card still comes, with a line on what the records already hold.

## Today
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| Add a widget (habit, goal, health, wealth, chess, links, music…) | existing | `add-widget` | yes | accept-correct |
| Remove a widget | new, a card that opens Today's own remove confirmation (effect) | `delete-record` what=widget | never | plan.test |
| Reorder the dashboard, move an item between columns | no: a drag in Layout edit; ZIGi opens Layout edit | `open-page` page=today view=layout | — | plan.test |
| Apply a Today preset (balanced, habits-health, wealth…) | new | `set-today-preset` | yes | accept-correct |
| My links: add | existing | `add-link` | yes (https only; icon only for a matching host, F9) | accept-correct |
| My links: rename, change the address or icon | new | `edit-link` | yes | accept-correct |
| My links: remove | new (effect) | `delete-record` what=link | never | plan.test |
| Weekly intention | existing | `review-intention` | yes | accept-correct |
| Weekly review: skip this week | new | `skip-review` | yes | accept-correct |
| Weekly review: change its weekday | new | `set-review-weekday` | yes | accept-correct |
| Evening wrap-up: the mood | existing | `log-mood` | Health gate | accept-correct |
| Evening wrap-up: on/off and its time | new | `set-wrap-up` | yes | accept-correct |
| Remember this (What ZIGi knows about me) | existing | `remember` | yes | accept-correct |
| Forget a note | new (effect) | `delete-record` what=note | never | plan.test |
| What's new, Help, Quick add | nav | `open-page` | — | plan.test |
| Journal day boundary / time zone | no: the day boundary changes what every record means (owner decision Y10) | — | — | — |

## Goals
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| Create a goal (value, quantity, reward, project) | existing | `create-goal`, `plan-goal` | yes | accept-correct |
| Edit name, target, date, notes, category | existing | `edit-goal` | yes | accept-correct |
| Add a note, a milestone | existing | `add-goal-note`, `add-milestone` | yes | accept-correct |
| Tick a milestone as reached | no: milestones' ticks are Goals' own (ADR-017 S22) | — | — | — |
| Close a goal | new | `close-goal` | yes | accept-correct |
| Reopen a goal | new | `reopen-goal` | yes | accept-correct |
| Delete a goal | new (effect: Goals' own confirmation) | `delete-record` what=goal | never | plan.test |
| Lock / unlock | no: a security control | — | — | — |
| Fund, contribute, allocate, change the plan | form only (money): a pre-filled contribution form | `prefill-contribution` (effect: the page reads the stash) | never | plan.test |
| Weekly check-in reminder | existing | `create-reminder` for=goal | yes | accept-correct |
| Open a goal's page | nav | `open-page` page=goals record=g1 | — | plan.test |

## Habits
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| Check in, partial, skip, counts and minutes | existing | `check-in`, `skip`, `counter` | yes | accept-correct |
| Undo a planned skip | new | `unskip` | yes | accept-correct |
| Create, edit, stack, challenge | existing | `create-habit`, `build-habit`, `edit-habit`, `stack-habit`, `start-challenge` | yes | accept-correct |
| Pause, resume, archive, unarchive | new | `set-habit-state` | yes | accept-correct |
| Delete a habit | new (effect: Habits' own confirmation) | `delete-record` what=habit | never | plan.test |
| Vacation days (mark, clear) | new | `vacation` | yes | accept-correct |
| A reminder; turn a reminder off | existing; new | `create-reminder`, `remove-reminder` | yes | accept-correct |
| The habit timer: start; finish and log today's check-in (Session AA-Local H2) | AA | `start-timer`, `stop-timer` | yes (a finish logs what the clock measured) | accept-correct |
| Link a habit to a goal or a Health figure | no: the editor's own form (the link changes how check-ins are counted) | — | — | — |
| End a challenge early | no: a challenge ends by its date; "keep going" is the card the page offers | — | — | — |

| Move a habit to the morning, afternoon, evening or any time (AA-Local H1) | AA | `set-time-of-day` | yes | accept-correct |
| Skip today with a reason; a note and mood on a check-in (AA-Local H4) | existing kinds, new fields | `skip` reason, `check-in` note/mood | yes | accept-correct |
| Start a routine (AA-Local H5) | AA (effect: opens the routine player) | `start-routine` | never | plan-aa.test |
| A habit's life area (AA-Local H6, AA-Cloud's one list) | AA (device record `zigoals:habit-extras:v1`) | `set-habit-area` | yes | plan-aa.test |
| The cost per day of a quit habit (money saved, AA-Local H3) | AA (device record) | `set-quit-cost` | never | plan-aa.test |
| Use an earned streak freeze (AA-Local H7) | AA (a "Streak freeze" skipped entry) | `use-freeze` | yes | plan-aa.test |
| The year view, the routines list | nav | `open-page` page=habits view=year/routines | — | golden-spoken |

## Goals, Wealth, search and the Life review (AA-Cloud's features, wired by AA-Local at the merge)
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| A goal's life area (AA-Cloud G1, the balance wheel) | AA (device record `zigoals:goal-extras:v1`) | `set-goal-area` | yes | plan-aa-cloud.test, zigi-aa |
| A goal's why, obstacle and if-then plan (AA-Cloud G2) | AA (device record) | `set-goal-plan` | yes | plan-aa-cloud.test |
| A sub-goal in the goal tree (AA-Cloud G5) | AA (device record) | `set-sub-goal` | yes | plan-aa-cloud.test |
| A goal from the template library (AA-Cloud G7) | composite: becomes `create-goal` or `create-average-goal`; a weight template opens Health | `goal-from-template` | as the card it becomes | golden |
| An average goal; a logged value (AA-Cloud G8) | AA (device record `zigoals:average-goals:v1`) | `create-average-goal`, `log-average` | yes | plan-aa-cloud.test, zigi-aa |
| The compound interest calculator with figures (AA-Cloud Part 3) | AA (device record `zigoals:calculator:v1`, then the page; results labelled an estimate) | `calculator-scenario` | never | plan-aa-cloud.test |
| Search with a query (AA-Cloud Part 4) | nav (`/app?search=…` opens the palette) | `open-search` | never | plan-aa-cloud.test |
| The Life review on a week or a month (AA-Cloud Part 5) | AA (device record `zigoals:life-review:v1`, then the page) | `open-review`; `open-page` page=review view=week/month | never | plan-aa-cloud.test |
| The calculator, templates, Your data, Share pages | nav | `open-page` page=wealth view=calculator; page=goals view=templates; page=settings view=data; page=share | — | golden |


## Health
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| Water, weight, steps, a food, a measurement, a counter | existing | `log-water`, `log-weight`, `log-steps`, `log-food`, `log-measurement`, `counter` | Health gate; weight never | accept-correct |
| Edit a diary entry (meal, quantity, day) | new | `edit-diary-entry` | Health gate | accept-correct |
| Remove a water, weight or diary entry; a food or recipe | new (effect: the page's own remove) | `delete-record` what=water-entry/weight/diary-entry/food/recipe | never | plan.test |
| New food, recipe; a planned meal; groceries | existing | `create-food`, `create-recipe`, `plan-meal`, `grocery-item` | Health gate | accept-correct |
| Log a planned meal as eaten; remove a plan | new; new (effect) | `log-meal-plan`; `delete-record` what=meal-plan | Health gate; never | accept-correct |
| Grocery notes | new | `grocery-notes` | Health gate | accept-correct |
| Favourite a food or recipe | new | `set-favorite` | Health gate | accept-correct |
| A saved (reusable) meal from the diary | no: the diary's own "Save a reusable meal" (it copies items by id) | nav `open-page` page=health | — | — |
| Counters: create, rename or re-unit, delete | new; new; new (effect) | `create-counter`, `edit-counter`, `delete-record` what=counter | Health gate; never | accept-correct |
| Targets: kcal, protein, carbs, fat, weight, steps, water, sleep, mindful minutes a week | new | `set-target` | Health gate | accept-correct |
| Preferences: water unit, weight unit | new | `set-health-preference` | Health gate | accept-correct |
| Fasting: start, stop | existing | `start-fast`, `stop-fast` | never | accept-correct |
| Remove a fast | new (effect) | `delete-record` what=fast | never | plan.test |
| Sleep: a night or nap | existing | `log-sleep` | Health gate | accept-correct |
| Sleep: "I'm going to bed" / "I'm up" (the running night) | new | `start-night`, `end-night` | Health gate | accept-correct |
| Sleep goal | new | `set-target` area=sleep | Health gate | accept-correct |
| Delete a night | new (effect) | `delete-record` what=night | never | plan.test |
| Meditation: mindful minutes | existing | `log-meditation` | Health gate | accept-correct |
| Meditation: the timer, the breathing visual | nav: the timer is the page's own | `open-page` page=health view=meditation | — | plan.test |
| Meditation: weekly goal, the bell | new | `set-target` area=meditation, `set-bells` | Health gate | accept-correct |
| Delete a session | new (effect) | `delete-record` what=session | never | plan.test |
| Devices, imports, Open Food Facts barcode, CSV export | no: files, Bluetooth and downloads are the page's own | nav `open-page` view=devices/imports | — | — |

| A micronutrient target (fiber, sugar, saturated fat, sodium, potassium, calcium, iron; AA-Local N4) | AA (device record `zigoals:micro-targets:v1`) | `set-micro-target` | Health gate | plan-aa.test |
| The macro view: net carbs, keto, a custom split (AA-Local N7; display only) | AA (device record `zigoals:macro-mode:v1`) | `set-macro-mode` | Health gate | plan-aa.test |
| The weekly coach check-in: keep or adjust (AA-Local N3) | AA (device record `zigoals:health-coach:v1`; "adjust" writes `targets.kcal` through the existing mutator) | `coach-answer` | Health gate | plan-aa.test |
| Import a pasted recipe (AA-Local N6) | AA (the paste parser → a recipe and its unknown-nutrition foods) | `import-recipe` | never | accept-correct |
| Import a recipe from a web address | no: the Health page's own Import view (the server reads the page; ZIGi never fetches) | nav `open-page` page=health view=import | — | — |
| The meal planner, the insight cards, the Import view | nav | `open-page` page=health view=planner/insights/import | — | golden-spoken |

## Wealth, Portfolio, Markets, Staking (forms only)
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| Add a holding | form | `prefill-holding` | never | your-ai.spec |
| An account's or debt's balance | form | `update-account-balance` | never | your-ai.spec |
| Add an account or a debt | form (effect: the page reads the stash) | `prefill-account` | never | plan.test |
| Edit a holding | nav: the asset's own editor | `open-page` page=wealth record=asset | — | plan.test |
| Allocate, contribute, stake, unstake, claim, sign, swap, move money | no (never automatic; the pre-fills above are the only money-adjacent cards) | — | — | corpus refusals |
| Watchlist, markets, staking, portfolio | nav; lookups | `open-page`, the read-only tools | — | plan.test |

## Settings (the safe toggles)
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| Your pages & buttons: show or hide a page or button | new | `set-page-visibility` | yes | accept-correct |
| The start page | new | `set-start-page` | yes | accept-correct |
| ZIGi's look and feel (skin, animation, side, size, greeting, edge tab) and the knock | new, brain side; the write is ZIGi's own device record (effect) | `set-zigi-look` | yes | plan.test |
| Auto-accept switches | no: the switches decide what ZIGi may add by itself; ZIGi never widens its own permission | — | — | — |
| Account, sync, keys, provider, model, Health sharing, export, import, delete | no: security and consent controls stay the person's own taps | — | — | — |
| Time zone, chess settings, Load Showcase | no | — | — | — |

## The game layer and the pages that came with it (Session AA-Local)
| Action | ZIGi path | Kind | Auto-accept | Test |
|---|---|---|---|---|
| Turn the game layer on or off (ADR-022 B2) | AA (device record `zigoals:game:v1`) | `set-game-layer` | yes | zigi-aa.spec |
| The Journey page (level, quests, badges, the path) | nav | `open-page` page=journey | — | golden-spoken |
| The reminders plan (every type, quiet hours) | nav | `open-page` page=settings view=reminders | — | golden-spoken |
| XP, a level, a quest or a badge by hand | no: XP is derived from the journals, never stored (B17); a quest is proven from the records | — | — | — |

## Navigation (`open-page`, device-side and from the model)
"Open my sleep page", "show my portfolio", "ga naar mijn gewoontes": the lookup engine recognises the page, the Health view
(sleep, meditation, devices, imports), the Wealth pages (portfolio, markets, staking), Settings' ZIGi section, Help, Layout
edit, and a habit, goal or asset by its handle; since Session AA-Local also the Journey page, Habits' year view and routines, Health's planner, insights and Import views and Settings' reminders plan, in English and Dutch; the card's Add opens it (effect). Without the effect, the card shows the
route in words. Pages the person hid in "Your pages & buttons" are refused with the reason.

## What stays a "no", in one list
Milestone ticks; money moves of every kind beyond a pre-filled form; lock/unlock; account, sync, keys, consent; the
journal day boundary; files, Bluetooth, downloads; a saved meal from diary items; the auto-accept switches; ending a
challenge early; dashboard drags. Each answer names the page and control to use.
