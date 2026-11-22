# Session AV lane 2 — fixb3: batch 3's failing browser specs

Branch `lane2/fixb3` from `lane2/batch3` (9919f390). Run against the production build of lane2/batch3 at ed2a00d6 on
:3101, through the shared browser lock, desktop and mobile projects, all three themes (6 runs per spec).

All 12 failing specs are fixed. 10 of them were wrong in the spec only. 2 also found an app bug, now fixed with a unit test.
The build on :3101 does not have the two CSS fixes, so those two specs were checked with the new CSS appended to the
served stylesheets through a temporary `page.route` (not committed). They need the lead's rebuild, and the theme sheets
regenerated for notes.css, before they pass as committed.

| spec | cause | fix | commit | verified on :3101 |
|---|---|---|---|---|
| av2-circuits | spec: `Rounds` also matched "Rest between rounds" (strict mode) | `exact: true` | dea8ac13 | 6 of 6 |
| av2-library-filters | spec: the running tip's own "In het Nederlands" sits in the same region | scoped to `.av2-routines` | dea8ac13 | 6 of 6 |
| av2-water-day | spec: a `<label>` around a `<select>` takes its options' words, so `getByLabel('Drink', {exact})` never matched | `getByRole('combobox', {name: 'Drink', exact: true})` | dea8ac13 | 6 of 6 |
| av2-habit-words-trend | spec: "Consistency & trends" is behind the card's Details. **App bug**: the Trend per habit card's `.sr-only` sentences (position: absolute) took their place from the page, so the phone's swipe row (overflow-x: auto) did not clip them. Habits was 697 px wide at 390, the 320 check failed by 254 px, and a phone zoomed out so clicks missed. On a phone the card was also squeezed to 34 px | spec: `openHabitDetails` first. App: `.habit-trend-list { position: relative }` and the phone row's `flex: 0 0 88%` like its neighbours (habit-r3.css). Unit test `lib/habits-v2/fixb3-trend-card.test.ts` | 9b6f8ff3 | 6 of 6 with the new CSS injected; **needs the lead's rebuild** |
| av2-money-left-month | spec: `getByLabel('On')` also matched "Category — optional" | `exact: true` | e4869514 | 6 of 6 |
| av2-money-credit-card | spec: React writes a bare `data-private-amount` as `"true"`, not `""` (the stylesheet keys on its presence). On a phone "Accounts, debts & net worth" starts folded | the attribute is checked to be there, and the line to blur (`filter: blur(7px)`) with Hide amounts and clear with Show amounts (stricter). The phone opens the fold first, as av2-money-debts does | e4869514 | 6 of 6 |
| av2-money-networth-movers (mobile) | spec: a phone with fewer than two assets keeps "Your wealth over time" inside "More about your wealth" | on a phone, open that row first | e4869514 | 6 of 6 |
| av2-notes-ticks | spec: the Open tick boxes box leaves the list as soon as it is ticked, so `check()` waited for a box that was gone. **App bug** (found once it ran on): a ==yellow== highlight in Dark was 3.97:1 (`#a4b2cd` on `#584c25`, axe serious) | spec: `click()`. The next lines still check that it left the list, focus went to the heading and the note reads `- [x]`. App: `.note-hl` text uses `var(--text, currentColor)`, 7.7:1 in Dark (notes.css). Unit test `lib/notes/fixb3-highlight.test.ts` | 49c2c811 | Nebula and Light 4 of 4 as built; Dark 2 of 2 with the new rule injected; **needs the lead's rebuild and regenerated theme sheets** |
| av2-notes-canvas | spec: `getByLabel('Join to')` also matched the form "Join to another card" | `getByRole('combobox', {name: 'Join to', exact: true})` | bd058f67 | 6 of 6 |
| av2-notes-props | spec: `getByLabel('Value')` also matched the Which list's "has a value". The table starts sorted by Last changed, and the idea was changed just before (its property), so it is first | combobox named exactly Value; expected order `['Fictional idea', 'Fictional trip']` (the same two notes) | bd058f67 | 6 of 6 |
| av2-journal-letter | spec: `seedDevice` installs its own clock at Nov 14, so the letter's day (Nov 22) was not today. Three good things has its own `.journal-status` | `clock.setSystemTime` to Nov 22 after seeding; `.journal-status:not(#good-things .journal-status)` | bd058f67 | 6 of 6 |
| av2-reading-font (desktop) | spec: on a computer, Settings starts with every group folded | `openAllSettingsGroups` after each visit to Settings | f2912775 | 6 of 6 |

Every changed line is labelled `// Session AV lane 2 (fixb3: <why>, deliberate)`. No assertion was weakened or removed.

## For the lead
- Rebuild, then run `av2-habit-words-trend` and `av2-notes-ticks` (Dark) as committed.
- CSS changed: `apps/web/components/habits/habit-r3.css` and `apps/web/components/notes/notes.css`. Regenerate the theme
  sheets: `public/themes/*.css` copy `.note-hl`'s `color: inherit` today.
- No stored-format changes, no shared files edited, nothing added to Today.
- Note for future specs: `seedDevice` (tests/ap/ap-money-fixtures.ts) installs its own clock at 2026-11-14. A spec that
  needs another day sets it after seeding.
