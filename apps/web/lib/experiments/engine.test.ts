import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {habitDataSchema, type HabitData} from '../habits';
import {CROSS_MIN_PER_SIDE} from '../insights/cross-pillar';
import {endExperiment, experimentDates, experimentResult, noteExperiment, removeExperiment, startExperiment} from './engine';
import {EXPERIMENTS_KEY, MAX_EXPERIMENTS, emptyExperiments, experimentsSchema, type Experiment} from './store';
import {showcaseExperiments} from './showcase';

const today = '2026-10-31';
/** A journal that tags "walk" on the given days, and energy ratings on every day of a span. */
const src = (tagged: (d: string) => boolean, energy: (d: string, tagged: boolean) => number | null, from = addLocalDays(today, -60)) => {
  const entries: {date: string; tags?: string[]}[] = [], days: Record<string, {energy: number}> = {};
  for (let d = from; d <= today; d = addLocalDays(d, 1)) {
    const t = tagged(d); entries.push({date: d, ...(t ? {tags: ['walk']} : {})});
    const e = energy(d, t); if (e !== null) days[d] = {energy: e};
  }
  return {journal: {entries}, energy: {days}};
};
const x = (over: Partial<Experiment> = {}): Experiment => ({id: 'e1', title: 'Walk', factor: 'journal-tag:walk', outcome: 'energy', start: addLocalDays(today, -13), days: 14, ...over});

