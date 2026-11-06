// @vitest-environment jsdom
import {describe, expect, it} from 'vitest';
import {createEmptyHealth, saveWeight, type HealthData} from './health';
import {addLocalDays} from './local-date';
import {healthFieldIssue} from './health-field-rules';
import {checkHealthForm} from './health-field-dom';
import {servingsWarning, sleepHoursWarning, weightAsEntered, weightJumpWarning} from './health-plausible';
import {lookupFailure} from './health-barcode-outcome';
import {fastingRhythm, fastingRhythmText} from './health-fasting-rhythm';
import {activityKcalEstimate} from './health-activity-types';
import {maintenanceEstimate, maintenanceIssue} from './health-maintenance';
import {mealKcalTarget, setMealPref} from './health-extras';
import {waterDayDone, WATER_NO_TARGET} from './health-daily';
import {weightTrend} from './health-aa/trend';
import type {FastingHistoryRow} from './fasting/engine';

// Session AL lane L2, fourth pass: the rows the replay of c521574f found STILL OPEN or CHANGED (GROK53_REPLAY_L2_1.md).
describe('AL-FIELD-ERROR-003: every Health field says its range and unit at the field', () => {
  it('MO-001, D-077, BUG-020: a calorie target out of range or not a number names the range, never the storage text', () => {
    expect(healthFieldIssue('kcal-target', '99999')).toBe('Enter a calorie target from 1 to 10,000 kcal a day.');
    expect(healthFieldIssue('kcal-target', '0')).toBe('Enter a calorie target from 1 to 10,000 kcal a day.');
    expect(healthFieldIssue('kcal-target', '-5', {label: 'Calorie target (kcal)'})).toBe('Check the highlighted fields: Calorie target (kcal) needs a number: a calorie target from 1 to 10,000 kcal a day.');
    expect(healthFieldIssue('kcal-target', 'abc', {label: 'Calorie target (kcal)'})).toMatch(/from 1 to 10,000 kcal a day\.$/);
    expect(healthFieldIssue('kcal-target', '', {required: false})).toBeNull();
    expect(healthFieldIssue('kcal-target', '2000', {required: false})).toBeNull();
  });
  it('D-077, T-137: 5,000 g of protein and 1,000,000 steps a day are refused with their range', () => {
    expect(healthFieldIssue('macro-target', '5000')).toBe('Enter a daily target from 1 to 1,000 g.');
    expect(healthFieldIssue('steps-target', '1000000')).toBe('Enter a daily step target from 1 to 100,000 steps.');
    expect(healthFieldIssue('steps-target', '10000')).toBeNull();
  });
  it('MO-020, D-142: a weight blank, 0, 1000 or "abc" names the range in the unit typed', () => {
    expect(healthFieldIssue('weight', '', {unit: 'kg'})).toBe('Enter a weight from 20 to 400 kg.');
    expect(healthFieldIssue('weight', '0', {unit: 'kg'})).toBe('Enter a weight from 20 to 400 kg.');
    expect(healthFieldIssue('weight', '1000', {unit: 'kg'})).toBe('Enter a weight from 20 to 400 kg.');
    expect(healthFieldIssue('weight', '1000', {unit: 'lb'})).toMatch(/^Enter a weight from 45 to 881 lb\.$/);
    expect(healthFieldIssue('weight', '81,2', {unit: 'kg'})).toBeNull();
  });
  it('MO-036, D-024, DV-136, BUG-084, D-143: water says "more than 0 and at most 5,000 mL" for -100, abc, 1e6, 0, 99999 and blank', () => {
    const range = /more than 0 and at most 5,000 mL\.$/;
    for (const typed of ['-100', 'abc', '1e6', '0', '99999', '']) expect(healthFieldIssue('water', typed, {unit: 'ml', label: 'Water amount'})).toMatch(range);
    // the pinned prefix (tests/a11y-field-errors.spec.ts) for what is not a number at all
    expect(healthFieldIssue('water', 'abc', {unit: 'ml', label: 'Water amount'})).toMatch(/^Check the highlighted fields: Water amount needs a number/);
    expect(healthFieldIssue('water', '1,234', {unit: 'ml', label: 'Water amount'})).toMatch(/^Check the highlighted fields/);
    expect(healthFieldIssue('water', '0.001', {unit: 'ml'})).toBe('Use at most 2 decimal places.');
    expect(healthFieldIssue('water', '250', {unit: 'ml'})).toBeNull();
  });
  it('MO-030, MO-141: a waist says its range; activity steps and minutes are whole and optional', () => {
    expect(healthFieldIssue('waist', '5000', {unit: 'cm'})).toBe('Enter a measurement from 10 to 250 cm.');
    expect(healthFieldIssue('waist', '-5', {unit: 'cm', label: 'Measurement value'})).toMatch(/from 10 to 250 cm\.$/);
    expect(healthFieldIssue('steps', '', {required: false})).toBeNull();
    expect(healthFieldIssue('steps', '-100', {required: false, label: 'Steps'})).toMatch(/whole number from 0 to 100,000\.$/);
    expect(healthFieldIssue('minutes', '30.5', {required: false})).toBe('Enter whole minutes from 0 to 1,440.');
  });
  it('D-074, MO-104, D-089: a name blank, of spaces, or longer than 120 characters is said, never cut', () => {
    expect(healthFieldIssue('name', '')).toBe('Enter a name.');
    expect(healthFieldIssue('name', '   ')).toBe('Enter a name with at least one visible character.');
    expect(healthFieldIssue('name', 'x'.repeat(250))).toBe('A name can be at most 120 characters (this one has 250).');
    expect(healthFieldIssue('brand', '', {required: false})).toBeNull();
  });
  it('the page check reads a form: only slotted fields, keyed by id, in the form order', () => {
    document.body.innerHTML = `<form data-health-check>
      <div class="health-checked"><label><span>Weight (kg)</span><input id="w" data-check="weight" data-unit="kg" required value=""></label></div>
      <div class="health-checked"><label><span>Activity name</span><input id="n" data-check="name" required value="   "></label></div>
      <label><span>Not slotted</span><input id="x" required value=""></label>
      <div class="health-checked"><label><span>Steps</span><input id="s" data-check="steps" value=""></label></div></form>`;
    expect(checkHealthForm(document.querySelector('form')!)).toEqual({w: 'Enter a weight from 20 to 400 kg.', n: 'Enter a name with at least one visible character.'});
  });
});

