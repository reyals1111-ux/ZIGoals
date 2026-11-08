import {describe, expect, it} from 'vitest';
import {createEmptyHealth, saveWeight, type HealthData} from './health';
import {addWater, saveHealthPreferences, undoWaterLog, waterOn, waterToday} from './health-daily';
import {diaryDayIssue, journalDay, JOURNAL_MIN_DAY} from './health-day';
import {rateReadiness} from './health-aa/trend';
import {coachCheckIn, rateWaitSentence} from './health-aa/coach';
import {energyProgress} from './health-aa/energy-progress';
import {timerRuleText, tooShortText, tooShortToSave, TIMER_MINIMUM_MS} from './health-timer-rules';
import {measuresOfPaths} from './health-events';
import {sleepScore} from './health-aa/sleep-score';
import {addLocalDays} from './local-date';

// Session AL, lane L2 (Health): the logic behind the trust rows, each named by its finding ids.
const AT = '2026-11-04T09:00:00.000Z', TODAY = '2026-11-04';
const id = (n: number) => `health_${String(n).padStart(8, '0')}-al`;

describe('MO-149 / X3-16 / P-PR-23: the coach says what the weekly rate needs', () => {
  const daily = (days: number) => { let d: HealthData = createEmptyHealth(); for (let i = 0; i < days; i++) d = saveWeight(d, {id: id(i + 1), date: addLocalDays(TODAY, -i), grams: 82_000 - i * 100}, AT); return d; };
  it('seven daily readings in one week: no rate yet, and it no longer says "two in the last week will do"', () => {
    const data = daily(6), c = coachCheckIn(data, {version: 1}, TODAY);
    expect(c.rateGrams).toBeNull();
    expect(c.sentence).not.toMatch(/two in the last week/);
    expect(c.sentence).toBe('6 days with a weight since Oct 30. A weekly rate needs readings at least seven days apart. A reading on Nov 6 or later gives the rate.');
    expect(rateReadiness(data.weights, TODAY)).toEqual({readings: 6, first: '2026-10-30', last: TODAY, readyOn: '2026-11-06', ready: false});
  });
  it('readings eight days apart give the rate; none in the window asks for one', () => {
    expect(coachCheckIn(daily(9), {version: 1}, TODAY).sentence).toMatch(/^This week: /);
    expect(rateWaitSentence(rateReadiness([], TODAY), TODAY)).toBe('Log a weight or two and the coach can read your week.');
  });
  it('PR-020/PR-097: the estimate\'s progress never reads "27 of 14 logged days"', () => {
    expect(energyProgress({loggedDays: 27, weights: 4})).toMatchObject({figure: '4 of 10 weigh-ins', note: '6 more weigh-ins to go'});
  });
});

describe('NB-082 / P-PR-03: one water number; NB-081/NB-089: Undo removes that entry', () => {
  const two = () => { let d = createEmptyHealth(); d = addWater(d, {id: id(1), date: TODAY, amountMilli: 250_000, unit: 'ml'}, AT); return addWater(d, {id: id(2), date: TODAY, amountMilli: 250_000, unit: 'ml'}, AT); };
  it('waterToday is the journal day\'s sum; reached is unknown (null) without a target, never "done"', () => {
    const d = two();
    expect(waterOn(d, TODAY)).toEqual({day: TODAY, millilitres: 500, entries: 2, targetMl: null, unit: 'ml', reached: null});
    expect(waterToday(saveHealthPreferences(d, {timezone: 'Europe/Brussels', waterUnit: 'ml', weightUnit: 'kg', waterTargetMl: 2000}), new Date('2026-11-04T10:00:00Z'))).toMatchObject({day: TODAY, millilitres: 500, reached: false});
  });
  it('undoWaterLog removes exactly the entry it names from the latest record', () => {
    const after = undoWaterLog(id(1))(two());
    expect(waterOn(after, TODAY)).toMatchObject({millilitres: 250, entries: 1});
    expect(after.daily!.water.map(w => w.id)).toEqual([id(2)]);
    expect(undoWaterLog(id(9))(after)).toBe(after);
  });
});

describe('MO-110 / P-MO-54 and MO-010 / P-MO-53: journal and diary days', () => {
  it('the journal opens from 1990 (1900 crashed the page) up to today', () => {
    expect(JOURNAL_MIN_DAY).toBe('1990-01-01');
    expect(journalDay('1900-01-01', TODAY)).toBe(TODAY);
    expect(journalDay('1990-01-01', TODAY)).toBe('1990-01-01');
  });
  it('a diary entry is for today or earlier', () => {
    expect(diaryDayIssue('2026-11-05', TODAY)).toMatch(/^Choose today or an earlier day/);
    expect(diaryDayIssue('1900-01-01', TODAY)).toMatch(/^Choose a day from /);
    expect(diaryDayIssue(TODAY, TODAY)).toBeNull();
  });
});

describe('PR-018 / P-PR-22: one timer rule, stated once', () => {
  // Session AL fifth pass (PR-018, deliberate: the owner's one minimum for every timer replaces ten minutes / one second).
  it('every timer (sleep, fast, meditation, focus) saves from one minute', () => {
    expect(TIMER_MINIMUM_MS).toEqual({sleep: 60_000, fast: 60_000, meditation: 60_000, focus: 60_000});
    for (const kind of ['sleep', 'fast', 'meditation', 'focus'] as const) {
      expect(tooShortToSave(kind, 59_999)).toBe(true);
      expect(tooShortToSave(kind, 60_000)).toBe(false);
    }
    expect(tooShortToSave('sleep', 0)).toBe(true);
    expect(tooShortToSave('meditation', 21_000)).toBe(true);
    expect(tooShortText('fast')).toBe('Stopped after less than a minute, so nothing was saved.');
    expect(tooShortText('focus', true)).toBe('Focus stopped after less than a minute, so nothing was saved.');
    expect(timerRuleText).toBe('A timer stopped within its first minute saves nothing: sleep, fasts, meditation and focus alike.');
  });
});

describe('MO-125: Health names the linked measures a removal touches', () => {
  it('weights, water, activity, nights', () => {
    expect(measuresOfPaths([['weights']])).toEqual(['weight']);
    expect(measuresOfPaths([['daily', 'water']])).toEqual(['water']);
    expect(measuresOfPaths([['activity']])).toEqual(['steps', 'activeMinutes']);
    expect(measuresOfPaths([['sleep', 'nights']])).toEqual(['sleepMinutes']);
    expect(measuresOfPaths([['diary']])).toEqual([]);
  });
});

describe('PR-022 / P-PR-25: the sleep score names where its goal comes from', () => {
  it('no goal set: an 8 h reference, said as such', () => {
    expect(sleepScore({version: 1, nights: []}, TODAY).duration).toMatchObject({goalMinutes: 480, goalSet: false});
    expect(sleepScore({version: 1, nights: [], goal: {minutes: 420, updatedAt: AT}}, TODAY).duration).toMatchObject({goalMinutes: 420, goalSet: true});
  });
});

describe('MO-151 / P-MO-68: the weekly budget header is the sum of its days', () => {
  it('a 1,000 kcal target shows 8,400 for seven days at the 1,200 floor, not "7,000 (1,000 × 7)"', async () => {
    const {weekBudget, emptyCalorieWeek} = await import('./health-aa/calorie-week');
    const data = createEmptyHealth(); data.targets.kcal = 1000;
    const w = weekBudget(data, emptyCalorieWeek(), TODAY, TODAY)!;
    expect(w.days.every(d => d.budget === 1200)).toBe(true);
    expect(w.weeklyBudget).toBe(8400);
  });
});
