import {describe, expect, test} from 'vitest';
import {adjustForFeeling, EASIER_WORDS, FEEL_WORDS, roundDownKg, walkInstead} from './feel';
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
