import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {buildPlan, type PlanInput} from './plan';
import {emptyNotifyPrefs, setType} from './prefs';
import {zonedInstant} from './zone';
import {doneTaskIds} from './actions';

/**
 * Session AV lane 2 (r5-plan, LEDGER #353; Akiflow's "leave by"; TIER 3 (PWA)): a "Leave by 8:40" wake before a task or an
 * imported event with travel minutes typed before it — under the tasks switch, refused inside quiet hours, the time to leave
 * always said and the title only where names are allowed; it has no Done, and a Done pressed on a mixed notification never
 * finishes the task from it.
 */
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 10, 23, 5, 0); // Monday 06:00 in Brussels
const at = (time: string) => zonedInstant('2026-11-23', time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: emptyNotifyPrefs(), quiet: {from: '22:00', to: '06:00'}, labels: true, habits: [], contributions: [], bills: [], orbit: {done: 1, total: 4}, prices: [], ...over});
const LEAVE = {id: 'dentist', title: 'Fictional dentist', at: at('08:40'), leave: '8:40 AM', href: '/app/tasks?task=dentist'};
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; actions: {action: string}[]; data: {url: string; items: {kind: string; id: string}[]}}}}).self.zigoalsCompose;
};
describe('Leave by (LEDGER #353)', () => {
  it('a one-off wake at the time to leave, with the time said; no Done; opens the task', () => {
    const items = buildPlan(base({tasks: [LEAVE]})).snapshot.items.filter(i => i.kind === 'task');
    expect(items).toEqual([{at: at('08:40'), kind: 'task', id: `leave:dentist@${at('08:40')}`, label: 'Fictional dentist', detail: 'Leave by 8:40 AM', href: '/app/tasks?task=dentist', actionable: false}]);
    // Names off: the time to leave stays, the title goes.
    expect(buildPlan(base({labels: false, tasks: [LEAVE]})).snapshot.items.find(i => i.kind === 'task')).toEqual({at: at('08:40'), kind: 'task', id: `leave:dentist@${at('08:40')}`, detail: 'Leave by 8:40 AM', href: '/app/tasks?task=dentist', actionable: false});
  });
  it('under the tasks switch and quiet hours', () => {
    expect(buildPlan(base({prefs: setType(emptyNotifyPrefs(), 'tasks', false), tasks: [LEAVE]})).snapshot.items.some(i => i.kind === 'task')).toBe(false);
    const quiet = buildPlan(base({tasks: [{...LEAVE, at: at('23:10'), leave: '11:10 PM'}]}));
    expect(quiet.snapshot.items.some(i => i.kind === 'task')).toBe(false);
    expect(quiet.refused).toContainEqual({kind: 'task', time: '23:10'});
  });
  it('the notification says "Leave by", with the name only when names are on; Done never finishes the task from it', () => {
    const compose = composer(), when = at('08:40');
    expect(compose({v: 1, labels: false, items: [{at: when, kind: 'task', id: `leave:dentist@${when}`, detail: 'Leave by 8:40 AM', href: '/app/tasks?task=dentist', actionable: false}], summary: null}, when).body).toBe('Leave by 8:40 AM');
    const named = compose({v: 1, labels: true, items: [{at: when, kind: 'task', id: `leave:dentist@${when}`, label: 'Fictional dentist', detail: 'Leave by 8:40 AM', href: '/app/tasks?task=dentist', actionable: false}], summary: null}, when);
    expect(named.body).toBe('Leave by 8:40 AM · Fictional dentist');
    expect(named.actions.map(a => a.action)).not.toContain('done');
    // A task reminder at the same minute keeps its own words and its Done; the leave item is never a task to finish.
    const mixed = compose({v: 1, labels: true, items: [{at: when, kind: 'task', id: `leave:dentist@${when}`, label: 'Fictional dentist', detail: 'Leave by 8:40 AM', actionable: false}, {at: when, kind: 'task', id: `task:post@${when}`, label: 'Fictional post', actionable: true}], summary: null}, when);
    expect(mixed.body).toBe('Leave by 8:40 AM · Fictional dentist · Fictional post');
    expect(doneTaskIds({items: mixed.data.items} as Parameters<typeof doneTaskIds>[0])).toEqual(['post']);
  });
});
