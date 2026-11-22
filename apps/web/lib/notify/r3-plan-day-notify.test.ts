import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './plan';
import {DEFAULT_ON, emptyNotifyPrefs, NOTIFY_LABELS, NOTIFY_TYPES, setType, typeOn} from './prefs';
import {zonedInstant} from './zone';

/**
 * Session AV lane 2 (r3-plan, LEDGER #256; Structured's morning planning and overdue reminders; TIER 3 (PWA)): a "Plan your
 * day" notification at the time set in Tasks, opening Plan my day, with one quiet line of how many tasks are overdue (on it,
 * else on the morning orbit) — a count, never a name, and no notification per overdue task.
 */
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 10, 23, 5, 0); // Monday 06:00 in Brussels
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '06:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 1, total: 4}, prices: [], ...over});
const OVERDUE = [{date: '2026-11-23', count: 3}, {date: '2026-11-24', count: 1}, {date: '2026-11-25', count: 0}];
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; actions: unknown[]; data: {url: string; items: unknown[]}}}}).self.zigoalsCompose;
};
describe('Plan your day (LEDGER #256)', () => {
  it('a type of its own, on by default but silent until a time is set in Tasks', () => {
    expect(NOTIFY_TYPES).toContain('planDay');
    expect(DEFAULT_ON.planDay).toBe(true);
    expect(NOTIFY_LABELS.planDay.title).toBe('Plan your day');
    expect(buildPlan(base({overdue: OVERDUE})).snapshot.items.filter(i => i.kind === 'planDay')).toEqual([]);
  });
  it('wakes daily at its time, opens Plan my day, and carries the overdue count of that day', () => {
    const plan = buildPlan(base({planDay: {time: '07:15'}, overdue: OVERDUE}));
    const items = plan.snapshot.items.filter(i => i.kind === 'planDay');
    expect(items.map(i => [i.at, i.href, i.detail ?? null, i.label ?? null])).toEqual([
      [at('2026-11-23', '07:15'), '/app/tasks?view=today&plan=1', '3 tasks overdue', null],
      [at('2026-11-24', '07:15'), '/app/tasks?view=today&plan=1', '1 task overdue', null],
    ]); // the plan holds 48 hours
    expect(buildPlan(base({now: at('2026-11-24', '06:00'), planDay: {time: '07:15'}, overdue: OVERDUE})).snapshot.items.find(i => i.kind === 'planDay' && i.at === at('2026-11-25', '07:15'))?.detail).toBeUndefined();
    expect(plan.registration.wakes).toContainEqual({m: 7 * 60 + 15, d: 127});
    // The count rides on Plan your day, so the morning orbit stays as it was.
    expect(plan.snapshot.items.filter(i => i.kind === 'morning').every(i => i.detail === undefined)).toBe(true);
    // Switched off, or inside quiet hours: nothing wakes (the quiet one is said on the card).
    expect(buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'planDay', false), planDay: {time: '07:15'}})).snapshot.items.some(i => i.kind === 'planDay')).toBe(false);
    expect(buildPlan(base({planDay: {time: '23:00'}})).refused).toContainEqual({kind: 'planDay', time: '23:00'});
    expect(typeOn(emptyNotifyPrefs(), 'planDay')).toBe(true);
  });
  it('without a plan-your-day time the overdue count is one line on the morning orbit; no count, no line', () => {
    const items = buildPlan(base({overdue: OVERDUE})).snapshot.items.filter(i => i.kind === 'morning');
    expect(items.map(i => i.detail ?? null)).toEqual(['3 tasks overdue', '1 task overdue']);
    expect(buildPlan(base()).snapshot.items.filter(i => i.kind === 'morning').every(i => i.detail === undefined)).toBe(true);
  });
  it('the notification says it in plain words, opens Plan my day, and has no Done or Snooze', () => {
    const when = at('2026-11-23', '07:15'), compose = composer();
    const out = compose({v: 1, labels: false, items: [{at: when, kind: 'planDay', id: 'plan-day', detail: '3 tasks overdue', href: '/app/tasks?view=today&plan=1', actionable: false}], summary: null}, when);
    expect(out.body).toBe('Plan your day · 3 tasks overdue');
    expect(out.data.url).toBe('/app/tasks?view=today&plan=1');
    expect(out.actions).toEqual([]);
    expect(out.data.items).toEqual([]);
    const morning = compose({v: 1, labels: false, items: [{at: when, kind: 'morning', id: 'morning', detail: '2 tasks overdue', href: '/app/checklist', actionable: false}], summary: {date: '2026-11-23', done: 1, total: 4}}, when);
    expect(morning.body).toBe('Good morning. Today: 1 of 4 done. 2 tasks overdue.');
    expect(morning.data.url).toBe('/app/checklist');
    // Session AK's morning line is unchanged without a count.
    expect(compose({v: 1, labels: false, items: [{at: when, kind: 'morning', id: 'morning', href: '/app/checklist', actionable: false}], summary: {date: '2026-11-23', done: 1, total: 4}}, when).body).toBe('Good morning. Today: 1 of 4 done.');
  });
});
