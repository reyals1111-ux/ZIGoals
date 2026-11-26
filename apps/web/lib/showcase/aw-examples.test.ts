import {describe, expect, test} from 'vitest';
import {buildShowcase} from '../showcase-data';
import {addLocalDays} from '../local-date';
import {feelingTrends} from '../feeling-trends/trends';
import {crossPillarInsights} from '../insights/cross-pillar';
import {habitDataSchema, HABITS_KEY} from '../habits';
import {healthSchema, HEALTH_STORAGE_KEY} from '../health';
import {healthGroupIn, withHealthGroup} from '../vault/w-homes';
import {ENERGY_KEY, energySchema} from '../energy/schema';
import {SYMPTOMS_KEY} from '../symptoms/schema';
import {WORKOUTS_KEY} from '../workouts/schema';
import {TASKS_KEY, tasksSchema} from '../tasks/schema';
import {TASK_PLAN_KEY} from '../tasks/plan-key';
import {taskPlanSchema} from '../tasks/plan-record';
import {viewTasks} from '../tasks/engine';
import {objectiveProgress, weekObjectives, weekStart} from '../tasks/layouts';
import {dueReminders, reminderInstants} from '../tasks/reminders';
import {instantAt} from '../zone-time';
import {CHESS_COMPUTER_KEY, chessComputerSchema, totalTally} from '../chess/computer-record';
import {JOURNAL_KEY, journalSchema} from '../journal/schema';
import {packsOn} from '../journal-prompts/packs';
import {SHOWCASE_JOURNAL_PHOTOS} from '../journal/showcase-photo-ids';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {readHabitOptions} from '../habit-options/rule';
import {MONEY_LOG_KEY} from '../money-log/schema';
import {BUDGETS_KEY, budgetsSchema} from '../budgets/schema';
import {budgetsCard} from '../nova/cards/budgets';
import {moneyAttention} from '../money-attention';
import {AW_AREAS, AW_ENERGY_DAYS, AW_MOOD_DAYS, AW_NEAR_BUDGET, AW_NEAR_BUDGET_ID, AW_OBJECTIVES, AW_PROJECTS, AW_TASK_IDS, showcaseStamps} from './aw-examples';

/**
 * Session AW (showcase; review lane2-b1 row 13, QUALITY.md "Not fixed"): the labelled examples that give the empty
 * features real content in the Showcase, and the guards that keep the rest of the Showcase as it was (the last 30 days of
 * moods and energy, Today's tasks and reminders, Today's cross-pillar insights).
 */
const DAYS = ['2026-11-17', '2026-11-12', '2026-11-30', '2026-12-04', '2027-03-01'] as const;
const build = (day: string) => { const r = buildShowcase(day, 'UTC').records; return {r, j: (k: string) => r[k] ? JSON.parse(r[k]!) : null}; };