describe('soft checks and shown values', () => {
  const day = '2026-11-04', lb = (v: number) => Math.round(v * 453.59237);
  const week = [182.4, 181.7, 181.0, 180.3, 179.6, 178.9, 178.2].map((v, i) => ({date: addLocalDays(day, i - 6), grams: lb(v)}));
  it('MO-017: correcting today\'s 178.2 lb to 300 lb compares with that reading, to the tenth', () => {
    expect(weightJumpWarning(lb(300), day, week, 'lb')).toBe('That is +121.8 lb from this day’s reading of 178.2 lb. If it is right, press Save weight again to keep it.');
    expect(weightJumpWarning(lb(178.0), day, week, 'lb')).toBeNull();
  });
  it('MO-109: the soft check names the button the form has', () => {
    expect(servingsWarning(1_000_000, null)).toBe('1,000 servings in one entry is a lot. If it is right, press Log to diary again to keep it.');
  });
  it('N-MO-14, N-NB-10: a reading shows as entered (70.55 kg), lb to two decimals', () => {
    expect(weightAsEntered(70_550, 'kg')).toBe('70.55 kg');
    expect(weightAsEntered(lb(178.2), 'lb')).toBe('178.2 lb');
  });
  it('DV-012a, DV-052a, G-044: 20 to 24 hours of sleep asks once; 8 hours does not', () => {
    expect(sleepHoursWarning(24)).toBe('24 hours of sleep is most of the day. If it is right, press Save again to keep it.');
    expect(sleepHoursWarning(8)).toBeNull();
  });
  it('X3-16: seven daily readings 182.4 → 178.2 lb: the trend follows the readings (it read 181.2)', () => {
    const data = week.reduce<HealthData>((h, w, i) => saveWeight(h, {id: `health_00000000-0000-4000-8000-00000000000${i}`, date: w.date, grams: w.grams}, `${w.date}T07:00:00.000Z`), createEmptyHealth());
    const t = weightTrend(data, day);
    expect(t.latestTrend! / 453.59237).toBeLessThan(178.6);
    expect(t.latestTrend! / 453.59237).toBeGreaterThan(178.2);
  });
});

