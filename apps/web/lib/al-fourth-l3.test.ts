import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, habitDay, type HabitInput} from './habits';
import {addWater} from './health-daily';
import {createEmptyHealth, healthSchema} from './health';
import {applyAutoCompletion, autoCheckInMarker, autoCompletions} from './habit-health-links/engine';
import {ideaHealthLink} from './habit-health-links/suggest';
import {autoTickCount} from '../components/habits/auto-value';
import {duplicateHabitInput} from './habits-duplicate';
import {levelLine} from './game/celebrate';
import {cleanProfileName, onboardingSetupSchema, profileNameSchema} from './onboarding-setup';

/** Session AL fourth pass (lane L3): the replay's open rows, on the records. Fictional data only. */
const NOW = new Date('2026-11-04T03:10:00Z'), TODAY = '2026-11-04', ID = '11111111-1111-4111-8111-111111111111';
const input = (extra: Partial<HabitInput> = {}): HabitInput => ({title: 'Read', category: 'Learning', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});

describe('N-056/NB-200/D-220: an automatic tick counts what Health holds now', () => {
  const litres = input({title: 'Drink water', category: 'Health', measurement: {kind: 'quantity', unit: 'liters'}, target: 2});
  test('2 L ticks the habit at its 2 L target; 250 mL more makes the card read 2.25, as Health says 2,250 mL', () => {
    const habits = createHabit({...emptyHabitData(), timeZone: 'UTC'}, litres, new Date('2026-11-04T02:00:00Z'), ID);
    let health = healthSchema.parse(createEmptyHealth());
    health = addWater(health, {id: 'health_water-0001', date: TODAY, amountMilli: 2_000_000, unit: 'ml'}, '2026-11-04T01:00:00.000Z');
    const link = ideaHealthLink(litres, 'ml')!;
    const [item] = autoCompletions({links: {version: 1, links: {[ID]: link}, applied: []}, habits, health, now: NOW});
    const ticked = applyAutoCompletion(habits, item!, NOW), habit = ticked.habits[0]!, rule = habit.rules[0]!;
    const marker = autoCheckInMarker(item!, new Date(NOW.getTime() + 5));
    expect(habitDay(habit, TODAY, TODAY).count).toBe(2);
    expect(autoTickCount(habit, rule, TODAY, marker, link, health)).toBeNull(); // Health holds no more than the entry
    health = addWater(health, {id: 'health_water-0002', date: TODAY, amountMilli: 250_000, unit: 'ml'}, '2026-11-04T03:20:00.000Z');
    expect(autoTickCount(habit, rule, TODAY, marker, link, health)).toBe(2.25);
    // The person's own change after the tick wins: the card shows the entry again.
    const edited = {...habit, entries: habit.entries.map(e => ({...e, updatedAt: '2026-11-04T04:00:00.000Z'}))};
    expect(autoTickCount(edited, rule, TODAY, marker, link, health)).toBeNull();
    expect(autoTickCount(habit, rule, TODAY, {...marker, undone: true}, link, health)).toBeNull();
    // A unit the Health value does not convert to is left alone.
    expect(autoTickCount(habit, {...rule, measurement: {kind: 'quantity', unit: 'glasses'}}, TODAY, marker, link, health)).toBeNull();
  });
});

describe('NB-133: Duplicate makes a copy with the same rule and no history', () => {
  test('"Read (copy)", then "Read (copy 2)"; a past end date and the stack link are left out', () => {
    const d = createHabit(emptyHabitData(), input({schedule: {kind: 'frequency', times: 3, period: 'week'}, endCondition: {kind: 'date', date: '2026-10-01'}}), new Date('2026-09-01T08:00:00Z'), ID);
    const copy = duplicateHabitInput(d.habits[0]!, ['Read'], TODAY);
    expect(copy).toMatchObject({title: 'Read (copy)', schedule: {kind: 'frequency', times: 3, period: 'week'}, endCondition: {kind: 'none'}});
    expect(copy).not.toHaveProperty('stackAfterId');
    expect(duplicateHabitInput(d.habits[0]!, ['Read', 'read (copy)'], TODAY).title).toBe('Read (copy 2)');
    const long = createHabit(emptyHabitData(), input({title: 'x'.repeat(100)}), NOW, ID).habits[0]!;
    expect(duplicateHabitInput(long, [], TODAY).title).toHaveLength(100);
    // The copy is a valid new habit.
    expect(() => createHabit(d, copy, NOW, '22222222-2222-4222-8222-222222222222')).not.toThrow();
  });
});

