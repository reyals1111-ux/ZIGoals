import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, frequencyProgress, habitDay, habitEntryText, habitRuleOn, logHabitValue, restoreHabitEntry, setHabitEntryStatus, type HabitInput} from './habits';
import {scheduleHabitState} from './habit-actions';
import {deleteHabitForGoodNow, undoDeleteHabit} from './habit-delete-write';
import {isDeletedHabit} from './habit-delete';
import {addWater, removeWater} from './health-daily';
import {createEmptyHealth, healthSchema} from './health';
import {applyAutoCompletion, autoCheckInMarker, autoCompletions, autoRevocations, revokeAutoCompletion} from './habit-health-links/engine';
import {clearAutoCheckIn, recordAutoCheckIn} from './habit-health-links/store';
import type {HabitHealthLinksV4} from './habit-health-links/schema';
import {ideaHealthLink, waterTargetFromLitres} from './habit-health-links/suggest';
import {autoTickRevocations, clearAutoTick} from './auto-rules/engine';

/** Session AL (Part 6, lane L3): the Habits trust rows on the records. Fictional data only. */
const NOW = new Date('2026-11-04T03:10:00Z'), TODAY = '2026-11-04', ID = '11111111-1111-4111-8111-111111111111';
const input = (extra: Partial<HabitInput> = {}): HabitInput => ({title: 'Typo habbit', category: 'Personal', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});

describe('NB-135/NB-160/NB-181: an archived habit can be deleted for good the same day', () => {
  test('a habit with a check-in today, archived from tomorrow, is deleted now; Undo brings it back as it was', () => {
    let d = createHabit(emptyHabitData(), input(), new Date('2026-11-01T08:00:00Z'), ID);
    d = logHabitValue(d, ID, TODAY, 1, {}, NOW);
    d = scheduleHabitState(d, ID, 'archived', '2026-11-05', NOW); // today holds a check-in: the archive starts tomorrow
    expect(habitRuleOn(d.habits[0]!, TODAY)?.state).toBe('active');
    const {data, deleted} = deleteHabitForGoodNow(d, ID, NOW);
    expect(isDeletedHabit(data.habits[0]!)).toBe(true);
    expect(data.habits[0]!.entries).toEqual([]);
    const back = undoDeleteHabit(data, deleted);
    expect(back.habits[0]!.title).toBe('Typo habbit');
    expect(back.habits[0]!.entries).toHaveLength(1);
    // Accepted rule revisions are never dropped by the deletion (sync's append-only rule).
    for (const r of d.habits[0]!.ruleRevisions ?? []) expect(data.habits[0]!.ruleRevisions?.some(x => x.id === r.id)).toBe(true);
  });
});

describe('PR-044/NB-068/NB-131: a skip can be undone', () => {
  test('restoreHabitEntry puts the day back to the entry it held before the skip', () => {
    let d = createHabit(emptyHabitData(), input({measurement: {kind: 'duration', unit: 'minutes'}, target: 30}), new Date('2026-11-01T08:00:00Z'), ID);
    d = logHabitValue(d, ID, TODAY, 15, {}, NOW);
    const before = d.habits[0]!.entries.find(e => e.date === TODAY);
    const skipped = setHabitEntryStatus(d, ID, TODAY, 'skipped', 'Skipped · Rest day', NOW);
    expect(habitDay(skipped.habits[0]!, TODAY, TODAY).status).toBe('skipped');
    const back = restoreHabitEntry(skipped, ID, TODAY, before, new Date(NOW.getTime() + 1000));
    expect(habitDay(back.habits[0]!, TODAY, TODAY)).toMatchObject({status: 'partial', count: 15});
    const fresh = restoreHabitEntry(setHabitEntryStatus(createHabit(emptyHabitData(), input(), new Date('2026-11-01T08:00:00Z'), ID), ID, TODAY, 'skipped', '', NOW), ID, TODAY, undefined, NOW);
    expect(habitDay(fresh.habits[0]!, TODAY, TODAY).status).toBe('due');
  });
});

