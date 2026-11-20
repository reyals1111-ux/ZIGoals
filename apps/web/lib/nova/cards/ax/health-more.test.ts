import {expect, test} from 'vitest';
import {createEmptyHealth, healthSchema} from '../../../health';
import {buildShowcase} from '../../../showcase-data';
import {emptyWorkouts, workoutsSchema} from '../../../workouts/schema';
import {AX_HEALTH_LINES} from '../../summon/ax-lines-health';
import type {LineData} from '../../summon/lines';
import {AS_HEALTH} from '../../widgets/catalog-as-health';
import {COMPARE_REFS, compareRef, healthCompare} from './health-compare';
import {nutritionGauges} from './health-gauges';
import {moodMap, moodWord, stepsHeat} from './health-heat';

/** Session AS (ADR-042 Part 2): gauges, heat, the mood map and the twins of Health, and the line of every Health answer widget (the Showcase on 17 November 2026). */
const DAY = '2026-11-17', records = buildShowcase(DAY, 'UTC').records, NOW = new Date(`${DAY}T19:00:00Z`);
const health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)), workouts = workoutsSchema.parse(JSON.parse(records['zigoals:workouts:v1']!));

test('nutrition gauges: today’s four entries against the person’s own targets; over a target is said, not judged', () => {
  const view = nutritionGauges(health, DAY);
  expect(view.entries).toBe(4);
  expect(view.gauges.map(g => [g.key, g.amount, g.target])).toEqual([['kcal', 1970, 2200], ['protein', 131, 120], ['carbs', 217, 260], ['fat', 65, 73]]);
  expect(view.gauges[0]!.share).toBeCloseTo(1970 / 2200, 5);
  expect(view.gauges[1]).toMatchObject({share: 1, over: true, words: '131 g of your 120 g, 11 g over'});
  expect(view.words).toMatchObject({figure: '1,970', unit: 'kcal', label: 'eaten today · of your 2,200 kcal', note: 'Protein 131 g · Carbs 217 g · Fat 65 g'});
  // Without a target: the amount only.
  const free = nutritionGauges({...health, targets: {...health.targets, kcal: null, fatMg: null}}, DAY);
  expect(free.gauges[0]).toMatchObject({amount: 1970, target: null, share: null, words: '1,970 kcal, no target set'}); expect(free.gauges[3]).toMatchObject({target: null, share: null});
  expect(free.words.label).toBe('eaten today · no calorie target');
  // A day with no food logged is unknown, never zero.
  const none = nutritionGauges(health, '2026-11-18');
  expect(none.entries).toBe(0); expect(none.gauges.every(g => g.amount === null && g.share === null && g.figure === '—')).toBe(true);
});
test('steps heat: 13 weeks from Monday 24 August, lit by the 8,000 target; the gap of a month is unlit', () => {
  const view = stepsHeat(health, DAY);
  expect(view.weeks).toHaveLength(13); expect(view.weeks.every(w => w.length === 7)).toBe(true);
  expect(view).toMatchObject({from: '2026-08-24', to: DAY, days: 86, logged: 56, target: 8000, any: true});
  expect(view.average).toBeCloseTo(421950 / 56, 5); expect(view.best).toEqual({date: '2026-08-28', value: 9800});
  const cells = view.weeks.flat(), of = (date: string) => cells.find(c => c.date === date)!;
  expect(of('2026-08-24')).toMatchObject({state: 'lit', level: 3, value: 9500}); expect(of('2026-08-25')).toMatchObject({level: 2, value: 5650}); // half or more, under the target
  expect(of('2026-09-19')).toMatchObject({state: 'none', level: 0, value: null}); expect(of('2026-10-18').state).toBe('none'); // 19 September to 18 October: nothing logged
  expect(of(DAY)).toMatchObject({state: 'lit', level: 3, value: 8800, today: true}); expect(of('2026-11-18')).toMatchObject({state: 'ahead', value: null});
  expect(cells.filter(c => c.state === 'none')).toHaveLength(30); expect(cells.filter(c => c.state === 'ahead')).toHaveLength(5);
  expect(view.months).toEqual([{week: 2, label: 'Sep'}, {week: 6, label: 'Oct'}, {week: 10, label: 'Nov'}]); // August has one week of room: left out
  expect(view.words).toMatchObject({figure: '7,535', unit: 'steps a day', note: '56 of 86 days logged · target 8,000 reached on 25 · highest 9,800 steps, Fri, Aug 28'});
  // A day far over the target is the brightest step; a day under half the dimmest.
  const more = stepsHeat({...health, activity: [...health.activity, {...health.activity[0]!, id: 'health_activity-extra-1', date: '2026-11-17', steps: 1300}, {...health.activity[0]!, id: 'health_activity-extra-2', date: '2026-11-14', steps: 100}]}, DAY);
  expect(more.weeks.flat().find(c => c.date === DAY)).toMatchObject({level: 4, value: 10100}); expect(more.weeks.flat().find(c => c.date === '2026-11-14')!.level).toBe(2);
  const low = stepsHeat({...health, activity: health.activity.map(a => a.date === '2026-11-13' ? {...a, steps: 3000} : a)}, DAY);
  expect(low.weeks.flat().find(c => c.date === '2026-11-13')!.level).toBe(1);
});
test('the mood map: the Showcase keeps twelve example moods; with moods, a month of days by their own step and counts in words', () => {
  // Session AU (D8, deliberate): the Showcase's example moods, Nov 4 – Nov 16 without Nov 11 (lib/showcase/au-examples.ts).
  expect(moodMap(health.moods?.days ?? {}, undefined, DAY)).toMatchObject({any: true, logged: 12, counts: [0, 2, 5, 3, 2]});
  expect(moodMap(health.moods?.days ?? {}, undefined, DAY).words).toMatchObject({figure: '12', note: 'Most often: Okay (5 days)'});
  const days = {'2026-11-02': {mood: 4}, '2026-11-03': {mood: 4}, '2026-11-09': {mood: 2}, '2026-11-17': {mood: 5}, '2026-10-30': {mood: 1}};
  const view = moodMap(days, undefined, DAY);
  expect(view).toMatchObject({logged: 4, counts: [0, 1, 0, 2, 1], any: true}); // 30 October is outside this month
  expect(view.view.weeks).toHaveLength(6);
  const cells = view.view.weeks.flat();
  expect(cells.find(c => c.date === '2026-11-02')).toMatchObject({value: 4, inPeriod: true}); expect(cells.find(c => c.date === '2026-11-04')).toMatchObject({value: null, state: 'none'});
  expect(view.words).toMatchObject({figure: '4', unit: 'days', label: 'with a mood · this month', note: 'Most often: Good (2 days)'});
  expect(view.words.rows).toContainEqual(['Good', '2 days: Nov 2, Nov 3']); expect(view.words.rows).toContainEqual(['Okay', 'No day']);
  expect(view.key.map(k => k[1])).toEqual(['Hard', 'Low', 'Okay', 'Good', 'Great', 'No mood kept']); expect(moodWord(5)).toBe('Great');
});
test('twins: this week beside the same days of the week before, per measure; a side with nothing logged is unknown', () => {
  const steps = healthCompare(undefined, health, workouts, undefined, DAY); // no ref: steps; no period: this week
  expect(steps).toMatchObject({ref: 'steps', now: {label: 'This week', text: '16,900 steps', value: 16900}, was: {label: 'Before · Nov 9 – Nov 10', text: '14,100 steps', value: 14100}, delta: '2,800 steps more than the period before'});
  expect(steps.words).toMatchObject({figure: '16,900', unit: 'steps', label: 'steps · this week', asOf: 'this week beside Nov 9 – Nov 10'});
  const water = healthCompare('water', health, workouts, undefined, DAY); // 10 November holds no water
  expect(water).toMatchObject({now: {value: 3100}, was: {value: 2100, text: '2,100 mL'}, delta: '1,000 mL more than the period before'});
  const sleep = healthCompare('sleep', health, workouts, undefined, DAY); // a level: a night's average
  expect(sleep).toMatchObject({now: {text: '6 h 57 min on average', value: 417}, delta: '21 min less than the period before'});
  expect(sleep.words).toMatchObject({figure: '6', unit: 'h 57 min', label: 'sleep, a night on average · this week'});
  const meditation = healthCompare('meditation', health, workouts, undefined, DAY);
  expect(meditation).toMatchObject({now: {text: '2 sessions · 15 minutes'}, was: {text: '2 sessions · 13 minutes'}, delta: '2 minutes more than the period before'});
  const gym = healthCompare('workouts', health, workouts, undefined, DAY); // no workout on 9 or 10 November
  expect(gym).toMatchObject({now: {text: '1 workout · 49 minutes', value: 49}, was: {text: 'nothing logged', value: null}, delta: null});
  expect(gym.words.note).toBe('Nothing logged in the period before');
  const month = healthCompare('steps', health, workouts, 'last-month', DAY);
  expect(month.was).toMatchObject({label: 'Before · Sep 1 – Sep 30'}); expect(month.now.label).toBe('Last month');
  expect(healthCompare('vitals', health, workouts, undefined, DAY)).toMatchObject({any: false, now: {value: null}, was: {value: null}, delta: null});
  expect(compareRef('nope')).toBe('steps'); expect(compareRef('weight')).toBe('weight'); expect(COMPARE_REFS).toHaveLength(9);
});
test('nothing recorded: no gauge, no cell and no side holds a value', () => {
  const empty = createEmptyHealth();
  expect(nutritionGauges(empty, DAY)).toMatchObject({entries: 0, any: false});
  expect(stepsHeat(empty, DAY)).toMatchObject({logged: 0, average: null, best: null, any: false});
  expect(stepsHeat(empty, DAY).weeks.flat().every(c => c.value === null && c.level === 0)).toBe(true);
  for (const ref of COMPARE_REFS) expect(healthCompare(ref, empty, emptyWorkouts(), undefined, DAY), ref).toMatchObject({any: false, now: {value: null}, was: {value: null}, delta: null});
});
test('every Health answer widget has its line, in English and Dutch: one or two sentences, a full stop, no ISO date', () => {
  const data = {gateOpen: () => true, day: DAY, healthDay: DAY, health, workouts, fasting: health.fasting} as unknown as LineData;
  const fresh = {gateOpen: () => true, day: DAY, healthDay: DAY, health: createEmptyHealth(), workouts: emptyWorkouts(), fasting: {version: 1, sessions: []}} as unknown as LineData;
  expect(Object.keys(AX_HEALTH_LINES).sort()).toEqual(AS_HEALTH.map(w => w.id).sort());
  for (const w of AS_HEALTH) for (const lang of ['en', 'nl'] as const) for (const d of [data, fresh]) {
    const text = AX_HEALTH_LINES[w.id]!(undefined, d, lang, NOW);
    expect(text, w.id).toBeTypeOf('string');
    expect(text!.length, `${w.id}: ${text}`).toBeLessThanOrEqual(190); expect(text!, w.id).toMatch(/\.$/); expect(text!, w.id).not.toMatch(/\d{4}-\d{2}-\d{2}|^[•*-]\s|\n/);
    expect(text!.match(/[.!?](?=\s|$)/g)!.length, `${w.id}: ${text}`).toBeLessThanOrEqual(2);
  }
  const en = (id: string) => AX_HEALTH_LINES[id]!(undefined, data, 'en', NOW), nl = (id: string) => AX_HEALTH_LINES[id]!(undefined, data, 'nl', NOW);
  expect(en('water-days')).toBe('Water: target reached on 14 of 16 days this month, below your target on 0, nothing logged on 2. Today is still open.');
  expect(nl('steps-days')).toBe('Stappen: doel gehaald op 8 van 17 dagen deze maand, onder je doel op 9.');
  expect(en('workout-days')).toBe('Workouts: a workout logged on 9 of 16 days this month.');
  expect(en('health-scan')).toBe('On record: sleep 7 h 17 min, 8,800 steps today, water 1,000 mL today, weight 73.48 kg.');
  expect(en('body-scan')).toBe('Latest measurements: waist 84 cm (today), weight 73.48 kg (yesterday).');
  expect(en('weight-trend')).toBe('Weight: 73.48 kg (Mon, Nov 16), down 1.1 kg since Oct 19. Your goal is 72 kg.');
  expect(en('sleep-stages')).toBe('Sleep stages: recorded for 0 of 6 nights in the last 7 days.');
  expect(nl('fasting-windows')).toBe('Laatste vastenperiode: 16 h van een doel van 16 h, begonnen op Nov 16. Er loopt geen vastenperiode.');
  expect(en('steps-heat')).toBe('Steps: 7,535 a day on average over the last 13 weeks, on 56 of 86 days logged. Your target of 8,000 was reached on 25.');
  expect(en('health-compare')).toBe('Steps: 16,900 steps this week; 14,100 steps the period before (Mon, Nov 9 to Tue, Nov 10), 2,800 steps more.');
  expect(en('heart-trend')).toBe('No heart rate is recorded yet.'); expect(nl('mood-map')).toBe('Een stemming bewaard op 12 dagen deze maand; meestal Oké (5 dagen).'); // Session AU (D8, deliberate): the Showcase's example moods
  expect(AX_HEALTH_LINES['health-compare']!({ref: 'water'}, data, 'en', NOW)).toMatch(/^Water: 3,100 mL this week; 2,100 mL the period before/);
  // Records that were not read give no line (the widget says why).
  expect(AX_HEALTH_LINES['health-scan']!(undefined, {gateOpen: () => true, day: DAY, healthDay: DAY} as unknown as LineData, 'en', NOW)).toBeNull();
});
