import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {addLocalDays} from '../local-date';
import {saveNight} from '../sleep/engine';
import {emptySleep, type Sleep} from '../sleep/schema';
import {energyCurve} from '../energy-curve/curve';
import {eveningRecordSchema, type EveningRecord} from '../evening-plan/schema';
import {saveMorning, setStepReminder, tickMorning} from '../evening-plan/morning';
import {tickStep} from '../evening-plan/plan';
import {buildPlan, type PlanInput} from './plan';
import {DIP_AHEAD, ENERGY_WORDS, energyItems, WIND_DOWN_AHEAD} from './energy-items';
import {emptyNotifyPrefs, setEnergyReminder, setType} from './prefs';
import {zonedInstant} from './zone';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #235, #236, Rise): reminders from the day's energy curve (the focus window's start,
 * before the dip, the wind-down start), and a reminder at each chosen step of the morning and evening plan; off unless
 * chosen; in the app's own words, never a sleep figure; an own habit's name only where names are allowed.
 */
const ZONE = 'UTC', TODAY = '2026-11-20', NOW = Date.UTC(2026, 10, 20, 7, 30); // Friday 07:30, after waking at 07:00
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
function nights(n: number): Sleep {
  let s: Sleep = emptySleep();
  for (let i = 0; i < n; i++) { const day = addLocalDays(TODAY, -i), end = at(day, '07:00'); s = saveNight(s, {kind: 'night', start: end - 8 * 3_600_000, end, timeZone: ZONE, latencyMin: 0, awakeMin: 0}, new Date('2026-12-01T00:00:00Z')); }
  return {...s, goal: {minutes: 480, updatedAt: '2026-10-01T00:00:00.000Z'}};
}
const PLAN: EveningRecord = eveningRecordSchema.parse({version: 1, plan: {bedtime: '23:00', windDown: 45, hindrances: [], steps: [{id: 'screens-away', label: 'Screens away', minutesBefore: 45}, {id: 'habit-1-read', label: 'Read ten pages', minutesBefore: 30, habitId: 'h-read'}, {id: 'lights-out', label: 'Lights out', minutesBefore: 0}], updatedAt: '2026-11-01T00:00:00.000Z'}, days: {}});
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '23:30', to: '06:30'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; data: {url: string}}}}).self.zigoalsCompose;
};

describe('reminders from the energy curve (LEDGER #235)', () => {
  it('nothing unless chosen', () => {
    expect(energyItems({sleep: nights(10), evening: PLAN, prefs: emptyNotifyPrefs(), today: TODAY, zone: ZONE})).toEqual({once: [], daily: []});
    expect(buildPlan(base()).snapshot.items.filter(i => i.kind === 'energy')).toEqual([]);
  });
  it('at the focus window\'s start, before the dip and at the wind-down start, today and tomorrow, from the curve', () => {
    const sleep = nights(10), c = energyCurve(sleep, TODAY)!;
    let prefs = setEnergyReminder(emptyNotifyPrefs(), 'focus', true);
    prefs = setEnergyReminder(setEnergyReminder(prefs, 'dip', true), 'windDown', true);
    const e = energyItems({sleep, evening: null, prefs, today: TODAY, zone: ZONE});
    const minute = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    expect(e.once.filter(o => o.id.endsWith(`@${TODAY}`)).map(o => [o.id, o.at])).toEqual([
      [`energy:focus@${TODAY}`, at(TODAY, minute(c.focus.from))],
      [`energy:dip@${TODAY}`, at(TODAY, minute(c.dip.from - DIP_AHEAD))],
      [`energy:wind-down@${TODAY}`, at(TODAY, minute(c.bedtime.from - WIND_DOWN_AHEAD))],
    ]);
    expect(e.once).toHaveLength(6); // tomorrow's from the usual wake
    const plan = buildPlan(base({prefs, energy: e}));
    const today = plan.snapshot.items.filter(i => i.kind === 'energy' && i.id.endsWith(TODAY));
    expect(today.map(i => i.detail)).toEqual([ENERGY_WORDS.focus, ENERGY_WORDS.dip, ENERGY_WORDS.windDown]);
    expect(today.every(i => i.href === '/app/health?view=sleep' && !i.label)).toBe(true);
    expect(plan.registration.once).toContain(Math.floor(at(TODAY, minute(c.focus.from)) / 60000));
    // The registration carries minutes only.
    expect(JSON.stringify(plan.registration)).not.toMatch(/focus|dip|wind/);
  });
  it('inside quiet hours: said on the card, no wake', () => {
    const prefs = setEnergyReminder(emptyNotifyPrefs(), 'windDown', true), sleep = nights(10);
    const plan = buildPlan(base({prefs, quiet: {from: '21:00', to: '07:00'}, energy: energyItems({sleep, evening: null, prefs, today: TODAY, zone: ZONE})}));
    expect(plan.refused.some(r => r.kind === 'energy')).toBe(true);
    expect(plan.snapshot.items.filter(i => i.kind === 'energy')).toEqual([]);
  });
  it('the notification says the app\'s line and opens Sleep; never a figure', () => {
    const when = at(TODAY, '09:00');
    const out = composer()({v: 1, labels: false, items: [{at: when, kind: 'energy', id: 'energy:focus@x', detail: ENERGY_WORDS.focus, href: '/app/health?view=sleep', actionable: false}], summary: null}, when);
    expect(out.body).toBe('Your good focus window starts now (an estimate from your sleep)');
    expect(out.data.url).toBe('/app/health?view=sleep');
  });
});

