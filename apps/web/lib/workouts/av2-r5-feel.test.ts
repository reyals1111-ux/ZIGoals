import {describe, expect, test} from 'vitest';
import {adjustForFeeling, EASIER_WORDS, easierLine, FEEL_WORDS, roundDownKg, walkInstead} from './feel';
import {savePlates} from './depth';
import {EXERCISES} from './library';
import {showcaseWorkouts} from './showcase';
import {startWorkout} from './engine';
import {suggestWorkout} from './suggest';

/**
 * Session AV lane 2, round 5 (gym; LEDGER #372, Gentler Streak's "How I feel"): fresh and normal keep the suggestion; tired
 * makes it shorter with last time's weights; sore makes it shorter and about 10 % lighter; a walk is offered instead.
 */
const DAY = '2026-11-22', NOW = new Date(`${DAY}T10:00:00Z`), w = showcaseWorkouts(DAY);
const made = (minutes: 30 | 45 | 60 = 60) => suggestWorkout({w, library: EXERCISES, now: NOW, today: DAY, place: null, minutes});

describe('how you feel shapes the suggestion', () => {
  test('fresh, normal and no choice keep it as it is', () => {
    const s = made();
    for (const f of ['fresh', 'normal', null] as const) expect(adjustForFeeling(w, s, f, NOW)).toBe(s);
  });
  test('tired: one exercise and one set fewer, never a weight above last time', () => {
    const s = made(60), t = adjustForFeeling(w, s, 'tired', NOW);
    expect(t.exercises).toHaveLength(s.exercises.length - 1);
    t.exercises.forEach((x, i) => {
      expect(x.sets.length).toBe(Math.max(2, s.exercises[i]!.sets.length - 1));
      x.sets.forEach((set, j) => { if (set.weightKg !== undefined) expect(set.weightKg).toBeLessThanOrEqual(s.exercises[i]!.sets[j]!.weightKg!); });
    });
    // A lift whose target went up comes back to the heaviest weight of last time.
    const up = s.exercises.findIndex(x => x.from === 'up' && x.sets[0]?.weightKg !== undefined);
    if (up >= 0 && up < t.exercises.length) expect(t.exercises[up]!.sets[0]!.weightKg).toBeLessThan(s.exercises[up]!.sets[0]!.weightKg!);
  });
  test('sore: three exercises, two sets each, about 10 % lighter, down to what plates make', () => {
    const s = made(60), t = adjustForFeeling(w, s, 'sore', NOW);
    expect(t.exercises).toHaveLength(3);
    t.exercises.forEach((x, i) => {
      expect(x.sets).toHaveLength(2);
      x.sets.forEach((set, j) => { const was = s.exercises[i]!.sets[j]!.weightKg; if (was !== undefined) expect(set.weightKg).toBe(roundDownKg(was * 0.9)); });
    });
    expect(roundDownKg(62.5 * 0.9)).toBe(55);
    expect(roundDownKg(12 * 0.9)).toBe(10);
  });
  test('review B5J-4: Sore rounds in the person’s own unit and to their own plates', () => {
    const lb = (n: number) => n * 0.45359237;
    // 225 lb × 0.9 = 202.5 lb: on the standard lb set (45 lb bar, 2.5 lb plates) it is 200 lb, never 198.4 lb (90 kg).
    expect(roundDownKg(lb(225) * 0.9, w, 'lb') / 0.45359237).toBeCloseTo(200, 2);
    // Own kg plates of 5 kg at least (10 kg steps on a 20 kg bar): 0.9 × 80 = 72 → 70.
    const big = savePlates(w, {unit: 'kg', bar: 20, plates: [{size: 10, pairs: 2}, {size: 5, pairs: 1}]});
    expect(roundDownKg(72, big, 'kg')).toBe(70);
    // On one side of a 40 kg sled with 5 kg plates: 5 kg steps.
    expect(roundDownKg(72, savePlates(w, {unit: 'kg', bar: 20, plates: [{size: 5, pairs: 4}], oneSide: true, start: 40}), 'kg')).toBe(70);
    const s = made(60), t = adjustForFeeling(w, s, 'sore', NOW, 'lb');
    for (const x of t.exercises) for (const set of x.sets) if (set.weightKg !== undefined && set.weightKg / 0.45359237 >= 45) expect(Math.round(set.weightKg / 0.45359237 * 100) / 100 % 5).toBe(0);
  });
  test('review B5J-5: the line says only what changed', () => {
    const s = made(60);
    expect(easierLine(s, adjustForFeeling(w, s, 'tired', NOW), 'tired')).toMatch(/^An easier day: one exercise fewer, fewer sets/);
    expect(easierLine(s, adjustForFeeling(w, s, 'sore', NOW), 'sore')).toBe('A lighter day: three exercises, two sets each, about 10 % less weight.');
    // A short suggestion (three exercises of two sets, no weights) stays as it is, and the line says so.
    const short = {...s, exercises: s.exercises.slice(0, 3).map(x => ({...x, sets: x.sets.slice(0, 2).map(({weightKg: _w, ...rest}) => { void _w; return rest; })}))};
    const tired = adjustForFeeling(w, short, 'tired', NOW);
    expect(tired.exercises).toHaveLength(3);
    expect(easierLine(short, tired, 'tired')).toBe('An easier day: this suggestion is already short and no weight goes up, so it stays as it is.');
    expect(easierLine(short, adjustForFeeling(w, short, 'sore', NOW), 'sore')).toBe('A lighter day: this suggestion is already short and light, so it stays as it is.');
  });
  test('the walk instead is an ordinary cardio workout to start', () => {
    const started = startWorkout(w, {date: DAY, now: NOW, repeat: walkInstead()});
    const x = started.workouts.find(y => !y.endedAt)!;
    expect(x).toMatchObject({name: 'Easy walk', type: 'cardio'});
    expect(x.exercises.map(e => [e.exerciseId, e.measure])).toEqual([['walking', 'distance-time']]);
  });
  test('everyday words in both languages, no body reading', () => {
    expect(Object.values(FEEL_WORDS).map(f => f.en)).toEqual(['Fresh', 'Normal', 'Tired', 'Sore']);
    for (const v of [...Object.values(EASIER_WORDS).flatMap(x => [x.en, x.nl])]) expect(v).not.toMatch(/\b(?:injur|pain|symptom|recover(?:y|ed)|medical|you should|you must|kcal|calorie|blessure|pijn|je moet)\w*/i);
  });
});
