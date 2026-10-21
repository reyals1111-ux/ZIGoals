// Fictional records for the Checklist's unit tests only (never shipped: nothing outside *.test.ts imports this file).
import {createHabit, emptyHabitData, type HabitData, type HabitInput} from '../habits';
import {createEmptyHealth, saveFood, type HealthData} from '../health';
import {emptyPlatform, privateGoalSchema, type Platform} from '../positions';
import {emptySleep} from '../sleep/schema';
import {emptyMeditation, emptyMeditationRun} from '../meditation/schema';
import {emptyFasting} from '../fasting/schema';
import type {DeriveSources} from './derive';
import {addCustom, addFavourite} from './store';
import {emptyChecklist, type Checklist} from './schema';

/** 10:00 UTC on a Sunday: the same calendar day in UTC (CI) and in Brussels (the owner's Mac). */
export const NOW = new Date('2026-10-18T10:00:00.000Z'), TODAY = '2026-10-18', CREATED = new Date('2026-09-01T06:00:00.000Z');
export const ID = {walk: '11111111-1111-4111-8111-111111111111', push: '22222222-2222-4222-8222-222222222222', sugar: '33333333-3333-4333-8333-333333333333', piano: '44444444-4444-4444-8444-444444444444', monday: '55555555-5555-4555-8555-555555555555'};
export const FOOD = 'health_00000000-0000-4000-8000-000000000001', VITAMIN = 'health_00000000-0000-4000-8000-000000000002';
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
export function habits(): HabitData {
  let d = emptyHabitData();
  d = createHabit(d, input('Morning walk'), CREATED, ID.walk);
  d = createHabit(d, input('Push-ups', {measurement: {kind: 'count', unit: 'times'}, target: 100}), CREATED, ID.push);
  d = createHabit(d, input('No sugar', {type: 'quit', measurement: {kind: 'boolean'}, target: 0, timeOfDay: 'anytime'}), CREATED, ID.sugar);
  d = createHabit(d, input('Play piano', {measurement: {kind: 'duration', unit: 'minutes'}, target: 15, timeOfDay: 'evening'}), CREATED, ID.piano);
  d = createHabit(d, input('Monday plan', {schedule: {kind: 'weekdays', days: [1]}}), CREATED, ID.monday);
  return d;
}
export function health(): HealthData {
  const at = CREATED.toISOString();
  let h = saveFood(createEmptyHealth(), {id: FOOD, name: 'Oats', brand: '', servingGrams: 40, nutrients: {kcal: 150, proteinMg: 5000, carbsMg: 27000, fatMg: 3000}, createdAt: at, updatedAt: at});
  h = saveFood(h, {id: VITAMIN, name: 'Vitamin D', brand: '', servingGrams: 1, nutrients: {kcal: 0, proteinMg: 0, carbsMg: 0, fatMg: 0}, createdAt: at, updatedAt: at});
  return h;
}
export function platform(done = false): Platform {
  const goal = privateGoalSchema.parse({id: '7', name: 'Fictional reserve', type: 'PROJECT', status: 'active', asset: 'EUR', denom: 'EUR', decimals: 2, target: '600000', notes: '', createdAt: '2026-06-01T09:00:00.000Z', milestones: [{id: 'm1', title: 'Open the account', done}, {id: 'm2', title: 'First deposit', done: false}]});
  return {...emptyPlatform(), goals: [goal]} as Platform;
}
export function sources(extra: Partial<DeriveSources> = {}): DeriveSources {
  return {habits: habits(), habitsDay: TODAY, health: health(), healthDay: TODAY, sleep: emptySleep(), meditation: emptyMeditation(), meditationRun: emptyMeditationRun(), fasting: emptyFasting(), platform: platform(), zone: 'UTC', now: NOW, ...extra};
}
/** A path with one of everything. */
export function fullPath(): Checklist {
  let r = emptyChecklist(), n = 0; const o = (section?: string, extra: object = {}) => ({id: `ck_${++n}`, at: new Date(NOW.getTime() + n), ...(section ? {section} : {}), ...extra});
  r = addFavourite(r, {kind: 'habit', habitId: ID.walk}, o('morning'));
  r = addFavourite(r, {kind: 'health', input: 'water'}, o('morning', {defaultValue: 500, unit: 'ml'}));
  r = addFavourite(r, {kind: 'habit', habitId: ID.push}, o('morning'));
  r = addFavourite(r, {kind: 'health', input: 'diary', sourceKind: 'food', sourceId: VITAMIN}, o('morning'));
  r = addFavourite(r, {kind: 'health', input: 'weight'}, o('morning'));
  r = addFavourite(r, {kind: 'goal-step', goalId: '7', milestoneId: 'm1'}, o('afternoon'));
  r = addFavourite(r, {kind: 'habit', habitId: ID.monday}, o('afternoon'));
  r = addFavourite(r, {kind: 'habit', habitId: ID.sugar}, o('anytime'));
  r = addFavourite(r, {kind: 'health', input: 'meditation'}, o('evening'));
  r = addFavourite(r, {kind: 'health', input: 'sleep'}, o('evening'));
  r = addFavourite(r, {kind: 'health', input: 'fast'}, o('evening'));
  r = addCustom(r, {label: 'Play piano 15 minutes', colour: 'gold', section: 'evening'}, o());
  return r;
}
