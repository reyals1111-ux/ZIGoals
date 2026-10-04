import {afterEach, describe, expect, test} from 'vitest';
import {buildShowcase} from './showcase-data';
import {powerUserRecords} from './vault/power-user-fixture';
import {HABITS_KEY, clearVacation, createHabit, emptyHabitData, habitCalendarDay, habitDataSchema, habitDay, habitRuleOn, habitStats, logHabitCount, planSkip, setHabitEntryStatus, setVacation, unplanSkip, type Habit, type HabitData, type HabitInput} from './habits';
import {addLocalDays} from './local-date';
import {dueReminders} from './reminders/due';

// H1 (docs/product/features/H1-streak-protection.md, "Tests"): skipped days are neutral, planned skips and vacations.
const deviceZone = process.env.TZ;
afterEach(() => { if (deviceZone === undefined) delete process.env.TZ; else process.env.TZ = deviceZone; });
const ID = '92000000-0000-4000-8000-000000000101';
const INPUT: HabitInput = {title: 'Walk', category: 'Movement', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
const at = (day: string) => new Date(`${day}T12:00:00Z`);
function daily(start = '2026-09-01', input: Partial<HabitInput> = {}) { process.env.TZ = 'UTC'; return createHabit(emptyHabitData(), {...INPUT, ...input}, at(start), ID); }
/** The rule before Session P: a skipped day reset the streak, like a failed one (days-unit habits only). */
function oldStreaks(habit: Habit, today: string) {
  let current = 0, best = 0;
  for (let date = habit.startDate; date <= today; date = addLocalDays(date, 1)) {
    const day = habitDay(habit, date, today); if (!day.scheduled) continue;
    if (day.status === 'complete') { current++; best = Math.max(best, current); } else if (day.status === 'failed' || day.status === 'skipped') current = 0;
  }
  return {current, best};
}

describe('streaks: a skipped day is neutral', () => {
  test('complete, complete, complete, skipped, complete is a streak of four', () => {
    let data = daily();
    for (const day of ['2026-09-01', '2026-09-02', '2026-09-03']) data = logHabitCount(data, ID, day, 1, '', at(day));
    data = setHabitEntryStatus(data, ID, '2026-09-04', 'skipped', 'Rest', at('2026-09-04'));
    data = logHabitCount(data, ID, '2026-09-05', 1, '', at('2026-09-05'));
    const stats = habitStats(data.habits[0]!, '2026-09-05');
    expect(stats).toMatchObject({currentStreak: 4, bestStreak: 4, skipCount: 1, completionPercentage: 80, successCount: 4, failCount: 0});
    expect(oldStreaks(data.habits[0]!, '2026-09-05')).toEqual({current: 1, best: 3});
  });
  test('a skip at the start, two skips in a row, and a failed day that still resets', () => {
    let data = daily();
    data = setHabitEntryStatus(data, ID, '2026-09-01', 'skipped', '', at('2026-09-01'));
    for (const day of ['2026-09-02', '2026-09-03', '2026-09-04']) data = logHabitCount(data, ID, day, 1, '', at(day));
    expect(habitStats(data.habits[0]!, '2026-09-04').currentStreak).toBe(3);
    data = setHabitEntryStatus(data, ID, '2026-09-05', 'skipped', '', at('2026-09-05'));
    data = setHabitEntryStatus(data, ID, '2026-09-06', 'skipped', '', at('2026-09-06'));
    data = logHabitCount(data, ID, '2026-09-07', 1, '', at('2026-09-07'));
    expect(habitStats(data.habits[0]!, '2026-09-07')).toMatchObject({currentStreak: 4, bestStreak: 4, skipCount: 3});
    data = setHabitEntryStatus(data, ID, '2026-09-08', 'failed', '', at('2026-09-08'));
    expect(habitStats(data.habits[0]!, '2026-09-08')).toMatchObject({currentStreak: 0, bestStreak: 4, failCount: 1});
  });
  test('an existing streak never breaks from the change: Showcase and the power user', () => {
    process.env.TZ = 'UTC';
    const today = '2026-10-01', sets = [buildShowcase(today).records[HABITS_KEY]!, powerUserRecords().records[HABITS_KEY]!].map(raw => habitDataSchema.parse(JSON.parse(raw)));
    let compared = 0;
    for (const data of sets) for (const habit of data.habits) {
      const stats = habitStats(habit, today); if (stats.streakUnit !== 'days') continue;
      const old = oldStreaks(habit, today);
      expect(stats.currentStreak).toBeGreaterThanOrEqual(old.current); expect(stats.bestStreak).toBeGreaterThanOrEqual(old.best); compared++;
    }
    expect(compared).toBeGreaterThan(40);
    // The Showcase skips every ninth day, so its streaks lengthen under the new rule: Walk's three skips in 30 days no longer reset it, and the 27 logged days run as one streak (a skipped day adds nothing).
    const walk = sets[0]!.habits[2]!;
    expect(habitStats(walk, today)).toMatchObject({currentStreak: 27, bestStreak: 27, skipCount: 3});
  });
});

describe('planned skips', () => {
  const now = at('2026-10-01');
  test('a planned skip is a future skipped entry with its reason; what it refuses', () => {
    const data = daily('2026-09-01');
    const planned = planSkip(data, ID, '2026-10-02', '', now);
    expect(planned.habits[0]!.entries.at(-1)).toEqual({date: '2026-10-02', count: 0, disposition: 'skipped', note: 'Planned skip', updatedAt: now.toISOString()});
    expect(planSkip(data, ID, '2026-10-02', ' Dentist ', now).habits[0]!.entries.at(-1)!.note).toBe('Planned skip · Dentist');
    expect(() => planSkip(data, ID, '2026-10-01', '', now)).toThrow('Choose a scheduled day within the next year.');
    expect(() => planSkip(data, ID, addLocalDays('2026-10-01', 367), '', now)).toThrow('Choose a scheduled day within the next year.');
    expect(planSkip(data, ID, addLocalDays('2026-10-01', 366), '', now).habits[0]!.entries.at(-1)!.date).toBe(addLocalDays('2026-10-01', 366));
    const logged = logHabitCount(data, ID, '2026-10-01', 3, '', now);
    expect(() => planSkip({...logged, habits: logged.habits.map(h => ({...h, entries: h.entries.map(e => ({...e, date: '2026-10-02'}))}))}, ID, '2026-10-02', '', now)).toThrow('A check-in is already saved for that day.');
    const weekdays = daily('2026-09-01', {schedule: {kind: 'weekdays', days: [1, 2, 3, 4, 5]}});
    expect(() => planSkip(weekdays, ID, '2026-10-03', '', now)).toThrow('Choose a scheduled day within the next year.'); // a Saturday
    expect(planSkip(weekdays, ID, '2026-10-05', '', now).habits[0]!.entries.at(-1)!.date).toBe('2026-10-05');
    const weekly = daily('2026-09-01', {schedule: {kind: 'frequency', times: 3, period: 'week'}, targetPeriod: 'day'});
    expect(() => planSkip(weekly, ID, '2026-10-02', '', now)).toThrow('This habit counts per week; skip a day in its History instead.');
  });
  test('the day reads as a planned skip until it arrives, then as skipped; reminders stay quiet', () => {
    const planned = planSkip(daily('2026-09-01'), ID, '2026-10-02', 'Trip', now), habit = planned.habits[0]!;
    expect(habitDay(habit, '2026-10-02', '2026-10-01')).toMatchObject({status: 'planned-skip', scheduled: false, note: 'Planned skip · Trip'});
    expect(habitDay(habit, '2026-10-03', '2026-10-01').status).toBe('future');
    expect(habitDay(habit, '2026-10-02', '2026-10-02')).toMatchObject({status: 'skipped', scheduled: true});
    const reminders = {version: 1 as const, habits: {[ID]: {time: '08:00'}}, dismissed: {}};
    expect(dueReminders({reminders, habits: planned, now: new Date('2026-10-02T09:00:00Z')})).toEqual([]);
    expect(dueReminders({reminders, habits: planned, now: new Date('2026-10-03T09:00:00Z')}).map(r => r.id)).toEqual([ID]);
  });
  test('unplanSkip removes exactly that entry; today and the past belong to the day editor', () => {
    const data = daily('2026-09-01'), planned = planSkip(planSkip(data, ID, '2026-10-02', '', now), ID, '2026-10-03', '', now);
    const cleared = unplanSkip(planned, ID, '2026-10-02', now);
    expect(cleared.habits[0]!.entries.map(e => e.date)).toEqual(['2026-10-03']);
    expect(habitDay(cleared.habits[0]!, '2026-10-02', '2026-10-01').status).toBe('future');
    expect(unplanSkip(cleared, ID, '2026-10-04', now).habits[0]!.entries).toEqual(cleared.habits[0]!.entries);
    expect(() => unplanSkip(cleared, ID, '2026-10-01', now)).toThrow('Today and earlier days are changed from the day editor.');
  });
});

describe('vacation', () => {
  test('marks scheduled days without a check-in for the active habits, keeps check-ins, and clears exactly its own entries', () => {
    process.env.TZ = 'UTC';
    const now = at('2026-10-01'), data = habitDataSchema.parse(JSON.parse(buildShowcase('2026-10-01').records[HABITS_KEY]!));
    const marked = setVacation(data, {from: '2026-10-05', to: '2026-10-11'}, now);
    for (const habit of marked.habits) {
      const vacation = habit.entries.filter(e => e.note === 'Vacation');
      expect(vacation.map(e => e.date)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
      expect(vacation.every(e => e.disposition === 'skipped' && e.count === 0)).toBe(true);
      const before = data.habits.find(h => h.id === habit.id)!;
      expect(habit.entries.filter(e => e.date <= '2026-10-01')).toEqual(before.entries.filter(e => e.date <= '2026-10-01'));
    }
    expect(setVacation(marked, {from: '2026-10-05', to: '2026-10-11'}, now)).toBe(marked);
    const cleared = clearVacation(marked, {from: '2026-10-05', to: '2026-10-11'}, now);
    expect(cleared.habits.map(h => h.entries)).toEqual(data.habits.map(h => h.entries));
    // Today counts, a logged check-in is kept, a paused habit is left alone, chosen habits only.
    const logged = logHabitCount(data, ID.replace('101', '001'), '2026-10-01', 30, '', now);
    const today = setVacation(logged, {from: '2026-10-01', to: '2026-10-02', habitIds: [ID.replace('101', '001'), ID.replace('101', '002')]}, now);
    expect(today.habits[0]!.entries.find(e => e.date === '2026-10-01')).toMatchObject({disposition: 'logged', count: 30});
    expect(today.habits[0]!.entries.find(e => e.date === '2026-10-02')).toMatchObject({disposition: 'skipped', note: 'Vacation'});
    // The second habit keeps whatever it already logged today; only the days without a check-in are marked.
    const loggedToday = data.habits[1]!.entries.some(e => e.date === '2026-10-01');
    expect(today.habits[1]!.entries.filter(e => e.note === 'Vacation').map(e => e.date)).toEqual(loggedToday ? ['2026-10-02'] : ['2026-10-01', '2026-10-02']);
    expect(today.habits[2]!.entries).toEqual(data.habits[2]!.entries);
    expect(() => setVacation(data, {from: '2026-09-30', to: '2026-10-02'}, now)).toThrow('Choose days from today up to a year ahead.');
    expect(() => setVacation(data, {from: '2026-10-02', to: '2026-10-01'}, now)).toThrow('Choose days from today up to a year ahead.');
  });
  test.each(['UTC', 'Europe/Brussels', 'America/New_York', 'Pacific/Kiritimati', 'Etc/GMT+12', 'Asia/Kolkata', 'Asia/Kathmandu', 'Australia/Adelaide', 'Pacific/Chatham', 'Australia/Lord_Howe', 'America/Santiago'])('the horizon counts calendar days in the journal zone %s', zone => {
    process.env.TZ = 'Europe/Brussels';
    const now = new Date('2026-10-01T11:30:00Z');
    const data = habitDataSchema.parse({...createHabit(emptyHabitData(), INPUT, new Date('2026-09-01T12:00:00Z'), ID), timeZone: zone});
    const today = habitCalendarDay(data, now);
    if (zone === 'Pacific/Kiritimati') expect(addLocalDays(today, 1)).toBe('2026-10-03');
    expect(planSkip(data, ID, addLocalDays(today, 1), '', now).habits[0]!.entries.at(-1)!.date).toBe(addLocalDays(today, 1));
    expect(planSkip(data, ID, addLocalDays(today, 366), '', now).habits[0]!.entries.at(-1)!.date).toBe(addLocalDays(today, 366));
    expect(() => planSkip(data, ID, addLocalDays(today, 367), '', now)).toThrow('within the next year');
  });
  test('DST: a range across the clock changes writes one entry per calendar day', () => {
    process.env.TZ = 'Europe/Brussels';
    const data = habitDataSchema.parse({...createHabit(emptyHabitData(), INPUT, new Date('2026-01-10T12:00:00Z'), ID), timeZone: 'Europe/Brussels'});
    const spring = setVacation(data, {from: '2026-03-28', to: '2026-03-30'}, new Date('2026-03-28T08:00:00Z'));
    expect(spring.habits[0]!.entries.map(e => e.date)).toEqual(['2026-03-28', '2026-03-29', '2026-03-30']);
    const autumn = setVacation(data, {from: '2026-10-24', to: '2026-10-26'}, new Date('2026-10-24T08:00:00Z'));
    expect(autumn.habits[0]!.entries.map(e => e.date)).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']);
  });
  test('a history at its limit refuses the whole change', () => {
    process.env.TZ = 'UTC';
    const now = at('2026-10-01'), base = createHabit(emptyHabitData(), INPUT, new Date('2000-01-01T12:00:00Z'), ID);
    const dates: string[] = []; for (let date = '2000-01-01'; dates.length < 19999; date = addLocalDays(date, 1)) if (date < '2026-10-01' || date > '2026-10-07') dates.push(date);
    const full: HabitData = {...base, habits: [{...base.habits[0]!, entries: dates.map(date => ({date, count: 1, disposition: 'logged' as const, note: '', updatedAt: now.toISOString()}))}]};
    expect(habitDataSchema.safeParse(full).success).toBe(true);
    expect(() => setVacation(full, {from: '2026-10-01', to: '2026-10-07'}, now)).toThrow("This habit's history is full.");
    expect(habitRuleOn(full.habits[0]!, '2026-10-01')).toBeDefined();
  });
});
