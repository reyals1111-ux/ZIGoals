import {habitDay, habitRuleOn, type HabitData} from '../../habits';

/**
 * Session AK Part 8.8 (owner amendment A16): take your habits to Loop Habit Tracker (Android). Loop imports its own backup
 * database and files from Tickmate, HabitBull and Rewire — not its own CSV — so this writes a HabitBull-format CSV, the
 * one CSV Loop really reads (uhabits-core HabitBullCSVImporter: the first line starts with
 * "HabitName,HabitDescription,HabitCategory"; columns name, description, category, date YYYY-MM-DD, value, notes; a value
 * of 1 is a check, above 1 a number; docs/research/session-ak/FORMATS.md (b)). One row per day a habit was logged done or
 * counted; skipped and failed days are left out (Loop has no such state to receive). Text cells are kept plain: commas,
 * quotes and line breaks quoted; a leading = + - @ neutralised so a spreadsheet never runs it.
 */
export const HABITBULL_HEADER = 'HabitName,HabitDescription,HabitCategory,CalendarDate,Value,CommentText';
const cell = (value: string) => {
  let text = value.replace(/[\r\n]+/g, ' ').slice(0, 500);
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return /[",]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export function habitsToHabitBullCsv(data: HabitData, today: string): {csv: string; rows: number; habits: number} {
  const lines = [HABITBULL_HEADER];
  let habits = 0;
  for (const habit of data.habits) {
    let any = false;
    const dates = [...new Set(habit.entries.filter(e => e.disposition === 'logged').map(e => e.date))].sort();
    for (const date of dates) {
      const rule = habitRuleOn(habit, date); if (!rule) continue;
      const day = habitDay(habit, date, today), entry = habit.entries.find(e => e.date === date && e.disposition === 'logged');
      if (!entry) continue;
      const boolean = rule.measurement.kind === 'boolean';
      const value = boolean ? (day.status === 'complete' || entry.count > 0 ? 1 : 0) : Math.max(0, entry.count);
      if (value === 0) continue;
      lines.push([cell(habit.title), cell(habit.description ?? ''), cell(habit.category ?? ''), date, String(boolean ? 1 : Math.round(value * 1000) / 1000), cell(entry.note ?? '')].join(','));
      any = true;
    }
    if (any) habits++;
  }
  return {csv: lines.join('\n') + '\n', rows: lines.length - 1, habits};
}
/** What each target really accepts, said plainly (A16). */
export const BRIDGES = [
  {app: 'Loop Habit Tracker (Android)', what: 'Your habits and their check-ins, as a HabitBull-format CSV. In Loop: Settings → Import data.', file: true},
  {app: 'Cronometer', what: 'Cronometer has no diary import. The Health diary CSV in Export everything is for your own records or a spreadsheet.', file: false},
  {app: 'Habitify', what: 'Habitify imports no CSV files (only its own, Streaks and Productive backups), so nothing can be sent there directly.', file: false},
  {app: 'Any spreadsheet or app', what: 'Export everything gives generic CSV files (goals, habits, check-ins, the Health diary, money) and the full JSON backup.', file: false},
] as const;
