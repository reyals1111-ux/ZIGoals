import {needOn, type DayGoal} from '../../checklist/day-goal-core';
import {countdownWords, daysUntil, splitCountdowns, type Countdowns} from '../../countdowns/schema';
import {dayEndLabel, type DayEnds} from '../../day-boundary';
import type {Habit} from '../../habits';
import {perfectDay, perfectDayWords, perfectMonth, perfectRun, type PerfectDay} from '../../habits-extras/perfect-days';
import {wordCount, wordsThisYear, writingStreak} from '../../journal/stats';
import {addLocalDays, localWeekday} from '../../local-date';
import type {Tasks} from '../../tasks/schema';
import {eveningTasks, somedayTasks, type TaskWhen} from '../../tasks/when';
import {formatDate, formatMonth, formatNumber} from '../../visual-format';
import {nearness} from './bills';
import type {WeekCell} from './habit-week';

/**
 * Session AM-2 (step 3, "NOVA connected"): the figures of six widgets NOVA makes on request, pure and read only, each
 * from its page's own rules: "Perfect days" (lib/habits-extras/perfect-days.ts), "Your day’s rules" ("A day counts as
 * done at N", lib/checklist/day-goal-core.ts, and "My day ends at", lib/day-boundary.ts), "This evening and Someday"
 * (lib/tasks/when.ts), "Days until" (lib/countdowns/schema.ts), "Journal numbers" (lib/journal/stats.ts) and
 * "Templates" (lib/templates/library.ts, a static library: nothing of the person's is read).
 *
 * Unknown is not zero: a record that was not read is null, a day with nothing due is "nothing due" (never a miss), a
 * month without an entry is a gap. Nothing is projected and nothing is written.
 */

/* ---- Perfect days ---- */
export type PerfectWeek = {key: string; cells: WeekCell[]; today?: number};
export type PerfectDaysCard = {
  /** Habits on this device (0: the widget teaches). */
  count: number;
  month: string; firstMonday: string; weeks: PerfectWeek[];
  /** Perfect days this month, and the days this month on which something was due. */
  perfect: number; dueDays: number;
  /** The current run of perfect days (a day with nothing due is skipped; today unfinished does not break it). */
  run: number;
  today: PerfectDay; todayWords: string;
};
const cellOf = (d: PerfectDay | null): WeekCell => !d ? 'rest' : d.kind === 'perfect' ? 'done' : d.kind === 'partly' ? 'part' : d.kind === 'no-record' ? (d.isToday ? 'ahead' : 'missed') : d.kind === 'nothing-due' ? 'rest' : 'ahead';
export function perfectDaysCard(habits: readonly Habit[], today: string): PerfectDaysCard {
  const month = today.slice(0, 7), first = `${month}-01`, firstMonday = addLocalDays(first, -((localWeekday(first) + 6) % 7));
  const m = perfectMonth(habits, month, today), day = perfectDay(habits, today, today);
  return {
    count: habits.length, month, firstMonday,
    weeks: m.weeks.map((week, w) => { const at = week.findIndex(d => d?.isToday); return {key: addLocalDays(firstMonday, w * 7), cells: week.map(cellOf), ...(at >= 0 ? {today: at} : {})}; }),
    perfect: m.perfect, dueDays: m.dueDays, run: perfectRun(habits, today), today: day, todayWords: perfectDayWords(day).text,
  };
}
export function perfectDaysRows(card: PerfectDaysCard): [string, string][] {
  const marks = card.weeks.flatMap(w => w.cells.map((c, i) => c === 'done' ? formatDate(addLocalDays(w.key, i), {year: false}) : '')).filter(Boolean);
  return [
    [`Perfect days in ${formatMonth(card.month)}`, `${card.perfect} of ${card.dueDays} ${card.dueDays === 1 ? 'day' : 'days'} with something due`],
    ['Perfect days in a row', card.run > 0 ? `${card.run} ${card.run === 1 ? 'day' : 'days'}` : 'No run going'],
    ['Today', card.todayWords],
    ['The perfect days', marks.join(', ') || 'None yet this month'],
  ];
}

