import {describe, expect, it} from 'vitest';
import {createEmptyHealth, dailyHealthSummary, formatHealthGrams, formatNutrient, logHealthItem, nutritionSummaryText, saveActivity, saveFood, setHealthTargets, type HealthData, type HealthFood} from '../../health';
import {addWater, dailyData, saveHealthPreferences, waterSummary} from '../../health-daily';
import {waterText} from '../../health-units';
import {createHabit, emptyHabitData, habitDay, habitStats, logHabitCount, type HabitData, type HabitInput} from '../../habits';
import {habitConsistency} from '../../life-intelligence';
import {formatNumber} from '../../visual-format';
import {paceForecast, type ForecastPoint} from '../../goal-forecast';
import type {GoalSummary} from '../../goal-summary';
import {addTask, taskCounts, tasksOnDay} from '../../tasks/engine';
import {captureInto} from '../../notes/store';
import {widgetMorphPlan, goalMorphClass, goalMorphName} from '../../motion/goal-morph';
import {arcPath, clamp01, clockAngle, polar, segmentsLit, sparkPoints, tickPath} from './geometry';
import {hudMotion} from './motion';
import {healthHud, heartLine} from './health';
import {habitsHud, streakWords} from './habits';
import {goalArcs, paceChart} from './goals';
import {purposeShare, wealthHud} from './wealth';
import {clockItems, dayCounts, nextItems, type ClockInput} from './agenda';
import {coreRings} from './core';
import {recentNotes, tasksHud} from './lists';
import {QUICK_ACTIONS, quickActionsFor} from './actions';
import {makeMotes, moteAt} from './motes';
import {WIDGETS} from '../widgets/catalog';

const DAY = '2026-11-04', AT = '2026-11-04T12:00:00.000Z';
const hid = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const food: HealthFood = {id: hid(1), name: 'Fictional oats', brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: 5000, carbsMg: 27000, fatMg: 3000}, createdAt: AT, updatedAt: AT};

describe('geometry', () => {
  it('points and arcs go clockwise from twelve o\'clock', () => {
    expect(polar(0, 0, 10, 0)).toEqual({x: 0, y: -10});
    expect(polar(0, 0, 10, 90)).toEqual({x: 10, y: 0});
    expect(arcPath(0, 0, 10, 0, 90)).toBe('M0 -10A10 10 0 0 1 10 0');
    expect(arcPath(0, 0, 10, 0, 0)).toBe('');
    expect(arcPath(0, 0, 10, 0, 360).split('A')).toHaveLength(3);
    expect(tickPath(0, 0, 8, 10, 4).match(/M/g)).toHaveLength(4);
  });
  it('segments light whole, then a part; unknown lights none', () => {
    expect(segmentsLit(0.55, 10)).toEqual({full: 5, part: 0.5});
    expect(segmentsLit(1.4, 10)).toEqual({full: 10, part: 0});
    expect(segmentsLit(null, 10)).toEqual({full: 0, part: 0});
    expect(clamp01(Number.NaN)).toBe(0);
  });
  it('a 24-hour dial and a sparkline', () => {
    expect([clockAngle('00:00'), clockAngle('06:00'), clockAngle('18:30'), clockAngle('24:00'), clockAngle(null)]).toEqual([0, 90, 277.5, null, null]);
    const pts = sparkPoints([1, null, 3], 100, 20, 0);
    expect(pts.map(p => [p.x, p.y])).toEqual([[0, 20], [100, 0]]);
  });
});

describe('motion (O5)', () => {
  it('Full turns, pulses, shimmers and ticks; Calm is slower and fewer; Off is still; a hidden tab pauses all', () => {
    const full = hudMotion({level: 'full', hidden: false, phone: false}), calm = hudMotion({level: 'calm', hidden: false, phone: false});
    expect(full).toMatchObject({state: 'full', rotate: true, shimmer: true, ticker: true, motes: true, pulse: 'glow'});
    expect(calm).toMatchObject({state: 'calm', rotate: true, shimmer: false, ticker: false, motes: false, pulse: 'fade'});
    expect(calm.rotateSeconds).toBeGreaterThan(full.rotateSeconds);
    expect(hudMotion({level: 'off', hidden: false, phone: false})).toMatchObject({state: 'still', rotate: false, pulse: 'none', motes: false});
    expect(hudMotion({level: 'full', hidden: true, phone: false})).toMatchObject({state: 'paused', rotate: false, motes: false});
    expect(hudMotion({level: 'full', hidden: false, phone: true})).toMatchObject({shimmer: false, motes: false});
  });
});

