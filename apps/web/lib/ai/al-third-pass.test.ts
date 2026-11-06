import {describe, expect, test} from 'vitest';
import {logHabitValue, latestHabitRule, measurementUnit} from '../habits';
import {inputCounter, INPUT_COUNTER_FROM, MAX_INPUT_CHARS} from './chats';
import {localAnswer} from './local-answers/engine';
import {foodEstimateFood, isFoodEstimateAsk} from './local-answers/al-third';
import {nlUnits} from './local-answers/words';
import {loggedTextOf} from './tools/habits';
import {toolEnv} from './tools/env';
import {gatesFor, showcaseSources} from './tools/fixtures';
import {runTool} from './tools/registry';
import type {ToolOk} from './tools/types';
import {buildShowcase} from '../showcase-data';
import {habitDataSchema, type HabitData} from '../habits';
import {healthSchema, type HealthData} from '../health';
import {platformSchema, type Platform} from '../positions';
import {homeRecordsIn} from '../sync-homes-store';
import {emptyReminders} from '../reminders/schema';
import {presetSettings} from '../dashboard-settings';
import {planAction, type Stores} from './actions/plan';
import {actionSchema} from './actions/schema';

/** Session AL third pass (lane L7): the counter (BN-070), the food-question reading (P14-B) and part-minutes (NB-114). */
describe('BN-070: the composer counter', () => {
  test('a 5,000-character message sees the limit; a short one sees nothing; the limit itself is announced', () => {
    expect(INPUT_COUNTER_FROM).toBe(2000);
    expect(inputCounter(1999)).toBeNull();
    expect(inputCounter(5000)).toEqual({text: '5,000 of 15,000 characters', atLimit: false});
    expect(inputCounter(MAX_INPUT_CHARS)).toEqual({text: 'That is the limit: 15,000 characters. A shorter message gets a better answer.', atLimit: true});
  });
});

describe('P14-B: a question about a food is not a question about the diary', () => {
  test('the food is read from the question, in English and Dutch', () => {
    expect(foodEstimateFood('How many calories in my plate of pasta?')).toBe('pasta');
    expect(foodEstimateFood('Roughly how many calories are in a bowl of oatmeal?')).toBe('oatmeal');
    expect(foodEstimateFood('calories in 200g rice')).toBe('rice');
    expect(foodEstimateFood('how much protein in chicken breast')).toBe('chicken breast');
    expect(foodEstimateFood('Hoeveel calorieën zitten er in een bord pasta?')).toBe('pasta');
    expect(foodEstimateFood('Hoeveel kcal heeft een banaan')).toBe('banaan');
  });
  test('the diary\'s questions stay the lookups\' (today, a meal, what I ate), and a photo or a label keeps its own card', () => {
    for (const q of ['How many calories did I eat today?', 'calories in my lunch', 'How many calories in my breakfast?', 'How many calories this week?', 'Hoeveel calorieën heb ik gisteren gegeten?', 'Estimate the calories in my meal from a photo', 'How many calories in this?', 'calories in the label photo'])
      expect(isFoodEstimateAsk(q), q).toBe(false);
  });
  test('with a model connected, the device leaves the food question to it (localAnswer says none)', () => {
    const env = toolEnv(showcaseSources(), gatesFor(true), 'local');
    expect(localAnswer('How many calories in my plate of pasta?', env).kind).toBe('none');
    expect(localAnswer('How many calories did I eat today?', env).kind).toBe('answer');
  });
});

describe('NB-114: a part-minute in ZIGi\'s habit words', () => {
  test('habits_due and the device answer say "12 s of 10 minutes", never "0.2 of 10 minutes"', () => {
    const sources = showcaseSources(), day = sources.habitDay;
    const timed = sources.habits.habits.find(h => /^minutes?$/.test(measurementUnit(latestHabitRule(h)) ?? '') && latestHabitRule(h).target > 1)!;
    expect(timed).toBeTruthy();
    const habits = logHabitValue(sources.habits, timed.id, day, 0.2, {mode: 'set'}, sources.now);
    const env = toolEnv({...sources, habits}, gatesFor(true), 'local');
    const r = runTool('habits_due', {}, env) as ToolOk, row = ((r.data.open ?? []) as {title: string; logged: unknown; loggedText?: string}[]).find(x => x.title === timed.title)!;
    expect(row.logged).toBe(0.2);
    expect(row.loggedText).toBe('12 s');
    const answer = localAnswer('Which habits are still open today?', env);
    expect('text' in answer ? answer.text : '').toContain(`${timed.title}: 12 s of`);
    expect('text' in answer ? answer.text : '').not.toMatch(/\b0\.2 of\b/);
  });
  test('whole amounts keep their number; Dutch answers name the unit in Dutch', () => {
    expect(loggedTextOf(3, 'minutes')).toEqual({});
    expect(loggedTextOf(0.81, 'minutes')).toEqual({loggedText: '49 s'});
    expect(loggedTextOf(1.25, 'hours')).toEqual({loggedText: '1 h 15 min'});
    expect(nlUnits('30 minutes')).toBe('30 minuten');
    expect(nlUnits('1 time')).toBe('1 keer');
    expect(nlUnits('8 push-ups')).toBe('8 push-ups');
  });
});

test('NB-114: the check-in card says "was 49 s", never "was 0.81"', () => {
  const DAY = '2026-09-20', now = new Date('2026-09-20T19:00:00Z'), {records} = buildShowcase(DAY);
  let habits = habitDataSchema.parse(JSON.parse(records['zigoals:habits:v1']!)) as HabitData;
  const meditate = habits.habits.find(h => h.title === 'Meditate')!;
  habits = logHabitValue(habits, meditate.id, DAY, 0.81, {mode: 'set'}, now);
  const stores: Stores = {habits, health: healthSchema.parse(JSON.parse(records['zigoals:health:v1']!)) as HealthData, platform: platformSchema.parse(JSON.parse(records['zigoals:platform:v1']!)) as Platform,
    fasting: homeRecordsIn(records).fasting, reminders: emptyReminders(), zigiReminders: {version: 1}, weekly: homeRecordsIn(records).weeklyReview, memory: {version: 1}, settings: {...presetSettings('balanced'), onboarded: true}};
  const handles = habits.habits.map((h, i) => ({handle: `h${i + 1}`, kind: 'habit' as const, id: h.id, label: h.title}));
  const result = planAction(actionSchema.parse({kind: 'check-in', habit: handles.find(h => h.label === 'Meditate')!.handle, minutes: 10}), {stores, handles, now, habitDay: DAY, healthDay: DAY, timeZone: 'UTC', newHealthId: () => 'health_t3-00000001', newHabitId: () => '93000000-0000-4000-8000-000000000001'});
  expect(result.ok && result.plan.card.lines[0]).toBe('Set the day\'s count to 10 minutes (target 10 minutes), was 49 s');
});