/* ---- Your day's rules: "A day counts as done at N" and "My day ends at" (read-outs of two settings) ---- */
export type DayRulesCard = {
  /** null: the setting was not read. `need` null is the default, every dot. */
  goal: {need: number | null; words: string; since: string | null} | null;
  ends: {minutes: number; words: string; changedAt: string | null} | null;
};
export function dayRulesCard(goal: DayGoal | null | undefined, ends: DayEnds | null | undefined, today: string): DayRulesCard {
  const need = goal ? needOn(goal, today) : null, since = goal ? [...goal.changes].reverse().find(c => c.from <= today)?.from ?? null : null;
  return {
    goal: goal ? {need, words: need === null ? 'Every dot' : `${need} ${need === 1 ? 'dot' : 'dots'}`, since: need === null ? null : since} : null,
    ends: ends ? {minutes: ends.endsAt, words: dayEndLabel(ends.endsAt), changedAt: ends.change?.at ?? null} : null,
  };
}
export function dayRulesRows(card: DayRulesCard): [string, string][] {
  return [
    ['A day counts as done at', !card.goal ? 'Not read on this device' : card.goal.need === null ? 'Every dot lit (the default)' : `${card.goal.words} lit, or every dot on a shorter day${card.goal.since ? `; since ${formatDate(card.goal.since)}` : ''}`],
    ['My day ends at', !card.ends ? 'Not read on this device' : card.ends.minutes === 0 ? 'Midnight (the default)' : `${card.ends.words} at night: until then it still counts for the day before`],
  ];
}

/* ---- This evening and Someday ---- */
export type LaterLine = {id: string; title: string; due: string | null; dueText: string | null};
export type TasksLaterCard = {/** 'empty': no open task; 'quiet': open tasks, none on either list. */ state: 'empty' | 'quiet' | 'live'; open: number; evening: LaterLine[]; someday: LaterLine[]};
export function tasksLaterCard(when: TaskWhen, record: Tasks, today: string): TasksLaterCard {
  const line = (t: Tasks['tasks'][number]): LaterLine => ({id: t.id, title: t.title, due: t.due ?? null, dueText: t.due ? formatDate(t.due, {weekday: true, year: t.due.slice(0, 4) !== today.slice(0, 4)}) : null});
  const evening = eveningTasks(when, record, today).map(line), someday = somedayTasks(when, record, today).map(line), open = record.tasks.filter(t => !t.doneAt).length;
  return {state: !open ? 'empty' : evening.length || someday.length ? 'live' : 'quiet', open, evening, someday};
}
export function tasksLaterRows(card: TasksLaterCard, shown = 6): [string, string][] {
  const list = (lines: readonly LaterLine[]) => lines.length ? `${lines.slice(0, shown).map(l => l.title).join('; ')}${lines.length > shown ? `; and ${lines.length - shown} more` : ''}` : 'Nothing';
  return [[`This evening (${card.evening.length})`, list(card.evening)], [`Someday (${card.someday.length})`, list(card.someday)]];
}

