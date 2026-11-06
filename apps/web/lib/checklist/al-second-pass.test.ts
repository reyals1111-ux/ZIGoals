import {describe, expect, test} from 'vitest';
import {addWater, dailyData} from '../health-daily';
import type {HealthData} from '../health';
import {deriveDots, pathLine, summarise} from './derive';
import {distinctPathLabels, suggestPathLabel} from './path-label';
import {orderedItems, sectionOfItem, sectionsOf, stepItem} from './store';
import {NOW, TODAY, fullPath, sources} from './test-fixtures';
import {tooShortText} from '../health-timer-rules';

/** Session AL second pass (lane L5): P-LS-19 water at its target, PR-085, PR-070, PR-069, the one timer rule. */
const today = {date: TODAY, ticks: [], custom: [], nudged: []};
const water = (health: HealthData) => deriveDots(fullPath(), today, TODAY, sources({health})).find(d => d.kind === 'health' && d.input === 'water')!;
const withTarget = (h: HealthData, targetMl: number | null): HealthData => ({...h, daily: {...dailyData(h), preferences: {...dailyData(h).preferences, waterTargetMl: targetMl}}});

describe('P-LS-19 (LS-016, LS-056, LC-002): Water is done at the target when one is set', () => {
  test('with a 2,000 mL target, 300 mL is not done and says how far; 2,000 mL is done', () => {
    const base = withTarget(sources().health!, 2000);
    const some = addWater(base, {id: 'health_water-0001', date: TODAY, amountMilli: 300000, unit: 'ml'}, NOW.toISOString());
    expect(water(some)).toMatchObject({state: 'undone', note: '300 ml today of 2,000 ml'});
    const all = addWater(some, {id: 'health_water-0002', date: TODAY, amountMilli: 1700000, unit: 'ml'}, NOW.toISOString());
    expect(water(all)).toMatchObject({state: 'done', note: '2,000 ml today of 2,000 ml'});
  });
  test('with no target, one entry is the day’s water (the pinned Checklist spec’s case); the amount is shown unrounded', () => {
    const one = addWater(withTarget(sources().health!, null), {id: 'health_water-0001', date: TODAY, amountMilli: 2500, unit: 'ml'}, NOW.toISOString());
    expect(water(one)).toMatchObject({state: 'done', note: '2.5 ml today'});
  });
});

describe('PR-085 (P-PR-21): "All planets lit!" only when every planet is lit', () => {
  test('all counted done but a resting planet left: says what is true', () => {
    const summary = {total: 2, done: 2, next: null};
    expect(pathLine(summary, [{state: 'done'}, {state: 'done'}])).toBe('All planets lit!');
    expect(pathLine(summary, [{state: 'done'}, {state: 'done'}, {state: 'undone'}])).toBe('Every planet due today is lit');
    expect(pathLine({total: 2, done: 0, next: null}, [])).toBe('Tap a planet to begin');
    expect(pathLine(null, [])).toBeUndefined();
  });
  test('the fixtures’ path: nothing done yet starts with "Tap a planet to begin"', () => {
    const dots = deriveDots(fullPath(), today, TODAY, sources());
    expect(pathLine(summarise(dots, today), dots)).toBe('Tap a planet to begin');
  });
});

describe('PR-070 (P-PR-19): each arrow press moves one place, across orbits at an edge, and says so', () => {
  test('within an orbit, then into the orbit before, then refuses at the very top', () => {
    let r = fullPath();
    const orbits = sectionsOf(r).map(s => s.id), inOrbit = (id: string) => sectionOfItem(r, orderedItems(r).find(i => i.id === id)!);
    const secondOrbit = orbits.find((o, i) => i > 0 && orderedItems(r).some(x => sectionOfItem(r, x) === o))!;
    const mates = orderedItems(r).filter(i => sectionOfItem(r, i) === secondOrbit);
    const last = mates[mates.length - 1]!;
    let step = stepItem(r, last.id, -1);
    if (mates.length > 1) { expect(step.moved).toBe('within'); r = step.record; }
    // Up until it leaves its orbit.
    for (let guard = 0; guard < 40 && inOrbit(last.id) === secondOrbit; guard++) { step = stepItem(r, last.id, -1); r = step.record; }
    expect(step.moved).toBe('orbit');
    const before = orbits[orbits.indexOf(secondOrbit) - 1]!;
    expect(inOrbit(last.id)).toBe(before);
    // It landed at the end of the orbit before.
    const now = orderedItems(r).filter(i => sectionOfItem(r, i) === before);
    expect(now[now.length - 1]!.id).toBe(last.id);
    // The first item of the first orbit cannot go further up.
    const first = orderedItems(r).find(i => sectionOfItem(r, i) === orbits[0])!;
    expect(stepItem(r, first.id, -1)).toMatchObject({moved: null});
  });
});

