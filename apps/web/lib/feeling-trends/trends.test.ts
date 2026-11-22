import {describe, expect, test} from 'vitest';
import {feelingTrends, measureOptions, weeklyMeasure, weekOf} from './trends';
import {createEmptyHealth, healthSchema, type HealthData} from '../health';
import {emptyEnergy, rateEnergy} from '../energy/schema';
import {emptySymptoms, symptomsSchema} from '../symptoms/schema';
import {addLocalDays} from '../local-date';
import {createHabit, emptyHabitData, logHabitValue} from '../habits';
import {readCheckin, setGraph} from '../checkin-extras/rule';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';

/** Session AV lane 2 (habits pillar; LEDGER #66, #67): mood, energy and symptoms against your usual; the week-by-week graph. */
const TODAY = '2026-11-18', AT = '2026-11-18T20:00:00.000Z';
function withMoods(days: Record<string, number>): HealthData {
  return healthSchema.parse({...createEmptyHealth(), schemaVersion: 4, moods: {version: 1, days: Object.fromEntries(Object.entries(days).map(([d, mood]) => [d, {mood, at: AT}]))}});
}
const back = (n: number) => addLocalDays(TODAY, -n);
describe('your usual', () => {
  test('mood: the last 90 days lower than the year; energy still collecting; a symptom level', () => {
    const days: Record<string, number> = {};
    for (let i = 0; i < 200; i++) days[back(i)] = i < 90 ? 2 : 4;
    let energy = emptyEnergy();
    for (let i = 0; i < 10; i++) energy = rateEnergy(energy, back(i), 3, AT);
    const symptoms = symptomsSchema.parse({...emptySymptoms(), items: [{id: 'headache', name: 'Headache', kind: 'symptom', createdAt: AT}], days: Object.fromEntries(Array.from({length: 150}, (_, i) => [back(i), {headache: i < 30 ? 2 : 0}]))});
    const t = feelingTrends({health: withMoods(days), energy, symptoms}, TODAY);
    const mood = t.ready.find(r => r.id === 'mood')!;
    expect(mood).toMatchObject({direction: 'down', recent: {days: 90, value: 2}, usual: {days: 200}, scale: 5});
    expect(mood.usual.value).toBeCloseTo((90 * 2 + 110 * 4) / 200, 5);
    expect(t.pending.find(p => p.id === 'energy')).toMatchObject({recentDays: 10, yearDays: 10, needRecent: 20, needYear: 60});
    expect(t.ready.find(r => r.id === 'symptom:headache')).toMatchObject({direction: 'up', scale: 3});
  });
  test('nothing answered: nothing listed', () => {
    expect(feelingTrends({health: withMoods({})}, TODAY)).toEqual({ready: [], pending: []});
  });
});
describe('week by week', () => {
  test('a week\'s average of answered days; a week without a record is null; a habit as its share of due days', () => {
    const health = withMoods({[back(0)]: 5, [back(1)]: 3, [back(15)]: 1});
    const w = weeklyMeasure({health}, 'mood', TODAY, 4);
    expect(w.map(x => x.week)).toEqual([addLocalDays(weekOf(TODAY), -21), addLocalDays(weekOf(TODAY), -14), addLocalDays(weekOf(TODAY), -7), weekOf(TODAY)]);
    expect(w.at(-1)).toEqual({week: weekOf(TODAY), value: 4, days: 2});
    expect(w[0]!.value).toBeNull();
    const id = '00000000-0000-4000-8000-0000000000d1';
    let habits = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1}, new Date(`${back(20)}T10:00:00`), id);
    habits = logHabitValue(habits, id, weekOf(TODAY), 1, {}, new Date(`${TODAY}T10:00:00`));
    const h = weeklyMeasure({health, habits}, `habit:${id}`, TODAY, 1)[0]!;
    expect(h.days).toBe(2); // Monday and Tuesday are due; today (Wednesday) still open does not count
    expect(h.value).toBe(50);
    expect(measureOptions({health, habits}).map(o => o.id)).toEqual(['mood', 'energy', 'sleep', 'steps', `habit:${id}`]);
  });
  test('the chosen measures are kept (at most four, known shapes only)', () => {
    const e = setGraph(emptyEnergy(), ['mood', 'symptom:headache', 'steps']);
    expect(readCheckin(e).graph).toEqual(['mood', 'symptom:headache', 'steps']);
    expect(() => setGraph(e, ['mood', 'energy', 'sleep', 'steps', 'symptom:x'])).toThrow(/up to 4/);
    expect(() => setGraph(e, ['calories'])).toThrow();
    expect(readCheckin({checkin: {graph: ['mood', 'nonsense', 'mood']}}).graph).toEqual(['mood']);
    expect(readCheckin(setGraph(e, [])).graph).toEqual([]);
  });
  test('NOVA and ZIGi: mood and energy against your usual, EN and NL', () => {
    // The answers count from the harness day (17 Nov), one day before TODAY here, so the year holds 119 of the 120 days.
    const days: Record<string, number> = {};
    for (let i = 0; i < 120; i++) days[back(i)] = i < 90 ? 4 : 2;
    const s = {...showcaseAll(), health: withMoods(days), energy: emptyEnergy()};
    const text = (q: string) => { const r = av2HabitsAnswer(q, zigiEnv(s)); return r && 'text' in r ? r.text : ''; };
    expect(text('how is my mood compared to usual')).toMatch(/^Mood: up — last 90 days 4 of 5 \(90 days\), your usual 3[.,]5 \(119 days\)\. Up or down/);
    expect(text('hoe is mijn stemming vergeleken met normaal')).toMatch(/^Stemming: hoger — laatste 90 dagen 4 van 5 \(90 dagen\), je gewoonlijke 3,5 \(119 dagen\)\./);
  });
});
