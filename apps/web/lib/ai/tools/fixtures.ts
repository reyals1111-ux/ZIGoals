import {saveMeasurement} from '../../body-measurements';
import {fastingSchema, type Fasting} from '../../fasting/schema';
import {habitDataSchema, type HabitData} from '../../habits';
import {healthSchema, logHealthItem, saveActivity, saveFood, saveRecipe, saveWeight, type HealthData} from '../../health';
import {addCounter, changeCount} from '../../health-counters';
import {addWater, saveGroceryNotes, saveHealthPreferences, saveMealFromRecipe, saveMealPlan, dailyData} from '../../health-daily';
import {platformSchema, type Platform} from '../../positions';
import {portfolioDataSchema, type PortfolioData} from '../../portfolio/schema';
import {buildShowcase} from '../../showcase-data';
import {weeklyReviewSchema, type WeeklyReview} from '../../weekly-review/schema';
import {addLocalDays} from '../../local-date';
import {aiGates, type Gates} from '../gates';
import {defaultAiSettings, type AiSettings, type PageArea} from '../settings';
import type {ToolSources} from './env';

/**
 * Fixtures for ZIGi's tools and for every path that reads them (Session V; used by unit tests only, nothing in the app
 * imports this file). `showcaseSources` is the Showcase's fictional data on a given day. `withSentinels` adds Health
 * records whose names and numbers appear nowhere else, so a test can prove that none of them leaves the device while the
 * Health gate is closed, on any path; the same values must appear when the gate is open, which proves the test can see
 * them. Everything here is fictional.
 */
export const DAY = '2026-10-05';
export const SENTINEL = {
  food: 'SENTINEL_FOOD_93c1', recipe: 'SENTINEL_RECIPE_0e9d', counter: 'SENTINEL_COUNTER_5d2e', activity: 'SENTINEL_ACTIVITY_c3f0', grocery: 'SENTINEL_GROCERY_44d1',
  note: 'SENTINEL_HEALTH_NOTE_a71b', kcal: 7919, steps: 77131, waterMl: 4111, habitValue: 61007, weightKg: '59.2',
} as const;
/** Every sentinel as text, for "contains none of these" checks. */
export const SENTINEL_TEXTS = [SENTINEL.food, SENTINEL.recipe, SENTINEL.counter, SENTINEL.activity, SENTINEL.grocery, SENTINEL.note, String(SENTINEL.kcal), String(SENTINEL.steps), String(SENTINEL.waterMl), String(SENTINEL.habitValue)];
export const sentinelsIn = (text: string) => SENTINEL_TEXTS.filter(s => text.includes(s));