describe('PR-069 (P-PR-17): same-named items stay apart on the path', () => {
  // Session AL (CI 1539, deliberate): the path shows ONE word (owner amendment 10, the PROTECTED Checklist pin); a closing
  // number made it two and widened the names under ZIGi's cheer on a phone. The tag is still skipped ("Task", not "QA"), and
  // the numbers that tell "QA Task 1–3" apart are held, at the same strength, by distinctPathLabels — the helper O6 wires.
  test('one word on the path; the closing number tells them apart in distinctPathLabels', () => {
    expect(['QA Task 1', 'QA Task 2', 'QA Task 3'].map(suggestPathLabel)).toEqual(['Task', 'Task', 'Task']);
    const told = distinctPathLabels(['QA Task 1', 'QA Task 2', 'QA Task 3'].map((name, i) => ({id: `t${i}`, name})));
    expect(['t0', 't1', 't2'].map(id => told.get(id))).toEqual(['Task 1', 'Task 2', 'Task 3']);
    expect(suggestPathLabel('Fictional star 3')).toBe('Fictional');
    expect(suggestPathLabel('Play piano 15 minutes')).toBe('Piano');
    expect(suggestPathLabel('QA Floss')).toBe('Floss');
    expect(suggestPathLabel('Photosynthesis 4')).toBe('Photosynthes');
  });
});

describe('PR-018 (L2’s one timer rule): the Checklist’s timer stops use the shared words', () => {
  test('the words the Checklist already said for sleep and fasts are the shared ones (adapters.test pins each stop)', () => {
    expect(tooShortText('fast')).toBe('Stopped after less than ten minutes, so nothing was saved.');
    expect(tooShortText('sleep')).toBe('Stopped after less than ten minutes, so nothing was saved.');
  });
});

describe('C-DVG-75 / A7: Skip today and Done yesterday from the List view undo exactly', () => {
  test('the habit comes back as it was; other habits changed since are kept', async () => {
    const {setHabitEntryStatus, logHabitValue} = await import('../habits');
    const {restoreHabit} = await import('./habit-undo');
    const {habits, ID} = await import('./test-fixtures');
    const data = habits(), before = data.habits.find(h => h.id === ID.walk)!;
    const skipped = setHabitEntryStatus(data, ID.walk, TODAY, 'skipped', 'Skipped from the Checklist', NOW);
    expect(skipped.habits.find(h => h.id === ID.walk)!.entries.find(e => e.date === TODAY)?.disposition).toBe('skipped');
    const latest = logHabitValue(skipped, ID.push, TODAY, 10, {}, NOW);
    const back = restoreHabit(latest, before);
    expect(back.habits.find(h => h.id === ID.walk)).toEqual(before);
    expect(back.habits.find(h => h.id === ID.push)).toEqual(latest.habits.find(h => h.id === ID.push));
    expect(restoreHabit(latest, undefined)).toBe(latest);
  });
});

/** Session AL fourth pass (L5-4): LS-019/LC-005 rename a habit from the List; LS-032/C-LS-35 own item done yesterday. */
import {fillOwnDay as l54Fill, renameHabit as l54Rename, restoreDay as l54Restore} from './habit-undo';
import {emptyChecklistDays as l54Days} from './schema';
describe('Session AL L5-4 List tools', () => {
  test('LS-019: a habit is renamed on Habits; blank and too long say why', () => {
    const data = {schemaVersion: 2 as const, kind: 'zigoals-habits' as const, habits: [{id: 'h1', title: 'QA Vitamins', updatedAt: '2026-11-01T00:00:00.000Z'}]} as never;
    const next = l54Rename(data, 'h1', '  Vitamins  D ', new Date('2026-11-04T09:00:00Z')) as unknown as {habits: {title: string; updatedAt: string}[]};
    expect(next.habits[0]).toMatchObject({title: 'Vitamins D', updatedAt: '2026-11-04T09:00:00.000Z'});
    expect(() => l54Rename(data, 'h1', '   ')).toThrow('A habit needs a name.');
    expect(() => l54Rename(data, 'h1', 'x'.repeat(101))).toThrow(/at most 100/);
  });
  test('LS-032: own item done yesterday counts once, with an exact Undo', () => {
    const days = {...l54Days(), days: {'2026-11-03': {total: 3, done: 1}}};
    const once = l54Fill(days, '2026-11-03', 'ck_floss', 2);
    expect(once.days['2026-11-03']).toMatchObject({total: 3, done: 2, filled: ['ck_floss']});
    expect(() => l54Fill(once, '2026-11-03', 'ck_floss', 2)).toThrow('Already filled in for yesterday.');
    expect(l54Restore(once, '2026-11-03', days.days['2026-11-03']).days['2026-11-03']).toEqual({total: 3, done: 1});
    const fresh = l54Fill(l54Days(), '2026-11-03', 'ck_floss', 2);
    expect(fresh.days['2026-11-03']).toMatchObject({total: 2, done: 1});
    expect(l54Restore(fresh, '2026-11-03', undefined).days['2026-11-03']).toBeUndefined();
  });
});
