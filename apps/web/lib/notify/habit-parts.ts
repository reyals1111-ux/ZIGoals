import {habitDay, type HabitData} from '../habits';
import {addLocalDays} from '../local-date';
import {notifyPrefsSchema, type NotifyPrefs} from './prefs';

/**
 * Session AV lane 2 (r5-body; Productive's reminders for each part of the day; LEDGER #369; TIER 3 (PWA)): one reminder at
 * the start of the morning, the afternoon and the evening, saying how many of that part's habits are still open (their
 * names only where names are allowed, never a Health-linked habit's), in place of one reminder per habit for the habits in
 * a part. Anytime habits are in no part and keep their own reminders. Opt-in; quiet hours as every reminder. Pure.
 */
export const HABIT_PARTS = ['morning', 'afternoon', 'evening'] as const;
export type HabitPart = (typeof HABIT_PARTS)[number];
export const PART_DEFAULTS: Record<HabitPart, string> = {morning: '08:30', afternoon: '12:30', evening: '18:00'};
export const PART_WORDS: Record<HabitPart, string> = {morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening'};
export const habitPartsOn = (p: NotifyPrefs) => p.habitParts?.on === true;
export const partTime = (p: NotifyPrefs, part: HabitPart) => p.habitParts?.[part] ?? PART_DEFAULTS[part];
export function setHabitParts(p: NotifyPrefs, change: Partial<{on: boolean} & Record<HabitPart, string>>): NotifyPrefs {
  const was = p.habitParts ?? {on: false};
  return notifyPrefsSchema.parse({...p, habitParts: {...was, ...change}, ...(change.on ? {types: {...p.types, habits: true}} : {})});
}
export type HabitPartsInput = {
  parts: {part: HabitPart; time: string; days: {date: string; open: number; detail: string; names?: string[]}[]}[];
  /** The habits whose own reminders the part reminders stand in for. */
  covered: string[];
};
/**
 * For today and the next two days: each part's habits still open (today: due and not done; a later day: scheduled, not a
 * planned skip). `linked` is the set of Health-linked habits (null when unreadable: no names at all).
 */
export function habitPartsInput(data: HabitData, today: string, prefs: NotifyPrefs, linked: ReadonlySet<string> | null): HabitPartsInput | undefined {
  if (!habitPartsOn(prefs)) return undefined;
  const dates = [today, addLocalDays(today, 1), addLocalDays(today, 2)], covered = new Set<string>();
  const parts = HABIT_PARTS.map(part => {
    const mine = data.habits.filter(h => h.timeOfDay === part);
    for (const h of mine) covered.add(h.id);
    return {part, time: partTime(prefs, part), days: dates.map(date => {
      const open = mine.filter(h => { const s = habitDay(h, date, date).status; return s === 'due' || s === 'partial'; });
      const named = linked !== null && open.every(h => !linked.has(h.id));
      return {date, open: open.length, detail: partLine(part, open.length), ...(named && open.length ? {names: open.map(h => h.title)} : {})};
    })};
  });
  return {parts, covered: [...covered]};
}
/** The line a part's notification carries: "Morning: 3 habits still open". */
export const partLine = (part: HabitPart, open: number) => `${PART_WORDS[part]}: ${open} ${open === 1 ? 'habit' : 'habits'} still open`;
