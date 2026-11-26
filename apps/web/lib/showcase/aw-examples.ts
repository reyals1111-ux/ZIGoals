import {addLocalDays} from '../local-date';
import {HABIT_EXTRAS_KEY} from '../aa-device-keys';
import {habitExtrasSchema} from '../habits-extras/schema';
import {HABITS_KEY, habitDataSchema} from '../habits';
import {HEALTH_STORAGE_KEY, type HealthData} from '../health';
import {healthGroupIn, withHealthGroup} from '../vault/w-homes';
import {moodsSchema} from '../moods/schema';
import {ENERGY_KEY, energySchema} from '../energy/schema';
import {TASKS_KEY, tasksSchema} from '../tasks/schema';
import {TASK_PLAN_KEY} from '../tasks/plan-key';
import {taskPlanSchema} from '../tasks/plan-record';
import {weekStart} from '../tasks/layouts';
import {CHESS_COMPUTER_KEY, chessComputerSchema, type ChessComputer} from '../chess/computer-record';
import {JOURNAL_KEY, journalSchema} from '../journal/schema';
import {SHOWCASE_JOURNAL_PHOTOS} from '../journal/showcase-photo-ids';
import {BUDGETS_KEY, budgetsSchema} from '../budgets/schema';

/**
 * Session AW (showcase; review lane2-b1 row 13 and QUALITY.md's "Not fixed" row on Showcase examples): labelled examples
 * for the features the Showcase left on their empty teaching state. Applied last to the Showcase's records
 * (lib/showcase-data.ts), each in its record's own stored format, additive only (no earlier example's figure changes
 * unless named here). Deterministic for a day. Nothing new is stored on a person's device: these records live in the
 * Showcase tab's own storage only. Today's Showcase Tab stops stay as they were (D-028, ≤ 90): nothing here adds a
 * control to Today (see the hand-back for the two examples that would).
 * - "Your usual" mood and energy (lib/feeling-trends/trends.ts needs 20 days in the last 90 and 60 in the year): an older
 *   history of moods and energy ratings, kept clear of the last 30 days (31–58 days back, then 91–331 days back), so the
 *   week and month views read as before and Health → How you felt compares the last 90 days with the year.
 * - Tasks: two areas with a project each, two week objectives (each with a done and an open task), three more tasks
 *   finished on earlier days with their planned and spent minutes (the timer's planned vs actual), and one open task
 *   with a reminder three days ahead (never ringing on the Showcase's day). The timer that runs is stamped when the
 *   Showcase is loaded (`showcaseStamps`), so the builder stays a function of its day.
 * - Chess: results against the computer at two levels (no game in progress).
 * - Journal: two prompt packs switched on, and two entries with an example photo (made in the Showcase's own media
 *   scope on first view, lib/journal/showcase-photo.ts).
 * - Habits: "Meditate" keeps one missed day in its streak (the 2-day rule), a habit option; its figures do not move (no
 *   missed day in its history).
 * - Wealth: the "Fun" budget near its limit (87 % spent) from the 5th of a month on (AW_NEAR_BUDGET below).
 */
export const AW_TASK_IDS = {seeds: 'task_showcase-07', pots: 'task_showcase-08', standing: 'task_showcase-09', books: 'task_showcase-10'} as const;
export const AW_AREAS = {home: 'area_showcase-home', money: 'area_showcase-money'} as const;
export const AW_PROJECTS = {balcony: 'proj_showcase-balcony', admin: 'proj_showcase-admin'} as const;
export const AW_OBJECTIVES = {balcony: 'objective_showcase-1', savings: 'objective_showcase-2'} as const;
export const AW_NEAR_BUDGET_ID = 'showcase-budget-fun';

/** [days ago, mood 1–5]: ten in the last 90 days (31–58 back), forty older ones (91–325 back, every sixth day). */
const MOOD_RECENT: readonly (readonly [number, number])[] = [[32, 4], [35, 3], [37, 4], [40, 3], [43, 5], [46, 3], [49, 4], [52, 3], [55, 4], [58, 3]];
const MOOD_OLDER = Array.from({length: 40}, (_, i) => [91 + i * 6, [3, 2, 3, 4, 3, 3, 2, 4][i % 8]!] as const);
/** [days ago, energy 1–5]: eight in the last 90 days, forty older ones (94–328 back). */
const ENERGY_RECENT: readonly (readonly [number, number])[] = [[33, 3], [36, 4], [39, 3], [42, 4], [45, 3], [48, 3], [51, 4], [54, 3]];
const ENERGY_OLDER = Array.from({length: 40}, (_, i) => [94 + i * 6, [3, 3, 4, 3, 3, 4, 3, 3][i % 8]!] as const);
export const AW_MOOD_DAYS = [...MOOD_RECENT, ...MOOD_OLDER], AW_ENERGY_DAYS = [...ENERGY_RECENT, ...ENERGY_OLDER];

