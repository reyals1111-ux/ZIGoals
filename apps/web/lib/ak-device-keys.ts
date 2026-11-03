/**
 * Session AK: this session's personal device keys, as literals in a module with no imports (the lib/aj-device-keys.ts
 * pattern), so the account erase can name them without shipping a schema; lib/ak-device-keys.test.ts proves each literal
 * equals its owner's constant. None is synced (ADR-036). Its IndexedDB databases are listed beside them.
 */
export const AK_PERSONAL_KEYS: readonly string[] = [
  'zigoals:notify:v1',
  'zigoals:music-mix:v1',
  'zigoals:auto-rules:v1',
  'zigoals:bills:v1',
  'zigoals:budgets:v1',
  'zigoals:target-allocation:v1',
  'zigoals:csv-mappings:v1',
  'zigoals:backup-reminder:v1',
  // Part 4 (lane HN): scan history, extra nutrients, the grocery list's ticks and pantry, the weekly calorie budget.
  'zigoals:food-scans:v1',
  'zigoals:nutrient-extras:v1',
  'zigoals:grocery:v1',
  'zigoals:calorie-week:v1',
  // Lane S: the last pair chosen in Health → Insights → Compare.
  'zigoals:compare-pair:v1',
  // Lanes T and X: recovery days per muscle group, food quality letter choices, the rewards shelf.
  'zigoals:muscle-recovery:v1',
  'zigoals:food-display:v1',
  'zigoals:rewards-shelf:v1',
  // Lane M: money-log rules, imported entries still to review, the financial freedom inputs, the emergency sheet.
  'zigoals:money-rules:v1',
  'zigoals:money-review:v1',
  'zigoals:fi-model:v1',
  'zigoals:emergency-sheet:v1',
  // Owner follow-up 1 (F5): the supplements and medication log.
  'zigoals:supplements:v1',
  // Owner follow-up 1 (F4): opt-in reminders a day before a governance vote ends.
  // Owner follow-up 1 (BUILD list 2 #8): experiments, one change compared with the days before.
  'zigoals:experiments:v1',
  // Owner follow-up 1 (BUILD list 2 #5): the optional Your first week card.
  'zigoals:first-week:v1',
  // Owner follow-up 1 (BUILD list 2 #3): On this day, its switch and the memories hidden from it.
  'zigoals:journal-display:v1',
  // Owner follow-up 1 (F5): the agenda view and filters.
  'zigoals:agenda:v1',
  // Owner follow-up 1 (F5): ZIGoals Wrapped, the day each year was opened.
  'zigoals:wrapped:v1',
  // Owner follow-up 1 (F5): the debt payoff planner figures.
  'zigoals:debt-planner:v1',
  // Owner follow-up 1 (F5): savings challenges on goals.
  'zigoals:savings-challenges:v1',
  // Owner follow-up 1 (F5): net-worth milestones.
  'zigoals:networth-milestones:v1',
  // Owner follow-up 2 (B): notes, daily notes and the capture inbox.
  'zigoals:notes:v1',
  // Owner follow-up 2 (T2): calendars imported from .ics files (read-only events).
  'zigoals:calendar-import:v1',
  // Owner follow-up 2 (N2, N12): NOVA layout, widgets, quick access, persona and panels.
  'zigoals:nova:v1',
  // Owner follow-up 2 (N1): which chats started in NOVA and which turns were delegated (no message text).
  'zigoals:nova-bridge:v1',
  // Owner follow-up 2 (N6): NOVA briefs composed on the device.
  'zigoals:nova-briefs:v1',
  // Owner follow-up 2 (N6): NOVA custom workflows (names, instructions, steps; no records).
  'zigoals:nova-workflows:v1',
  // Owner follow-up 2 (N3): the setup guide progress and the privacy mode.
  'zigoals:nova-setup:v1',
  // Owner follow-up 3 (N11): the Hermes Agent connection and guide progress (the key stays in the key store).
  'zigoals:nova-hermes:v1',
  // Owner follow-up 2 (G1 #4): Your numbers (TIER 3 stored format, additive).
  'zigoals:health-numbers:v1',
  // Owner follow-up 2 (G1 #12): your own 1-5 scales.
  'zigoals:scales:v1',
  // Owner follow-up 2 (G1 #16): the cycle log, off by default; Health-describing.
  'zigoals:cycle:v1',
  // Owner follow-up 2 (G1 #15): the Pomodoro bell and breaks.
  'zigoals:focus-rounds:v1',
  // Owner follow-up 2 (G1 #21): Was this useful? under ZIGi notes.
  'zigoals:insight-feedback:v1',
  'zigoals:gov-reminders:v1',
];
/** The account erase removes them all. */
export const AK_ERASE_KEYS: readonly string[] = AK_PERSONAL_KEYS;
/** This session's device-only databases: the notification snapshot and identity, the queue of notification taps, and the
 * offline generic food library (public data, a cache), the person's own Spotify client id (device-only, never exported),
 * the offline queue, the meal photos the person chose to keep (exported as files), and the Lichess token (never exported). */
export const AK_DATABASES: readonly string[] = ['zigoals-notify-v1', 'zigoals-notify-actions-v1', 'zigoals-food-generic-v1', 'zigoals-music-byo-v1', 'zigoals-offline-queue-v1', 'zigoals-meal-photos-v1', 'zigoals-lichess-v1', 'zigoals-notes-photos-v1', 'zigoals-money-photos-v1'];
