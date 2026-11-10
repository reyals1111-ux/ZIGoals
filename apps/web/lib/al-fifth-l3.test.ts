// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {createHabit, emptyHabitData, habitDay, habitStats, limitPeriodProgress, logHabitValue, type HabitData, type HabitInput} from './habits';
import {earliestHabitEdit} from './habit-actions';

/** Session AL fifth pass (lane L3, GROK53_REPLAY_L3_2 STILL OPEN / CHANGED): the rows on the records. Fictional data. */
vi.mock('../components/chain/use-chain-choice', () => ({useChainChoice: () => ({chosen: false})}));
vi.mock('../components/reminders/reminder-time-field', () => ({ReminderTimeField: () => createElement('label', {className: 'field'}, 'Reminder time', createElement('input', {type: 'time'}))}));
const {HabitEditor} = await import('../components/habits/habit-editor');
const {habitCheckIn} = await import('../components/habits/use-habits');

const ID = '11111111-1111-4111-8111-111111111111', MON = '2026-11-02', TUE = '2026-11-03';
const at = (day: string) => new Date(`${day}T09:00:00Z`);
const input = (extra: Partial<HabitInput> = {}): HabitInput => ({title: 'Snacks', category: 'Health', description: '', notes: '', type: 'limit', measurement: {kind: 'count', unit: 'times'}, schedule: {kind: 'frequency', times: 3, period: 'week'}, target: 2, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}, ...extra});
const make = (extra: Partial<HabitInput> = {}): HabitData => createHabit({...emptyHabitData(), timeZone: 'UTC'}, input(extra), new Date(`${MON}T08:00:00Z`), ID);

describe('PR-093: a limit counts its own period, for the count and the verdict', () => {
  beforeEach(() => { process.env.TZ = 'UTC'; });
  for (const [name, extra] of [['3× per week', {}], ['every day, at most 2 a week', {schedule: {kind: 'daily'}, targetPeriod: 'week'}]] as const) {
    test(`${name}: three taps are "3 of at most 2 this week", over the limit, never Partial`, () => {
      let data = make(extra);
      expect(limitPeriodProgress(data.habits[0]!, MON)).toEqual({amount: 0, target: 2, period: 'week', over: false});
      expect(habitDay(data.habits[0]!, MON, MON).status).toBe('due');
      for (let n = 1; n <= 3; n++) data = logHabitValue(data, ID, MON, 1, {mode: 'add'}, at(MON));
      expect(limitPeriodProgress(data.habits[0]!, MON)).toEqual({amount: 3, target: 2, period: 'week', over: true});
      expect(habitDay(data.habits[0]!, MON, MON).status).toBe('failed');
    });
    test(`${name}: within the limit on Monday, Tuesday stays open to log (it read "Not scheduled")`, () => {
      const data = logHabitValue(make(extra), ID, MON, 1, {}, at(MON));
      expect(habitDay(data.habits[0]!, MON, MON).status).toBe('complete');
      const tuesday = habitDay(data.habits[0]!, TUE, TUE);
      expect(tuesday.scheduled).toBe(true);
      expect(tuesday.status).toBe('due');
      const more = logHabitValue(data, ID, TUE, 2, {}, at(TUE));
      expect(limitPeriodProgress(more.habits[0]!, TUE)).toMatchObject({amount: 3, over: true});
      expect(habitDay(more.habits[0]!, TUE, TUE).status).toBe('failed');
    });
  }
  test('a build habit on 3× per week still counts its days (unchanged)', () => {
    let data = createHabit({...emptyHabitData(), timeZone: 'UTC'}, input({title: 'Gym', type: 'build', target: 1}), new Date(`${MON}T08:00:00Z`), ID);
    data = logHabitValue(data, ID, MON, 1, {}, at(MON));
    expect(habitDay(data.habits[0]!, MON, MON).status).toBe('partial');
    expect(limitPeriodProgress(data.habits[0]!, MON)).toBeNull();
  });
  test('"Within limit" confirms the day as counted; it never wipes the count (it wrote 0)', () => {
    let data = make({schedule: {kind: 'daily'}});
    data = logHabitValue(data, ID, MON, 1, {}, at(MON));
    data = habitCheckIn.smartDone(ID, MON)(data);
    expect(data.habits[0]!.entries.find(e => e.date === MON)?.count).toBe(1);
    const fresh = habitCheckIn.smartDone(ID, MON)(make({schedule: {kind: 'daily'}}));
    expect(fresh.habits[0]!.entries.find(e => e.date === MON)).toMatchObject({count: 0, disposition: 'logged'});
  });
});