describe('Experiments (Session AK, BUILD list 2 #8)', () => {
  test('dates: the baseline is the same number of days just before; running, then finished', () => {
    const d = experimentDates(x(), addLocalDays(today, -6));
    expect([d.baselineStart, d.baselineEnd, d.start, d.plannedEnd, d.phase, d.day]).toEqual(['2026-10-04', '2026-10-17', '2026-10-18', '2026-10-31', 'running', 8]);
    expect(experimentDates(x(), today)).toMatchObject({phase: 'running', day: 14});
    expect(experimentDates(x(), addLocalDays(today, 1))).toMatchObject({phase: 'finished', end: today, day: 14});
    expect(experimentDates(x({start: addLocalDays(today, 2)}), today)).toMatchObject({phase: 'upcoming', day: 0});
  });
  test('a clear difference: counts, the Compare label, words that never claim a cause', () => {
    const s = src(d => d >= x().start, (_, t) => (t ? 4 : 2));
    const r = experimentResult(s, x(), today);
    expect([r.state, r.withDays, r.withoutDays, r.counts, r.label]).toEqual(['ready', 14, 14, '14 days with, 14 without', 'early']);
    expect(r.sentence).toBe('On the days you tried it, your energy averaged 4.0 of 5; on the days before, without it, 2.0 of 5.');
    expect(r.why).toMatch(/not proof that one brings the other/);
    for (const text of [r.sentence!, r.why]) expect(text).not.toMatch(/\bcaus|\bbecause\b|improv|made you|leads? to/i);
  });
  test('too few days: "not enough to say", with the counts', () => {
    // Tagged on only 10 of the 14 days.
    const s = src(d => d >= addLocalDays(x().start, 4), (_, t) => (t ? 4 : 2));
    const r = experimentResult(s, x(), today);
    expect([r.state, r.withDays, r.withoutDays, r.need]).toEqual(['pending', 10, 14, CROSS_MIN_PER_SIDE]);
    expect(r.withValue).toBeNull(); expect(r.sentence).toBeNull();
    const ended = experimentResult(s, x(), addLocalDays(today, 3));
    expect(ended.why).toMatch(/not enough to say/);
  });
  test('unknown is not zero: days without a rating are left out on both sides', () => {
    const s = src(d => d >= x().start, (d, t) => (Number(d.slice(-2)) % 2 ? null : t ? 4 : 2));
    const r = experimentResult(s, x(), today);
    expect(r.withDays + r.withoutDays).toBeLessThan(28);
    expect(r.state).toBe('pending');
  });
  test('close sides: not a finding', () => {
    const s = src(d => d >= x().start, () => 3);
    expect(experimentResult(s, x(), today).state).toBe('unclear');
  });
  test('an experiment ended early stops counting on its last day', () => {
    const s = src(d => d >= x().start, (_, t) => (t ? 4 : 2));
    let rec = startExperiment(emptyExperiments(), {id: 'e1', title: ' Walk ', factor: 'journal-tag:walk', outcome: 'energy', start: x().start}, x().start);
    rec = endExperiment(rec, 'e1', addLocalDays(x().start, 4));
    const item = rec.items[0]!;
    expect(item.title).toBe('Walk'); expect(item.days).toBe(14); expect(item.endedAt).toBe(addLocalDays(x().start, 4));
    const r = experimentResult(s, item, today);
    expect(r.dates).toMatchObject({phase: 'finished', endedEarly: true, end: addLocalDays(x().start, 4), day: 5});
    expect([r.state, r.withDays]).toEqual(['pending', 5]);
    expect(r.why).toMatch(/ended early/);
    // Ending a finished one changes nothing.
    expect(endExperiment(rec, 'e1', today)).toEqual(rec);
  });
  test('a time zone change: days are calendar keys, so the same records give the same result on either side of a change', () => {
    const s = src(d => d >= x().start, (_, t) => (t ? 4 : 2));
    // The device moving west makes "today" the day before for a few hours: one day fewer, nothing shifted.
    const west = experimentResult(s, x(), addLocalDays(today, -1));
    expect([west.dates.day, west.withDays, west.withoutDays]).toEqual([13, 13, 14]);
    expect(experimentResult(s, x(), today).withDays).toBe(14);
  });
  test('a factor that is gone, an unknown outcome, or a spending factor: "gone", never a number', () => {
    const habits = habitDataSchema.parse({schemaVersion: 2, kind: 'zigoals-habits', habits: []}) as HabitData;
    expect(experimentResult({habits}, x({factor: 'habit:00000000-0000-4000-8000-000000000000'}), today).state).toBe('gone');
    expect(experimentResult(src(() => true, () => 3), x({outcome: 'happiness'}), today).state).toBe('gone');
    expect(experimentResult({money: {entries: [{kind: 'expense', amount: '5', currency: 'EUR', date: today}]}}, x({factor: 'spend'}), today).state).toBe('gone');
  });
  test('the record: 14, 21 or 28 days; at most 20, the oldest finished making way; note; remove', () => {
    const add = (rec: ReturnType<typeof emptyExperiments>, i: number, start: string, days?: number) => startExperiment(rec, {id: `e${i}`, title: `T${i}`, factor: 'workout', outcome: 'mood', start, days}, today);
    expect(add(emptyExperiments(), 0, today, 21).items[0]!.days).toBe(21);
    expect(add(emptyExperiments(), 0, today, 9).items[0]!.days).toBe(14);
    let rec = emptyExperiments();
    for (let i = 0; i < MAX_EXPERIMENTS; i++) rec = add(rec, i, addLocalDays('2026-01-01', i));
    rec = add(rec, 99, today);
    expect(rec.items).toHaveLength(MAX_EXPERIMENTS);
    expect(rec.items.some(i => i.id === 'e0')).toBe(false);
    let running = emptyExperiments();
    for (let i = 0; i < MAX_EXPERIMENTS; i++) running = add(running, i, today);
    expect(() => add(running, 99, today)).toThrow(/At most 20/);
    rec = noteExperiment(rec, 'e99', '  felt calmer  ');
    expect(rec.items.find(i => i.id === 'e99')!.note).toBe('felt calmer');
    expect(noteExperiment(rec, 'e99', ' ').items.find(i => i.id === 'e99')!.note).toBeUndefined();
    expect(removeExperiment(rec, 'e99').items.some(i => i.id === 'e99')).toBe(false);
    expect(EXPERIMENTS_KEY).toBe('zigoals:experiments:v1');
    expect(experimentsSchema.safeParse({version: 1}).success).toBe(true);
    expect(experimentsSchema.safeParse({version: 1, items: [{...x(), days: 40}]}).success).toBe(false);
  });
  test('the Showcase example: one finished, labelled experiment on a Showcase habit (or workouts)', () => {
    const habits = {habits: [{id: 'h-a', title: 'Read', entries: [{date: addLocalDays(today, -3), count: 1}]}, {id: 'h-b', title: 'Walk', entries: [-1, -2, -4].map(o => ({date: addLocalDays(today, o), count: 1}))}]};
    const rec = showcaseExperiments(today, habits);
    expect(rec.items).toHaveLength(1);
    expect(rec.items[0]).toMatchObject({factor: 'habit:h-b', outcome: 'mood', days: 14});
    expect(rec.items[0]!.title).toContain('(Showcase)');
    expect(experimentDates(rec.items[0]!, today).phase).toBe('finished');
    expect(showcaseExperiments(today).items[0]!.factor).toBe('workout');
  });
});