describe('DV-118: the level line names where the XP came from', () => {
  test('check-ins and logs keep the original line; a goal says goal steps', () => {
    expect(levelLine([{kind: 'habit', xp: 10}, {kind: 'health', xp: 2}])).toBe('Every check-in and log you made brought you here.');
    expect(levelLine([{kind: 'goal', xp: 25}])).toBe('Your goal steps brought you here.');
    expect(levelLine([{kind: 'habit', xp: 10}, {kind: 'goal', xp: 25}, {kind: 'review', xp: 15}])).toBe('Your check-ins, goal steps and weekly reviews brought you here.');
  });
});

describe('NB-006/NB-241: the welcome keeps a name and the pages it switched, tolerantly', () => {
  test('a name is cleaned and capped; an unreadable record reads as no name', () => {
    expect(cleanProfileName('  Sam\u0007  Lee ‮')).toBe('Sam Lee');
    expect(cleanProfileName('y'.repeat(80))).toHaveLength(40);
    expect(cleanProfileName('   ')).toBe('');
    expect(profileNameSchema.parse({version: 1, name: 42})).toMatchObject({name: ''});
  });
  test('the setup record reads with or without its page list, and drops a broken one', () => {
    const base = {version: 1, at: '2026-11-04T02:00:00.000Z', habitIds: [], widgetIds: [], focuses: []};
    expect(onboardingSetupSchema.parse(base).pages).toBeUndefined();
    expect(onboardingSetupSchema.parse({...base, pages: [{id: 'health', was: false}]}).pages).toEqual([{id: 'health', was: false}]);
    expect(onboardingSetupSchema.parse({...base, pages: 'nope'}).pages).toBeUndefined();
  });
});

describe('MO-123 (L2 request): a linked water habit counts the water already logged before it ticks', () => {
  test('500 mL logged → 0.5 of 2 liters so far; nothing in Health or a manual entry → none', async () => {
    const {healthSoFar} = await import('../components/habits/auto-value');
    const litres = input({title: 'Drink water', category: 'Health', measurement: {kind: 'quantity', unit: 'liters'}, target: 2});
    const habits = createHabit({...emptyHabitData(), timeZone: 'UTC'}, litres, new Date('2026-11-04T02:00:00Z'), ID), habit = habits.habits[0]!, rule = habit.rules[0]!;
    const link = ideaHealthLink(litres, 'ml')!;
    let health = healthSchema.parse(createEmptyHealth());
    expect(healthSoFar(habit, rule, TODAY, undefined, link, health)).toBeNull();
    health = addWater(health, {id: 'health_water-0003', date: TODAY, amountMilli: 500_000, unit: 'ml'}, '2026-11-04T01:00:00.000Z');
    expect(healthSoFar(habit, rule, TODAY, undefined, link, health)).toBe(0.5);
    expect(autoCompletions({links: {version: 1, links: {[ID]: link}, applied: []}, habits, health, now: NOW})).toEqual([]); // not ticked below 2 L
    const manual = createHabit({...emptyHabitData(), timeZone: 'UTC'}, litres, new Date('2026-11-04T02:00:00Z'), ID);
    const logged = {...manual.habits[0]!, entries: [{date: TODAY, count: 1, disposition: 'logged' as const, note: '', updatedAt: NOW.toISOString()}]};
    expect(healthSoFar(logged, rule, TODAY, undefined, link, health)).toBeNull();
  });
});

describe('N-085 (L2 request): an exercise habit names its activity from Health\'s list, in the day\'s note', () => {
  test('offered on a minutes habit about movement; one "Activity:" line, set, replaced and removed', async () => {
    const {ACTIVITY_CHOICES, activityOfNote, offersActivityType, withActivityNote} = await import('./habits-activity');
    expect(ACTIVITY_CHOICES).toContain('Run');
    expect(offersActivityType({title: 'Exercise', category: 'Movement'}, {measurement: {kind: 'duration', unit: 'minutes'}})).toBe(true);
    expect(offersActivityType({title: 'Read', category: 'Learning'}, {measurement: {kind: 'duration', unit: 'minutes'}})).toBe(false);
    expect(offersActivityType({title: 'Exercise', category: 'Movement'}, {measurement: {kind: 'boolean'}})).toBe(false);
    const once = withActivityNote('Felt good', 'Run');
    expect(once).toBe('Felt good\nActivity: Run');
    expect(activityOfNote(once)).toBe('Run');
    expect(withActivityNote(once, 'Yoga')).toBe('Felt good\nActivity: Yoga');
    expect(withActivityNote(once, '')).toBe('Felt good');
    expect(withActivityNote('', '  Strength training ')).toBe('Activity: Strength training');
  });
});