describe('"your usual" mood and energy', () => {
  test.each(DAYS)('%s: Health → How you felt compares the last 90 days with the year, for mood and energy', day => {
    const {j} = build(day), health = healthSchema.parse(j(HEALTH_STORAGE_KEY));
    const f = feelingTrends({health, energy: j(ENERGY_KEY), symptoms: j(SYMPTOMS_KEY)}, day);
    for (const id of ['mood', 'energy'] as const) {
      const row = f.ready.find(x => x.id === id)!;
      expect(row, id).toBeTruthy();
      expect(row.recent.days).toBeGreaterThanOrEqual(20);
      expect(row.usual.days).toBeGreaterThanOrEqual(60);
    }
    expect(f.ready.find(x => x.id === 'mood')!.direction).toBe('up');
    expect(f.ready.find(x => x.id === 'energy')!.direction).toBe('same');
  });
  test('the older days stay clear of the last 30 days and of a year ago (On this day), one per day', () => {
    for (const days of [AW_MOOD_DAYS, AW_ENERGY_DAYS]) {
      const ago = days.map(([n]) => n);
      expect(new Set(ago).size).toBe(ago.length);
      expect(Math.min(...ago)).toBeGreaterThan(30);
      expect(Math.max(...ago)).toBeLessThan(365);
      expect(ago.filter(n => n < 90).length).toBeGreaterThanOrEqual(8);
      for (const [, v] of days) expect(v >= 1 && v <= 5).toBe(true);
    }
  });
  test.each(DAYS)('%s: the Health record with the older moods is exactly what its own schema reads (written without a second full parse)', day => {
    const raw = buildShowcase(day, 'UTC').records[HEALTH_STORAGE_KEY]!;
    expect(JSON.stringify(healthSchema.parse(JSON.parse(raw)))).toBe(raw);
  });
  test('the last 30 days of moods and energy are exactly as before (twelve evening moods, fourteen ratings)', () => {
    const day = '2026-11-17', {j} = build(day), from = addLocalDays(day, -29);
    const moods = healthGroupIn(healthSchema.parse(j(HEALTH_STORAGE_KEY)), 'moods')!.days, energy = energySchema.parse(j(ENERGY_KEY)).days;
    expect(Object.keys(moods).filter(d => d >= from).length).toBe(12);
    expect(Object.keys(energy).filter(d => d >= from).length).toBe(14);
    expect(Object.keys(moods).length).toBe(12 + AW_MOOD_DAYS.length);
    expect(Object.keys(energy).length).toBe(14 + AW_ENERGY_DAYS.length);
  });
  test.each(DAYS)('%s: Today’s cross-pillar insights (ready and unclear) are the ones the Showcase had without the older days', day => {
    const {j} = build(day), habits = habitDataSchema.parse(j(HABITS_KEY)), health = healthSchema.parse(j(HEALTH_STORAGE_KEY)), energy = energySchema.parse(j(ENERGY_KEY));
    const older = (ago: readonly (readonly [number, number])[]) => new Set(ago.map(([n]) => addLocalDays(day, -n)));
    const moodsBefore = Object.fromEntries(Object.entries(healthGroupIn(health, 'moods')!.days).filter(([d]) => !older(AW_MOOD_DAYS).has(d)));
    const before = {habits, health: withHealthGroup(health, 'moods', {version: 1, days: moodsBefore}, false), energy: {...energy, days: Object.fromEntries(Object.entries(energy.days).filter(([d]) => !older(AW_ENERGY_DAYS).has(d)))}};
    const ids = (x: ReturnType<typeof crossPillarInsights>) => ({ready: x.ready.map(y => y.id), unclear: (x.unclear ?? []).map(y => y.id)});
    const others = {workouts: j(WORKOUTS_KEY), symptoms: j(SYMPTOMS_KEY), today: day};
    expect(ids(crossPillarInsights({habits, health, energy, ...others}))).toEqual(ids(crossPillarInsights({...before, ...others})));
  });
});

describe('Tasks: areas, week objectives, finished tasks, planned vs actual, a reminder and a timer', () => {
  test.each(DAYS)('%s: two areas with a project each, two objectives of this week, each one task done of two', day => {
    const {j} = build(day), record = tasksSchema.parse(j(TASKS_KEY));
    expect(record.areas!.map(a => [a.id, a.name])).toEqual([[AW_AREAS.home, 'Example · Home'], [AW_AREAS.money, 'Example · Money']]);
    expect(record.projects!.map(p => [p.id, p.areaId])).toEqual([[AW_PROJECTS.balcony, AW_AREAS.home], [AW_PROJECTS.admin, AW_AREAS.money]]);
    const week = weekObjectives(record, weekStart(day));
    expect(week.map(o => o.id)).toEqual([AW_OBJECTIVES.balcony, AW_OBJECTIVES.savings]);
    for (const o of week) { expect(o.title.startsWith('Example · ')).toBe(true); expect(o.doneAt).toBeUndefined(); expect(objectiveProgress(record, o.id)).toMatchObject({done: 1, of: 2}); }
    for (const t of record.tasks) expect(t.title.startsWith('Example · '), t.title).toBe(true);
  });
  test.each(DAYS)('%s: four finished tasks on four earlier days, three with planned and spent minutes; Today’s tasks and reminders as before', day => {
    const {j} = build(day), record = tasksSchema.parse(j(TASKS_KEY));
    const done = record.tasks.filter(t => t.doneAt);
    expect(done.length).toBe(4);
    expect(new Set(done.map(t => t.doneAt!.slice(0, 10))).size).toBe(4);
    for (const t of done) expect(t.doneAt!.slice(0, 10) < day).toBe(true);
    expect(done.filter(t => t.minutes && t.spent !== undefined).map(t => [t.minutes, t.spent])).toEqual([[30, 40], [20, 15], [15, 10]]);
    // Today: the same tasks due (the dentist call and the garden bed), and no reminder rings on the Showcase's day.
    expect(viewTasks(record, {kind: 'today'}, day).map(t => t.id).sort()).toEqual(['task_showcase-01', 'task_showcase-03']);
    const endOfDay = instantAt(addLocalDays(day, 1), '00:00', 'UTC') - 1;
    expect(dueReminders(record, endOfDay, 'UTC', {windowMs: 48 * 3_600_000})).toEqual([]);
    const reminder = reminderInstants(record, 'UTC').find(r => r.task.id === AW_TASK_IDS.seeds)!;
    expect(reminder.at).toBe(instantAt(addLocalDays(day, 3), '18:00', 'UTC'));
  });
  test('the timer runs from the click, twelve minutes before it, on the open bulbs task (stamped, never built)', () => {
    const {r, j} = build('2026-11-17'), now = Date.parse('2026-11-17T10:00:00.000Z');
    expect(taskPlanSchema.parse(j(TASK_PLAN_KEY)).timers).toBeUndefined();
    const stamped = taskPlanSchema.parse(JSON.parse(showcaseStamps(r, now)[TASK_PLAN_KEY]!));
    expect(stamped.timers).toEqual([{taskId: AW_TASK_IDS.seeds, since: now - 12 * 60_000}]);
    expect(stamped.timeTargets).toEqual(taskPlanSchema.parse(j(TASK_PLAN_KEY)).timeTargets); // the time target stays
    expect(showcaseStamps({}, now)).toEqual({});
  });
});

