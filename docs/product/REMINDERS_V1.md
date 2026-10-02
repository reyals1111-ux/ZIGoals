# Reminders v1: in-app, on this device (Session I, Part 8)

## What it is
- A habit, and the Water journal, can have a **reminder time**. The field is "Reminder time — on this device", in the
  habit editor and under Water on Health. It is optional, on a 24-hour clock; leaving it empty means no reminder.
- Once the device's own clock passes that time, **Today shows a reminder card**, only while all of these hold:
  - the habit is scheduled that day, by the habit journal's day;
  - it is not done yet (for water: nothing is logged, or the day is below the personal target);
  - the card has not been dismissed for today.
- A card offers **Open habit** (`/app/habits#habit-<id>`) or **Open water journal** (`/app/health#water`), and
  **Dismiss for today**. It returns the next day if still due.
- There are no notifications, no permission prompts and no service worker. A reminder shows only while ZIGoals is open.

## Storage
- **Key:** `zigoals:reminders:v1` through `getAppStorage()`. It is per account, and in Showcase it lives in the tab's
  session storage.
- **Shape:** `{version:1, habits:{[habitId]:{time:"HH:MM"}}, water?:{time}, dismissed:{[id]:"YYYY-MM-DD"}}`.
  - Validated with zod (`lib/reminders/schema.ts`); at most 200 habit reminders.
  - Dismissals older than yesterday are pruned on save.
  - Reminders of habits that no longer exist are dropped when one is set.
- **Written only** when someone sets or clears a time, or dismisses a card. Viewing a page writes nothing.
- **Unreadable data** reads as "no reminders" and is left untouched until the next save.
- **Not synced and not in any backup.** A habit's backup never carries its reminder time.

## Time
- Reminder times follow the device's local clock (the time zone the device is set to).
- The habit's day follows the habit journal, and water's day follows the Health journal.
- The UTC funding schedule (QA-04) is not involved.

## Rollback
- Revert the Part 8b commit. Older builds ignore the key, and the key is harmless if left behind.

## Tests
- `apps/web/lib/reminders/reminders.test.ts` covers the schema, store and due logic.
- `apps/web/tests/reminders.spec.ts` covers, on desktop and mobile:
  - the card appears after the time and stays dismissed for today;
  - a done habit has no card;
  - the editor shows and clears the time;
  - water;
  - nothing is written on view, and no backup carries a reminder.
