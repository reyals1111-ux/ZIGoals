import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './plan';
import {doneTaskIds} from './actions';
import {emptyNotifyPrefs, NOTIFY_LABELS, NOTIFY_TYPES, setType, typeOn} from './prefs';
import {zonedInstant} from './zone';

/**
 * Session AV (owner follow-up 1, F-TASK-NOTIFY; Todoist, TickTick, Things): a reminder set on a task becomes a one-off
 * wake at its own instant, with Snooze; its name only with names on; inside quiet hours it is said on the card and wakes
 * nothing; a switch of its own, on by default. The service worker's composer says it in words.
 */
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 9, 5, 5, 0); // Monday 07:00 in Brussels
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '07:00'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; actions: {action: string}[]; data: {url: string}}}}).self.zigoalsCompose;
};

describe('Session AV (F-TASK-NOTIFY): task reminders in the notification plan', () => {
  it('a switch of its own, on by default, with its words', () => {
    expect(NOTIFY_TYPES).toContain('tasks');
    expect(typeOn(emptyNotifyPrefs(), 'tasks')).toBe(true);
    expect(NOTIFY_LABELS.tasks.title).toBe('Task reminders');
  });
  it('a reminder ahead becomes a one-off wake at its instant; one in the past or a month away does not', () => {
    const soon = at('2026-10-05', '09:30'), past = at('2026-10-05', '06:00'), far = at('2026-11-20', '09:30');
    const plan = buildPlan(base({tasks: [{id: 't1', title: 'Fictional call to the bank', at: soon}, {id: 't2', at: past}, {id: 't3', at: far}]}));
    // Session AV (1c, q1 #1; deliberate test change, equally strict): a task reminder is now actionable (Done on the notification).
    expect(plan.snapshot.items.filter(i => i.kind === 'task')).toEqual([{at: soon, kind: 'task', id: `task:t1@${soon}`, href: '/app/tasks#task-t1', actionable: true}]);
    expect(plan.registration.once).toEqual([Math.floor(soon / 60000)]);
  });
  it('the name only with names on; never with them off', () => {
    const soon = at('2026-10-05', '09:30');
    expect(buildPlan(base({labels: true, tasks: [{id: 't1', title: 'Fictional call to the bank', at: soon}]})).snapshot.items.find(i => i.kind === 'task')!.label).toBe('Fictional call to the bank');
    expect(buildPlan(base({labels: false, tasks: [{id: 't1', title: 'Fictional call to the bank', at: soon}]})).snapshot.items.find(i => i.kind === 'task')).not.toHaveProperty('label');
  });
  it('inside quiet hours it is said on the card and wakes nothing; switched off, nothing at all', () => {
    const late = at('2026-10-05', '23:15');
    const quiet = buildPlan(base({tasks: [{id: 't1', at: late}]}));
    expect(quiet.refused).toEqual([{kind: 'task', time: '23:15'}]);
    expect(quiet.registration.once).toEqual([]); expect(quiet.snapshot.items.filter(i => i.kind === 'task')).toEqual([]);
    const off = buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'tasks', false), tasks: [{id: 't1', at: at('2026-10-05', '09:30')}]}));
    expect(off.snapshot.items.filter(i => i.kind === 'task')).toEqual([]); expect(off.registration.once).toEqual([]);
  });
  it('the worker says it: by name with names on, otherwise counted; Snooze offered, the tap opens Tasks', () => {
    const compose = composer(), soon = at('2026-10-05', '09:30');
    // Session AV (1c, q1 #1; deliberate test change, equally strict): an actionable task reminder offers Done and Snooze.
    const named = compose({labels: true, items: [{at: soon, kind: 'task', id: 't1', label: 'Fictional call to the bank', href: '/app/tasks#task-t1', actionable: true}], summary: {date: '2026-10-05', done: 0, total: 0}}, soon);
    expect(named.body).toBe('Fictional call to the bank');
    expect(named.actions.map(a => a.action)).toEqual(['done', 'snooze']);
    expect(named.data.items).toEqual([expect.objectContaining({kind: 'task', id: 't1'})]);
    const countdown = compose({labels: true, items: [{at: soon, kind: 'countdown', id: 'countdown:c1@2026-10-07', label: 'Fictional birthday', detail: 'in 2 days', href: '/app', actionable: false}], summary: {date: '2026-10-05', done: 0, total: 0}}, soon);
    expect(countdown.body).toBe('Fictional birthday · in 2 days');
    expect(compose({labels: false, items: [{at: soon, kind: 'countdown', id: 'c1', href: '/app', actionable: false}], summary: {date: '2026-10-05', done: 0, total: 0}}, soon).body).toBe('1 countdown reminder');
    expect(named.data.url).toContain('/app/tasks');
    const counted = compose({labels: false, items: [{at: soon, kind: 'task', id: 't1', href: '/app/tasks', actionable: false}, {at: soon, kind: 'task', id: 't2', href: '/app/tasks', actionable: false}], summary: {date: '2026-10-05', done: 0, total: 0}}, soon);
    expect(counted.body).toBe('2 task reminders');
  });
});

/** Session AV (1c, q1 #1): a "Done" tap that names task reminders names the tasks it ticks off (the page applies it). */
describe('Session AV (1c): Done on a task reminder', () => {
  it('reads the task ids from the plan items, once each; other kinds and odd ids are left out', () => {
    expect(doneTaskIds({items: [{kind: 'task', id: 'task:t1@1795424400000', at: 1}, {kind: 'task', id: 'task:t1@1795428000000', at: 2}, {kind: 'habit', id: 'h1', at: 1}, {kind: 'task', id: 'task:../x@1', at: 1}]})).toEqual(['t1']);
    expect(doneTaskIds({})).toEqual([]);
  });
});
