import {previewImport, emptyItems} from '../../import/switch/apply';
import {activityImportId} from '../../import/switch/ids';
import {vitalDaySchema} from '../../vitals/schema';
import {saveMeasurement} from '../../body-measurements';
import type {Fasting} from '../../fasting/schema';
import {habitDataSchema, type HabitData} from '../../habits';
import {healthSchema, logHealthItem, saveActivity, saveFood, saveRecipe, saveWeight, type HealthData} from '../../health';
import {addCounter, changeCount} from '../../health-counters';
import {addWater, saveGroceryNotes, saveHealthPreferences, saveMealFromRecipe, saveMealPlan, dailyData} from '../../health-daily';
import {platformSchema, type Platform} from '../../positions';
import {portfolioDataSchema, type PortfolioData} from '../../portfolio/schema';
import {buildShowcase} from '../../showcase-data';
import type {WeeklyReview} from '../../weekly-review/schema';
import {homeRecordsIn} from '../../sync-homes-store';
import {emptySleep, sleepSchema} from '../../sleep/schema';
import {emptyMeditation, meditationSchema} from '../../meditation/schema';
import {healthGroupIn, withHealthGroup} from '../../vault/w-homes';
import {addLocalDays} from '../../local-date';
import {quickIn, setPinned} from '../../health-quick/quick';
import {healthQuickSchema} from '../../health-quick/schema';
import {aiGates, type Gates} from '../gates';
import {defaultAiSettings, type AiSettings, type PageArea} from '../settings';
import type {ToolSources} from './env';
import {emptyMoods, moodsSchema} from '../../moods/schema';
import {accountsSchema} from '../../accounts/schema';
import {ACCOUNTS_KEY, CHESS_CACHE_KEY} from '../../w-device-keys';
import {chessCacheSchema} from '../../skills/chess/schema';
import {chessOf} from '../../skills/chess/engine';
import {DASHBOARD_SETTINGS_KEY, dashboardSettingsSchema} from '../../dashboard-settings';
import {linksOf} from '../../links/engine';

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
  // Session W Part 4: a night in Health v4 `sleep` with a sentinel tag and note.
  sleepTag: 'SENTINEL_SLEEP_6b2f', sleepNote: 'SENTINEL_SLEEP_NOTE_d81e',
  // Session W Part 5: a meditation session with a sentinel note.
  meditationNote: 'SENTINEL_MEDITATION_NOTE_47ac',
  // Session W Part 7: a day's steps and active energy brought in by an import (Apple Health), with distinctive values.
  importSteps: 86_531, importKcal: 4127,
  // Session W Part 8: a workout a linked service brought (the name is the sentinel; a real one carries the sport) and
  // the heart-rate summary a meditation session keeps from a Bluetooth monitor.
  linkedWorkout: 'SENTINEL_LINKED_WORKOUT_2c9e', heartRate: {avg: 187, min: 173, max: 199},
  // Session W Part 9: a water button of the person's own size (Health v4 `quick`, with the sentinel food pinned).
  quickWaterMl: 4093,
  // Session W Part 13: the evening wrap-up's mood of the day (Health v4 `moods`), with a sentinel note.
  moodNote: 'SENTINEL_MOOD_NOTE_5e3a',
} as const;
/** Every sentinel as text, for "contains none of these" checks. */
export const SENTINEL_TEXTS = [SENTINEL.food, SENTINEL.recipe, SENTINEL.counter, SENTINEL.activity, SENTINEL.grocery, SENTINEL.note, String(SENTINEL.kcal), String(SENTINEL.steps), String(SENTINEL.waterMl), String(SENTINEL.habitValue), SENTINEL.sleepTag, SENTINEL.sleepNote, SENTINEL.meditationNote, String(SENTINEL.importSteps), String(SENTINEL.importKcal), SENTINEL.linkedWorkout, SENTINEL.moodNote];
export const sentinelsIn = (text: string) => SENTINEL_TEXTS.filter(s => text.includes(s));

