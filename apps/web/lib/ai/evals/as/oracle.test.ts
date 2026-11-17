import {expect, test} from 'vitest';
import {buildShowcase} from '../../../showcase-data';
import {ask, DAY, novaEnv, showcaseAll} from './harness';

/**
 * Session AS (ADR-042, approval item 7): the oracle. The corpus's expected answers were written out from the engine and
 * then read; this file recomputes the facts that matter most a second, simpler way — plain loops over the Showcase's raw
 * stored records, none of the pages' engines, none of the exact layer — and holds the answers against them. So the
 * corpus is not a snapshot of the engine's own output: a wrong count in the engine fails here.
 */
const RAW = buildShowcase(DAY, 'UTC').records, record = (key: string) => JSON.parse(RAW[key]!);
type Entry = {date: string; count: number; disposition: string};
type RawHabit = {title: string; startDate: string; entries: Entry[]; rules: {type: string; target: number; state: string}[]};
const habits = (record('zigoals:habits:v1').habits as RawHabit[]).filter(h => h.rules.at(-1)!.state === 'active');
const days = (from: string, to: string) => { const out: string[] = []; for (let d = new Date(`${from}T00:00:00Z`); d.toISOString().slice(0, 10) <= to; d = new Date(d.getTime() + 86_400_000)) out.push(d.toISOString().slice(0, 10)); return out; };
/** A daily habit's day by its stored entry alone: skipped when marked so; done when a build habit reached its target (a quit habit stayed within it); else missed on a past day, open today. */
function dayOf(h: RawHabit, date: string): 'done' | 'missed' | 'skipped' | 'open' | 'rest' {
  if (date < h.startDate) return 'rest';
  const e = h.entries.find(x => x.date === date), rule = h.rules.at(-1)!;
  if (e?.disposition === 'skipped') return 'skipped';
  const ok = !!e && e.disposition === 'logged' && (rule.type === 'build' ? e.count >= rule.target : e.count <= rule.target);
  return ok ? 'done' : date === DAY ? 'open' : 'missed';
}
const env = novaEnv(showcaseAll()), NOV = days('2026-11-01', DAY), THIS_WEEK = days('2026-11-16', DAY), LAST_WEEK = days('2026-11-09', '2026-11-15');
const named = (title: string) => habits.find(h => h.title.startsWith(title))!;

