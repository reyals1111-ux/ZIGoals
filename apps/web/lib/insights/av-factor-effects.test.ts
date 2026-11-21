import {afterEach, describe, expect, it} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {FORBIDDEN_INSIGHT_WORDS} from './engine';
import {factorEffects} from './factor-effects';

/**
 * Session AV (owner follow-up 1, F-FACTORS; Bearable): every factor against mood, energy and sleep, under the pairings'
 * own rules (14 days a side, a gap, the probability of superiority). Fictional records.
 */
const TODAY = '2026-10-31', HABIT = '92000000-0000-4000-8000-000000000777', zone = process.env.TZ;
afterEach(() => { if (zone === undefined) delete process.env.TZ; else process.env.TZ = zone; });
const INPUT: HabitInput = {title: 'Fictional stretch', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
function world(n: number) {
  const start = addLocalDays(TODAY, 1 - n);
  let habits: HabitData = createHabit(emptyHabitData(), INPUT, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT);
  const moods: Record<string, {mood: number}> = {}, tags: Record<string, string[]> = {}, journal: {date: string; tags?: string[]}[] = [];
  for (let i = 0; i < n; i++) {
    const day = addLocalDays(start, i), even = i % 2 === 0;
    moods[day] = {mood: even ? 4 : 2};                           // stretch days are the better days
    if (even) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
    if (i % 3 === 0) tags[day] = ['Outside'];                    // a tag with no clear difference
    journal.push({date: day, ...(even ? {tags: ['family']} : {})}); // the same days as the stretch
  }
  return {habits, health: {...createEmptyHealth(), moods: {days: moods}} as unknown as HealthData, moodTags: {entries: tags}, journal: {entries: journal}};
}
describe('Session AV (F-FACTORS)', () => {
  it('ranks a habit and a journal tag with a clear mood difference; leaves a tag without one out; never a cause word', () => {
    process.env.TZ = 'UTC';
    const r = factorEffects({...world(60), today: TODAY});
    const ids = r.ready.map(f => f.id);
    expect(ids).toContain(`habit:${HABIT}:mood`);
    expect(ids).toContain('journal-tag:family:mood');
    expect(ids.some(id => id.startsWith('mood-tag:outside'))).toBe(false);
    const habit = r.ready.find(f => f.id === `habit:${HABIT}:mood`)!;
    expect(habit.sentence).toBe('On days you did “Fictional stretch”, your mood that day averaged 4.0 of 5; on scheduled days you did not, 2.0.'.replace('2.0.', '2.0 of 5.'));
    expect(habit.label).toBe('consistent');
    for (const f of r.ready) for (const w of FORBIDDEN_INSIGHT_WORDS) expect(f.sentence.split(f.factor).join(' ')).not.toMatch(new RegExp(`\\b${w}\\b`, 'i'));
    expect(r.unclear).toBeGreaterThan(0);
  });
  it('below 14 days a side it is still collecting; with no factor at all the card has nothing to compare', () => {
    process.env.TZ = 'UTC';
    expect(factorEffects({...world(20), today: TODAY})).toMatchObject({ready: []});
    expect(factorEffects({...world(20), today: TODAY}).collecting).toBeGreaterThan(0);
    expect(factorEffects({habits: emptyHabitData(), health: createEmptyHealth() as HealthData, today: TODAY}).factors).toBe(0);
  });
  it('q3 #8: symptoms and supplements are factors, and mood is read the next day too', () => {
    process.env.TZ = 'UTC';
    const base = world(60), start = addLocalDays(TODAY, -59), days: Record<string, Record<string, number>> = {}, log: {itemId: string; date: string; status: string}[] = [];
    for (let i = 0; i < 60; i++) {
      const day = addLocalDays(start, i), even = i % 2 === 0;
      days[day] = {headache: even ? 0 : 2};                           // the headache days are the low-mood days
      log.push({itemId: 'supp_fictional-d', date: day, status: even ? 'taken' : 'skipped'});
    }
    const all = factorEffects({...base, today: TODAY,
      symptoms: {items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom'}], days},
      supplements: {items: [{id: 'supp_fictional-d', name: 'Fictional vitamin D', kind: 'supplement', times: ['08:00'], weekdays: 127, createdAt: `${addLocalDays(start, -1)}T08:00:00.000Z`}], log}}, 40);
    const headache = all.ready.find(f => f.id === 'symptom:headache:mood')!;
    expect(headache.sentence).toBe('On days you rated “Fictional headache” above None, your mood that day averaged 2.0 of 5; on days rated None, 4.0 of 5.');
    expect(headache.lag).toBe(0);
    const vitamin = all.ready.find(f => f.id === 'supplement:supp_fictional-d:mood')!;
    expect(vitamin.sentence).toBe('On days you took “Fictional vitamin D”, your mood that day averaged 4.0 of 5; on days you did not, 2.0 of 5.');
    // The next day: a taken day is followed by a low-mood day in this world.
    const next = all.ready.find(f => f.id === 'supplement:supp_fictional-d:mood:next')!;
    expect(next.lag).toBe(1);
    expect(next.sentence).toBe('On days you took “Fictional vitamin D”, your mood the next day averaged 2.0 of 5; on days you did not, 4.0 of 5.');
    expect(next.withA.days + next.withoutA.days).toBe(59); // the last day has no next day yet
  });
});