const json = (records: Record<string, string>, key: string): unknown => { const raw = records[key]; return raw ? JSON.parse(raw) : undefined; };

function withFeelingHistory(records: Record<string, string>, day: string): void {
  // The Health record was written by the builder's own parse a moment ago (lib/showcase-data.ts), so it is read as it is
  // (a second full parse of the Showcase's largest record would cost each build more than all of this); the moods group
  // added to it is checked by its own schema. lib/showcase/aw-examples.test.ts parses the result in full.
  const health = JSON.parse(records[HEALTH_STORAGE_KEY]!) as HealthData, moods = healthGroupIn(health, 'moods') ?? {version: 1 as const, days: {}};
  const days = {...moods.days};
  for (const [ago, mood] of AW_MOOD_DAYS) { const d = addLocalDays(day, -ago); days[d] ??= {mood, at: `${d}T21:00:00.000Z`}; }
  records[HEALTH_STORAGE_KEY] = JSON.stringify(withHealthGroup(health, 'moods', moodsSchema.parse({version: 1, days}), false));
  const energy = energySchema.parse(json(records, ENERGY_KEY) ?? {version: 1, days: {}}), eDays = {...energy.days};
  for (const [ago, value] of AW_ENERGY_DAYS) { const d = addLocalDays(day, -ago); eDays[d] ??= {energy: value, at: `${d}T20:30:00.000Z`}; }
  records[ENERGY_KEY] = JSON.stringify(energySchema.parse({...energy, days: eDays}));
}

function withTaskExamples(records: Record<string, string>, day: string): void {
  const tasks = tasksSchema.parse(json(records, TASKS_KEY) ?? {version: 1, tasks: []}), at = (offset: number, time = '08:00') => `${addLocalDays(day, offset)}T${time}:00.000Z`;
  // Plain objects: the tasks record's own schema reads them (below), as it reads any stored task.
  const added = [
    {id: AW_TASK_IDS.seeds, title: 'Example · Order bulbs for the balcony boxes', priority: 'normal', createdAt: at(-6), projectId: AW_PROJECTS.balcony, objective: AW_OBJECTIVES.balcony, minutes: 20,
      reminders: [{before: 0, at: `${addLocalDays(day, 3)}T18:00`}]},
    {id: AW_TASK_IDS.pots, title: 'Example · Clear the old flower pots', priority: 'normal', due: addLocalDays(day, -2), createdAt: at(-7), doneAt: at(-2, '17:30'), projectId: AW_PROJECTS.balcony, objective: AW_OBJECTIVES.balcony, minutes: 30, spent: 40},
    {id: AW_TASK_IDS.standing, title: 'Example · Move the savings standing order', priority: 'normal', due: addLocalDays(day, -3), createdAt: at(-8), doneAt: at(-3, '12:15'), projectId: AW_PROJECTS.admin, objective: AW_OBJECTIVES.savings, minutes: 20, spent: 15},
    {id: AW_TASK_IDS.books, title: 'Example · Return the library books', priority: 'low', due: addLocalDays(day, -5), createdAt: at(-9), doneAt: at(-5, '16:45'), minutes: 15, spent: 10},
  ];
  const week = weekStart(day);
  records[TASKS_KEY] = JSON.stringify(tasksSchema.parse({...tasks,
    // The savings comparison serves the second objective (only its link is new; its day, label and goal stay).
    tasks: [...tasks.tasks.map(t => t.id === 'task_showcase-02' ? {...t, objective: AW_OBJECTIVES.savings} : t), ...added],
    areas: [...(tasks.areas ?? []), {id: AW_AREAS.home, name: 'Example · Home', order: 0}, {id: AW_AREAS.money, name: 'Example · Money', order: 1}],
    projects: [...(tasks.projects ?? []), {id: AW_PROJECTS.balcony, name: 'Example · Balcony garden', colour: 'green', order: 0, areaId: AW_AREAS.home}, {id: AW_PROJECTS.admin, name: 'Example · Money admin', colour: 'blue', order: 1, areaId: AW_AREAS.money}],
    objectives: [...(tasks.objectives ?? []), {id: AW_OBJECTIVES.balcony, week, title: 'Example · Balcony ready for winter'}, {id: AW_OBJECTIVES.savings, week, title: 'Example · Savings accounts sorted'}]}));
}

