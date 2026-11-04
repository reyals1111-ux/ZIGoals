import {describe, expect, test} from 'vitest';
import {deriveDots} from './derive';
import {focusPlan} from './adapters';
import {emptyChecklist} from './schema';
import {addFavourite, addSection, orderedItems, removeSection, sectionOfItem} from './store';
import {CREATED, NOW, TODAY, fullPath, sources} from './test-fixtures';
import {createHabit, emptyHabitData, logHabitValue, type HabitData} from '../habits';
import {startHabitTimer} from '../habit-timer-actions';
import {ID, habits} from './test-fixtures';

const SWIM = '66666666-6666-4666-8666-666666666666';
/** The fixtures' "Play piano" (a minutes habit) with a Focus timer started at `at`. */
function startHabitTimerForTest(at: Date) {
  const data = startHabitTimer(habits(), ID.piano, '77777777-7777-4777-8777-777777777777', at, 'UTC');
  return {data, habit: (d: HabitData) => d.habits.find(h => h.id === ID.piano)!};
}

/** Session AL (Part 8): Checklist rows LS-007, LS-016/056, LS-026, LS-034, LS-036. */
const today = {date: TODAY, ticks: [], custom: [], nudged: []};
describe('Checklist (Session AL)', () => {
  test('LS-007: with no weigh-in history the weight dot has no real value (the List hides its "+70 kg")', () => {
    const dots = deriveDots(fullPath(), today, TODAY, sources());
    const weight = dots.find(d => d.kind === 'health' && d.input === 'weight')!;
    expect(weight.value?.current).toBeNull();
  });
  test('LS-036: an "X times a week" habit is lit on its check-in day and says "1 of 2 this week"', () => {
    let h = createHabit(emptyHabitData(), {title: 'Swim', category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'frequency', times: 2, period: 'week'}, target: 1, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}}, CREATED, SWIM);
    const path = addFavourite(emptyChecklist(), {kind: 'habit', habitId: SWIM}, {id: 'ck_swim', at: NOW});
    const before = deriveDots(path, today, TODAY, sources({habits: h}))[0]!;
    expect(before.state).toBe('undone');
    h = logHabitValue(h, SWIM, TODAY, 1, {mode: 'add'}, NOW);
    const after = deriveDots(path, today, TODAY, sources({habits: h}))[0]!;
    expect(after).toMatchObject({state: 'done', note: '1 of 2 this week'});
  });
  test('LS-026: removing an orbit can send its items to Anytime (Edit path asks); without a choice, the last orbit as before', () => {
    let r = addSection(fullPath(), {label: 'Gym'}, 'gym');
    const evening = orderedItems(r).filter(i => sectionOfItem(r, i) === 'evening').map(i => i.id);
    r = removeSection(r, 'evening', 'anytime');
    expect(evening.every(id => sectionOfItem(r, orderedItems(r).find(i => i.id === id)!) === 'anytime')).toBe(true);
    const old = removeSection(addSection(fullPath(), {label: 'Gym'}, 'gym'), 'evening');
    expect(evening.every(id => sectionOfItem(old, orderedItems(old).find(i => i.id === id)!) === 'gym')).toBe(true);
  });
  test('LS-034: Focus logs whole minutes, under a minute saves nothing, and its end offers Undo', () => {
    const {data, habit} = startHabitTimerForTest(NOW);
    const short = focusPlan(habit(data), {date: TODAY, habitsDay: TODAY, healthDay: TODAY, zone: 'UTC', now: new Date(NOW.getTime() + 12_000)});
    expect(short.message).toBe('Focus stopped after less than a minute, so nothing was saved.');
    expect(short.undo.length).toBe(1);
    const long = focusPlan(habit(data), {date: TODAY, habitsDay: TODAY, healthDay: TODAY, zone: 'UTC', now: new Date(NOW.getTime() + 25 * 60_000 + 40_000)});
    expect(long.message).toMatch(/25 minutes of focus logged/);
    const after = long.writes.reduce((d, w) => (w.change as (x: typeof d) => typeof d)(d), data);
    expect(habit(after).entries.find(e => e.date === TODAY)?.count).toBe(25);
    const undone = long.undo.reduce((d, w) => (w.change as (x: typeof d) => typeof d)(d), after);
    expect(habit(undone).timer?.state).toBe('running');
  });
});

describe('names on the path (Session AL, LS-053, LS-069, PR-031)', () => {
  test('markup is never a fragment; a capitals tag is skipped; duplicates get (2)', async () => {
    const {suggestPathLabel} = await import('./path-label');
    expect(suggestPathLabel('<i>x</i>')).toBe('X');
    expect(suggestPathLabel('QA Floss')).toBe('Floss');
    expect(suggestPathLabel('QA Plants')).toBe('Plants');
    expect(suggestPathLabel('QA')).toBe('QA');
    const {addCustom} = await import('./store');
    void addCustom;
    let r = addFavourite(emptyChecklist(), {kind: 'habit', habitId: ID.walk}, {id: 'ck_a', at: NOW});
    r = addFavourite(r, {kind: 'habit', habitId: ID.monday}, {id: 'ck_b', at: NOW});
    const h = habits(); h.habits.find(x => x.id === ID.walk)!.title = 'Stretch'; h.habits.find(x => x.id === ID.monday)!.title = 'Stretch';
    const labels = deriveDots(r, today, TODAY, sources({habits: h})).map(d => d.label);
    expect(labels).toEqual(['Stretch', 'Stretch (2)']);
  });
});

describe('P-LS-36 (LS-025/LS-064): the Checklist records round-trip for the encrypted backup and the readable export', () => {
  test('zigoals:checklist:v1 and zigoals:checklist-days:v1 serialize and parse to the same records', async () => {
    const {CHECKLIST, CHECKLIST_DAYS} = await import('./schema');
    const {addReceipt, setCustomDone, sealDay} = await import('./day');
    const path = fullPath();
    expect(CHECKLIST.schema.parse(JSON.parse(JSON.stringify(path)))).toEqual(CHECKLIST.schema.parse(path));
    let days = CHECKLIST_DAYS.empty();
    days = setCustomDone(addReceipt(days, TODAY, {id: 'ck_1', at: NOW}), TODAY, 'ck_12', true);
    days = sealDay(days, '2026-10-19', () => ({total: 3, done: 2}));
    expect(CHECKLIST_DAYS.schema.parse(JSON.parse(JSON.stringify(days)))).toEqual(days);
    expect(CHECKLIST.key).toBe('zigoals:checklist:v1');
    expect(CHECKLIST_DAYS.key).toBe('zigoals:checklist-days:v1');
  });
});