describe('health HUD reads the Health page\'s own figures', () => {
  const base = () => {
    let d: HealthData = saveFood(createEmptyHealth(), food);
    d = setHealthTargets(d, {...d.targets, kcal: 2000, proteinMg: 100_000, steps: 8000});
    d = saveHealthPreferences(d, {...dailyData(d).preferences, waterTargetMl: 2000});
    return d;
  };
  it('a fresh day: calories, steps and water unknown (never 0; review M5), no hearts for unset targets', () => {
    const hud = healthHud(base(), DAY);
    expect(hud.kcal).toMatchObject({value: null, text: '—', note: 'No meals logged today'});
    expect(hud.steps).toMatchObject({value: null, text: '—', note: 'No steps logged today'});
    // Review M5 (lane L8d): nothing logged is "—" with its reason, as for every other measure in the panel (it read "0 mL").
    expect(hud.water).toMatchObject({value: null, share: null, text: '—', targetText: waterText(2000, 'ml'), note: 'No water logged yet today'});
    expect(hud.hearts.map(h => h.key)).not.toContain('water');
    expect(hud.macros[1]).toMatchObject({key: 'carbs', target: null});
    expect(hud.heart).toBeNull();
  });
  it('logged food, water and steps: the same numbers and words as the page functions', () => {
    let d = base();
    d = logHealthItem(d, {id: hid(2), sourceId: hid(1), sourceKind: 'food', date: DAY, meal: 'Breakfast', quantityMilli: 1500}, AT);
    d = addWater(d, {id: hid(3), date: DAY, amountMilli: 250_000, unit: 'ml'}, AT);
    d = addWater(d, {id: hid(4), date: DAY, amountMilli: 500_000, unit: 'ml'}, AT);
    d = saveActivity(d, {id: hid(5), date: DAY, name: 'Walk', steps: 4321, minutes: 30}, AT);
    const hud = healthHud(d, DAY), s = dailyHealthSummary(d, DAY), w = waterSummary(d, DAY);
    expect(hud.kcal.text).toBe(`${formatNutrient(s.nutrients.kcal)} kcal`);
    expect(hud.kcal.share).toBeCloseTo(s.nutrients.kcal! / 2000);
    expect(hud.macros[0]!.text).toBe(`${formatHealthGrams(s.nutrients.proteinMg)} g`);
    expect(hud.macros[0]!.targetText).toBe(`${formatHealthGrams(100_000)} g`);
    expect(hud.water.text).toBe(waterText(w.millilitres, 'ml'));
    expect(hud.water.share).toBeCloseTo(750 / 2000);
    expect(hud.steps.text).toBe(formatNumber(4321));
    expect(hud.hearts.map(h => h.key)).toEqual(['kcal', 'protein', 'water', 'steps']);
    expect(hud.entries).toBe(1);
  });
  it('a meal without calories makes the total unknown and says how much is known (the page\'s words)', () => {
    let d = saveFood(base(), {...food, id: hid(9), nutrients: {kcal: null, proteinMg: null, carbsMg: null, fatMg: null}});
    d = logHealthItem(d, {id: hid(2), sourceId: hid(1), sourceKind: 'food', date: DAY, meal: 'Lunch', quantityMilli: 1000}, AT);
    d = logHealthItem(d, {id: hid(3), sourceId: hid(9), sourceKind: 'food', date: DAY, meal: 'Lunch', quantityMilli: 1000}, AT);
    const hud = healthHud(d, DAY);
    expect(hud.kcal).toMatchObject({value: null, text: '—', share: null, note: nutritionSummaryText(dailyHealthSummary(d, DAY), 'kcal', 'kcal')});
  });
  it('the heart line appears only with real values, two days at least, resting first', () => {
    const d = createEmptyHealth();
    const v = (date: string, more: object) => ({id: `health_vital-oura-${date}`, date, source: 'oura', updatedAt: AT, ...more});
    expect(heartLine({...d, vitals: {version: 1, days: [v('2026-11-03', {restingHr: 55})]}} as unknown as HealthData, DAY)).toBeNull();
    expect(heartLine({...d, vitals: {version: 1, days: [v('2026-11-03', {hrAvg: 70}), v('2026-11-04', {hrAvg: 72})]}} as unknown as HealthData, DAY)).toMatchObject({kind: 'average', latest: 72});
    expect(heartLine({...d, vitals: {version: 1, days: [v('2026-11-02', {restingHr: 54, hrAvg: 70}), v('2026-11-04', {restingHr: 56})]}} as unknown as HealthData, DAY)).toMatchObject({kind: 'resting', points: [{date: '2026-11-02', bpm: 54}, {date: '2026-11-04', bpm: 56}]});
    expect(heartLine({...d, vitals: {version: 1, days: [v('2026-10-01', {restingHr: 54}), v('2026-10-02', {restingHr: 56})]}} as unknown as HealthData, DAY)).toBeNull();
  });
});