/** Results against ZIGoals' own chess engine at two levels; no game in progress. */
export const showcaseChessComputer = (): ChessComputer => chessComputerSchema.parse({version: 1, tally: {easy: {won: 4, lost: 1, drawn: 1}, medium: {won: 1, lost: 3, drawn: 0}}});

function withJournalExamples(records: Record<string, string>, day: string): void {
  const journal = journalSchema.parse(json(records, JOURNAL_KEY));
  const photoOn: Record<string, string> = {[addLocalDays(day, 0)]: SHOWCASE_JOURNAL_PHOTOS[0], [addLocalDays(day, -11)]: SHOWCASE_JOURNAL_PHOTOS[1]};
  records[JOURNAL_KEY] = JSON.stringify(journalSchema.parse({...journal, packs: ['sleep', 'gratitude'],
    entries: journal.entries.map(e => { const id = /^showcase-journal-\d+$/.test(e.id) ? photoOn[e.date] : undefined; return id && !e.photos?.length ? {...e, photos: [id]} : e; })}));
}

function withHabitOption(records: Record<string, string>): void {
  if (!records[HABIT_EXTRAS_KEY]) return;
  const extras = habitExtrasSchema.parse(json(records, HABIT_EXTRAS_KEY)), meditate = habitDataSchema.parse(json(records, HABITS_KEY)).habits.find(h => h.title === 'Meditate');
  if (!meditate) return;
  records[HABIT_EXTRAS_KEY] = JSON.stringify(habitExtrasSchema.parse({...extras, options: {...(extras.options ?? {}), [meditate.id]: {twoDay: true}}}));
}

/**
 * The Showcase's "Fun" budget at €27.50 a month (it was €60.00), so the month's one cinema visit (€24.00, four days before
 * the Showcase's day) leaves it near its limit, 87 % spent, from the 5th of a month on. A fourth budget was tried first: its
 * "1 more" in NOVA's context pack took the pack past its 600 tokens (lib/ai/context-pack/nova-budget.test.ts), so the
 * example uses a budget the Showcase already has. Its other fields (category, rollover, start) stay as they were.
 */
export const AW_NEAR_BUDGET = {id: AW_NEAR_BUDGET_ID, monthly: '27.50'} as const;
function withNearBudget(records: Record<string, string>): void {
  const raw = json(records, BUDGETS_KEY);
  if (!raw) return;
  const budgets = budgetsSchema.parse(raw);
  records[BUDGETS_KEY] = JSON.stringify(budgetsSchema.parse({...budgets, budgets: budgets.budgets.map(b => b.id === AW_NEAR_BUDGET.id ? {...b, monthly: AW_NEAR_BUDGET.monthly} : b)}));
}

export function withAwShowcaseExamples(records: Record<string, string>, day: string): void {
  withFeelingHistory(records, day);
  withTaskExamples(records, day);
  records[CHESS_COMPUTER_KEY] = JSON.stringify(showcaseChessComputer());
  withJournalExamples(records, day);
  withHabitOption(records);
  withNearBudget(records);
}

/**
 * The parts stamped when the Showcase is loaded (lib/showcase.ts), never by the builder: the task timer started twelve
 * minutes before the click, on "Example · Order bulbs for the balcony boxes" (20 minutes planned), so Tasks → Today lists
 * a timer running and Stop adds its minutes to the task.
 */
export function showcaseStamps(records: Readonly<Record<string, string>>, nowMs: number): Record<string, string> {
  try {
    const plan = taskPlanSchema.parse(json(records as Record<string, string>, TASK_PLAN_KEY) ?? {version: 1});
    if (!tasksSchema.parse(json(records as Record<string, string>, TASKS_KEY)).tasks.some(t => t.id === AW_TASK_IDS.seeds && !t.doneAt)) return {};
    return {[TASK_PLAN_KEY]: JSON.stringify(taskPlanSchema.parse({...plan, timers: [...(plan.timers ?? []).filter(t => t.taskId !== AW_TASK_IDS.seeds), {taskId: AW_TASK_IDS.seeds, since: Math.max(0, Math.round(nowMs - 12 * 60_000))}]}))};
  } catch { return {}; }
}