test('the owner’s second question: Meditate was not done on 3 and 12 November, both skipped, nothing missed, today open', () => {
  const med = named('Meditate'), states = NOV.map(d => [d, dayOf(med, d)] as const);
  expect(states.filter(([, s]) => s === 'skipped').map(([d]) => d)).toEqual(['2026-11-03', '2026-11-12']);
  expect(states.filter(([, s]) => s === 'missed')).toEqual([]);
  expect(dayOf(med, DAY)).toBe('open');
  const a = ask('wgat days did i forget to meditate this month', env);
  expect(a.facts).toMatchObject({count: 2, days: ['2026-11-03', '2026-11-12'], missed: 0, skipped: 2, open: 1});
  expect(a.text).toBe('Meditate: not done on 2 days this month (Sun, Nov 1 to Tue, Nov 17): Tue, Nov 3 and Thu, Nov 12. Both were marked as skipped. Today is still open.');
});
test('the owner’s first question: no habit was missed this week; three are still open today', () => {
  const missed = habits.filter(h => THIS_WEEK.some(d => dayOf(h, d) === 'missed')).map(h => h.title), open = habits.filter(h => dayOf(h, DAY) === 'open').map(h => h.title);
  expect(missed).toEqual([]);
  expect(open).toEqual(['Exercise', 'Meditate', 'Drink water']);
  const a = ask('how many habits did I miss this week', env);
  expect(a.facts).toMatchObject({count: 0, habits: []});
  expect(a.text).toBe('You missed no habit this week (Mon, Nov 16 to Tue, Nov 17): 11 of 11 due check-ins done. Still open today: Exercise, Meditate and Drink water.');
  // 7 habits × 2 days, less today's three open ones: 11 decided, all done.
  expect(habits.length * THIS_WEEK.length - open.length).toBe(11);
  expect(habits.flatMap(h => THIS_WEEK.map(d => dayOf(h, d))).filter(s => s === 'done')).toHaveLength(11);
});
test('missed and skipped, habit by habit, this month and last week', () => {
  const count = (period: string[], state: string) => Object.fromEntries(habits.map(h => [h.title.replace(/ \(Showcase\)$/, ''), period.filter(d => dayOf(h, d) === state).length]).filter(([, n]) => n));
  expect(count(NOV, 'missed')).toEqual({'Late-night snacks': 2});
  expect(NOV.filter(d => dayOf(named('Late-night snacks'), d) === 'missed')).toEqual(['2026-11-08', '2026-11-13']);
  expect(count(NOV, 'skipped')).toEqual({Read: 2, Exercise: 2, Walk: 2, Meditate: 2, Contribute: 2, 'Drink water': 2, 'Late-night snacks': 3});
  expect(count(LAST_WEEK, 'skipped')).toEqual({Read: 1, Exercise: 1, Walk: 1, Meditate: 1, Contribute: 1, 'Drink water': 1, 'Late-night snacks': 2});
  const month = ask('which habits did I miss this month', env).facts as {habits: {habit: string; days: number; missedDays: string[]}[]};
  expect(month.habits).toMatchObject([{habit: 'Late-night snacks', days: 2, missedDays: ['2026-11-08', '2026-11-13']}]);
  expect((ask('which habits did I skip last week', env).facts as {habits: {habit: string; days: number}[]}).habits.map(h => [h.habit, h.days])).toEqual([['Late-night snacks', 2], ['Contribute', 1], ['Drink water', 1], ['Exercise', 1], ['Meditate', 1], ['Read', 1], ['Walk', 1]]);
  // Perfect days: every habit that was due and not skipped was done.
  const perfect = NOV.filter(d => d !== DAY).filter(d => { const s = habits.map(h => dayOf(h, d)).filter(x => x !== 'rest' && x !== 'skipped'); return s.length > 0 && s.every(x => x === 'done'); });
  expect(perfect).toHaveLength(14);
  expect(ask('which days this month were perfect days for my habits', env).facts).toMatchObject({count: 14});
});
test('the money log: this month, yesterday, the largest entry, days without spending', () => {
  const entries = record('zigoals:money-log:v1').entries as {kind: string; amount: string; currency: string; date: string; category: string}[];
  const cents = (list: typeof entries) => list.reduce((n, e) => n + Math.round(Number(e.amount) * 100), 0), spent = (from: string, to: string) => entries.filter(e => e.kind === 'expense' && e.currency === 'EUR' && e.date >= from && e.date <= to);
  expect(cents(spent('2026-11-01', DAY))).toBe(43559);
  expect(cents(spent('2026-11-16', '2026-11-16'))).toBe(5140);
  expect(cents(spent('2026-10-01', '2026-10-31'))).toBe(17640);
  expect(ask('how much did I spend yesterday', env).facts).toMatchObject({currency: 'EUR', totalCents: 5140});
  const top = ask('what did I spend the most on this month', env).facts as {totalCents: number; categories: {category: string; cents: number}[]};
  expect(top.totalCents).toBe(43559);
  expect(top.categories.slice(0, 2)).toEqual([{category: 'Groceries', cents: 18710}, {category: 'Bills', cents: 12000}]);
  expect(top.categories.reduce((n, c) => n + c.cents, 0)).toBe(43559);
  const biggest = spent('2026-11-01', DAY).sort((a, b) => Number(b.amount) - Number(a.amount))[0]!;
  expect(ask('what was my biggest expense this month', env).facts).toMatchObject({entry: {day: biggest.date, cents: Math.round(Number(biggest.amount) * 100)}});
  const quiet = LAST_WEEK.filter(d => !spent(d, d).length);
  expect(ask('which days did I not spend anything last week', env).facts).toMatchObject({days: quiet});
  expect(cents(entries.filter(e => e.kind === 'income' && e.date >= '2026-11-01' && e.date <= DAY))).toBe(255000);
});
test('steps, workouts, the journal, focus and tasks, from their stored records', () => {
  const activity = record('zigoals:health:v1').activity as {date: string; steps: number}[], steps = (d: string) => activity.filter(a => a.date === d).reduce((n, a) => n + a.steps, 0);
  expect(LAST_WEEK.filter(d => steps(d) > 0 && steps(d) < 8000)).toEqual(['2026-11-09', '2026-11-10', '2026-11-13', '2026-11-14', '2026-11-15']);
  expect(ask('which days did I miss my step goal last week', env).facts).toMatchObject({days: ['2026-11-09', '2026-11-10', '2026-11-13', '2026-11-14', '2026-11-15']});
  expect(THIS_WEEK.reduce((n, d) => n + steps(d), 0)).toBe(16900); expect(LAST_WEEK.reduce((n, d) => n + steps(d), 0)).toBe(51100);
  const workouts = (record('zigoals:workouts:v1').workouts as {date: string; endedAt?: string}[]).filter(w => w.endedAt);
  expect(workouts.filter(w => w.date >= '2026-11-01' && w.date <= DAY)).toHaveLength(9);
  expect(LAST_WEEK.filter(d => !workouts.some(w => w.date === d))).toEqual(['2026-11-09', '2026-11-10', '2026-11-14']);
  expect(ask('which days did I not work out last week', env).facts).toMatchObject({days: ['2026-11-09', '2026-11-10', '2026-11-14']});
  const written = new Set((record('zigoals:journal:v1').entries as {date: string}[]).map(e => e.date));
  expect(NOV.filter(d => written.has(d))).toHaveLength(10);
  expect(ask('which days did I not write in my journal this month', env).facts).toMatchObject({days: NOV.filter(d => !written.has(d) && d !== DAY)});
  const focus = record('zigoals:focus-sessions:v1').sessions as {day: string; focusedSeconds: number}[], minutes = (period: string[]) => Math.round(focus.filter(s => period.includes(s.day)).reduce((n, s) => n + s.focusedSeconds, 0) / 60);
  expect(minutes(THIS_WEEK)).toBe(150); expect(minutes(LAST_WEEK)).toBe(136); expect(focus.filter(s => NOV.includes(s.day))).toHaveLength(16);
  const tasks = record('zigoals:tasks:v1').tasks as {title: string; due?: string; time?: string; doneAt?: string}[];
  const overdue = tasks.filter(t => !t.doneAt && t.due && (t.due < DAY || (t.due === DAY && !!t.time && t.time < '19:00'))).map(t => t.title.replace(/^Example · /, ''));
  expect(overdue.sort()).toEqual(['Book the dentist', 'Sketch the garden bed']);
  expect((ask('which tasks are overdue', env).facts as {overdue: string[]}).overdue.sort()).toEqual(overdue.sort());
});
