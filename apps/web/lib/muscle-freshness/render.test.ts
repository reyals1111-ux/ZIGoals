// @vitest-environment jsdom
import {afterEach, expect, test} from 'vitest';
import {act, createElement} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import MuscleFreshness from '../../components/health/workouts/muscle-freshness';
import MuscleFreshToday from '../../components/health/workouts/muscle-freshness-today';
import {categoryLookup} from '../workouts/depth';
import {addExercise, finishWorkout, inProgress, startWorkout, updateSet} from '../workouts/engine';
import {allExercises, EXERCISES} from '../workouts/library';
import {emptyWorkouts} from '../workouts/schema';
import {MUSCLE_RECOVERY_KEY} from './model';

// Session AK (item 8): the freshness section and the start sheet's line, rendered. Fictional workouts.
(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null, host: HTMLDivElement | null = null;
afterEach(() => { act(() => root?.unmount()); host?.remove(); root = null; host = null; localStorage.clear(); });
const render = (el: ReturnType<typeof createElement>) => { host = document.createElement('div'); document.body.append(host); root = createRoot(host); act(() => root!.render(el)); return host; };
const library = allExercises([]), today = new Date().toISOString().slice(0, 10);
function squatToday() {
  let w = startWorkout(emptyWorkouts(), {date: today, now: new Date(Date.now() - 3_600_000)});
  w = addExercise(w, EXERCISES.find(e => e.id === 'squat')!);
  const e = inProgress(w)!.exercises[0]!;
  w = updateSet(w, e.id, e.sets[0]!.id, {weightKg: 60, reps: 8, done: true});
  w = addExercise(w, EXERCISES.find(e => e.id === 'bench-press')!);
  const b = inProgress(w)!.exercises[1]!;
  w = updateSet(w, b.id, b.sets[0]!.id, {weightKg: 40, reps: 8, done: true});
  return finishWorkout(w, new Date()).workouts;
}

test('the body diagram names every group with its estimate in words; the list says an estimate', () => {
  const host = render(createElement(MuscleFreshness, {w: squatToday(), lookup: categoryLookup(library), today}));
  const svg = host.querySelector('svg')!;
  expect(svg.getAttribute('role')).toBe('img'); expect(svg.getAttribute('aria-label')).toMatch(/Legs about \d+%, (recovering|worked recently|fresh)/);
  expect([...svg.querySelectorAll('.mf-label')].map(t => t.textContent)).toEqual(['Shoulders', 'Chest', 'Core', 'Arms', 'Legs', 'Shoulders', 'Back', 'Arms', 'Legs']);
  expect(svg.querySelectorAll('.mf-unknown').length).toBeGreaterThan(0);
  expect(host.textContent).toMatch(/\(an estimate\)/); expect(host.textContent).toMatch(/Back\s*Not in your log yet/);
});

test('recovery days are edited per group and kept in their own key', () => {
  const host = render(createElement(MuscleFreshness, {w: squatToday(), lookup: categoryLookup(library), today}));
  const details = host.querySelector('details')!;
  act(() => { details.open = true; details.dispatchEvent(new Event('toggle')); });
  const legs = [...host.querySelectorAll('label')].find(l => l.textContent?.startsWith('Legs'))!.querySelector('select')!;
  act(() => { legs.value = '3'; legs.dispatchEvent(new Event('change', {bubbles: true})); });
  expect(JSON.parse(localStorage.getItem(MUSCLE_RECOVERY_KEY)!)).toEqual({version: 1, days: {Legs: 3}});
  expect(host.textContent).toMatch(/Legs: 3 days to recover, on this device/);
});

test('the start sheet line shows only fresh groups, and nothing without a log', () => {
  expect(render(createElement(MuscleFreshToday, {w: emptyWorkouts(), library, today})).textContent).toBe('');
  act(() => root?.unmount()); host?.remove();
  const line = render(createElement(MuscleFreshToday, {w: squatToday(), library, today})).textContent ?? '';
  expect(line).not.toMatch(/legs|chest/);
});
