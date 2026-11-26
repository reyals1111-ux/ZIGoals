import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, test} from 'vitest';
import {buildPlan, type PlanInput} from './notify/plan';
import {DEFAULT_ON, emptyNotifyPrefs, NOTIFY_TYPES, setType, typeOn} from './notify/prefs';
import {NOTIFY_LABELS} from './notify/labels';
import {zonedInstant} from './notify/zone';
import {monthlyDates, weighedInOn, weighInDueOn, weighInMask, weighInPlanInput, weighInWords, withWeighIn} from './weigh-in';
import {createEmptyHealth} from './health';
import {saveMeasurement} from './body-measurements';

/**
 * Session AV lane 2 (health r3; LEDGER #286, Carb Manager): an opt-in weigh-in reminder every day, on chosen weekdays or
 * once a month, at a chosen time, skipped once a weight is logged that day; TIER 3 (PWA): the plan's `weighIn` kind and
 * the service worker's line. Never a weight.
 */
const ZONE = 'UTC', TODAY = '2026-11-23', NOW = Date.UTC(2026, 10, 23, 6, 0); // Monday 06:00
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '06:30'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; data: {url: string}}}}).self.zigoalsCompose;
};

describe('the weigh-in reminder (LEDGER #286)', () => {
  test('a new type, on by default, whose reminder is off until set; setting it switches the type on', () => {
    expect(NOTIFY_TYPES).toContain('weighIn');
    expect(DEFAULT_ON.weighIn).toBe(true);
    expect(NOTIFY_LABELS.weighIn.blurb).toContain('Never a weight');
    const p = withWeighIn(setType(emptyNotifyPrefs(), 'weighIn', false), {time: '07:15', repeat: 'weekdays', weekdays: 1 | 8});
    expect(p.weighIn).toEqual({time: '07:15', repeat: 'weekdays', weekdays: 9});
    expect(typeOn(p, 'weighIn')).toBe(true);
    expect(withWeighIn(p, null).weighIn).toBeUndefined();
    expect(withWeighIn(p, {time: '07:00', repeat: 'monthly', day: 31}).weighIn).toEqual({time: '07:00', repeat: 'monthly', day: 28});
  });
  test('the words and the days', () => {
    expect(weighInWords({time: '07:15', repeat: 'weekdays', weekdays: 9})).toBe('Mon and Thu at 07:15');
    expect(weighInWords({time: '07:15', repeat: 'daily'})).toBe('Every day at 07:15');
    expect(weighInWords({time: '07:15', repeat: 'monthly', day: 2})).toBe('On the 2nd of each month at 07:15');
    expect(weighInMask({time: '07:15', repeat: 'daily'})).toBe(127);
    expect(monthlyDates({time: '07:00', repeat: 'monthly', day: 1}, TODAY)).toEqual(['2026-12-01']);
    // Session AV lane 2 (review B3B-3, deliberate): the plan input takes whether today has a weight (weighedInOn), not the list.
    expect(weighInPlanInput({time: '07:00', repeat: 'daily'}, true, TODAY)).toEqual({time: '07:00', weekdays: 127, dates: [], doneToday: true});
  });
  test('the plan wakes on its weekdays, quiet once a weight is logged today; never a weight in the line', () => {
    const w = weighInPlanInput({time: '07:15', repeat: 'weekdays', weekdays: 1 | 2}, false, TODAY)!;
    const plan = buildPlan(base({weighIn: w}));
    const items = plan.snapshot.items.filter(i => i.kind === 'weighIn');
    expect(items.map(i => i.at)).toEqual([zonedInstant(TODAY, '07:15', ZONE), zonedInstant('2026-11-24', '07:15', ZONE)]);
    expect(plan.registration.wakes).toContainEqual({m: 7 * 60 + 15, d: 3});
    const said = composer()(plan.snapshot, zonedInstant(TODAY, '07:15', ZONE));
    expect(said.body).toContain('Time to weigh in');
    expect(said.body).not.toMatch(/kg|lb|\d+\.\d/);
    expect(said.data.url).toContain('/app/health?view=weight');
    const done = buildPlan(base({weighIn: {...w, doneToday: true}})).snapshot.items.filter(i => i.kind === 'weighIn');
    expect(done.map(i => i.at)).toEqual([zonedInstant('2026-11-24', '07:15', ZONE)]);
    expect(buildPlan(base({weighIn: w, prefs: setType(emptyNotifyPrefs(), 'weighIn', false)})).snapshot.items.filter(i => i.kind === 'weighIn')).toEqual([]);
  });
  test('once a month: a one-off wake on its day; inside quiet hours it is refused and said', () => {
    const w = weighInPlanInput({time: '07:00', repeat: 'monthly', day: 24}, false, TODAY)!;
    const plan = buildPlan(base({weighIn: w}));
    expect(plan.snapshot.items.filter(i => i.kind === 'weighIn').map(i => i.id)).toEqual(['weigh-in@2026-11-24']);
    expect(plan.registration.once).toContain(Math.floor(zonedInstant('2026-11-24', '07:00', ZONE) / 60000));
    expect(buildPlan(base({weighIn: {...w, time: '05:00'}})).refused).toEqual([{kind: 'weighIn', time: '05:00'}]);
  });
  // Session AV lane 2 (review B3B-3): a timed weight reading from Health → Measurements counts as weighed in, on its own zone's day.
  test('weighed in: the daily weight list, or a timed weight reading on that day of its zone', () => {
    const empty = createEmptyHealth();
    expect(weighedInOn(empty, TODAY)).toBe(false);
    expect(weighedInOn({...empty, weights: [{id: 'health_w0000001', date: TODAY, grams: 70_000, createdAt: '2026-11-23T07:00:00.000Z', updatedAt: '2026-11-23T07:00:00.000Z'}]}, TODAY)).toBe(true);
    const timed = saveMeasurement(empty, {id: 'health_wtimed001', kind: 'weight', quantityMilli: 70_500, unit: 'kg', observedAt: '2026-11-22T23:30:00+00:00', timezone: 'Europe/Amsterdam', sourceLabel: 'Manual'}, '2026-11-23T07:00:00.000Z');
    expect(weighedInOn(timed, TODAY)).toBe(true);
    expect(weighedInOn(timed, '2026-11-22')).toBe(false);
    expect(weighedInOn(null, TODAY)).toBe(false);
  });
  // Session AV lane 2 (review B3B-9): the card's "today's reminder stays quiet" only on a reminder day.
  test('a reminder day: its weekdays, or its day of the month', () => {
    expect(weighInDueOn({time: '07:00', repeat: 'weekdays', weekdays: 1}, TODAY)).toBe(true); // Monday
    expect(weighInDueOn({time: '07:00', repeat: 'weekdays', weekdays: 8}, TODAY)).toBe(false);
    expect(weighInDueOn({time: '07:00', repeat: 'daily'}, TODAY)).toBe(true);
    expect(weighInDueOn({time: '07:00', repeat: 'monthly', day: 1}, TODAY)).toBe(false);
    expect(weighInDueOn({time: '07:00', repeat: 'monthly', day: 23}, TODAY)).toBe(true);
  });
});
