import {describe, expect, it} from 'vitest';
import {createEmptyHealth, saveActivity, saveWeight, type HealthData, type WaterEntry} from './health';
import {saveNight} from './sleep/engine';
import {emptySleep, type Sleep} from './sleep/schema';
import {withHealthGroup} from './vault/w-homes';
import {instantAt} from './zone-time';
import {drinkDay, emptyHealthExtras, healthExtrasSchema, mealHeading, mealLabel, pruneDrinks, readCaffeine, setDrink, setMealPref} from './health-extras';
import {getSleepActivities} from './health-sleep-activities';
import {readSleepCsv} from './health-sleep-csv';
import {conversionNote, toBaseAmount, unitsFor} from './health-serving-units';
import {addBodyFat, bodyFatHistory, emptyMeasurementsCustom, measurementsCustomSchema, removeBodyFat} from './health-aa/measurements-custom';
import {weekUsage, weekUsageText} from './health-aa/week-usage';
import {documentFeatureState} from './health-navigation';
import {bluetoothSupport} from './bluetooth/web-bluetooth';
import {activityTypeOf} from './health-activity-types';
import {looksLikeFormula, numberRefusal, planNutritionImport, previewLine} from './import/nutrition';
import {detectNutritionPreset} from './import/nutrition-presets';
import {parseCsv} from './csv/parse';


