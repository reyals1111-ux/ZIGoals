import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {weightTrend, weeklyRateOf, TREND_ALPHA} from './trend';
import {energyEstimate, suggestedTarget, ENERGY_MIN_LOGGED_DAYS} from './energy';
import {coachCheckIn} from './coach';
import {answerCoach, emptyHealthCoach} from './coach-schema';
import {sleepScore} from './sleep-score';
import {fastingTimeline} from './fasting-timeline';
import {foodInsights} from './food-insights';
import {microDay, richIn, setMicroTarget, emptyMicroTargets, DEFAULT_MICRO_TARGETS} from './micro';
import {netCarbs, setMacroMode, splitGrams, emptyMacroMode} from './macro-mode';
import {showcaseSleep} from '../sleep/showcase';

const TODAY = '2026-10-07';
const stamp = (d: string, t = '08:00') => `${d}T${t}:00.000Z`;
function withWeights(h: HealthData, from: number, every = 2, start = 74000, perDay = -50): HealthData {
  const weights = []; for (let i = from; i >= 0; i -= every) { const d = addLocalDays(TODAY, -i); weights.push({id: `health_weight-${String(i).padStart(3, '0')}`, date: d, grams: start + (from - i) * perDay, createdAt: stamp(d), updatedAt: stamp(d)}); }
  return {...h, weights};
}
function withDiary(h: HealthData, days: number, kcalPerDay = 2200, extra: Partial<HealthData['foods'][number]['nutrients']> = {}): HealthData {
  const food = {id: 'health_food-0001', name: 'Fictional bowl', brand: '', servingGrams: 300, nutrients: {kcal: kcalPerDay / 2, proteinMg: 30000, carbsMg: 60000, fatMg: 20000, ...extra}, createdAt: stamp('2026-09-01'), updatedAt: stamp('2026-09-01')};
  const diary = []; for (let i = 0; i < days; i++) { const d = addLocalDays(TODAY, -i); for (const [k, meal, t] of [['a', 'Lunch', '12:00'], ['b', 'Dinner', i % 3 === 0 ? '21:30' : '19:00']] as const) diary.push({id: `health_diary-${String(i).padStart(3, '0')}${k}`, sourceId: food.id, sourceKind: 'food' as const, snapshot: {name: food.name, servingGrams: 300, nutrients: {...food.nutrients}}, date: d, meal, quantityMilli: 1000, createdAt: stamp(d, t), updatedAt: stamp(d, t)}); }
  return healthSchema.parse({...h, foods: [food], diary});
}

