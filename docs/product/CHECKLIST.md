# The Checklist (Session AF, Part 7; ADR-028)

Today's path of starred dots, at `/app/checklist`. Owner requests P7.1–P7.24 (`docs/product/OWNER_REQUESTS_AF.md`).

## What it is
- **Favourites.** A star (`StarToggle`) on every habit card, private Goal card (its next open step), Goal milestone, Water,
  familiar food or supplement, diary meal, the weight journal, sleep, meditation and fasting. Outlined: not on the path;
  filled with the item's own colour: on the path. Instant, with Undo in the toast. Custom items ("Play piano 15 minutes")
  are added in Edit path and can become a habit ("Make this a habit": a daily habit on Habits, same place on the path).
- **The path.** The shared path engine (`lib/path`, `components/path`): large glowing dots in their page's colour (Habits
  cyan, Goals purple, Health pink, water blue, sleep magenta, meditation teal, fasting gold, custom items the person's
  colour), joined by the footer banner's neon line, grouped in orbits (Morning, Afternoon, Evening, Anytime, or the
  person's own) with banners; chests half way and at the end; ZIGi beside the next dot; a "Jump to next" bubble.
- **Ticking.** Any dot, in any order. The real record is written through each page's own functions: a habit check-in
  (Habits' Complete / Add), a goal step (the milestone's own tick), water, a diary entry, a weight (an upsert for the day),
  a night (start, then end), mindful minutes, a fast (start, then stop, with the linked habit's time as Health adds it).
  Undo reverses exactly that write. A dot's state is always derived from the record: a habit ticked on Habits lights its
  dot; an entry removed on Health puts it out.
- **Values.** Water, weight, mindful minutes and count or duration habits open an inline stepper with the item's default,
  and the path remembers the last value logged.
- **Streaks, fairly.** A day counts when every counted dot is done, whatever the hour. Rest days (not scheduled, paused,
  skipped, planned) are left out, never failed. "Perfect orbit" when every dot was ticked here in path order; a dot done
  on its own page has no order, and that is never a penalty. The game layer's streak freezes mend a missed day.
- **The day.** Local midnight in the journal time zone (else the device's); the app has no day-start hour (ADR-028 H66).
  Each page still writes to its own day; a dot says when that differs. The first read on a new day seals the previous
  one into the history (counts only), and days never opened are sealed from the records for up to two weeks.
- **Timers.** Sleep, Meditate, Fast and Focus (when a timed habit is on the path), always in reach: one tap starts the
  page's own timer, the next ends it, and the record lands on its page.
- **Two views.** Path (default) and List (compact pills with an accent colour from the palette).
- **Feedback.** A soft bell only when sounds are on (off by default) and outside the quiet hours; a short vibration only
  where the device has one (iOS Safari has none, and Options says so).
- **Nudges.** At most three gentle lines a day on Today's Checklist card (10:00, 15:00, 19:00), never in the quiet hours,
  in the app only. No notification, nothing sent.
- **The launcher.** ZIGi's and the music button's twin, between Music and ZIGi on a computer; tucked into the edge with its
  arrow; switched off per device in Settings. Phones have no third floating button: More, Today's card and the Home Screen
  shortcut (`/app/checklist` in the manifest) lead to it (ADR-028 H68).
- **Themes.** Nebula: the star sky with a slow mist (the page's one loop, owner-approved); Light: white with a very light
  colour mist; Dark: black with a subtle mist. Dots, lines, banners, chests and timers are the same colours in all three.
- **Motion.** One-time: a dot fills and bursts once, its line lights once, a chest opens once, ZIGi's move plays once per
  state. Under reduced motion and Motion Off every state is a still.

## Storage (device only in Session AF)
- `zigoals:checklist:v1` — favourites (pointers to records, never the records), custom items, Health quick inputs (kept
  apart), orbits, order, each item's default and last value. Loose and versioned.
- `zigoals:checklist-days:v1` — the day history (counts and the Perfect-orbit flag) and today's tick receipts and custom
  ticks. Loose and versioned.
- `zigoals:ui-prefs:v1`, group `checklist` — the launcher switch and fold, the view, the accent, sounds, vibration, nudges.
- Never synced in Session AF (a guard test); shaped as an extras-sync section `checklist` so a later session can carry
  them: `healthItems` and today's receipts (which name Health entries) must stay device fields inside the Health consent.

## Wearables
None yet. **The List view is the watch-sized layout**: one 44 px row per dot, a round check, the label and its value. A
future watch or wearable app starts from it and from the same derived dots (`lib/checklist/derive.ts`) and plans
(`lib/checklist/adapters.ts`), so a tick on the wrist writes the same records with the same Undo.

## For ZIGi (the ZIGi lane wires these)
`lib/checklist/commands.ts`: `checklistSummary` and `findItemByName` for a read tool; `checklistDeviceWrite` and
`checklistDaysDeviceWrite` for `registerDeviceWrite` (add a custom item, take one off, tick a custom item); the live surface
`checklistCommands()` (`tick`, `addFavourite`, `addCustom`, `startTimer`, `summary`) while the Checklist is open.
Record-backed dots are ticked by ZIGi's existing kinds (check-in, log-water, start-night…), which write the same records.

## Known limitations
- The Checklist stays on this device: favourites, custom items and the day history are not synced yet; a second device
  starts with an empty path, and its XP from Checklist days is lower until a later sync carries the history.
- Undo of an ended night reopens it as a new running night with the original start (no function reopens a night).
- A finished Focus timer is changed on Habits (its receipt is part of the habit's record), so that toast has no Undo.