/* ---- Days until (countdowns) ---- */
export type CountdownLine = {id: string; title: string; date: string; dateText: string; days: number; words: string; /** How near it is, for the dial (full on the day, empty a month or more ahead). */ near: number; note: string | null};
export type CountdownsCard = {state: 'empty' | 'live'; upcoming: CountdownLine[]; next: CountdownLine | null; passed: number; total: number};
export function countdownsCard(record: Countdowns, today: string): CountdownsCard {
  const {upcoming, passed} = splitCountdowns(record, today);
  const lines = upcoming.map((c): CountdownLine => { const days = daysUntil(c.date, today); return {id: c.id, title: c.title, date: c.date, dateText: formatDate(c.date, {weekday: true, year: c.date.slice(0, 4) !== today.slice(0, 4)}), days, words: countdownWords(c.date, today, n => formatNumber(n)), near: nearness(days), note: c.note ?? null}; });
  return {state: record.items.length ? 'live' : 'empty', upcoming: lines, next: lines[0] ?? null, passed: passed.length, total: record.items.length};
}
export function countdownsRows(card: CountdownsCard, shown = card.upcoming.length): [string, string][] {
  return [
    ...card.upcoming.slice(0, shown).map((l, i) => [i === 0 ? `Next: ${l.title}` : l.title, `${l.words}, ${l.dateText}`] as [string, string]),
    ...(card.upcoming.length > shown ? [['More countdowns', `${card.upcoming.length - shown} more coming up`] as [string, string]] : []),
    ...(card.upcoming.length ? [] : [['Coming up', 'Nothing ahead'] as [string, string]]),
    ...(card.passed ? [['Passed', `${card.passed} ${card.passed === 1 ? 'day has' : 'days have'} passed`] as [string, string]] : []),
  ];
}

/* ---- Journal numbers ---- */
export type JournalMonthWords = {key: string; label: string; name: string; /** Words written that month; null: no entry (a gap, never a zero). */ words: number | null; entries: number};
export type JournalNumbersCard = {
  /** Entries in the journal at all (0: the widget teaches). */
  total: number;
  streak: {current: number; longest: number; writtenToday: boolean};
  year: string; words: number; entries: number;
  /** Words per entry this year, rounded; null without an entry this year. */
  average: number | null;
  /** The last six calendar months, oldest first. */
  months: JournalMonthWords[];
  /** Round 6: the last fourteen days, oldest first, today last: the words written on each; null on a day without an entry (a gap, never a zero). */
  days: {date: string; label: string; name: string; words: number | null}[];
  lastDate: string | null;
};
const DAY = /^\d{4}-\d{2}-\d{2}$/;
export function journalNumbersCard(entries: readonly {date: string; text?: string}[], today: string): JournalNumbersCard {
  const own = entries.filter(e => typeof e.date === 'string' && DAY.test(e.date) && e.date <= today).map(e => ({date: e.date, text: typeof e.text === 'string' ? e.text : ''}));
  const year = wordsThisYear(own, today), months: JournalMonthWords[] = [];
  for (let i = 5, y = Number(today.slice(0, 4)), m = Number(today.slice(5, 7)); i >= 0; i--) {
    const index = y * 12 + (m - 1) - i, key = `${String(Math.floor(index / 12)).padStart(4, '0')}-${String(index % 12 + 1).padStart(2, '0')}`, rows = own.filter(e => e.date.startsWith(key));
    months.push({key, label: formatMonth(key, {year: false}).slice(0, 3), name: formatMonth(key), words: rows.length ? rows.reduce((n, e) => n + wordCount(e.text), 0) : null, entries: rows.length});
  }
  const days = Array.from({length: 14}, (_, i) => { const date = addLocalDays(today, i - 13), rows = own.filter(e => e.date === date);
    return {date, label: String(Number(date.slice(8, 10))), name: formatDate(date, {year: false}), words: rows.length ? rows.reduce((n, e) => n + wordCount(e.text), 0) : null}; });
  return {total: own.length, streak: writingStreak(own, today), year: today.slice(0, 4), words: year.words, entries: year.entries, average: year.entries ? Math.round(year.words / year.entries) : null, months, days,
    lastDate: own.reduce<string | null>((latest, e) => !latest || e.date > latest ? e.date : latest, null)};
}
export function journalNumbersRows(card: JournalNumbersCard): [string, string][] {
  const days = (n: number) => `${formatNumber(n)} ${n === 1 ? 'day' : 'days'}`;
  return [
    ['Writing streak', card.streak.current > 0 ? `${days(card.streak.current)}${card.streak.writtenToday ? '' : '; write today to keep it'}` : 'No streak running'],
    ['Longest streak', days(card.streak.longest)],
    [`Words in ${card.year}`, `${formatNumber(card.words)} in ${formatNumber(card.entries)} ${card.entries === 1 ? 'entry' : 'entries'}`],
    ['Words per entry', card.average === null ? 'No entry this year' : `about ${formatNumber(card.average)}`],
    ...card.months.map(m => [m.name, m.words === null ? 'No entry' : `${formatNumber(m.words)} ${m.words === 1 ? 'word' : 'words'} in ${m.entries} ${m.entries === 1 ? 'entry' : 'entries'}`] as [string, string]),
  ];
}