export function showcaseSources(day = DAY, overrides: Partial<ToolSources> = {}): ToolSources {
  const {records} = buildShowcase(day);
  const habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData;
  const health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData;
  const platform = platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform;
  const fasting = records['zigoals:fasting:v1'] ? fastingSchema.parse(JSON.parse(records['zigoals:fasting:v1'])) as Fasting : null;
  const weekly = records['zigoals:weekly-review:v1'] ? weeklyReviewSchema.parse(JSON.parse(records['zigoals:weekly-review:v1'])) as WeeklyReview : null;
  return {now: new Date(`${day}T19:00:00Z`), habitDay: day, healthDay: day, habitZone: 'UTC', healthZone: 'UTC', habits, health, fasting, platform, localGoals: [], metadata: {}, quotes: [], localActivity: null, portfolio: null, weekly, notes: null, showcase: true, ...overrides};
}
const at = (day: string) => `${day}T08:00:00.000Z`;
/** Health records with sentinel names and values, a check-in filled in from Health, and a Health-tagged note. */
export function withSentinels(sources: ToolSources): ToolSources {
  const day = sources.healthDay, stamp = at(day);
  let health = sources.health;
  health = saveFood(health, {id: 'health_food-sentinel-1', name: SENTINEL.food, brand: '', servingGrams: 100, nutrients: {kcal: SENTINEL.kcal, proteinMg: 12_000, carbsMg: 30_000, fatMg: null}, createdAt: stamp, updatedAt: stamp});
  health = logHealthItem(health, {id: 'health_diary-sentinel-1', sourceId: 'health_food-sentinel-1', sourceKind: 'food', date: day, meal: 'Dinner', quantityMilli: 1000}, stamp);
  health = saveRecipe(health, {id: 'health_recipe-sentinel-1', name: SENTINEL.recipe, portionsMilli: 2000, items: [{foodId: 'health_food-sentinel-1', quantityMilli: 2000}]}, stamp);
  health = saveMealFromRecipe(health, 'health_meal-sentinel-1', 'health_recipe-sentinel-1', 1000, stamp);
  health = saveMealPlan(health, {id: 'health_plan-sentinel-1', savedMealId: 'health_meal-sentinel-1', date: addLocalDays(day, 1), meal: 'Dinner'}, stamp);
  health = saveGroceryNotes(health, SENTINEL.grocery);
  health = addWater(health, {id: 'health_water-sentinel-1', date: day, amountMilli: SENTINEL.waterMl * 1000, unit: 'ml'}, stamp);
  health = saveActivity(health, {id: 'health_activity-sentinel-1', date: day, name: SENTINEL.activity, steps: SENTINEL.steps, minutes: 41}, stamp);
  health = saveWeight(health, {id: 'health_weight-sentinel-1', date: day, grams: 59_173}, stamp);
  health = saveMeasurement(health, {id: 'health_measure-sentinel-1', kind: 'waist', quantityMilli: 93_700, unit: 'cm', observedAt: stamp, timezone: 'UTC', sourceLabel: 'Tape'}, stamp);
  health = addCounter(health, SENTINEL.counter, 'core', 'health_counter-sentinel-1');
  health = changeCount(health, 'health_counter-sentinel-1', day, 12);
  const walk = sources.habits.habits.find(h => h.title === 'Walk');
  const habits = walk ? habitDataSchema.parse({...sources.habits, schemaVersion: 3, habits: sources.habits.habits.map(h => h.id !== walk.id ? h : {...h, entries: h.entries.map(e => e.date === day ? {...e, count: SENTINEL.habitValue, source: 'health'} : e)})}) as HabitData : sources.habits;
  const notes = [{text: SENTINEL.note, category: 'health'}, {text: 'Prefers short answers in the morning', category: 'preferences'}];
  return {...sources, health, habits, notes};
}
/** A hand-made Health journal in US fl oz and pounds, with a recipe, a plan and timed measurements (cases the Showcase lacks). */
export function withHandHealth(sources: ToolSources): ToolSources {
  const day = sources.healthDay, stamp = at(day);
  let health = saveHealthPreferences(sources.health, {...dailyData(sources.health).preferences, waterUnit: 'fl-oz-us', weightUnit: 'lb', waterTargetMl: 2000});
  health = saveFood(health, {id: 'health_food-hand-lentils', name: 'Lentil soup', brand: 'Home', servingGrams: 300, nutrients: {kcal: 240, proteinMg: 14_000, carbsMg: null, fatMg: 4_000, fiberMg: 8_000}, createdAt: stamp, updatedAt: stamp});
  health = saveRecipe(health, {id: 'health_recipe-hand-soup', name: 'Big lentil pot', portionsMilli: 4000, items: [{foodId: 'health_food-hand-lentils', quantityMilli: 4000}]}, stamp);
  health = saveMealFromRecipe(health, 'health_meal-hand-soup', 'health_recipe-hand-soup', 1000, stamp);
  health = saveMealPlan(health, {id: 'health_plan-hand-soup-1', savedMealId: 'health_meal-hand-soup', date: addLocalDays(day, 2), meal: 'Lunch'}, stamp);
  health = saveMeasurement(health, {id: 'health_measure-hand-hips-1', kind: 'hips', quantityMilli: 101_000, unit: 'cm', observedAt: `${addLocalDays(day, -20)}T07:00:00Z`, timezone: 'Europe/Brussels', sourceLabel: 'Tape'}, stamp);
  health = saveMeasurement(health, {id: 'health_measure-hand-hips-2', kind: 'hips', quantityMilli: 99_500, unit: 'cm', observedAt: `${addLocalDays(day, -1)}T22:30:00Z`, timezone: 'Europe/Brussels', sourceLabel: 'Tape'}, stamp);
  health = saveMeasurement(health, {id: 'health_measure-hand-weight-1', kind: 'weight', quantityMilli: 160_000, unit: 'lb', observedAt: `${addLocalDays(day, -3)}T06:00:00Z`, timezone: 'UTC', sourceLabel: 'Scale'}, stamp);
  return {...sources, health};
}
/** Two portfolios (one Real, one Hypothetical) and a price table with sources and times. */
export function withPortfolios(sources: ToolSources, prices: Record<string, {price: string; source: string; observedAt: string | null}> = {'coingecko:coin:bitcoin:USD': {price: '62000', source: 'CoinGecko', observedAt: '2026-10-05T18:55:00.000Z'}}): ToolSources {
  const createdAt = '2026-09-01T10:00:00.000Z';
  const data = portfolioDataSchema.parse({version: 1, portfolios: [
    {id: 'pf-real', name: 'Long-term coins', kind: 'real', currency: 'USD', createdAt, coins: [{ref: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'}, {ref: {provider: 'coingecko', kind: 'coin', id: 'ethereum'}, name: 'Ethereum', symbol: 'ETH'}],
      transactions: [{id: 't1', coin: 'coingecko:coin:bitcoin', kind: 'buy', quantity: '0.05', price: '60000', date: '2026-09-02', note: '', createdAt}, {id: 't2', coin: 'coingecko:coin:ethereum', kind: 'transfer-in', quantity: '1.5', date: '2026-09-03', note: '', createdAt}]},
    {id: 'pf-plan', name: 'What if', kind: 'hypothetical', currency: 'EUR', createdAt, coins: [{ref: {provider: 'coingecko', kind: 'coin', id: 'bitcoin'}, name: 'Bitcoin', symbol: 'BTC'}],
      transactions: [{id: 't3', coin: 'coingecko:coin:bitcoin', kind: 'buy', quantity: '0.1', price: '55000', date: '2026-09-04', note: '', createdAt}]},
  ]}) as PortfolioData;
  return {...sources, portfolio: {data, priceOf: (coin, currency) => prices[`${coin}:${currency}`]}};
}
/** The person's AI settings with every area on and the three-part Health gate open or closed. */
export function settingsWith(health: boolean, overrides: Partial<AiSettings> = {}): AiSettings {
  const base = defaultAiSettings();
  return {...base, enabled: true, mode: 'api', provider: 'openai', model: 'mock-model', includeHealth: health, pageShare: {...base.pageShare, health}, ...overrides};
}
export function gatesFor(health: boolean, area: PageArea = 'today', pathname = '/app', extra: {sensitive?: boolean; settings?: AiSettings; layoutHasHealth?: boolean} = {}): Gates {
  return aiGates({settings: extra.settings ?? settingsWith(health), area, pathname, layoutHasHealth: extra.layoutHasHealth ?? true, accountActive: false, accountHealthPermitted: null, sensitive: extra.sensitive ?? false});
}
