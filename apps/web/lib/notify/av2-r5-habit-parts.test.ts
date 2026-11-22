import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './plan';
import {emptyNotifyPrefs, setType, typeOn} from './prefs';
import {zonedInstant} from './zone';
import {habitPartsInput, habitPartsOn, partTime, setHabitParts} from './habit-parts';
import {createHabit, emptyHabitData, type HabitData, type HabitInput} from '../habits';

/**
 * Session AV lane 2 (r5-body; LEDGER #369, Productive's reminders for each part of the day; TIER 3 (PWA)): opt-in, one
 * notification at the start of each part of the day with how many of its habits are still open, names only with names
 * on (never a Health-linked habit's), in place of one per habit; Anytime habits keep their own; quiet hours apply.
 */
const ZONE = 'Europe/Amsterdam', NOW = Date.UTC(2026, 10, 23, 5, 0), TODAY = '2026-11-23';
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '06:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 3}, prices: [], ...over});
function habits(): HabitData {
  let d = emptyHabitData();
  const made = new Date('2026-11-01T10:00:00.000Z');
  for (const [i, [title, timeOfDay]] of ([['Fictional walk', 'morning'], ['Fictional stretch', 'morning'], ['Fictional read', 'evening'], ['Fictional water', 'anytime']] as const).entries())
    d = createHabit(d, {title, category: 'Personal', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'count', unit: 'times'}, target: 1, timeOfDay} as HabitInput, made, `59a35604-3696-4a78-b455-40000000000${i}`);
  return d;
}
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; actions: unknown[]; data: {url: string}}}}).self.zigoalsCompose;
};

describe('one reminder for each part of the day (#369)', () => {
  it('off unless chosen; switching it on keeps the habits type on; the times are the person’s', () => {
    const p = emptyNotifyPrefs();
    expect(habitPartsOn(p)).toBe(false);
    expect(habitPartsInput(habits(), TODAY, p, new Set())).toBeUndefined();
    const on = setHabitParts(setType(p, 'habits', false), {on: true});
    expect(habitPartsOn(on)).toBe(true);
    expect(typeOn(on, 'habits')).toBe(true);
    expect(partTime(on, 'morning')).toBe('08:30');
    expect(partTime(setHabitParts(on, {evening: '19:15'}), 'evening')).toBe('19:15');
  });
  it('the open habits of each part; the habits in a part have no reminder of their own; Anytime keeps its own', () => {
    const data = habits(), prefs = setHabitParts(emptyNotifyPrefs(), {on: true}), parts = habitPartsInput(data, TODAY, prefs, new Set())!;
    expect(parts.parts.map(p => [p.part, p.time, p.days[0]!.open])).toEqual([['morning', '08:30', 2], ['afternoon', '12:30', 0], ['evening', '18:00', 1]]);
    const ids = data.habits.map(h => h.id);
    const plan = buildPlan(base({prefs, habitParts: parts, habits: ids.map(id => ({id, title: 'x', time: '09:00', weekdays: 127, doneToday: false}))}));
    const items = plan.snapshot.items;
    expect(items.filter(i => i.kind === 'habit').map(i => i.id)).toEqual([ids[3], ids[3]]); // Anytime, today and tomorrow
    const morning = items.filter(i => i.kind === 'habitPart' && i.id === 'part:morning');
    expect(morning.map(i => [i.at, i.detail, i.label])).toEqual([
      [at(TODAY, '08:30'), 'Morning: 2 habits still open', 'Fictional walk · Fictional stretch'],
      [at('2026-11-24', '08:30'), 'Morning: 2 habits still open', 'Fictional walk · Fictional stretch'],
    ]);
    expect(items.some(i => i.id === 'part:afternoon')).toBe(false); // nothing open: quiet
    expect(plan.registration.wakes).toContainEqual({m: 8 * 60 + 30, d: 127});
    expect(plan.registration.skips).toContain(Math.floor(at(TODAY, '12:30') / 60000));
  });
  it('names only with names on, and never when a Health-linked habit is open in the part', () => {
    const data = habits(), prefs = setHabitParts(emptyNotifyPrefs(), {on: true});
    const linked = habitPartsInput(data, TODAY, prefs, new Set([data.habits[0]!.id]))!;
    expect(linked.parts[0]!.days[0]!.names).toBeUndefined();
    expect(habitPartsInput(data, TODAY, prefs, null)!.parts[0]!.days[0]!.names).toBeUndefined();
    const plan = buildPlan(base({prefs, labels: false, habitParts: habitPartsInput(data, TODAY, prefs, new Set())}));
    expect(plan.snapshot.items.filter(i => i.kind === 'habitPart').every(i => i.label === undefined)).toBe(true);
  });
  it('quiet hours: a part inside them is refused and said; the habits switch off sends none', () => {
    const data = habits(), prefs = setHabitParts(emptyNotifyPrefs(), {on: true, morning: '05:30'});
    const plan = buildPlan(base({prefs, habitParts: habitPartsInput(data, TODAY, prefs, new Set())}));
    expect(plan.refused).toContainEqual({kind: 'habitPart', time: '05:30'});
    expect(buildPlan(base({prefs: setType(prefs, 'habits', false), habitParts: habitPartsInput(data, TODAY, prefs, new Set())})).snapshot.items.some(i => i.kind === 'habitPart')).toBe(false);
  });
  it('the notification says the part and the count; names only where the snapshot holds them; no Done', () => {
    const data = habits(), prefs = setHabitParts(emptyNotifyPrefs(), {on: true});
    const compose = composer(), when = at(TODAY, '18:00');
    const named = buildPlan(base({prefs, habitParts: habitPartsInput(data, TODAY, prefs, new Set())})).snapshot;
    expect(compose(named, when).body).toContain('Evening: 1 habit still open · Fictional read');
    expect(compose(named, when).actions).toEqual([{action: 'snooze', title: 'Snooze 1 h'}]);
    expect(compose(named, when).data.url).toBe('/app/habits');
    const unnamed = buildPlan(base({prefs, labels: false, habitParts: habitPartsInput(data, TODAY, prefs, new Set())})).snapshot;
    expect(compose(unnamed, when).body).toContain('Evening: 1 habit still open');
    expect(compose(unnamed, when).body).not.toContain('Fictional');
  });
});