describe('the barcode outcome without a lookup provider (MO-007, MO-107, C-MO-01, C-DVG-35)', () => {
  it('503 says the lookup is not available here and offers "Add it yourself" with the code; 404 the same form', () => {
    expect(lookupFailure(503, '3017620422003')).toEqual({draft: true, message: 'Barcode lookup is not available in this version yet, so 3017620422003 could not be looked up. Add the food yourself below (the code stays with it), or search foods by name. Your private food library still works.'});
    expect(lookupFailure(404, '0000000000000').draft).toBe(true);
    expect(lookupFailure(500, '0000000000000')).toEqual({draft: false, message: 'Food lookup is unavailable right now. Your private food library still works.'});
  });
});

describe('competitor rows built (A11)', () => {
  const row = (day: string, hours: number, target = 16) => ({day, hours, session: {targetHours: target}}) as unknown as FastingHistoryRow;
  it('C-MO-35: fasts that reached their own target, in a row and of the last seven days; no longest fast', () => {
    const r = fastingRhythm([row('2026-11-04', 16.2), row('2026-11-03', 17), row('2026-11-02', 10), row('2026-11-01', 16)], '2026-11-04');
    expect(r).toEqual({inARow: 2, lastSeven: 3, reachedDays: 3});
    expect(fastingRhythmText(r)).toBe('Fasts that reached your own target: 2 days in a row · 3 of the last 7 days. Rest days are fine; a longer fast is not counted as more.');
    expect(fastingRhythmText(fastingRhythm([], '2026-11-04'))).toBeNull();
  });
  it('C-MO-39: a labelled estimate of the energy an activity used; unknown without type, minutes or weight', () => {
    expect(activityKcalEstimate('Walk', 60, 80_000)).toBe(280);
    expect(activityKcalEstimate('Gardening', 60, 80_000)).toBeNull();
    expect(activityKcalEstimate('Walk', 0, 80_000)).toBeNull();
    expect(activityKcalEstimate('Walk', 60, null)).toBeNull();
  });
  it('C-MO-04: a maintenance estimate (Mifflin–St Jeor × activity), refused outside its adult range', () => {
    expect(maintenanceEstimate({sex: 'female', ageYears: 30, heightCm: 165, weightKg: 60, activity: 'sedentary'})).toEqual({resting: 1320, kcal: 1580});
    expect(maintenanceIssue({sex: 'male', ageYears: 15, heightCm: 170, weightKg: 60, activity: 'light'})).toMatch(/18 to 100/);
  });
  it('C-DVG-38: a calorie target per meal, kept beside its name and time; blank clears it', () => {
    const set = setMealPref({version: 1}, 'Lunch', {name: '', time: '12:30', kcal: '600'});
    expect(set.ok && mealKcalTarget(set.value, 'Lunch')).toBe(600);
    const cleared = set.ok ? setMealPref(set.value, 'Lunch', {name: '', time: '12:30', kcal: ''}) : set;
    expect(cleared.ok && mealKcalTarget(cleared.value, 'Lunch')).toBeNull();
    expect(setMealPref({version: 1}, 'Lunch', {name: '', time: '', kcal: '0'})).toMatchObject({ok: false, issue: {field: 'kcal'}});
    // a caller that does not pass the field keeps the target
    const kept = set.ok ? setMealPref(set.value, 'Lunch', {name: 'Midday', time: '12:30'}) : set;
    expect(kept.ok && mealKcalTarget(kept.value, 'Lunch')).toBe(600);
  });
});

describe('X3-26, LS-016: water is done only at your own target', () => {
  it('no target is never done', () => {
    expect(waterDayDone({reached: null})).toBe(false);
    expect(waterDayDone({reached: false})).toBe(false);
    expect(waterDayDone({reached: true})).toBe(true);
    expect(WATER_NO_TARGET).toMatch(/Journal settings/);
  });
});