describe('habits HUD reads the Habits page\'s own engine', () => {
  const input: HabitInput = {title: 'Fictional walk', category: 'Movement', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
  it('due, done, streaks against their best, the week and the 30-day consistency', () => {
    let data: HabitData = createHabit(emptyHabitData(), input, new Date('2026-10-20T12:00:00'), '59a35604-3696-4a78-b455-4015acb66885');
    data = createHabit(data, {...input, title: 'Fictional read'}, new Date('2026-10-20T12:00:00'), '59a35604-3696-4a78-b455-4015acb66886');
    for (const day of ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']) data = logHabitCount(data, '59a35604-3696-4a78-b455-4015acb66885', day, 1);
    const hud = habitsHud(data.habits, DAY), c = habitConsistency(data.habits, DAY);
    expect([hud.due, hud.done]).toEqual([2, 1]);
    expect(hud.due).toBe(data.habits.filter(h => habitDay(h, DAY, DAY).scheduled).length);
    expect(hud.rings[0]).toMatchObject({title: 'Fictional walk', streak: habitStats(data.habits[0]!, DAY).currentStreak, share: 1});
    expect(hud.week).toEqual(c.week.map(d => ({date: d.date, checkins: d.checkins, scheduled: d.scheduled})));
    expect(hud.activeDays).toBe(c.activeDays);
    expect(streakWords(1, 'days')).toBe('1 day');
    expect(streakWords(6, 'days')).toBe('6 days');
  });
});

describe('goals HUD', () => {
  const g = (key: string, progressPct: string, more: Partial<GoalSummary> = {}): GoalSummary => ({key, id: key, href: `/app/goals/${key}`, name: key, type: 'Savings', source: '', status: 'active', scene: 'garden', current: '1', currency: 'EUR', progressPct, fundingHealth: 'ON_TRACK', requiresReview: false, metadata: [], ...more});
  it('arcs in NOVA\'s one goal format; unknown is never a number; the rest counted', () => {
    const {arcs, more, active} = goalArcs([g('a', '41.66'), g('b', '12', {progressBound: 'unavailable'}), g('c', '100'), g('d', '5', {status: 'completed'}), g('e', '3')]);
    // Second review M6 (lane L8f, deliberate): the Goals page's rounding — half up (41.66 → 42%), and 100% only for a finished
    // goal, as its progress ring reads an active one at 100 (99%).
    expect(arcs.map(a => [a.text, a.pct])).toEqual([['42%', 41.66], ['Unavailable', null], ['99%', 100]]);
    expect([more, active]).toEqual([1, 4]);
  });
  it('the pace chart: a band only for an estimate, from today to the earliest and latest dates', () => {
    const points: ForecastPoint[] = [{day: '2026-09-01', value: 100}, {day: '2026-09-20', value: 300}, {day: '2026-10-10', value: 450}, {day: '2026-10-30', value: 650}];
    const f = paceForecast(points, 650, 2000, DAY), chart = paceChart(points, 650, 2000, DAY, f)!;
    expect(f.state).toBe('estimate');
    expect(chart.line[0]).toEqual({t: 0, v: 100});
    expect(chart.band!.early).toBeLessThanOrEqual(chart.band!.mid);
    expect(chart.span).toBeGreaterThanOrEqual(chart.band!.mid);
    const few = paceChart(points.slice(0, 2), 300, 2000, DAY, paceForecast(points.slice(0, 2), 300, 2000, DAY))!;
    expect(few.band).toBeNull();
    expect(paceChart([], 0, 2000, DAY, f)).toBeNull();
  });
});

describe('wealth HUD', () => {
  it('speaks in the headline currency, never converts, and uses the purpose flow\'s words', () => {
    const sub = (currency: string, value: bigint, allocated = 0n) => ({currency, value, allocated, unallocated: value - allocated});
    const hud = wealthHud({
      subtotals: [sub('USD', 100_000n, 25_000n), sub('EUR', 5_000n)], incomplete: true, missingValue: false, rows: [1, 2, 3],
      categories: [{assetClass: 'Cash', subtotals: [sub('USD', 75_000n)]}, {assetClass: 'Stocks', subtotals: [sub('USD', 25_000n), sub('EUR', 5_000n)]}, {assetClass: 'Crypto', subtotals: []}],
      history: [{currency: 'EUR', points: [{at: AT, value: '1'}]}, {currency: 'USD', points: [{at: '2026-11-01T00:00:00Z', value: '90000'}, {at: AT, value: '100000'}]}],
    }, [{currency: 'USD', assets: [], flows: [], total: 100_000n, targets: [{id: 'goal:a', label: 'Fictional bike', value: 25_000n, kind: 'goal'}, {id: 'still-available', label: 'Still available', value: 75_000n, kind: 'available'}]}]);
    expect(hud.primary?.currency).toBe('USD');
    expect(hud.otherCurrencies).toEqual(['EUR']);
    expect(hud.line.map(p => p.value)).toEqual([900, 1000]);
    expect(hud.mix.map(m => [m.assetClass, m.share])).toEqual([['Cash', 0.75], ['Stocks', 0.25]]);
    expect(hud.purpose).toMatchObject({allocated: 25_000n, available: 75_000n, shareText: '25.0%', goals: [{label: 'Fictional bike', value: 25_000n}]});
    // Second review p7 (lane L8f, deliberate): one percent style on NOVA, "33.3%" (the figure is the purpose flow's).
    expect(purposeShare(1n, 3n)).toBe('33.3%');
    expect(purposeShare(1n, 0n)).toBe('—');
    expect(wealthHud({subtotals: [], incomplete: false, missingValue: false, categories: [], history: [], rows: []}).primary).toBeNull();
  });
});

describe('agenda (P-LA-14): next three by time across every source, with their times', () => {
  const item = (id: string, source: ClockInput['source'], time: string | null, state: ClockInput['state'] = 'open'): ClockInput => ({id, source, pillar: 'habits', title: id, time, href: null, state});
  it('timed habits and a 6 PM task keep their times; done ones leave; untimed after the coming ones; past ones last', () => {
    const items = [item('meditate', 'habit', '07:00'), item('anytime', 'habit', null), item('walk', 'habit', '14:00'), item('call', 'task', '18:00'), item('read', 'habit', '19:00'), item('done', 'habit', '15:00', 'done')];
    expect(nextItems(items, '13:30').map(i => [i.id, i.time, i.when])).toEqual([['walk', '14:00', 'next'], ['call', '18:00', 'later'], ['read', '19:00', 'later']]);
    expect(nextItems(items, '20:00').map(i => [i.id, i.when])).toEqual([['anytime', 'anytime'], ['meditate', 'earlier'], ['walk', 'earlier']]);
    expect(clockItems(items).find(i => i.id === 'call')!.angle).toBe(270);
    expect(dayCounts(items)).toEqual({total: 6, done: 1, timed: 5, anytime: 1});
  });
});

describe('the core: four rings, one figure each, unknown with its reason', () => {
  it('knowns and unknowns', () => {
    const rings = coreRings({water: {share: 0.5, text: '1,000 mL', targetText: '2,000 mL'}, habits: {due: 0, done: 0}, goal: {name: 'Fictional bike', pct: 45.5, text: '45%'}, wealth: {allocated: 1n, total: 4n, shareText: '25.0%'}});
    expect(rings.map(r => [r.pillar, r.share, r.text, r.reason])).toEqual([['health', 0.5, '1,000 mL of 2,000 mL', null], ['habits', null, '—', 'No habit is due today'], ['goals', 0.455, '45%', null], ['wealth', 0.25, '25.0%', null]]);
    expect(coreRings({water: {share: null, text: '0 mL', targetText: null}, habits: null, goal: null, wealth: null}).map(r => r.reason)).toEqual(['No water target set', 'Your habits are not read yet', 'No active goal yet', 'No valued holding yet']);
    // Review M5 (lane L8d): nothing logged today is unknown with its own reason; a logged amount without a target keeps its figure.
    expect(coreRings({water: {share: null, text: '—', targetText: '2,000 mL', logged: false}, habits: null, goal: null, wealth: null})[0]).toMatchObject({share: null, text: '—', reason: 'No water logged yet today'});
    expect(coreRings({water: {share: null, text: '750 mL', targetText: null, logged: true}, habits: null, goal: null, wealth: null})[0]).toMatchObject({share: null, text: '750 mL', reason: 'No water target set'});
  });
});

describe('tasks and notes panels', () => {
  it('the counters are taskCounts; the queue is today\'s open tasks', () => {
    let r = {version: 1, tasks: []} as unknown as Parameters<typeof taskCounts>[0];
    r = addTask(r, {title: 'Fictional today', due: DAY}, {id: 'task_a', at: new Date(AT), today: DAY});
    r = addTask(r, {title: 'Fictional later', due: '2026-11-09'}, {id: 'task_b', at: new Date(AT), today: DAY});
    r = addTask(r, {title: 'Fictional someday'}, {id: 'task_c', at: new Date(AT), today: DAY});
    const hud = tasksHud(r, DAY, iso => iso.slice(0, 10));
    expect({overdue: hud.overdue, today: hud.today, open: hud.open}).toEqual(taskCounts(r, DAY));
    expect(hud.queue.map(t => t.id)).toEqual([...tasksOnDay(r, DAY, DAY, iso => iso.slice(0, 10)).map(t => t.id), 'task_c']);
  });
  it('recent captures, newest first', () => {
    let n = {version: 1, notes: []} as unknown as Parameters<typeof recentNotes>[0];
    n = captureInto(n, {text: 'Fictional first', day: DAY, now: '2026-11-04T08:00:00.000Z', id: 'n1'}).record;
    n = captureInto(n, {text: 'Fictional second', day: DAY, now: '2026-11-04T09:00:00.000Z', id: 'n2'}).record;
    expect(recentNotes(n)).toMatchObject({recent: [{id: 'n2', name: 'Fictional second'}, {id: 'n1'}], inbox: 2, total: 2});
  });
});

describe('quick actions, motes and the morph', () => {
  it('every gallery widget has at least one known quick action', () => {
    for (const w of WIDGETS) { const a = quickActionsFor(w.id); expect(a.length, w.id).toBeGreaterThan(0); for (const x of a) expect(QUICK_ACTIONS).toContain(x); }
    expect(quickActionsFor('health-hud')).toContain('water');
  });
  it('motes are seeded, rise, and fade at the edges', () => {
    const [m] = makeMotes(4);
    expect(makeMotes(4)[0]).toEqual(m);
    expect(moteAt(m!, 10).y).not.toBe(moteAt(m!, 0).y);
    expect(moteAt({...m!, y: 0, speed: 0}, 0).a).toBe(0);
  });
  it('the widget → page morph: Full grows to the window, Calm fades, Off is a plain navigation; the goal morph is unchanged', () => {
    const plan = widgetMorphPlan({x: 0, y: 0, width: 200, height: 100}, {width: 1000, height: 800}, 'full');
    expect(plan).toEqual({mode: 'zoom', dx: 400, dy: 350, scale: 8});
    expect(widgetMorphPlan({x: 0, y: 0, width: 500, height: 400}, {width: 1000, height: 800}, 'full')!.scale).toBe(2);
    expect(widgetMorphPlan({x: 0, y: 0, width: 200, height: 100}, {width: 1000, height: 800}, 'calm')).toEqual({mode: 'fade', dx: 0, dy: 0, scale: 1});
    expect(widgetMorphPlan({x: 0, y: 0, width: 200, height: 100}, {width: 1000, height: 800}, 'off')).toBeNull();
    expect(goalMorphName('a b')).toBe('zg-goal-a_b');
    expect(goalMorphClass('full')).toBe('zg-morph');
    expect(goalMorphClass('off')).toBe('none');
  });
});
