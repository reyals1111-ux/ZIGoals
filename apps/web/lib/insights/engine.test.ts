import {afterEach, describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {HABITS_KEY, createHabit, emptyHabitData, habitDataSchema, logHabitCount, setHabitEntryStatus, type HabitData, type HabitInput} from '../habits';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, type HealthData} from '../health';
import {HABIT_HEALTH_LINKS_KEY, type HabitHealthLinks} from '../habit-health-links/schema';
import {addLocalDays} from '../local-date';
import {setDisplayLocale} from '../visual-format';
import {FORBIDDEN_INSIGHT_WORDS, insightCards, stepThreshold} from './engine';
import {INSIGHTS_KEY, MAX_DISMISSED, emptyInsights} from './schema';
import {dismissInsight, hiddenInsights, readInsights, startOverInsights} from './store';

// M3 (docs/product/features/M3-insights.md, "Tests"): pairings in counts, from the person's own records.
const DAY = '2026-10-01', AT = `${DAY}T07:00:00.000Z`;
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; setDisplayLocale('en-US'); });
const HABIT = '92000000-0000-4000-8000-000000000301';
const INPUT: HabitInput = {title: 'Read', category: 'Learning', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
const forbidden = (text: string) => FORBIDDEN_INSIGHT_WORDS.filter(word => new RegExp(`\\b${word}\\b`, 'i').test(text));
function showcase() {
  const {records} = buildShowcase(DAY);
  return {habits: habitDataSchema.parse(JSON.parse(records[HABITS_KEY]!)), health: healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!)), links: JSON.parse(records[HABIT_HEALTH_LINKS_KEY]!) as HabitHealthLinks};
}
/** `days` back from DAY: activity with the given steps, water where `water[i]`. */
function journal(steps: number[], water: boolean[], extra: Partial<HealthData> = {}): HealthData {
  const base = createEmptyHealth();
  const health: HealthData = {...base, ...extra, activity: steps.map((s, i) => ({id: `health_activity-${String(i).padStart(3, '0')}`, date: addLocalDays(DAY, -i), name: 'Walk', steps: s, minutes: 30, createdAt: AT, updatedAt: AT})).filter(a => a.steps > 0)};
  health.daily = {version: 1, favorites: [], savedMeals: [], plans: [], waterOperations: [], copyOperations: [], groceryNotes: '', preferences: {timezone: null, waterUnit: 'ml', waterTargetMl: null, weightUnit: 'kg'}, water: water.map((w, i) => w ? {id: `health_water-${String(i).padStart(3, '0')}`, date: addLocalDays(DAY, -i), amountMilli: 250_000, unit: 'ml' as const, createdAt: AT, updatedAt: AT} : null).filter((w): w is NonNullable<typeof w> => w !== null)};
  return health;
}
function memoryStorage() { const m = new Map<string, string>(); return {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, String(v)); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage; }

