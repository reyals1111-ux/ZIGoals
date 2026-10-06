import {expect, test} from 'vitest';
import {buildShowcase} from '../../showcase-data';
import {createHabit, habitDataSchema, type HabitData} from '../../habits';
import {foodSchema, healthSchema, logHealthItem, saveFood, saveRecipe, type HealthData} from '../../health';
import {dailyData, saveMealFromRecipe} from '../../health-daily';
import {countOn} from '../../health-counters';
import {platformSchema, type Platform} from '../../positions';
import {fastingSchema, FASTING_KEY} from '../../fasting/schema';
import {emptyReminders} from '../../reminders/schema';
import {weeklyReviewSchema} from '../../weekly-review/schema';
import {reviewFor} from '../../weekly-review/store';
import type {Handle} from '../context/types';
import {applyBatch, undoBatch} from './batch';
import {parseReply} from './parse';
import {applyPlan, planAction, type Env, type Plan, type Stores} from './plan';
import {actionSchema, type Action} from './schema';

// Session V Part 7: the extended whitelist. Every new kind plans a card from the device's records, writes only through
// the existing mutators, undoes exactly, and refuses in plain words instead of guessing. Showcase data is fictional.
const DAY = '2026-09-20', now = new Date('2026-09-20T19:00:00Z'), at = now.toISOString();
const {records} = buildShowcase(DAY);
const stores: Stores = {
  habits: habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData,
  health: healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData,
  platform: platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform,
  fasting: fastingSchema.parse(JSON.parse(records[FASTING_KEY]!)),
  reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: weeklyReviewSchema.parse(JSON.parse(records['zigoals:weekly-review:v1']!)),
};
const habitNamed = (title: string) => stores.habits.habits.find(h => h.title === title)!;
const handles: Handle[] = [
  ...stores.habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title})),
  ...stores.platform.goals.map((g, i) => ({handle: `g${i + 1}`, kind: 'goal' as const, id: `private:${g.id}`, label: g.name})),
  ...stores.health.foods.map((f, i) => ({handle: `f${i + 1}`, kind: 'food' as const, id: f.id, label: f.name})),
];
const hOf = (title: string) => handles.find(h => h.label === title)!.handle;
let counter = 0;
const env = (overrides: Partial<Env> = {}): Env => ({stores, handles, now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', newHealthId: () => `health_v7-${String(++counter).padStart(8, '0')}`, newHabitId: () => `93000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`, ...overrides});
const action = (raw: Record<string, unknown>): Action => actionSchema.parse(raw);
function plan(raw: Record<string, unknown>, e = env()): Plan { const result = planAction(action(raw), e); if (!result.ok) throw Error(result.message); return result.plan; }
const refusal = (raw: Record<string, unknown>, e = env()) => { const result = planAction(action(raw), e); return result.ok ? null : result.message; };
const comparable = (s: Stores) => JSON.parse(JSON.stringify(s, (key, value: unknown) => key === 'updatedAt' ? undefined : value));
/** Apply on `base`, check the undo is accepted at once, undo, and expect `base` back exactly. */
function roundTrip(p: Plan, base: Stores = stores): Stores {
  const after = applyPlan(p, base);
  expect(comparable(after)).not.toEqual(comparable(base));
  expect(p.undo!.unchanged(after, after)).toBe(true);
  expect(comparable({...after, ...p.undo!.write(after)})).toEqual(comparable(base));
  return after;
}
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i;

test('the brief\'s breakfast: one message, five cards, "Add all" through the mutators, one Undo puts everything back', () => {
  const reply = 'Five cards for your morning.\n\n```zigoals-action\n[{"kind":"log-food","name":"Two eggs","meal":"Breakfast","estimate":{"kcal":140,"protein_g":12}},{"kind":"log-food","name":"Toast","meal":"Breakfast","estimate":{"kcal":80}},{"kind":"log-food","name":"Coffee","meal":"Breakfast"},{"kind":"check-in","habit":"' + hOf('Meditate') + '","minutes":30},{"kind":"log-water","glasses":2}]\n```';
  const parsed = parseReply(reply);
  expect(parsed.proposals.map(p => p.kind)).toEqual(['log-food', 'log-food', 'log-food', 'check-in', 'log-water']);
  const plans = parsed.proposals.map(p => { const r = planAction(p, env()); if (!r.ok) throw Error(r.message); return r.plan; });
  const meditated = habitNamed('Meditate').entries.find(e => e.date === DAY)!.count;
  expect(plans[3]!.card).toMatchObject({title: 'Check in: Meditate', lines: [`Set the day's count to 30 minutes (target 10 minutes), was ${meditated}`]});
  expect(plans[2]!.card.lines[1]).toBe('AI estimate per serving: kcal unknown, protein unknown, carbs unknown, fat unknown; unknown stays unknown, never 0');
  const {stores: after, applied, error} = applyBatch(plans, stores);
  expect(error).toBeNull(); expect(applied).toBe(5);
  expect(after.health.diary.length).toBe(stores.health.diary.length + 3);
  expect(dailyData(after.health).water.length).toBe(dailyData(stores.health).water.length + 1);
  expect(after.habits.habits.find(h => h.title === 'Meditate')!.entries.find(e => e.date === DAY)!.count).toBe(30);
  // Every confirmed card names its Activity entry: the diary entries, the check-in, the water entry.
  expect(plans.map(p => p.activity!.id)).toEqual([after.health.diary.at(-3)!.id, after.health.diary.at(-2)!.id, after.health.diary.at(-1)!.id, `habit:${habitNamed('Meditate').id}:${DAY}`, dailyData(after.health).water.at(-1)!.id]);
  const {stores: undone, refused} = undoBatch(plans, after, after);
  expect(refused).toBeNull();
  expect(comparable({...undone, health: {...undone.health, daily: {...dailyData(undone.health), waterOperations: []}}})).toEqual(comparable({...stores, health: {...stores.health, daily: {...dailyData(stores.health), waterOperations: []}}}));
});

test('check-ins in minutes or a quantity follow the habit\'s own measure, or are refused', () => {
  expect(plan({kind: 'check-in', habit: hOf('Read'), minutes: 45}).card.lines[0]).toBe('Set the day\'s count to 45 minutes (target 30 minutes), was 30');
  expect(refusal({kind: 'check-in', habit: hOf('Contribute'), minutes: 20})).toBe('This habit is counted in times, not in minutes, so nothing was proposed. Say how many times.');
  expect(plan({kind: 'check-in', habit: hOf('Drink water'), quantity: 3, unit: 'glasses'}).card.lines[0]).toMatch(/^Set the day's count to 3 glasses \(target 8 glasses\)/);
  expect(plan({kind: 'check-in', habit: hOf('Drink water'), quantity: 3, unit: 'glass'}).card.lines[0]).toMatch(/^Set the day's count to 3 glasses/);
  expect(refusal({kind: 'check-in', habit: hOf('Walk'), quantity: 2, unit: 'km'})).toBe('This habit is measured in steps, not km, so nothing was proposed.');
  expect(plan({kind: 'check-in', habit: hOf('Read'), quantity: 1, unit: 'hour'}).card.lines).toEqual(['Set the day\'s count to 60 minutes (target 30 minutes), was 30', '1 hour = 60 minutes']);
  // A habit kept in hours takes minutes as hours; one that is done or not is marked done.
  let habits = createHabit(stores.habits, {title: 'Deep work', category: 'Personal', description: '', notes: '', type: 'build', measurement: {kind: 'duration', unit: 'hours'}, schedule: {kind: 'daily'}, target: 2, targetPeriod: 'day', timeOfDay: 'anytime'}, now, '93000000-0000-4000-8000-0000000000a1');
  habits = createHabit(habits, {title: 'Floss', category: 'Personal', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime'}, now, '93000000-0000-4000-8000-0000000000a2');
  const more = env({stores: {...stores, habits}, handles: [...handles, {handle: 'h20', kind: 'habit', id: '93000000-0000-4000-8000-0000000000a1', label: 'Deep work'}, {handle: 'h21', kind: 'habit', id: '93000000-0000-4000-8000-0000000000a2', label: 'Floss'}]});
  expect(plan({kind: 'check-in', habit: 'h20', minutes: 90}, more).card.lines).toEqual(['Set the day\'s count to 1.5 hours (target 2 hours)', '90 minutes = 1.5 hours']);
  expect(plan({kind: 'check-in', habit: 'h21', minutes: 3}, more).card.lines).toEqual(['Mark as done', '3 minutes said; this habit records done or not']);
  expect(actionSchema.safeParse({kind: 'check-in', habit: 'h1', value: 2, minutes: 30}).success).toBe(false);
});

test('a custom food: per serving, unknown stays unknown, 100 g when no serving is given; its undo waits while the food is in use', () => {
  const shake = plan({kind: 'create-food', name: 'Protein shake', serving_ml: 300, estimate: {kcal: 200, protein_g: 30}});
  expect(shake.card).toMatchObject({title: 'Add the food "Protein shake"', where: 'Health · Foods & recipes', estimate: true, lines: ['per serving of 300 mL', 'Per serving: kcal 200, protein 30 g, carbs unknown, fat unknown; unknown stays unknown, never 0']});
  const after = roundTrip(shake);
  const food = after.health.foods.at(-1)!;
  expect(food).toMatchObject({name: 'Protein shake', brand: 'AI estimate', servingGrams: null, servingMl: 300, nutrients: {kcal: 200, proteinMg: 30_000, carbsMg: null, fatMg: null}});
  expect(shake.activity).toEqual({id: food.id, title: 'Food added: Protein shake'});
  const used = {...after, health: logHealthItem(after.health, {id: 'health_diary-v7-0001', sourceId: food.id, sourceKind: 'food', date: DAY, meal: 'Snacks', quantityMilli: 1000}, at)};
  expect(shake.undo!.unchanged(after, used)).toBe(false);
  const plain = plan({kind: 'create-food', name: 'Rye bread', brand: 'Bakery'});
  expect(plain.card.lines).toEqual(['Bakery · per serving of 100 g', 'Per serving: kcal unknown, protein unknown, carbs unknown, fat unknown; unknown stays unknown, never 0', 'Serving weight not given: recorded as 100 g per serving (edit it in Foods & recipes)']);
  expect(plain.card.estimate).toBe(false);
  expect(plan({kind: 'create-food', name: 'berry overnight oats'}).card.lines.at(-1)).toBe('You already have a food called "berry overnight oats"; this adds a second one');
});

test('a recipe: the person\'s own foods first (handle or exact name), new foods for the rest with unknown nutrients kept unknown', () => {
  const p = plan({kind: 'create-recipe', name: 'Weekend bowl', servings: 2, ingredients: [{name: 'Yogurt and almonds', servings: 1}, {name: 'Oats', food: 'f5', grams: 50}, {name: 'Blueberries', grams: 80, estimate_per_100g: {kcal: 57}}, {name: 'Honey', grams: 10}]});
  expect(p.card.title).toBe('Create the recipe "Weekend bowl"');
  expect(p.card.lines).toEqual(['Makes 2 servings', '1 serving Yogurt and almonds (your food)', '50 g Oats (your food)', '80 g Blueberries (new food, AI estimate per 100 g: kcal 57, protein unknown, carbs unknown, fat unknown)', '10 g Honey (new food, nutrients unknown)', '2 new foods added to Foods & recipes as "AI estimate" (100 g per serving); unknown nutrients stay unknown']);
  expect(p.card.estimate).toBe(true);
  const after = roundTrip(p), recipe = after.health.recipes.at(-1)!;
  expect(recipe.name).toBe('Weekend bowl'); expect(recipe.portionsMilli).toBe(2000);
  expect(recipe.ingredients.map(i => [i.snapshot.name, i.quantityMilli])).toEqual([['Yogurt and almonds', 1000], ['Showcase imported oats', 500], ['Blueberries', 800], ['Honey', 100]]);
  expect(after.health.foods.slice(-2).map(f => [f.name, f.brand, f.servingGrams, f.nutrients.kcal])).toEqual([['Blueberries', 'AI estimate', 100, 57], ['Honey', 'AI estimate', 100, null]]);
  expect(JSON.stringify(p.card)).not.toMatch(UUID); expect(JSON.stringify(p.card)).not.toContain('health_');
  // Two own foods with the same name are a question, never a guess; a food the context never gave is refused.
  const twins = {...stores, health: saveFood(stores.health, foodSchema.parse({...stores.health.foods[0]!, id: 'health_food-twin-0001'}))};
  expect(refusal({kind: 'create-recipe', name: 'x', ingredients: [{name: 'Berry overnight oats'}]}, env({stores: twins}))).toBe('You have 2 foods called "Berry overnight oats", so nothing was proposed. Ask again from Health, where ZIGi can tell them apart.');
  expect(refusal({kind: 'create-recipe', name: 'x', ingredients: [{name: 'x', food: 'f9'}]})).toMatch(/^ZIGi named a food \(f9\) that is not in this page's context/);
});

test('a planned meal: from a recipe (a saved meal is made for it) or a saved meal; today to 62 days ahead; undo removes both', () => {
  const recipeId = 'health_recipe-v7-0001', withRecipe = {...stores, health: saveRecipe(stores.health, {id: recipeId, name: 'Lentil soup', portionsMilli: 4000, items: [{foodId: stores.health.foods[0]!.id, quantityMilli: 2000}]}, at)};
  const e = env({stores: withRecipe, handles: [...handles, {handle: 'r1', kind: 'recipe', id: recipeId, label: 'Lentil soup'}]});
  const p = plan({kind: 'plan-meal', recipe: 'r1', meal: 'Dinner', day: '2026-09-22'}, e);
  expect(p.card).toMatchObject({title: 'Plan Lentil soup', where: 'Health · Meals & planning', day: '2026-09-22', lines: ['Dinner · 1 serving of your recipe', 'Planned only: log it from Meals & planning when you eat it']});
  const after = roundTrip(p, withRecipe), daily = dailyData(after.health);
  expect(daily.plans.at(-1)).toMatchObject({date: '2026-09-22', meal: 'Dinner', name: 'Lentil soup'}); expect(daily.savedMeals.at(-1)!.name).toBe('Lentil soup');
  expect(refusal({kind: 'plan-meal', recipe: 'r1', meal: 'Lunch', day: 'yesterday'}, e)).toBe('A meal plan is for today or a later day; log a past meal in the diary instead.');
  expect(refusal({kind: 'plan-meal', recipe: 'r1', meal: 'Lunch', day: '2026-11-22'}, e)).toBe('Meals can be planned up to 62 days ahead.');
  const savedId = 'health_meal-v7-0001', withMeal = {...withRecipe, health: saveMealFromRecipe(withRecipe.health, savedId, recipeId, 1000, at)};
  const m = plan({kind: 'plan-meal', saved_meal: 'm1', meal: 'Lunch'}, env({stores: withMeal, handles: [...handles, {handle: 'm1', kind: 'meal', id: savedId, label: 'Lentil soup'}]}));
  const afterMeal = roundTrip(m, withMeal);
  expect(dailyData(afterMeal.health).savedMeals.length).toBe(dailyData(withMeal.health).savedMeals.length);
  expect(actionSchema.safeParse({kind: 'plan-meal', recipe: 'r1', saved_meal: 'm1', meal: 'Lunch'}).success).toBe(false);
});

test('groceries are appended to the notes and taken off again exactly; counters by name or handle, put back exactly', () => {
  const g = plan({kind: 'grocery-item', items: ['Oat milk', 'Spinach']});
  expect(g.card).toMatchObject({title: 'Add 2 items to your grocery notes', lines: ['Oat milk', 'Spinach']});
  const notes = {...stores, health: saveFoodNotes(stores.health, 'Bread')};
  const after = roundTrip(g, notes);
  expect(dailyData(after.health).groceryNotes).toBe('Bread\n- Oat milk\n- Spinach');
  expect(dailyData(roundTrip(plan({kind: 'grocery-item', items: ['Tea']})).health).groceryNotes).toBe('- Tea');
  const push = plan({kind: 'counter', counter: 'push-up', count: 20});
  expect(push.card).toMatchObject({title: 'Add 20 Push-ups', where: 'Health · Counters'});
  const afterPush = roundTrip(push);
  expect(countOn(afterPush.health, 'health_counter-pushups', DAY)).toBe((countOn(stores.health, 'health_counter-pushups', DAY) ?? 0) + 20);
  const byHandle = plan({kind: 'counter', counter: 'c1', count: 5}, env({handles: [...handles, {handle: 'c1', kind: 'counter', id: 'health_counter-squats', label: 'Squats'}]}));
  expect(byHandle.card.title).toBe('Add 5 Squats');
  expect(refusal({kind: 'counter', counter: 'Burpees', count: 5})).toBe('No single counter is called "Burpees"; your counters: Push-ups, Pull-ups, Squats.');
  // Without an exercise group at all, the undo removes the group again rather than leaving an empty one behind.
  const {exercise, ...bare} = stores.health; void exercise;
  roundTrip(plan({kind: 'counter', counter: 'Squats', count: 3}), {...stores, health: healthSchema.parse(bare)});
});
function saveFoodNotes(health: HealthData, text: string): HealthData { return healthSchema.parse({...health, daily: {...dailyData(health), groceryNotes: text}}); }

test('reminders: habit and water as Today\'s cards, goals, Wealth and the pack in ZIGi\'s own key; a new habit\'s reminder waits for the habit', () => {
  const water = plan({kind: 'create-reminder', for: 'water', time: '10:00'});
  expect(water.target).toBe('reminders'); expect(water.card.lines[0]).toBe('Every day at 10:00, as a reminder card on Today (this device only)');
  expect(roundTrip(water).reminders.water).toEqual({time: '10:00'});
  const read = plan({kind: 'create-reminder', for: 'habit', habit: hOf('Read'), time: '21:00'});
  expect(roundTrip(read).reminders.habits[habitNamed('Read').id]).toEqual({time: '21:00'});
  const goal = plan({kind: 'create-reminder', for: 'goal', goal: 'g3', time: '18:00', weekday: 0});
  expect(goal.target).toBe('zigiReminders'); expect(goal.card.title).toBe('Weekly check-in: Japan adventure');
  expect(roundTrip(goal).zigiReminders.goalCheckIns).toEqual({[`private:${stores.platform.goals[2]!.id}`]: {weekday: 0, time: '18:00'}});
  const wealth = plan({kind: 'create-reminder', for: 'wealth', time: '09:00'});
  expect(wealth.card.lines[0]).toBe('Every Sunday at 09:00, kept on this device for ZIGi\'s reminders'); // 2026-09-20 is a Sunday
  expect(roundTrip(wealth).zigiReminders.wealthLook).toEqual({weekday: 0, time: '09:00'});
  // build-habit: the habit card and its reminder card; the reminder names the habit before it exists and waits for it.
  const parsed = parseReply('```zigoals-action\n{"kind":"build-habit","title":"Stretch","measurement":"minutes","target":10,"timeOfDay":"morning","reminder":"07:30"}\n```');
  expect(parsed.proposals).toEqual([expect.objectContaining({kind: 'create-habit', title: 'Stretch', ref: 'new1'}), {kind: 'create-reminder', for: 'habit', habit: 'new1', time: '07:30'}]);
  const refs = new Map([['new1', {id: '93000000-0000-4000-8000-0000000000b1', title: 'Stretch'}]]);
  const [habitPlan, reminderPlan] = parsed.proposals.map(p => { const r = planAction(p, env({refs})); if (!r.ok) throw Error(r.message); return r.plan; });
  expect(reminderPlan!.card.lines).toEqual(['Every day at 07:30, as a reminder card on Today (this device only)', 'For the new habit "Stretch": add that card first']);
  expect(() => applyPlan(reminderPlan!, stores)).toThrow('Add the habit "Stretch" first, then its reminder.');
  const both = applyBatch([habitPlan!, reminderPlan!], stores);
  expect(both.error).toBeNull(); expect(both.stores.habits.habits.some(h => h.id === '93000000-0000-4000-8000-0000000000b1')).toBe(true);
  expect(both.stores.reminders.habits['93000000-0000-4000-8000-0000000000b1']).toEqual({time: '07:30'});
  expect(refusal({kind: 'create-reminder', for: 'habit', habit: 'new3', time: '07:30'})).toBe('This reminder belongs to a habit that is not proposed in this reply, so nothing was proposed.');
  expect(actionSchema.safeParse({kind: 'create-reminder', for: 'water', time: '25:00'}).success).toBe(false);
});

test('a weekly intention: only the intention of this week\'s review, put back exactly by Undo', () => {
  const p = plan({kind: 'review-intention', intention: 'Walk after lunch on three days'});
  expect(p.card).toMatchObject({title: 'Set your intention for this week', day: 'week of 2026-09-14', where: 'Weekly review'});
  const after = roundTrip(p);
  expect(reviewFor(after.weekly, '2026-09-14')?.notes).toEqual({intention: 'Walk after lunch on three days'});
  expect(reviewFor(stores.weekly, '2026-09-14')).toBeUndefined();
});

test('plan-goal becomes a goal draft with milestone notes plus its supporting habits, each its own card', () => {
  const parsed = parseReply('```zigoals-action\n{"kind":"plan-goal","name":"Kyoto spring","target":4000,"currency":"EUR","targetDate":"2027-04-01","category":"Travel","milestones":["Flights","Rail pass"],"habits":[{"title":"Save a little daily","measurement":"done"},{"title":"Japanese practice","measurement":"minutes","target":15}]}\n```');
  expect(parsed.proposals.map(p => p.kind)).toEqual(['create-goal', 'create-habit', 'create-habit']);
  const goal = plan(parsed.proposals[0]! as unknown as Record<string, unknown>);
  expect(goal.card.lines).toContain('Milestones: Flights · Rail pass');
  const after = applyPlan(goal, stores);
  expect(after.platform.goals.at(-1)!.milestones.map(m => [m.title, m.done])).toEqual([['Flights', false], ['Rail pass', false]]);
  expect(goal.activity!.id).toBe(`created:${after.platform.goals.at(-1)!.id}`);
  // A composite that does not fit is one plain note, never a partial set of cards.
  const bad = parseReply('```zigoals-action\n{"kind":"plan-goal","name":"x","target":-5,"currency":"EUR"}\n```');
  expect(bad.proposals).toEqual([]); expect(bad.rejected).toHaveLength(1);
  // A reply that names new1 itself keeps it; the expanded habit takes the next number.
  const mixed = parseReply('```zigoals-action\n[{"kind":"create-habit","title":"A","ref":"new1"},{"kind":"build-habit","title":"B","reminder":"08:00"}]\n```');
  expect(mixed.proposals.map(p => p.kind === 'create-habit' ? p.ref : p.kind === 'create-reminder' ? p.habit : null)).toEqual(['new1', 'new2', 'new2']);
});