describe('NB-076/NB-158/H-008: a 3× per week habit says how the week stands', () => {
  test('frequencyProgress counts the days this week whose check-in met the target', () => {
    let d = createHabit(emptyHabitData(), input({title: 'Gym', schedule: {kind: 'frequency', times: 3, period: 'week'}}), new Date('2026-10-26T08:00:00Z'), ID);
    expect(frequencyProgress(d.habits[0]!, TODAY)).toEqual({done: 0, times: 3, period: 'week'});
    d = logHabitValue(d, ID, '2026-11-02', 1, {}, NOW); // Monday of this week
    d = logHabitValue(d, ID, '2026-11-01', 1, {}, NOW); // last week's Sunday: not counted
    expect(frequencyProgress(d.habits[0]!, TODAY)).toEqual({done: 1, times: 3, period: 'week'});
    expect(frequencyProgress(createHabit(emptyHabitData(), input(), NOW, ID).habits[0]!, TODAY)).toBeNull();
  });
});

describe('NB-199/NB-200/NB-201 and MO-125: the water link reads the water already logged, and a removed entry takes the tick back', () => {
  const litres = input({title: 'Drink water', category: 'Health', measurement: {kind: 'quantity', unit: 'liters'}, target: 2});
  test('a habit in liters suggests a Water link at 2000 mL; a one-tap idea gets it at once', () => {
    expect(waterTargetFromLitres('liters', '2', 'ml')).toBe('2000');
    expect(waterTargetFromLitres('L', '1,5', 'ml')).toBe('1500');
    expect(waterTargetFromLitres('glasses', '8', 'ml')).toBeNull();
    expect(ideaHealthLink(litres, 'ml')).toMatchObject({measure: 'water', rule: 'at-least', target: 2000});
  });
  test('2 L logged before the habit existed ticks it; removing that water opens it again', () => {
    const habits = createHabit({...emptyHabitData(), timeZone: 'UTC'}, litres, new Date('2026-11-04T02:00:00Z'), ID);
    let health = healthSchema.parse(createEmptyHealth());
    health = addWater(health, {id: 'health_water-0001', date: TODAY, amountMilli: 1_000_000, unit: 'ml'}, '2026-11-04T01:00:00.000Z');
    health = addWater(health, {id: 'health_water-0002', date: TODAY, amountMilli: 1_000_000, unit: 'ml'}, '2026-11-04T01:30:00.000Z');
    let links: HabitHealthLinksV4 = {version: 1, links: {[ID]: ideaHealthLink(litres, 'ml')!}, applied: []};
    const items = autoCompletions({links, habits, health, now: NOW});
    expect(items).toHaveLength(1);
    const ticked = applyAutoCompletion(habits, items[0]!, NOW);
    expect(habitDay(ticked.habits[0]!, TODAY, TODAY).status).toBe('complete');
    links = recordAutoCheckIn(links, autoCheckInMarker(items[0]!, new Date(NOW.getTime() + 5)));
    const later = new Date(NOW.getTime() + 60_000);
    expect(autoRevocations({links, habits: ticked, health, now: later})).toEqual([]);
    const removed = removeWater(health, 'health_water-0002');
    const revoke = autoRevocations({links, habits: ticked, health: removed, now: later});
    expect(revoke).toEqual([{habitId: ID, date: TODAY, measure: 'water'}]);
    const open = revokeAutoCompletion(ticked, revoke[0]!, links.applied[0]!.appliedAt, later);
    expect(habitDay(open.habits[0]!, TODAY, TODAY).status).toBe('due');
    expect(clearAutoCheckIn(links, ID, TODAY).applied).toEqual([]);
    // A tap the person made after the tick is theirs: nothing is taken back.
    const tapped = logHabitValue(ticked, ID, TODAY, 2, {}, new Date(later.getTime() + 1000));
    expect(autoRevocations({links, habits: tapped, health: removed, now: later})).toEqual([]);
  });
  test('MO-125 (auto-complete rules): a tick whose source is gone is listed for Undo; a changed day is left alone', () => {
    const rule = {id: 'r1', source: 'water' as const, comparator: 'at-least' as const, threshold: 2000, unit: 'mL' as const, habitId: ID, createdAt: '2026-11-04T01:00:00.000Z'};
    const marker = {ruleId: 'r1', habitId: ID, date: TODAY, source: 'water' as const, value: 2000, before: 0, wrote: 2, appliedAt: '2026-11-04T03:00:00.000Z'};
    const record = {version: 1 as const, rules: [rule], applied: [marker]};
    const data = logHabitValue(createHabit(emptyHabitData(), litres, new Date('2026-11-04T00:30:00Z'), ID), ID, TODAY, 2, {}, NOW);
    expect(autoTickRevocations({record, date: TODAY, sources: {}, data}).map(m => m.habitId)).toEqual([ID]);
    expect(autoTickRevocations({record, date: TODAY, sources: {waterMl: 2000}, data})).toEqual([]);
    expect(autoTickRevocations({record, date: TODAY, sources: {}, data: logHabitValue(data, ID, TODAY, 1.5, {}, NOW)})).toEqual([]);
    expect(clearAutoTick(record, ID, TODAY).applied).toEqual([]);
  });
});

