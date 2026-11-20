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
  // Session AU (D8, deliberate): October holds the Showcase's €13.99 streaming payment of 25 Oct (lib/showcase/au-examples.ts).
  expect(cents(spent('2026-10-01', '2026-10-31'))).toBe(19039);
  expect(spent('2026-10-01', '2026-10-31').filter(e => e.category === 'Subscriptions').map(e => [e.date, e.amount])).toEqual([['2026-10-25', '13.99']]);
  const last = ask('how much did I spend last month', env).text, compare = ask('did I spend more this month than last month', env);
  expect(last).toContain(`${(cents(spent('2026-10-01', '2026-10-31')) / 100).toFixed(2)} EUR last month`);
  expect(compare.facts).toMatchObject({compare: {before: {from: '2026-10-01', to: '2026-10-31', cents: cents(spent('2026-10-01', '2026-10-31'))}}});
  expect((ask('what did I spend most on last month', env).facts as {totalCents: number}).totalCents).toBe(cents(spent('2026-10-01', '2026-10-31')));
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
test('Session AU (D-ETA): the Emergency fund’s pace estimate, recomputed from the stored contributions, is the answer’s month; Japan has no pace yet', () => {
  type Event = {goalId: string; direction: string; quantity: string; asset: string; decimals: number; occurredAt: string; provenance: string};
  type Raw = {goals: {id: string; target: string; decimals: number}[]; positions: {id: string; decimals: number}[]; allocations: {goalId: string; positionId: string; quantity: string}[]; contributions: Event[]};
  const platform = record('zigoals:platform:v1') as Raw, at = (day: string) => Date.parse(`${day}T12:00:00Z`) / 86_400_000;
  /** The goal's own USD contributions as a running total by day (in minus out), the least-squares slope through them, and the day the remainder is covered. */
  const pace = (id: string) => {
    const own = platform.contributions.filter(e => e.goalId === id && e.asset === 'USD' && e.provenance !== 'REWARD_INCOME').sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
    const byDay = new Map<string, number>(); let run = 0;
    for (const e of own) { run += (e.direction === 'IN' ? 1 : -1) * Number(e.quantity) / 10 ** e.decimals; byDay.set(e.occurredAt.slice(0, 10), run); }
    const xs = [...byDay.keys()].map(at), ys = [...byDay.values()], span = xs.length ? xs.at(-1)! - xs[0]! : 0;
    if (xs.length < 3 || span < 14) return {state: 'not-enough' as const};
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const slope = xs.reduce((n, x, i) => n + (x - mx) * (ys[i]! - my), 0) / xs.reduce((n, x) => n + (x - mx) ** 2, 0);
    const goal = platform.goals.find(g => g.id === id)!, held = platform.allocations.filter(a => a.goalId === id).reduce((n, a) => n + Number(a.quantity) / 10 ** platform.positions.find(p => p.id === a.positionId)!.decimals, 0);
    const days = Math.ceil((Number(goal.target) / 10 ** goal.decimals - held) / slope);
    return {state: 'estimate' as const, held, slope, date: new Date((at(DAY) + days) * 86_400_000).toISOString().slice(0, 10)};
  };
  const emergency = pace('9201');
  expect(emergency).toMatchObject({state: 'estimate', held: 9000, slope: 25});
  expect(emergency.state === 'estimate' && emergency.date.slice(0, 7)).toBe('2028-01');
  const a = ask('when will I reach my emergency fund', env);
  expect(a.facts).toMatchObject({pace: 'estimate', estimateMonth: emergency.state === 'estimate' ? emergency.date.slice(0, 7) : null, targetDate: '2028-11-16'});
  expect(a.text).toMatch(/^At your current pace, you reach Emergency fund about Jan \d{1,2}, 2028 — an estimate from your pace so far, not a promise\./);
  expect(a.widgets).toEqual(['goal-focus']);
  expect(pace('9203')).toEqual({state: 'not-enough'});
  expect(ask('when will I reach my Japan adventure goal', env).facts).toMatchObject({pace: 'not-enough', estimate: null, targetDate: '2027-04-16'});
});
test('Session AU (REHEARSAL R-2, R-3): what was lifted and how far was run, from the raw workout log', () => {
  type RawSet = {kind: string; weightKg?: number; reps?: number; distanceKm?: number; done: boolean};
  type RawWorkout = {name: string; date: string; endedAt?: string; exercises: {name: string; measure: string; sets: RawSet[]}[]; imported?: {distanceKm?: number}};
  const log = (record('zigoals:workouts:v1').workouts as RawWorkout[]).filter(w => w.endedAt);
  // Yesterday's strength workout: each exercise's working sets (no warm-up) and its heaviest.
  const yesterday = log.filter(w => w.date === '2026-11-16' && w.exercises.some(e => e.measure === 'weight-reps'));
  const rows = yesterday.flatMap(w => w.exercises.map(e => { const sets = e.sets.filter(x => x.kind !== 'warmup'); return {name: e.name, sets: sets.length, top: Math.max(...sets.map(x => x.weightKg ?? 0))}; }));
  expect(rows).toEqual([{name: 'Bench press', sets: 3, top: 62.5}, {name: 'Overhead press', sets: 2, top: 37.5}, {name: 'Triceps pushdown', sets: 2, top: 27.5}]);
  expect(ask('what did I lift yesterday', env).facts).toMatchObject({workouts: [{workout: 'Push day', exercises: rows.map(r => ({name: r.name, sets: r.sets, topKg: r.top}))}]});
  // Kilometres by the sets' distance (else an imported file's summary), per week.
  const km = (from: string, to: string) => log.filter(w => w.date >= from && w.date <= to).reduce((n, w) => n + (w.exercises.flatMap(e => e.sets).reduce((m, x) => m + (x.distanceKm ?? 0), 0) || (w.imported?.distanceKm ?? 0)), 0);
  expect(km('2026-11-09', '2026-11-15')).toBe(6);
  expect(km('2026-11-16', DAY)).toBe(0);
  expect(ask('how far did I run last week', env).facts).toMatchObject({km: 6, count: 1});
  expect(ask('How far did I run this week?', env).facts).toMatchObject({km: 0, count: 0});
});
test('Session AU (D8, deliberate): the Showcase bill whose price stepped up, recomputed from the raw money log', () => {
  type Raw = {id: string; kind: string; amount: string; currency: string; date: string; category: string; note?: string};
  const entries = (record('zigoals:money-log:v1').entries as Raw[]).filter(e => e.kind === 'expense' && e.date <= DAY);
  // The same payee, category and currency, one payment per date, oldest first.
  const series = entries.filter(e => e.note === 'Streaming · SHOWCASE DATA' && e.category === 'Subscriptions' && e.currency === 'EUR').sort((a, b) => a.date.localeCompare(b.date));
  expect(series.map(e => [e.date, e.amount])).toEqual([['2026-07-26', '12.99'], ['2026-08-25', '13.99'], ['2026-09-25', '13.99'], ['2026-10-25', '13.99']]);
  const c = (e: Raw) => Math.round(Number(e.amount) * 100), latest = series.at(-1)!, previous = [...series].reverse().find(e => c(e) !== c(latest))!;
  // No other payee in the log is paid on three dates a month apart, and no confirmed bill comes from the log.
  expect((record('zigoals:bills:v1').bills as {origin: string}[]).filter(b => b.origin === 'detected')).toEqual([]);
  const a = ask('Did any bill go up in price?', env);
  expect(a.facts).toMatchObject({compared: 1, changes: [{bill: 'Streaming', direction: 'up', previousCents: c(previous), latestCents: c(latest), currency: 'EUR', previousDate: previous.date, latestDate: latest.date}]});
  expect(a.text).toContain(`Streaming went up from €${previous.amount} to €${latest.amount}`);
});
