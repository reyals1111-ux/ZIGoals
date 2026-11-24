import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';

/**
 * Review B6P-10 (Session AV lane 2, r6-body; LEDGER #414, #422): the grounding journal line and "Count bests from today"
 * take the app's day from their view (the Meditation view's today, which follows "My day ends at" in the Health zone;
 * the Workouts view's today, the day workouts are logged on), never this device's calendar (`localDate()`).
 * lib/calm/b6p-grounding-save.test.ts checks that the line is written on the day it is given.
 */
const read = (path: string) => readFileSync(fileURLToPath(new URL(`../${path}`, import.meta.url)), 'utf8');
describe('B6P-10: the app’s day, not the device’s calendar', () => {
  test('neither part reads the device’s calendar', () => {
    for (const file of ['components/health/r6/calm-parts.tsx', 'components/health/r6/exercise-own.tsx']) expect(read(file), file).not.toMatch(/\blocalDate\b/);
  });
  test('the grounding line is saved on the day the Meditation view passes', () => {
    expect(read('components/health/r6/calm-parts.tsx')).toContain('saveGroundingLine(getAppStorage(), line, today)');
    expect(read('components/health/meditation/meditation-view.tsx')).toContain('<CalmR6 part="grounding" today={today}/>');
    expect(read('components/health/meditation/meditation-view.tsx')).toContain('const {meditation, today} = store');
  });
  test('"Count bests from today" uses the Workouts view’s today', () => {
    expect(read('components/health/r6/exercise-own.tsx')).toMatch(/setBestsFrom\(x, exercise\.id, today\)/);
    expect(read('components/health/workouts/exercise-library.tsx')).toContain('<ExerciseOwn exercise={exercise} w={w} unit={unit} change={change} today={today}/>');
    expect(read('components/health/workouts/workouts-view.tsx')).toContain('<ExerciseLibrary w={w} unit={unit} library={library} change={change} place={place} today={today}/>');
  });
});