/** Session AL second pass (L3): Activity habit rows in words with their unit (DV-047a, DV-171, DV-207; P-DV-75). */
describe('DV-047a/DV-171/DV-207: an Activity habit row says the day with its unit', () => {
  const ruleOf = (extra: Partial<HabitInput>) => habitRuleOn(createHabit(emptyHabitData(), input(extra), new Date('2026-11-01T08:00:00Z'), ID).habits[0]!, TODAY)!;
  test('a measured build habit reads "500 of 2,000 mL", "2 of 2 L · done"', () => {
    expect(habitEntryText(ruleOf({measurement: {kind: 'quantity', unit: 'mL'}, target: 2000}), 500)).toBe('500 of 2,000 mL');
    expect(habitEntryText(ruleOf({measurement: {kind: 'quantity', unit: 'L'}, target: 2}), 2)).toBe('2 of 2 L · done');
    expect(habitEntryText(ruleOf({measurement: {kind: 'count', unit: 'pages'}, target: 1}), 1)).toBe('1 of 1 page · done');
  });
  test('a yes/no day reads "Done"; a quit day "Stayed on track" or its slips, never "0 / 0 completed"', () => {
    expect(habitEntryText(ruleOf({}), 1)).toBe('Done');
    const quit = ruleOf({type: 'quit', measurement: {kind: 'count', unit: 'times'}, target: 0});
    expect(habitEntryText(quit, 0)).toBe('Stayed on track');
    expect(habitEntryText(quit, 2)).toBe('2 slips');
    expect(habitEntryText(ruleOf({type: 'limit', measurement: {kind: 'count', unit: 'cups'}, target: 3}), 4)).toBe('4 of at most 3 cups · over the limit');
  });
});

/** Session AL second pass (L3, 3f): Habits forms read numbers through the app's one reader, with their own bounds. */
describe('readHabitNumber: parseNumberInput with the field\'s bounds and the old sentences', () => {
  test('decimal commas and unambiguous grouping read; bounds and whole numbers keep their messages', async () => {
    const {readHabitNumber} = await import('./habit-number');
    expect(readHabitNumber('0,5', {max: 10})).toBe(0.5);
    expect(readHabitNumber(',25', {max: 10})).toBe(0.25);
    expect(readHabitNumber('1 234,5', {max: 1_000_000})).toBe(1234.5);
    expect(() => readHabitNumber('1,234', {max: 1_000_000})).toThrow(/could mean/);
    expect(() => readHabitNumber('2.5', {min: 1, max: 365, whole: true})).toThrow('Enter a whole number from 1 to 365.');
    expect(() => readHabitNumber('0', {max: 10, positive: true})).toThrow('Enter a number greater than 0 and at most 10.');
    expect(() => readHabitNumber('', {max: 10})).toThrow('Enter a number from 0 to 10.');
    expect(() => readHabitNumber('-3', {max: 10})).toThrow('Enter a number from 0 to 10.');
  });
});

describe('DV-028 (P-DV-65): a habit not due yet this week reads so, never "0%"', () => {
  test('a Monday-only habit on a Wednesday with no Monday yet since it started; and a done day reads 100% this week', async () => {
    const {weeklyConsistencyText} = await import('./habits');
    // Created on Tuesday Nov 3, scheduled Mondays only: nothing has been due this week by Wednesday Nov 4.
    const d = createHabit(emptyHabitData(), input({schedule: {kind: 'weekdays', days: [1]}}), new Date('2026-11-03T08:00:00Z'), ID);
    expect(weeklyConsistencyText(d.habits[0]!, TODAY)).toBe('Not due yet this week');
    let daily = createHabit(emptyHabitData(), input(), new Date('2026-11-04T01:00:00Z'), ID);
    daily = logHabitValue(daily, ID, TODAY, 1, {}, NOW);
    expect(weeklyConsistencyText(daily.habits[0]!, TODAY)).toBe('100% this week');
  });
});