describe('a reminder at each chosen step (LEDGER #236)', () => {
  it('a morning step at its minutes after the wake time; quiet once ticked', () => {
    let r = saveMorning(PLAN, ['m-daylight', 'm-coffee'], new Date(NOW));
    r = setStepReminder(r, 'm-coffee', true);
    const prefs = setType(emptyNotifyPrefs(), 'energy', true);
    const e = energyItems({sleep: nights(10), evening: r, prefs, today: TODAY, zone: ZONE});
    expect(e.once.find(o => o.id === `step:m-coffee@${TODAY}`)).toMatchObject({at: at(TODAY, '08:30'), detail: 'Morning step: First coffee or tea, once the grogginess has passed'});
    r = tickMorning(r, TODAY, 'm-coffee', true);
    expect(energyItems({sleep: nights(10), evening: r, prefs, today: TODAY, zone: ZONE}).once.some(o => o.id === `step:m-coffee@${TODAY}`)).toBe(false);
  });
  it('an evening step at its clock time each evening, quiet once ticked; an own habit named only where names are allowed', () => {
    let r = setStepReminder(setStepReminder(PLAN, 'screens-away', true), 'habit-1-read', true);
    const prefs = setType(emptyNotifyPrefs(), 'energy', true), e = energyItems({sleep: null, evening: r, prefs, today: TODAY, zone: ZONE});
    expect(e.daily.map(d => [d.id, d.time, d.detail, d.label])).toEqual([['step:screens-away', '22:15', 'Evening step: Screens away', undefined], ['step:habit-1-read', '22:30', ENERGY_WORDS.step, 'Read ten pages']]);
    const items = (labels: boolean) => buildPlan(base({prefs, labels, energy: e})).snapshot.items.filter(i => i.kind === 'energy' && i.at === at(TODAY, '22:30'));
    expect(items(false)[0]!.label).toBeUndefined();
    expect(items(true)[0]!.label).toBe('Read ten pages');
    r = tickStep(r, TODAY, 'screens-away', true);
    const ticked = buildPlan(base({prefs, energy: energyItems({sleep: null, evening: r, prefs, today: TODAY, zone: ZONE})}));
    expect(ticked.snapshot.items.some(i => i.id === 'step:screens-away' && i.at === at(TODAY, '22:15'))).toBe(false);
    expect(ticked.snapshot.items.some(i => i.id === 'step:screens-away' && i.at === at('2026-11-21', '22:15'))).toBe(true);
  });
  it('a removed step loses its reminder; a step not in the plan is refused', () => {
    const r = setStepReminder(saveMorning(PLAN, ['m-daylight'], new Date(NOW)), 'm-daylight', true);
    expect(saveMorning(r, [], new Date(NOW)).remind).toEqual([]);
    expect(() => setStepReminder(PLAN, 'm-water', true)).toThrow('no longer in your plan');
  });
});