export function showcaseSources(day = DAY, overrides: Partial<ToolSources> = {}): ToolSources {
  const {records} = buildShowcase(day);
  const habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData;
  const health = healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData;
  const platform = platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform;
  // Session P's four records where the app keeps them (Session W Part 1: the sync writes are on, so the Showcase holds
  // fasting and the weekly review in Health and settings, not in their device keys).
  const homes = homeRecordsIn(records), fasting = homes.fasting as Fasting, weekly = homes.weeklyReview as WeeklyReview;
  // Session W Part 21: the Showcase's accounts and debts, its fictional chess and the number of its links (Parts 12, 14, 19).
  const settings = dashboardSettingsSchema.parse(JSON.parse(records[DASHBOARD_SETTINGS_KEY]!));
  const accounts = records[ACCOUNTS_KEY] ? accountsSchema.parse(JSON.parse(records[ACCOUNTS_KEY])) : null;
  const chess = records[CHESS_CACHE_KEY] ? {settings: chessOf(settings) ?? null, cache: chessCacheSchema.parse(JSON.parse(records[CHESS_CACHE_KEY]))} : null;
  return {now: new Date(`${day}T19:00:00Z`), habitDay: day, healthDay: day, habitZone: 'UTC', healthZone: 'UTC', habits, health, fasting, platform, localGoals: [], metadata: {}, quotes: [], localActivity: null, portfolio: null, weekly, notes: null,
    accounts, milestoneDates: null, chess, linksCount: linksOf(settings).items.length, showcase: true, ...overrides};
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
  // A night ending on the healthDay's morning four days back (a night the Showcase leaves unlogged), tagged and noted.
  const sleep = healthGroupIn(health, 'sleep') ?? emptySleep(), wake = addLocalDays(day, -4);
  health = withHealthGroup(health, 'sleep', sleepSchema.parse({...sleep, nights: [...sleep.nights, {id: 'health_sleep-sentinel-0001', kind: 'night', start: `${addLocalDays(wake, -1)}T21:30:00.000Z`, end: `${wake}T05:10:00.000Z`, timeZone: 'UTC', latencyMin: 12, awakeMin: 9, quality: 3, tags: [SENTINEL.sleepTag], note: SENTINEL.sleepNote, source: 'manual', createdAt: stamp, updatedAt: stamp}]}), false);
  const meditation = healthGroupIn(health, 'meditation') ?? emptyMeditation();
  health = withHealthGroup(health, 'meditation', meditationSchema.parse({...meditation, sessions: [...meditation.sessions, {id: 'health_med-sentinel-0001', startedAt: `${day}T06:00:00.000Z`, seconds: 600, kind: 'timer', note: SENTINEL.meditationNote, heartRate: {...SENTINEL.heartRate}, timeZone: 'UTC', source: 'timer', createdAt: stamp, updatedAt: stamp}]}), false);
  // An import's records, through the importer's own apply step: steps on a day before the Showcase's 30 (one source a
  // day would keep them out of a day that has steps) and the vitals of two days back.
  const stepsDay = addLocalDays(day, -40), vitalsDay = addLocalDays(day, -2);
  health = previewImport(health, {...emptyItems(), activity: [{id: activityImportId('apple-health', `steps|${stepsDay}`), date: stepsDay, name: 'Steps · Apple Health', steps: SENTINEL.importSteps, minutes: 0}],
    vitals: [vitalDaySchema.parse({id: `health_vital-apple-health-${vitalsDay}`, date: vitalsDay, source: 'apple-health', activeKcal: SENTINEL.importKcal, updatedAt: stamp})]}, stamp).next;
  // Quick logging's own group: the sentinel food pinned, and a water button of a sentinel size.
  const pinned = setPinned(health, 'food', 'health_food-sentinel-1', true, stamp);
  health = withHealthGroup(pinned, 'quick', healthQuickSchema.parse({...quickIn(pinned)!, waterSizesMl: [250, SENTINEL.quickWaterMl], updatedAt: stamp}), false);
  // The day's mood from the evening wrap-up, with a note.
  const moods = healthGroupIn(health, 'moods') ?? emptyMoods();
  health = withHealthGroup(health, 'moods', moodsSchema.parse({...moods, days: {...moods.days, [day]: {mood: 2, note: SENTINEL.moodNote, at: stamp}}}), false);
  // A linked service's workout on the day, through the same apply step a sync uses.
  health = previewImport(health, {...emptyItems(), activity: [{id: activityImportId('strava-link', 'workout|9001'), date: day, name: SENTINEL.linkedWorkout, steps: 0, minutes: 33}]}, stamp).next;
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