describe('chess results, prompt packs, journal photos, a habit option', () => {
  test('results against the computer at two levels, no game waiting', () => {
    const chess = chessComputerSchema.parse(build('2026-11-17').j(CHESS_COMPUTER_KEY));
    expect(chess.game).toBeUndefined();
    expect(totalTally(chess)).toEqual({won: 5, lost: 4, drawn: 1});
  });
  test.each(DAYS)('%s: two prompt packs on; the walk and the run entries each hold one example photo', day => {
    const journal = journalSchema.parse(build(day).j(JOURNAL_KEY));
    expect(packsOn(journal.packs).map(p => p.id)).toEqual(['sleep', 'gratitude']);
    const withPhotos = journal.entries.filter(e => e.photos?.length).map(e => [e.date, e.photos]);
    expect(withPhotos).toEqual([[addLocalDays(day, -11), [SHOWCASE_JOURNAL_PHOTOS[1]]], [addLocalDays(day, 0), [SHOWCASE_JOURNAL_PHOTOS[0]]]]); // oldest first, as the record keeps them
  });
  test('“Meditate” keeps one missed day in its streak (the 2-day rule), the only habit option set', () => {
    const {j} = build('2026-11-17'), meditate = habitDataSchema.parse(j(HABITS_KEY)).habits.find(h => h.title === 'Meditate')!;
    expect(readHabitOptions(j(HABIT_EXTRAS_KEY))).toEqual({[meditate.id]: {twoDay: true}});
  });
});

describe('a budget near its limit', () => {
  // From the 5th of a month: the Showcase's one cinema visit of a month falls four days before its day.
  test.each(DAYS.filter(d => Number(d.slice(8)) > 4))('%s: “Fun” near its limit (80–90 % spent, not over); Today names it in its one money line', day => {
    const {j} = build(day), budgets = budgetsSchema.parse(j(BUDGETS_KEY)), entries = j(MONEY_LOG_KEY).entries;
    expect(budgets.budgets.map(b => [b.id, b.monthly])).toEqual([['showcase-budget-groceries', '250.00'], ['showcase-budget-food', '120.00'], [AW_NEAR_BUDGET_ID, AW_NEAR_BUDGET.monthly]]);
    const line = budgetsCard(budgets, entries, day).lines.find(l => l.id === AW_NEAR_BUDGET_ID)!;
    expect(line).toMatchObject({category: 'Fun', over: false, spent: '€24.00', available: '€27.50'});
    expect(line.share).toBeGreaterThanOrEqual(0.8);
    expect(line.share).toBeLessThan(0.9);
    expect(moneyAttention({entries, budgets, today: day}).near).toContainEqual({category: 'Fun', currency: 'EUR'});
  });
  test.each(['2026-11-01', '2027-03-04'])('%s: before the month’s cinema visit, the same budget is simply not near (never a budget made at 0 %%)', day => {
    const {j} = build(day), budgets = budgetsSchema.parse(j(BUDGETS_KEY)), entries = j(MONEY_LOG_KEY).entries;
    expect(budgetsCard(budgets, entries, day).lines.find(l => l.id === AW_NEAR_BUDGET_ID)).toMatchObject({spent: '€0.00', available: '€27.50'});
    expect(moneyAttention({entries, budgets, today: day}).near).toEqual([]);
  });
});
