import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';
import {createEmptyHealth, healthSchema} from '../health';
import {emptyHealthExtras, healthExtrasSchema} from '../health-extras';
import {setMealReminders} from '../meal-reminders';
import {mealWakes} from '../food-plus/meal-notify';
import {buildPlan, type PlanInput} from './plan';
import {emptyNotifyPrefs, NOTIFY_TYPES, setType, typeOn} from './prefs';
import {NOTIFY_LABELS} from './labels';
import {zonedInstant} from './zone';

/**
 * Session AV lane 2 (food, LEDGER #90; MyFitnessPal's meal reminders): the meal reminders switched on in Health become
 * device notifications too, under their own switch (off by default): a daily wake at each meal's time, today's left out
 * once the meal is logged or "Not today" was chosen; the meal's name only with names on; never what was eaten.
 */
const ZONE = 'Europe/Brussels', NOW = Date.UTC(2026, 9, 5, 5, 0); // Monday 07:00 in Brussels
const at = (date: string, time: string) => zonedInstant(date, time, ZONE);
const base = (over: Partial<PlanInput> = {}): PlanInput => ({now: NOW, zone: ZONE, prefs: setType(emptyNotifyPrefs(), 'meals', true), quiet: {from: '22:00', to: '07:00'}, labels: false, habits: [], contributions: [], bills: [], orbit: {done: 0, total: 0}, prices: [], ...over});
const composer = () => {
  const sandbox = vm.createContext({BigInt, Array, String, URL, self: {location: {href: 'https://app.test/sw.js?v=x', origin: 'https://app.test'}, addEventListener() {}, registration: {}, clients: {}}});
  vm.runInContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), sandbox);
  return (sandbox as unknown as {self: {zigoalsCompose: (s: unknown, now: number) => {body: string; data: {url: string}}}}).self.zigoalsCompose;
};
const extras = () => setMealReminders(healthExtrasSchema.parse({version: 1, meals: {Breakfast: {time: '07:30'}, Lunch: {time: '12:30', name: 'Fictional desk lunch'}, Dinner: {time: '23:00'}}}), true);

describe('meal reminders as device notifications', () => {
  it('a switch of its own, off by default, with its words', () => {
    expect(NOTIFY_TYPES).toContain('meals');
    expect(typeOn(emptyNotifyPrefs(), 'meals')).toBe(false);
    expect(NOTIFY_LABELS.meals.title).toBe('Meal reminders');
  });
  it('the wakes come only from meals with a time while Health\'s meal reminders are on; logged or dismissed today is done', () => {
    const health = healthSchema.parse({...createEmptyHealth(), diary: [{id: 'health_diary-meal-001', sourceId: 'health_food-fict-001', sourceKind: 'food', snapshot: {name: 'Fictional toast', servingGrams: 40, nutrients: {kcal: 100, proteinMg: null, carbsMg: null, fatMg: null}}, date: '2026-10-05', meal: 'Breakfast', quantityMilli: 1000, createdAt: '2026-10-05T05:00:00.000Z', updatedAt: '2026-10-05T05:00:00.000Z'}]});
    const now = new Date(NOW);
    expect(mealWakes(emptyHealthExtras(), health, now)).toEqual([]);
    const wakes = mealWakes(extras(), health, now);
    expect(wakes.map(w => [w.meal, w.time, w.doneToday])).toEqual([['Breakfast', '07:30', true], ['Lunch', '12:30', false], ['Dinner', '23:00', false]]);
    expect(wakes[1]!.label).toBe('Fictional desk lunch');
  });
  it('daily wakes at each time; today\'s logged meal is not shown; quiet hours refuse; names only with names on', () => {
    const meals = [{meal: 'Breakfast', label: 'Breakfast', time: '07:30', doneToday: true}, {meal: 'Lunch', label: 'Fictional desk lunch', time: '12:30', doneToday: false}, {meal: 'Dinner', label: 'Dinner', time: '23:00', doneToday: false}];
    const plan = buildPlan(base({meals}));
    expect(plan.refused).toEqual([{kind: 'meal', time: '23:00'}]);
    expect(plan.registration.wakes).toEqual(expect.arrayContaining([{m: 7 * 60 + 30, d: 127}, {m: 12 * 60 + 30, d: 127}]));
    const items = plan.snapshot.items.filter(i => i.kind === 'meal');
    expect(items.filter(i => i.at === at('2026-10-05', '07:30'))).toEqual([]);
    expect(items.find(i => i.at === at('2026-10-05', '12:30'))).toEqual({at: at('2026-10-05', '12:30'), kind: 'meal', id: 'meal:Lunch', href: '/app/health?view=diary', actionable: false});
    expect(items.find(i => i.at === at('2026-10-06', '07:30'))).toBeTruthy();
    expect(buildPlan(base({labels: true, meals})).snapshot.items.find(i => i.kind === 'meal' && i.id === 'meal:Lunch')!.label).toBe('Fictional desk lunch');
    const off = buildPlan(base({prefs: emptyNotifyPrefs(), meals}));
    expect(off.snapshot.items.filter(i => i.kind === 'meal')).toEqual([]);
  });
  it('the worker says it: "Time for …" with names on, a plain line otherwise; the tap opens the Diary', () => {
    const compose = composer(), t = at('2026-10-05', '12:30');
    const named = compose({labels: true, items: [{at: t, kind: 'meal', id: 'meal:Lunch', label: 'Fictional desk lunch', href: '/app/health?view=diary', actionable: false}], summary: {date: '2026-10-05', done: 0, total: 0}}, t);
    expect(named.body).toBe('Time for Fictional desk lunch');
    expect(named.data.url).toContain('/app/health');
    expect(compose({labels: false, items: [{at: t, kind: 'meal', id: 'meal:Lunch', href: '/app/health?view=diary', actionable: false}], summary: {date: '2026-10-05', done: 0, total: 0}}, t).body).toBe('A meal reminder you set in Health');
  });
});
