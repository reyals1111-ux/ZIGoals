import {expect, test} from 'vitest';
import type {HabitSection} from './sections';
import {firstStepToday, pickTimeSection, sectionAllDone} from './time-card';

/** Session AK P4 (FIRST_RUN_REVIEW FR-3): ticking the only "Anytime" habit in the morning keeps Today's card in view. */
const section = (id: HabitSection['id'], habits: number, due: number, done: number): HabitSection => ({id, label: id, habits: Array.from({length: habits}, () => ({}) as HabitSection['habits'][number]), due, done});
const day = (anytime: [number, number, number]) => [section('morning', 0, 0, 0), section('afternoon', 0, 0, 0), section('evening', 0, 0, 0), section('anytime', ...anytime)];

test('the only Anytime habit, done in the morning: the card stays on Anytime with its done state', () => {
  const pick = pickTimeSection(day([1, 1, 1]), 'morning');
  expect(pick?.id).toBe('anytime');
  expect(sectionAllDone(pick!)).toBe(true);
});
test('before it is done the card shows it as up next; the clock\'s own section wins when it has habits', () => {
  expect(pickTimeSection(day([1, 1, 0]), 'morning')?.id).toBe('anytime');
  const withMorning = [section('morning', 1, 1, 1), ...day([1, 1, 0]).slice(1)];
  expect(pickTimeSection(withMorning, 'morning')?.id).toBe('morning');
  expect(pickTimeSection(day([0, 0, 0]), 'morning')).toBeNull();
  expect(sectionAllDone({due: 0, done: 0})).toBe(false);
});
test('the first step is the one logged day on this device, and it is today', () => {
  const e = (date: string, count = 1, disposition: 'logged' | 'skipped' = 'logged') => ({date, count, disposition, note: '', updatedAt: '2026-11-01T08:00:00.000Z'});
  type H = Parameters<typeof firstStepToday>[0][number];
  expect(firstStepToday([{entries: [e('2026-11-01')]} as H], '2026-11-01')).toBe(true);
  expect(firstStepToday([{entries: [e('2026-11-01')]} as H, {entries: [e('2026-10-31')]} as H], '2026-11-01')).toBe(false);
  expect(firstStepToday([{entries: [e('2026-10-31')]} as H], '2026-11-01')).toBe(false);
  expect(firstStepToday([{entries: [e('2026-11-01', 0), e('2026-10-30', 1, 'skipped')]} as H], '2026-11-01')).toBe(false);
  expect(firstStepToday([], '2026-11-01')).toBe(false);
});