describe('N2 weight trend', () => {
  test('an EWMA over daily readings, carried across gaps, with the weekly rate and goal line', () => {
    const h = withWeights(createEmptyHealth(), 40); h.targets.weightGrams = 70000;
    const t = weightTrend(h, TODAY);
    expect(t.points).toHaveLength(42); expect(t.readings).toBe(21); expect(t.goalGrams).toBe(70000);
    expect(t.points[41]!.grams).toBe(72000); expect(t.latestTrend).toBeLessThan(74000); expect(t.latestTrend).toBeGreaterThan(72000);
    expect(t.weeklyRate).toBeLessThan(0); expect(t.weeklyRate).toBeGreaterThan(-700);
    // a single reading moves the line a tenth of the way
    const one = weightTrend({...createEmptyHealth(), weights: [{id: 'health_weight-001', date: addLocalDays(TODAY, -1), grams: 70000, createdAt: stamp(TODAY), updatedAt: stamp(TODAY)}, {id: 'health_weight-002', date: TODAY, grams: 71000, createdAt: stamp(TODAY), updatedAt: stamp(TODAY)}]}, TODAY);
    expect(one.latestTrend).toBe(Math.round(70000 + TREND_ALPHA * 1000)); expect(one.weeklyRate).toBeNull(); // the week-ago point has no trend yet
    expect(weightTrend(createEmptyHealth(), TODAY).latestTrend).toBeNull();
  });
});
describe('N1 energy estimate', () => {
  test('needs two weeks of logs and ten weights (six before Session AJ); then intake minus the trend change, with a band; unknown days are left out', () => {
    expect(energyEstimate(withDiary(createEmptyHealth(), 10), TODAY)).toMatchObject({ready: false, loggedDays: 10, weights: 0});
    const h = withWeights(withDiary(createEmptyHealth(), 28, 2200), 27, 2, 74000, -40); // −40 g a day ≈ −0.28 kg a week
    const e = energyEstimate(h, TODAY);
    expect(e.ready).toBe(true); expect(e.loggedDays).toBeGreaterThanOrEqual(ENERGY_MIN_LOGGED_DAYS); expect(e.meanIntake).toBe(2200);
    expect(e.expenditure).toBeGreaterThan(2200); expect(e.expenditure).toBeLessThan(2700); expect(e.low! < e.expenditure! && e.expenditure! < e.high!).toBe(true);
    expect(e.weeklyChangeGrams).toBeLessThan(0);
    expect(suggestedTarget(e, -0.4)).toBeLessThan(e.expenditure!); expect(suggestedTarget(e, 0)).toBe(Math.round(e.expenditure! / 10) * 10);
    expect(suggestedTarget(energyEstimate(createEmptyHealth(), TODAY), -0.4)).toBeNull();
  });
  // Session AJ (item 25): one trend for every view — the estimate's weekly change is the trend card's weekly rate (the
  // 28-day slope), so −40 g a day reads as −280 g a week in both, and the estimate waits for 10 weigh-ins.
  test('the energy estimate uses the same weekly rate as the trend card, and needs 10 weigh-ins', () => {
    const h = withWeights(withDiary(createEmptyHealth(), 28, 2200), 27, 2, 74000, -40);
    const e = energyEstimate(h, TODAY);
    expect(e.weeklyChangeGrams).toBe(weeklyRateOf(h.weights, TODAY));
    expect(e.weeklyChangeGrams).toBe(-280);
    expect(e.expenditure).toBe(2200 + 280 / 7 * 7700 / 1000);
    const nine = withWeights(withDiary(createEmptyHealth(), 28, 2200), 16, 2, 74000, -40);
    expect(nine.weights).toHaveLength(9);
    expect(energyEstimate(nine, TODAY)).toMatchObject({ready: false, weights: 9});
  });
});
describe('N3 coach check-in', () => {
  test('reads the week\'s rate in the person\'s unit, suggests from the estimate, remembers the answer per week', () => {
    const h = withWeights(withDiary(createEmptyHealth(), 28), 27, 2, 74000, -40); h.targets.weightGrams = 70000; h.targets.kcal = 2200;
    const c = coachCheckIn(h, emptyHealthCoach(), TODAY);
    expect(c.sentence).toMatch(/^This week: −0\.\d kg\/week\.$/); expect(c.answered).toBeNull(); expect(c.suggestion?.paceKg).toBe(-0.4); expect(c.currentKcal).toBe(2200);
    expect(coachCheckIn(h, emptyHealthCoach(), TODAY, 'lb').sentence).toMatch(/lb\/week/);
    const answered = answerCoach(emptyHealthCoach(), c.weekStart, 'adjust', stamp(TODAY), 2100);
    expect(coachCheckIn(h, answered, TODAY).answered).toBe('adjust');
    expect(coachCheckIn(createEmptyHealth(), emptyHealthCoach(), TODAY).sentence).toMatch(/Log a weight/);
  });
});
describe('N10 sleep score', () => {
  test('a transparent score from duration, consistency and debt; fewer than three nights gives none', () => {
    const s = sleepScore(showcaseSleep(TODAY), TODAY);
    expect(s.nights).toBeGreaterThanOrEqual(3); expect(s.score).toBeGreaterThan(40); expect(s.score).toBeLessThanOrEqual(100);
    expect(s.duration.points + s.consistency.points + s.debt.points).toBeGreaterThanOrEqual(s.score! - 2);
    expect(s.formula).toContain('duration 50');
    expect(sleepScore({version: 1, nights: []}, TODAY).score).toBeNull();
  });
});
describe('N8 fasting timeline', () => {
  test('hours against neutral milestones, the target marked, no claims', () => {
    const session = {id: 'fast_1', startedAt: stamp(addLocalDays(TODAY, -1), '20:00'), endedAt: null, targetHours: 16, timeZone: 'UTC'};
    const t = fastingTimeline(session, new Date(stamp(TODAY, '10:00')));
    expect(t.hours).toBeCloseTo(14); expect(t.running).toBe(true); expect(t.stops.map(s => [s.hours, s.reached, s.target])).toEqual([[12, true, false], [16, false, true], [18, false, false], [24, false, false]]);
    expect(t.stops.every(s => !/burn|ketosis|detox|autophagy|fat/i.test(s.line))).toBe(true);
    const done = fastingTimeline({...session, endedAt: stamp(TODAY, '12:30')}, new Date(stamp(TODAY, '18:00')));
    expect(done.hours).toBeCloseTo(16.5); expect(done.running).toBe(false); expect(done.share).toBe(1);
    expect(fastingTimeline({...session, targetHours: 14}, new Date(stamp(TODAY, '10:00'))).stops.map(s => s.hours)).toEqual([12, 14, 16, 18, 24]);
  });
});
describe('N12 food insights', () => {
  test('cards over the diary: best-protein days, late eating, most-logged, weekday vs weekend; nothing under seven days', () => {
    expect(foodInsights(withDiary(createEmptyHealth(), 5), TODAY)).toEqual([]);
    const cards = foodInsights(withDiary(createEmptyHealth(), 20), TODAY, 'UTC');
    expect(cards.map(c => c.id)).toEqual(['protein-days', 'late-evening', 'most-logged', 'weekday-weekend']);
    expect(cards[1]!.line).toMatch(/after 21:00 on 7 of 20 days/);
    expect(cards.every(c => !/should|bad|guilty|too much/i.test(`${c.title} ${c.line}`))).toBe(true);
  });
});
describe('N4 micronutrients and N7 macro modes', () => {
  test('targets default, edit and read; totals only where the data has them; rich-in over own foods', () => {
    let r = emptyMicroTargets(); expect(microDay(withDiary(createEmptyHealth(), 1), TODAY, r).find(m => m.key === 'ironMg')).toMatchObject({total: null, known: 0, entries: 2, target: DEFAULT_MICRO_TARGETS.ironMg});
    const h = withDiary(createEmptyHealth(), 1, 2200, {ironMg: 4, fiberMg: 8000});
    expect(microDay(h, TODAY, r).find(m => m.key === 'ironMg')).toMatchObject({total: 8, known: 2});
    r = setMicroTarget(r, 'ironMg', 12); expect(microDay(h, TODAY, r).find(m => m.key === 'ironMg')!.target).toBe(12); r = setMicroTarget(r, 'ironMg', null); expect(r.targets).toBeUndefined();
    expect(richIn(h, 'ironMg')).toEqual([{id: 'health_food-0001', kind: 'food', name: 'Fictional bowl', mgPerServing: 4, serving: '300 g'}]); expect(richIn(h, 'calciumMg')).toEqual([]);
  });
  test('net carbs only when every entry has fiber; keto and custom splits in grams', () => {
    expect(netCarbs([{kcal: 500, proteinMg: 20000, carbsMg: 60000, fatMg: 10000, fiberMg: 10000}])).toEqual({grams: 50, net: true, fiberKnownOf: 1});
    expect(netCarbs([{kcal: 500, proteinMg: 20000, carbsMg: 60000, fatMg: 10000}])).toEqual({grams: 60, net: false, fiberKnownOf: 0});
    expect(netCarbs([])).toEqual({grams: null, net: false, fiberKnownOf: 0});
    let m = setMacroMode(emptyMacroMode(), 'keto'); expect(m.split).toEqual({fat: 70, protein: 25, carbs: 5});
    m = setMacroMode(m, 'custom', {fat: 30, protein: 40, carbs: 30}); expect(splitGrams(2000, m.split!)).toEqual({fat: 67, protein: 200, carbs: 150});
    expect(() => setMacroMode(m, 'custom', {fat: 50, protein: 40, carbs: 30})).toThrow();
    expect(setMacroMode(m, 'standard').split).toBeUndefined();
  });
});

