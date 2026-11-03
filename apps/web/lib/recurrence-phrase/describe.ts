import {addLocalDays} from '../local-date';
import {formatClock, formatDate, formatWeekday} from '../visual-format';
import type {HabitSchedule, PartOfDay, PhraseResult} from './parse';

/**
 * Session AK (item 21): the chips shown under the phrase box before anything is saved, one per thing understood. Weekday
 * and date words go through lib/visual-format.ts like every date the app shows (2024-01-07 is a Sunday: day n is n days later).
 */
const SUNDAY = '2024-01-07';
export const weekdayName = (day: number) => formatWeekday(`${addLocalDays(SUNDAY, day)}T12:00:00Z`, {timeZone: 'UTC'});
const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const join = (words: string[]) => words.length <= 1 ? words.join('') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
export function describeSchedule(s: HabitSchedule): string {
  switch (s.kind) {
    case 'daily': return 'Every day';
    case 'weekdays': {
      const key = [...s.days].sort((a, b) => a - b).join();
      if (key === '1,2,3,4,5') return `Weekdays (${weekdayName(1)} to ${weekdayName(5)})`;
      if (key === '0,6') return `Weekends (${weekdayName(6)} and ${weekdayName(0)})`;
      if (key === '0,1,2,3,4,5,6') return 'Every day of the week';
      // Monday first, the habit form's order.
      return `Every ${join([...s.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map(weekdayName))}`;
    }
    case 'interval': return s.every % 7 === 0 ? `Every ${s.every === 14 ? 'other week' : `${s.every / 7} weeks`}, from ${formatDate(`${s.anchor}T12:00:00Z`, {weekday: true, timeZone: 'UTC'})}` : `Every ${s.every === 2 ? 'other day' : `${s.every} days`}, from ${formatDate(`${s.anchor}T12:00:00Z`, {weekday: true, timeZone: 'UTC'})}`;
    case 'frequency': return `${s.times === 1 ? 'Once' : s.times === 2 ? 'Twice' : `${s.times} times`} a ${s.period}`;
    case 'month-dates': return `On the ${join(s.days.map(ordinal))} of the month`;
  }
}
const PART_WORDS: Record<PartOfDay, string> = {morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening'};
export type PhraseChip = {kind: 'schedule' | 'time' | 'part'; text: string};
/** What was understood, in order: the schedule, the reminder time, the part of the day. Nothing when there is a problem. */
export function phraseChips(r: PhraseResult): PhraseChip[] {
  if (r.problem) return [];
  return [
    ...(r.schedule ? [{kind: 'schedule' as const, text: describeSchedule(r.schedule)}] : []),
    ...(r.time ? [{kind: 'time' as const, text: `Reminder at ${formatClock(r.time)}`}] : []),
    ...(r.partOfDay ? [{kind: 'part' as const, text: PART_WORDS[r.partOfDay]}] : []),
  ];
}