describe('the habit form (D-044, DV-132/DV-243, PR-093)', () => {
  const today = MON;
  let root: Root, container: HTMLDivElement;
  beforeEach(() => { vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); container = document.createElement('div'); document.body.append(container); root = createRoot(container); });
  afterEach(async () => { await act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });
  const render = (data?: HabitData) => act(async () => root.render(createElement(HabitEditor, {habit: data?.habits[0], goals: [], habits: [], today, onSave: async () => {}, onCancel: () => {}})));
  const labelled = (name: string) => [...container.querySelectorAll('label')].find(label => label.firstChild?.textContent?.trim() === name)?.querySelector('input, select') as HTMLInputElement | HTMLSelectElement;
  const set = (element: HTMLInputElement | HTMLSelectElement, value: string) => act(async () => {
    const proto = element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(element, value);
    element.dispatchEvent(new Event(element instanceof HTMLSelectElement ? 'change' : 'input', {bubbles: true}));
  });
  const daily = () => logHabitValue(createHabit({...emptyHabitData(), timeZone: 'UTC'}, input({title: 'Sched', type: 'build', measurement: {kind: 'boolean'}, target: 1, schedule: {kind: 'daily'}}), new Date(`${MON}T07:00:00Z`), ID), ID, MON, 1, {}, at(MON));

  test('D-044: on a day with a record, "Changes effective from" shows the day the save uses: today for a schedule edit', async () => {
    const data = daily();
    expect(earliestHabitEdit(data.habits[0]!, {...input({title: 'Sched', type: 'build', measurement: {kind: 'boolean'}, target: 1}), schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}}, today)).toBe(MON);
    await render(data);
    expect(labelled('Changes effective from').value).toBe(MON);
    await set(labelled('Schedule'), 'weekdays');
    expect(labelled('Changes effective from').value).toBe(MON);
    // A target change cannot read today's record as it is, so the field says tomorrow, as the save then uses.
    await set(labelled('Measurement'), 'count');
    await set(labelled('Target value'), '3');
    expect(labelled('Changes effective from').value).toBe(TUE);
  });

  test('DV-132/DV-243: Habit type, the fold\'s first field, comes before Reminder time; the fold stays (FR-17)', async () => {
    await render();
    const type = labelled('Habit type'), reminder = labelled('Reminder time'), fold = container.querySelector('details.habit-more-options')!;
    expect(fold.contains(type)).toBe(true);
    expect(fold.contains(reminder)).toBe(false);
    expect(type.compareDocumentPosition(reminder) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(fold.querySelector('label')?.firstChild?.textContent).toBe('Habit type');
  });

  test('PR-093: a limit on "X times per period" says it counts the whole week', async () => {
    await render();
    await set(labelled('Schedule'), 'frequency');
    await set(labelled('Times per period'), '3');
    await set(labelled('Habit type'), 'limit');
    await set(labelled('Target value'), '2');
    expect(container.textContent).toContain('A limit counts the whole week: at most 2 times in all, however many days you log.');
    expect(container.textContent).not.toContain('you aim for 3 check-ins');
  });
});

describe('LS-070/C-LS-34: a habit ticked every day has its own streak (the List row reads it)', () => {
  test('ticked 29 Oct to 2 Nov: a 5-day streak, whatever the other planets did', () => {
    process.env.TZ = 'UTC';
    let data = createHabit({...emptyHabitData(), timeZone: 'UTC'}, input({title: 'QA Read', type: 'build', measurement: {kind: 'boolean'}, target: 1, schedule: {kind: 'daily'}}), new Date('2026-10-29T07:00:00Z'), ID);
    for (const day of ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']) data = logHabitValue(data, ID, day, 1, {}, at(day));
    const stats = habitStats(data.habits[0]!, '2026-11-02');
    expect([stats.currentStreak, stats.streakUnit]).toEqual([5, 'days']);
  });
});