/* ---- Templates (the library: static, nothing of the person's is read) ---- */
/**
 * The library's size, for NOVA's one-line answer without loading the library itself (it is a large static list, loaded
 * only with the Templates widget). lib/nova/cards/connect-life.test.ts keeps these equal to lib/templates/library.ts.
 */
export const TEMPLATE_COUNTS = {goals: 130, habits: 122, areas: 13} as const;
export type TemplateEntry = {kind: 'goal' | 'habit'; id: string; area: string; title: string; /** A goal template's own kind (lib/templates/goal-library.ts): it decides which form the template opens. */ goalKind?: string};
/**
 * Where a goal template opens, exactly as the Goal templates page opens it (components/goals/template-library.tsx
 * `templateHref`): the goal creator filled from it, the average-goal form, or Health goals for a weight. Nothing is
 * created by the link: every form has its own Save.
 */
export function templatePickHref(id: string, goalKind?: string): string {
  const key = encodeURIComponent(id.replace(/^goal:/, ''));
  return goalKind === 'average' ? `/app/goals/average/new?template=${key}` : goalKind === 'health-weight' ? '/app/goals?health-goal=weight#goals-health' : `/app/goals/new?template=${key}`;
}
export type TemplateArea = {id: string; label: string; goals: number; habits: number; total: number; /** Against the largest area. */ share: number};
export type TemplatesCard = {goals: number; habits: number; total: number; areas: TemplateArea[]; /** Goal templates to start from today (they rotate with the day), each with its link. */ picks: {id: string; title: string; area: string; href: string}[]};
const dayNumber = (day: string) => Math.round(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
export function templatesCard(entries: readonly TemplateEntry[], areas: readonly {id: string; label: string}[], today: string, picks = 3): TemplatesCard {
  const label = new Map(areas.map(a => [a.id, a.label])), goals = entries.filter(e => e.kind === 'goal'), habits = entries.filter(e => e.kind === 'habit');
  const rows = areas.map(a => { const g = goals.filter(e => e.area === a.id).length, h = habits.filter(e => e.area === a.id).length; return {id: a.id, label: a.label, goals: g, habits: h, total: g + h, share: 0}; }).filter(a => a.total > 0);
  const top = Math.max(1, ...rows.map(r => r.total));
  const n = Math.min(picks, goals.length), stride = Math.max(1, Math.floor(goals.length / Math.max(1, n))), start = goals.length ? Math.abs(dayNumber(today)) % goals.length : 0;
  return {
    goals: goals.length, habits: habits.length, total: entries.length,
    areas: rows.map(r => ({...r, share: r.total / top})).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)),
    picks: Array.from({length: n}, (_, i) => goals[(start + i * stride) % goals.length]!).map(g => ({id: g.id, title: g.title, area: label.get(g.area) ?? g.area, href: templatePickHref(g.id, g.goalKind)})),
  };
}
export function templatesRows(card: TemplatesCard, shown = card.areas.length): [string, string][] {
  return [
    ['In the library', `${formatNumber(card.goals)} goal templates and ${formatNumber(card.habits)} habit ideas`],
    ...card.areas.slice(0, shown).map(a => [a.label, `${a.goals} goal ${a.goals === 1 ? 'template' : 'templates'}, ${a.habits} habit ${a.habits === 1 ? 'idea' : 'ideas'}`] as [string, string]),
  ];
}