// Session AL, lane L2 (Health), third pass: the cross-lane asks and competitor rows built in this pass, each by its id.
const AT = '2026-11-04T09:00:00.000Z', BXL = 'Europe/Brussels', NOW = instantAt('2026-11-04', '12:00', BXL);
const id = (n: number) => `health_00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const night = (s: Sleep, from: [string, string], to: [string, string], extra: Partial<Parameters<typeof saveNight>[1]> = {}) =>
  saveNight(s, {kind: 'night', start: instantAt(from[0], from[1], BXL), end: instantAt(to[0], to[1], BXL), timeZone: BXL, ...extra}, new Date(NOW));

describe('DV-172 (P-DV-73): sleep nights as Activity rows', () => {
  it('ended nights and naps, newest first, on their wake day, with the asleep time; a running night is left out', () => {
    let s = night(emptySleep(), ['2026-11-02', '23:00'], ['2026-11-03', '07:00'], {latencyMin: 15, awakeMin: 15, quality: 4});
    s = saveNight(s, {kind: 'nap', start: instantAt('2026-11-03', '14:00', BXL), end: instantAt('2026-11-03', '14:40', BXL), timeZone: BXL}, new Date(NOW));
    const rows = getSleepActivities(withHealthGroup(createEmptyHealth(), 'sleep', s, false));
    expect(rows.map(r => [r.title, r.day, r.detail, r.href])).toEqual([
      ['Nap recorded', '2026-11-03', '40 min asleep (estimated) · Nov 3, 2026', '/app/health?view=sleep&date=2026-11-03'],
      ['Night’s sleep recorded', '2026-11-03', '7 h 30 min asleep · quality 4/5 · Nov 3, 2026', '/app/health?view=sleep&date=2026-11-03'],
    ]);
    expect(rows.every(r => r.category === 'HEALTH' && r.id.startsWith('sleep:'))).toBe(true);
    expect(getSleepActivities(createEmptyHealth())).toEqual([]);
  });
});

describe('GAP-045 (C-MO-03): your own meal names and times', () => {
  it('a name and a time show; blank goes back; a name made of spaces or a bad time is said at its field', () => {
    const r = setMealPref(emptyHealthExtras(), 'Breakfast', {name: ' Pre-workout ', time: '06:45'});
    if (!r.ok) throw Error('expected ok');
    expect([mealLabel(r.value, 'Breakfast'), mealHeading(r.value, 'Breakfast'), mealLabel(r.value, 'Lunch')]).toEqual(['Pre-workout', 'Pre-workout · 06:45', 'Lunch']);
    const back = setMealPref(r.value, 'Breakfast', {name: '', time: ''});
    expect(back.ok && back.value.meals).toBeUndefined();
    expect(setMealPref(r.value, 'Lunch', {name: '​ ', time: ''})).toMatchObject({ok: false, issue: {field: 'name'}});
    expect(setMealPref(r.value, 'Lunch', {name: 'Late lunch', time: '25:00'})).toMatchObject({ok: false, issue: {field: 'time', message: 'Enter a time like 07:30, or leave it blank.'}});
    // A newer build's extra part is kept by this loose record.
    expect(healthExtrasSchema.parse({version: 1, future: {x: 1}})).toMatchObject({future: {x: 1}});
  });
});

describe('GAP-079 (C-MO-09): drinks by type and caffeine', () => {
  const water = (n: number, ml: number): WaterEntry => ({id: id(n), date: '2026-11-04', amountMilli: ml * 1000, unit: 'ml', createdAt: AT, updatedAt: AT});
  it('coffee and tea are noted beside the entry; caffeine sums what was typed; one with no amount is unknown, not zero', () => {
    let x = setDrink(emptyHealthExtras(), id(1), 'coffee', 95);
    x = setDrink(x, id(2), 'tea');
    const day = drinkDay(x, [water(1, 250), water(2, 300), water(3, 500)], '2026-11-04');
    expect(day.byType).toEqual([{type: 'water', ml: 500, entries: 1}, {type: 'coffee', ml: 250, entries: 1}, {type: 'tea', ml: 300, entries: 1}]);
    expect([day.caffeineMg, day.caffeineKnown, day.caffeineUnknown]).toEqual([95, 1, 1]);
    expect(drinkDay(emptyHealthExtras(), [water(3, 500)], '2026-11-04').caffeineMg).toBeNull();
    expect(setDrink(x, id(1), 'water').drinks?.[id(1)]).toBeUndefined();
    expect(pruneDrinks(x, new Set([id(2)])).drinks).toEqual({[id(2)]: {type: 'tea'}});
  });
  it('caffeine reads whole milligrams; blank is unknown; the rest says why', () => {
    expect(readCaffeine('')).toEqual({ok: true, mg: undefined});
    expect(readCaffeine('80 mg')).toEqual({ok: true, mg: 80});
    expect(readCaffeine('8,5')).toMatchObject({ok: false, message: 'Caffeine is a whole number of milligrams, like 95, or blank.'});
    expect(readCaffeine('5000')).toMatchObject({ok: false, message: 'Caffeine for one drink goes up to 1000 mg.'});
  });
});

describe('GAP-048 (C-MO-08): kitchen units within weight or volume', () => {
  it('cups and spoons become millilitres, ounces grams; never weight into volume', () => {
    expect(toBaseAmount('1', 'cups')).toBe('236.588');
    expect(toBaseAmount('2', 'tablespoons')).toBe('29.574');
    expect(toBaseAmount('3,5', 'ounces')).toBe('99.223');
    expect(toBaseAmount('1', 'servings')).toBeNull();
    expect(() => toBaseAmount('abc', 'cups')).toThrow('Enter the amount as a number above 0, in US cups.');
    expect(conversionNote('1', 'cups')).toBe('1 US cups = 236.6 mL');
    expect(unitsFor({servingGrams: 40}).map(u => u.id)).toEqual(['servings', 'grams', 'ounces']);
    expect(unitsFor({servingGrams: null, servingMl: 250}).map(u => u.id)).toEqual(['servings', 'millilitres', 'cups', 'tablespoons', 'teaspoons', 'fluid-ounces']);
  });
});

describe('GAP-053 (C-MO-17): body-fat %', () => {
  it('one reading a day in tenths; out of range refused; removal; older readers keep the part', () => {
    let r = addBodyFat(emptyMeasurementsCustom(), '2026-11-03', 24.36, AT, 'bf1');
    r = addBodyFat(r, '2026-11-04', 24.1, AT, 'bf2');
    r = addBodyFat(r, '2026-11-04', 23.9, AT, 'bf3');
    expect(bodyFatHistory(r)).toEqual([{id: 'bf1', date: '2026-11-03', value: 24.4}, {id: 'bf3', date: '2026-11-04', value: 23.9}]);
    expect(() => addBodyFat(r, '2026-11-04', 90, AT)).toThrow('A body-fat reading is between 2 % and 75 %.');
    expect(bodyFatHistory(removeBodyFat(r, 'bf1')).map(x => x.id)).toEqual(['bf3']);
    expect(measurementsCustomSchema.parse({version: 1, kinds: [], bodyFat: [{id: 'a', date: '2026-11-04', tenths: 240, at: AT}]}).bodyFat).toHaveLength(1);
  });
});

describe('GAP-071 / GAP-072 (C-MO-42, C-MO-43): nights from Sleep Cycle, Oura or a start/end CSV', () => {
  it('Sleep Cycle (semicolons, no zone): read in your zone; asleep and time before sleep kept; quality in the note', () => {
    const csv = 'Start;End;Sleep Quality;Regularity;Time in bed (seconds);Time asleep (seconds);Time before sleep (seconds)\n2026-11-02 23:10:00;2026-11-03 06:55:00;84%;90%;27900;25200;900\n2026-11-03 23:00:00;2026-11-03 22:00:00;80%;;;;\n';
    const p = readSleepCsv(csv, {zone: BXL, nowMs: NOW, existing: emptySleep()});
    expect(p.layout).toBe('sleep-cycle');
    expect(p.nights).toHaveLength(1);
    expect(p.nights[0]).toMatchObject({kind: 'night', start: instantAt('2026-11-02', '23:10', BXL), end: instantAt('2026-11-03', '06:55', BXL), latencyMin: 15, awakeMin: 30, note: 'Imported from Sleep Cycle (CSV) · sleep quality 84 %'});
    expect(p.issues.map(i => i.reason)).toEqual(['Line 3: the night ends before it starts.']);
  });
  it('Oura’s sleep rows in any file name: offsets kept, rest periods left out, durations in seconds', () => {
    const csv = 'day,bedtime_start,bedtime_end,type,total_sleep_duration,latency\n2026-11-03,2026-11-02T23:30:00+01:00,2026-11-03T07:00:00+01:00,long_sleep,24600,600\n2026-11-03,2026-11-03T13:00:00+01:00,2026-11-03T13:20:00+01:00,rest,,\n';
    const p = readSleepCsv(csv, {zone: BXL, nowMs: NOW, existing: emptySleep()});
    expect(p.layout).toBe('oura');
    expect(p.nights[0]).toMatchObject({start: Date.parse('2026-11-02T22:30:00Z'), end: Date.parse('2026-11-03T06:00:00Z'), latencyMin: 10, awakeMin: 30});
    expect(p.issues[0]!.reason).toBe('Line 3: a period Oura marked as rest (left out).');
  });
  it('a plain start/end file; a night you already have is kept; a file without the columns says what it reads', () => {
    const existing = night(emptySleep(), ['2026-11-02', '23:00'], ['2026-11-03', '07:00']);
    const p = readSleepCsv('start,end\n2026-11-02 23:30,2026-11-03 06:30\n2026-11-03 23:00,2026-11-04 07:00\n', {zone: BXL, nowMs: NOW, existing});
    expect([p.layout, p.nights.length, p.kept]).toEqual(['start-end', 1, 1]);
    const none = readSleepCsv('date,hours\n2026-11-03,7\n', {zone: BXL, nowMs: NOW, existing: emptySleep()});
    expect([none.layout, none.issues[0]!.reason]).toEqual([null, expect.stringContaining('Sleep Cycle’s export, Oura’s sleep rows')]);
  });
});

describe('GAP-073 (C-MO-55): the week in Health, counted on this device', () => {
  it('days with any entry and entries by kind; nothing logged is said kindly', () => {
    let d: HealthData = saveWeight(createEmptyHealth(), {id: id(10), date: '2026-11-01', grams: 80_000}, AT);
    d = saveActivity(d, {id: id(11), date: '2026-11-04', name: 'Walk', steps: 3000, minutes: 30}, AT);
    d = saveWeight(d, {id: id(12), date: '2026-10-20', grams: 80_500}, AT);
    const u = weekUsage(d, '2026-11-04');
    expect([u.daysLogged, u.entries]).toEqual([2, 2]);
    expect(weekUsageText(u)).toBe('You logged on 2 of the last 7 days: 1 weight, 1 movement entry.');
    expect(weekUsageText(weekUsage(createEmptyHealth(), '2026-11-04'))).toBe('Nothing logged in Health in the last seven days. That is fine.');
  });
});

describe('INT (Bluetooth): a browser that does not know the feature is not "blocked"', () => {
  const doc = (policy: object) => policy as unknown as Document;
  const nav = {bluetooth: {requestDevice: async () => ({})}} as unknown as Navigator;
  it('the policy state: known and refused, known and allowed, unknown', () => {
    expect(documentFeatureState(doc({featurePolicy: {allowsFeature: () => false, features: () => ['camera']}}), 'bluetooth')).toBe('unknown');
    expect(documentFeatureState(doc({permissionsPolicy: {allowsFeature: () => false, features: () => ['camera', 'bluetooth']}}), 'bluetooth')).toBe('blocked');
    expect(documentFeatureState(doc({permissionsPolicy: {allowsFeature: (f: string) => f === 'bluetooth'}}), 'bluetooth')).toBe('allowed');
    expect(documentFeatureState(doc({}), 'bluetooth')).toBe('unknown');
  });
  it('support: no API = not supported; blocked by Health\'s policy = reload; an unknown feature = offered', () => {
    expect(bluetoothSupport(doc({}), {} as Navigator)).toBe('no-api');
    expect(bluetoothSupport(doc({permissionsPolicy: {allowsFeature: () => false, features: () => ['bluetooth']}}), nav)).toBe('policy');
    expect(bluetoothSupport(doc({featurePolicy: {allowsFeature: () => false, features: () => ['camera']}}), nav)).toBe('ok');
    expect(bluetoothSupport(doc({permissionsPolicy: {allowsFeature: () => true}}), nav)).toBe('ok');
  });
});

describe('GAP-042 (N-085): activity types', () => {
  it('a name that starts with a type reads as it; your own words stay your own', () => {
    expect([activityTypeOf('Run with Sam'), activityTypeOf('cycling'), activityTypeOf('Gardening')]).toEqual(['Run', 'Cycling', null]);
  });
});

describe('P-MO-61 (MO-049, MO-050, MO-138): the nutrition CSV says what it read', () => {
  it('each refusal quotes its cell and says why: negative, not a number, exponent', () => {
    expect(numberRefusal('Calories', '-100', new Error('is negative'))).toBe('Calories “-100” is negative; amounts start at 0.');
    expect(numberRefusal('Calories', 'abc', new Error('is not a number'))).toBe('Calories “abc” is not a number.');
    expect(numberRefusal('Fat', '1e3', new Error('uses exponent notation'))).toBe('Fat “1e3” uses exponent notation; write the number in full.');
  });
  it('MyFitnessPal: a meal total is named so; the -100 row says negative; sodium is in the preview line', () => {
    const csv = 'Date,Meal,Calories,Fat (g),Carbohydrates (g),Protein (g),Sodium (mg)\n2026-11-01,Breakfast,420,12,55,22,200\n2026-11-01,Lunch,abc,1,1,1,1\n2026-11-01,Dinner,-100,1,1,1,1\n';
    const parsed = parseCsv(csv), preset = detectNutritionPreset(parsed.header)!;
    const plan = planNutritionImport({rows: parsed.rows, mapping: preset.mapping, numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: '2026-11-04', importId: 'p3', at: AT});
    expect(plan.refused.map(r => r.reason)).toEqual(['Row 2: Calories “abc” is not a number.', 'Row 3: Calories “-100” is negative; amounts start at 0.']);
    expect(previewLine(plan.entries[0]!)).toBe('Nov 1, 2026 · Breakfast (meal total) · 1 serving · 420 kcal · P 22 g · C 55 g · F 12 g · serving measure unknown · sodium 200 mg');
  });
  it('Cronometer: the amount is the serving ("1 serving of 50 g"); a formula-looking name is kept and flagged', () => {
    const csv = 'Day,Group,Food Name,Amount,Energy (kcal)\n2026-11-01,Breakfast,Oats,50 g,190\n2026-11-02,Snacks,"=HYPERLINK(""x"")",1 serving,10\n';
    const parsed = parseCsv(csv), preset = detectNutritionPreset(parsed.header)!;
    const plan = planNutritionImport({rows: parsed.rows, mapping: preset.mapping, numberStyle: 'point', dateFormat: 'iso', basis: 'serving', today: '2026-11-04', importId: 'p3c', at: AT});
    expect(previewLine(plan.entries[0]!)).toContain('Oats · 1 serving of 50 g · 190 kcal');
    expect(plan.warnings.map(w => w.row)).toEqual([2]);
    expect(plan.warnings[0]!.reason).toContain('starts like a spreadsheet formula');
    expect([looksLikeFormula('=SUM(A1)'), looksLikeFormula('​+1'), looksLikeFormula('Oats')]).toEqual([true, true, false]);
  });
});