describe('insightCards', () => {
  test('Showcase on its day: two cards, push-ups and water first, then steps and water, with exact sentences', () => {
    process.env.TZ = 'UTC';
    const {habits, health, links} = showcase();
    const cards = insightCards({habits, health, today: DAY, links});
    expect(cards.map(c => c.id)).toEqual(['exercise-water:health_counter-pushups', 'steps-water']);
    expect(cards[0]!.sentence).toBe('On 5 of 9 days you counted Push-ups, you also logged water; on other days 7 of 21.');
    expect(cards[0]!.detail).toMatchObject({sampleDays: 30, withA: {yes: 5, total: 9}, withoutA: {yes: 7, total: 21}, window: {start: '2026-08-03', end: DAY}});
    expect(cards[1]!.sentence).toBe('On 6 of 12 days you walked at least 8,000 steps, you also logged water; on other days 6 of 18.');
    expect(cards[1]!.detail).toMatchObject({sampleDays: 30, withA: {yes: 6, total: 12}, withoutA: {yes: 6, total: 18}, threshold: {source: 'target', value: 8000, unit: 'steps'}, window: {start: '2026-08-03', end: DAY}});
    for (const card of cards) expect(forbidden(card.sentence)).toEqual([]);
  });
  test('below the minimum sample or side there is no card', () => {
    const steps = (count: number) => Array.from({length: count}, (_, i) => i % 2 ? 9000 : 5000), water = (count: number) => Array.from({length: count}, (_, i) => i % 3 === 0);
    expect(insightCards({habits: emptyHabitData(), health: journal(steps(13), water(13), {targets: {...createEmptyHealth().targets, steps: 8000}}), today: DAY})).toEqual([]);
    const lopsided = journal([9000, 9000, 9000, 9000, ...Array(10).fill(5000)], water(14), {targets: {...createEmptyHealth().targets, steps: 8000}});
    expect(insightCards({habits: emptyHabitData(), health: lopsided, today: DAY})).toEqual([]);
    const enough = journal([...Array(5).fill(9000), ...Array(9).fill(5000)], water(14), {targets: {...createEmptyHealth().targets, steps: 8000}});
    expect(insightCards({habits: emptyHabitData(), health: enough, today: DAY}).map(c => c.id)).toEqual(['steps-water']);
  });
  test('the threshold is the person\'s target, else the lower middle of their recorded days', () => {
    const health = journal([5000, 6000, 7000, 9000], [], {});
    expect(stepThreshold(health, [DAY, addLocalDays(DAY, -1), addLocalDays(DAY, -2), addLocalDays(DAY, -3)])).toEqual({source: 'usual', value: 6000});
    expect(stepThreshold({...health, targets: {...health.targets, steps: 8000}}, [DAY])).toEqual({source: 'target', value: 8000});
    expect(stepThreshold(createEmptyHealth(), [DAY])).toBeNull();
  });
  test('unknown is not zero: a day without an activity record is not in the sample, even with water', () => {
    const health = journal([...Array(10).fill(9000), ...Array(10).fill(5000), 0, 0, 0], Array(23).fill(true), {targets: {...createEmptyHealth().targets, steps: 8000}});
    const card = insightCards({habits: emptyHabitData(), health, today: DAY}).find(c => c.id === 'steps-water')!;
    expect(card.detail.sampleDays).toBe(20);
  });
  test('pair 2 skips a habit that ticks itself off from steps and takes the largest sample; skipped days are left out', () => {
    process.env.TZ = 'UTC';
    const health = journal(Array.from({length: 30}, (_, i) => i % 2 ? 9000 : 5000), [], {targets: {...createEmptyHealth().targets, steps: 8000}});
    let habits = createHabit(createHabit(emptyHabitData(), INPUT, new Date('2026-08-20T12:00:00Z'), HABIT), {...INPUT, title: 'Walk'}, new Date('2026-08-20T12:00:00Z'), '92000000-0000-4000-8000-000000000302');
    for (let i = 0; i < 30; i++) { const date = addLocalDays(DAY, -i); habits = i % 7 === 3 ? setHabitEntryStatus(habits, HABIT, date, 'skipped', '', new Date(AT)) : logHabitCount(habits, HABIT, date, i % 2 ? 1 : 0, '', new Date(AT)); habits = logHabitCount(habits, '92000000-0000-4000-8000-000000000302', date, 1, '', new Date(AT)); }
    const links: HabitHealthLinks = {version: 1, links: {'92000000-0000-4000-8000-000000000302': {version: 1, measure: 'steps', rule: 'at-least', target: 8000, updatedAt: AT}}, applied: []};
    const card = insightCards({habits, health, today: DAY, links}).find(c => c.id.startsWith('steps-habit:'))!;
    expect(card.id).toBe(`steps-habit:${HABIT}`);
    expect(card.detail.sampleDays).toBe(26);
    expect(card.sentence).toMatch(/you also completed Read; on other days/);
  });
  test('pair 5: a weekday-only habit has no weekend sample; a daily habit splits by localWeekday', () => {
    process.env.TZ = 'UTC';
    const weekdays = createHabit(emptyHabitData(), {...INPUT, schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}}, new Date('2026-07-20T12:00:00Z'), HABIT);
    expect(insightCards({habits: weekdays, health: createEmptyHealth(), today: DAY})).toEqual([]);
    let daily: HabitData = createHabit(emptyHabitData(), INPUT, new Date('2026-07-20T12:00:00Z'), HABIT);
    for (let i = 0; i < 60; i++) { const date = addLocalDays(DAY, -i); daily = logHabitCount(daily, HABIT, date, i % 3 === 0 ? 1 : 0, '', new Date(AT)); }
    const card = insightCards({habits: daily, health: createEmptyHealth(), today: DAY})[0]!;
    expect(card.id).toBe(`habit-weekday:${HABIT}`);
    expect(card.detail.withA.total + card.detail.withoutA.total).toBe(60);
    expect(card.detail.withoutA.total).toBe(16);
    expect(card.sentence).toMatch(/^On \d+ of \d+ weekdays you completed Read; at weekends \d+ of \d+\.$/);
  });
  test('numbers follow the display locale', () => {
    process.env.TZ = 'UTC';
    const {habits, health, links} = showcase();
    setDisplayLocale('de-DE');
    expect(insightCards({habits, health, today: DAY, links}).find(c => c.id === 'steps-water')!.sentence).toContain('8.000 steps');
  });
  test('ordering by contrast, then pair order; dismissed cards are left out', () => {
    process.env.TZ = 'UTC';
    const {habits, health, links} = showcase();
    const all = insightCards({habits, health, today: DAY, links});
    expect(all[0]!.contrast).toBeGreaterThan(all[1]!.contrast);
    expect(insightCards({habits, health, today: DAY, links, hidden: new Set(['steps-water'])}).map(c => c.id)).toEqual(['exercise-water:health_counter-pushups', 'weight-steps']);
  });
});

describe('dismissals', () => {
  test('a dismissal lasts 28 days and is pruned after; unreadable bytes are left alone; the cap', () => {
    const storage = memoryStorage();
    expect(dismissInsight(storage, 'steps-water', DAY)).toEqual({version: 1, dismissed: {'steps-water': DAY}});
    expect(hiddenInsights(readInsights(storage).data, addLocalDays(DAY, 27)).has('steps-water')).toBe(true);
    expect(hiddenInsights(readInsights(storage).data, addLocalDays(DAY, 28)).has('steps-water')).toBe(false);
    expect(dismissInsight(storage, 'weight-steps', addLocalDays(DAY, 29)).dismissed).toEqual({'weight-steps': addLocalDays(DAY, 29)});
    storage.setItem(INSIGHTS_KEY, '{"version":2}');
    expect(readInsights(storage)).toEqual({data: emptyInsights(), unreadable: true});
    expect(() => dismissInsight(storage, 'x', DAY)).toThrow('This card could not be dismissed on this device.');
    expect(storage.getItem(INSIGHTS_KEY)).toBe('{"version":2}');
    startOverInsights(storage);
    expect(readInsights(storage)).toEqual({data: emptyInsights(), unreadable: false});
    storage.setItem(INSIGHTS_KEY, JSON.stringify({version: 1, dismissed: Object.fromEntries(Array.from({length: MAX_DISMISSED}, (_, i) => [`card-${i}`, DAY]))}));
    expect(() => dismissInsight(storage, 'one-more', DAY)).toThrow();
  });
});
