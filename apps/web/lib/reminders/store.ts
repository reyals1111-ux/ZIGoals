import {REMINDERS_KEY, emptyReminders, remindersSchema, type Reminders} from './schema';

/** What this device holds: unreadable or invalid data reads as no reminders (`unreadable` says so) and is never touched until the next save. */
export function readReminders(storage: Pick<Storage, 'getItem'>): {data: Reminders; unreadable: boolean} {
  let raw: string | null;
  try { raw = storage.getItem(REMINDERS_KEY); } catch { return {data: emptyReminders(), unreadable: true}; }
  if (raw === null) return {data: emptyReminders(), unreadable: false};
  try {
    const parsed = remindersSchema.safeParse(JSON.parse(raw));
    return parsed.success ? {data: parsed.data, unreadable: false} : {data: emptyReminders(), unreadable: true};
  } catch { return {data: emptyReminders(), unreadable: true}; }
}
/** The calendar day before a "YYYY-MM-DD" day. */
function dayBefore(day: string) { const date = new Date(`${day}T00:00:00Z`); date.setUTCDate(date.getUTCDate() - 1); return date.toISOString().slice(0, 10); }
/**
 * Applies a change and writes the result. Dismissals from before yesterday are dropped as they no longer hide anything
 * (yesterday stays: the Habit and Health journals can keep different time zones), so the key stays small. Throws, and
 * writes nothing, when the result is invalid or storage refuses it.
 */
export function updateReminders(storage: Pick<Storage, 'getItem' | 'setItem'>, today: string, change: (current: Reminders) => Reminders): Reminders {
  const next = change(readReminders(storage).data), from = dayBefore(today);
  const dismissed = Object.fromEntries(Object.entries(next.dismissed).filter(([, day]) => day >= from));
  const valid = remindersSchema.parse({...next, dismissed});
  storage.setItem(REMINDERS_KEY, JSON.stringify(valid));
  return valid;
}
/** Sets or clears one habit's time; with `habitIds`, reminders of habits no longer in the journal are dropped too. */
export function setHabitReminder(current: Reminders, habitId: string, time: string | null, habitIds?: ReadonlySet<string>): Reminders {
  const habits = habitIds ? Object.fromEntries(Object.entries(current.habits).filter(([id]) => habitIds.has(id))) : {...current.habits};
  if (time) habits[habitId] = {time}; else delete habits[habitId];
  return {...current, habits};
}
export function setWaterReminder(current: Reminders, time: string | null): Reminders {
  const next: Reminders = {...current};
  if (time) next.water = {time}; else delete next.water;
  return next;
}
export function dismissForToday(current: Reminders, id: string, day: string): Reminders {
  return {...current, dismissed: {...current.dismissed, [id]: day}};
}