// Session AH (TR10; B-011, N-058): one weekly rate whatever window a view draws, and it follows the readings.
test('the weekly rate is the readings\' own slope, the same for the card, the coach and the energy estimate', () => {
  const weights = Array.from({length: 28}, (_, i) => ({id: `health_weight-${String(i).padStart(3, '0')}`, date: addLocalDays(TODAY, i - 27), grams: Math.round(80_000 - 40 * i), createdAt: stamp(TODAY), updatedAt: stamp(TODAY)}));
  const h = {...createEmptyHealth(), weights};
  expect(weeklyRateOf(weights, TODAY)).toBe(-280);
  expect(weightTrend(h, TODAY, 14).weeklyRate).toBe(-280); expect(weightTrend(h, TODAY, 42).weeklyRate).toBe(-280);
  expect(weightTrend(h, TODAY).latestReading).toEqual({date: TODAY, grams: 80_000 - 40 * 27});
  expect(weeklyRateOf(weights.slice(-3), TODAY)).toBeNull(); // under a week of span
});
describe('Session AK (task 4.5): the weekly coach card', () => {
  test('after two weeks of weight and intake: the estimated maintenance, the trend and a small step within the rails', () => {
    const h = withWeights(withDiary(createEmptyHealth(), 28), 27, 2, 74000, -40); h.targets.weightGrams = 70000; h.targets.kcal = 2200;
    const c = coachCheckIn(h, emptyHealthCoach(), TODAY), e = energyEstimate(h, TODAY);
    expect(c.maintenance).toEqual({kcal: e.expenditure, low: e.low, high: e.high});
    expect(c.changeKcal).toBe(c.suggestion!.kcal - 2200);
    expect(Math.abs(c.changeKcal!)).toBeLessThanOrEqual(2200 * 0.15 + 10);
    expect(c.suggestion!.kcal).toBeGreaterThanOrEqual(1200);
    expect(c.progress).toMatchObject({loggedDays: 28, weights: 14, implausible: false});
  });
});
