import {describe, expect, test} from 'vitest';
import {addWater, dailyData} from './health-daily';
import {createEmptyHealth, healthSchema, type HealthData} from './health';
import {deriveDots} from './checklist/derive';
import {readStepperValue} from './checklist/stepper-value';
import {NOW, TODAY, fullPath, sources} from './checklist/test-fixtures';
import {perDayUnitIssue, perDayUnitWarning, validateValue} from './limits/plausibility';
import {averageValueCheck, readAverageValue} from './goals/average-limits';
import {createHabit, emptyHabitData, type HabitInput} from './habits';
import {ideaHealthLink} from './habit-health-links/suggest';
import {healthSoFar} from '../components/habits/auto-value';
import {weightChangeText, weightChartValue, weightReadingDecimals, weightReadingText, weightReadingsText} from './health-units';
import {barcodeCodeHint, gtinCheckDigitOk, lookupFailure} from './health-barcode-outcome';
import {missingFoodDraft} from './food-scans/match';
import {planDue} from './reminders-plan/due';
import {emptyRemindersPlan, setPlanItem} from './reminders-plan/schema';

/** Session AL fifth pass (lane L2, replay GROK53_REPLAY_L2_2.md): the STILL OPEN and CHANGED rows, on the records. Fictional data. */
const day = {date: TODAY, ticks: [], custom: [], nudged: []};
const target = (h: HealthData, targetMl: number | null): HealthData => ({...h, daily: {...dailyData(h), preferences: {...dailyData(h).preferences, waterTargetMl: targetMl}}});
const water = (h: HealthData) => deriveDots(fullPath(), day, TODAY, sources({health: h})).find(d => d.kind === 'health' && d.input === 'water')!;

describe('LS-016, X3-26, LC-002: water is done only at the person’s own Health target', () => {
  test('with no target one glass leaves Water unlit, says so, and asks for a target', () => {
    const one = addWater(target(sources().health!, null), {id: 'health_water-0101', date: TODAY, amountMilli: 250_000, unit: 'ml'}, NOW.toISOString());
    expect(water(one)).toMatchObject({state: 'undone', note: '250 ml today, no daily target yet', askWaterTarget: true});
    expect(water(target(sources().health!, null))).toMatchObject({state: 'undone', askWaterTarget: true});
  });
  test('with a 2,000 ml target: 250 ml not done (no ask), 2,000 ml done', () => {
    const t = target(sources().health!, 2000), some = addWater(t, {id: 'health_water-0102', date: TODAY, amountMilli: 250_000, unit: 'ml'}, NOW.toISOString());
    expect(water(some)).toMatchObject({state: 'undone', note: '250 ml today of 2,000 ml'});
    expect(water(some).askWaterTarget).toBeUndefined();
    const all = addWater(some, {id: 'health_water-0103', date: TODAY, amountMilli: 1_750_000, unit: 'ml'}, NOW.toISOString());
    expect(water(all)).toMatchObject({state: 'done', note: '2,000 ml today of 2,000 ml'});
  });
});

describe('LS-056: the Checklist logs whole mL (the shared limits table’s waterStep row)', () => {
  const ml = {min: 1, max: 5000, unit: 'ml'}, floz = {min: 1, max: 169, unit: 'fl oz'};
  test('2.5 ml is refused with the field’s sentence; 250 ml and 8.5 fl oz are kept', () => {
    expect(readStepperValue('2.5', ml)).toEqual({ok: false, value: null, error: 'Enter an amount of water in whole mL, more than 0 and at most 5,000 mL.'});
    expect(readStepperValue('2,5', ml).ok).toBe(false);
    expect(readStepperValue('250', ml)).toEqual({ok: true, value: 250, error: null});
    expect(readStepperValue('8.5', floz)).toEqual({ok: true, value: 8.5, error: null});
    expect(validateValue('waterStep', '250.0', 'ml').ok).toBe(true);
  });
  test('the Health form keeps its own row: 0.5 mL is still read there (it asks once, MO-111)', () => {
    expect(validateValue('water', '0.5', 'ml')).toMatchObject({ok: true, value: 0.5});
  });
});

describe('G-044: your own measure in hours or minutes is a share of one day', () => {
  test('a 30-hour day (and a 30-hour target) is refused; 24 is the most; 20 or more asks once', () => {
    expect(readAverageValue('custom', '30', false, 'hours')).toEqual({ok: false, error: 'A day holds at most 24 hours. Enter from 0 to 24 hours.'});
    expect(readAverageValue('custom', '30', true, 'h a day')).toMatchObject({ok: false});
    expect(readAverageValue('custom', '24', false, 'hours')).toEqual({ok: true, value: 24});
    expect(averageValueCheck('custom', 21, 'hours')).toBe('21 hours is most of a day. If it is right, press Save again to keep it.');
    expect(averageValueCheck('custom', 2, 'hours')).toBeNull();
    expect(readAverageValue('custom', '1500', false, 'minutes')).toEqual({ok: false, error: 'A day holds at most 1,440 minutes. Enter from 0 to 1,440 minutes.'});
  });
  test('other units keep the record’s own limit; sleep keeps its own question', () => {
    expect(readAverageValue('custom', '30', false, 'pages')).toEqual({ok: true, value: 30});
    expect(perDayUnitIssue(30, 'EUR')).toBeNull(); expect(perDayUnitWarning(23, 'books')).toBeNull();
    expect(averageValueCheck('sleep-hours', 21, 'hours')).toMatch(/hours of sleep is most of the day/);
  });
});

describe('PR-019, N-086: the Drink water habit counts the water journal’s figure', () => {
  test('1 liter logged on the habit and 1,250 mL in the journal reads 1.25 liters; a larger habit entry stays', () => {
    const litres: HabitInput = {title: 'Drink water', category: 'Health', description: '', notes: '', type: 'build', measurement: {kind: 'quantity', unit: 'liters'}, schedule: {kind: 'daily'}, target: 2, targetPeriod: 'day', timeOfDay: 'anytime', endCondition: {kind: 'none'}};
    const ID = '11111111-1111-4111-8111-111111111111', created = createHabit({...emptyHabitData(), timeZone: 'UTC'}, litres, new Date('2026-11-04T02:00:00Z'), ID);
    const rule = created.habits[0]!.rules[0]!, link = ideaHealthLink(litres, 'ml')!;
    const logged = (count: number) => ({...created.habits[0]!, entries: [{date: TODAY, count, disposition: 'logged' as const, note: '', updatedAt: NOW.toISOString()}]});
    const health = addWater(healthSchema.parse(createEmptyHealth()), {id: 'health_water-0104', date: TODAY, amountMilli: 1_250_000, unit: 'ml'}, NOW.toISOString());
    expect(healthSoFar(logged(1), rule, TODAY, undefined, link, health)).toBe(1.25);
    expect(healthSoFar(logged(1.5), rule, TODAY, undefined, link, health)).toBeNull();
  });
});

describe('N-MO-14, N-NB-10 and the trend card’s sign: one weight format', () => {
  test('a reading shows as entered; an average of readings at their precision; the chart at two decimals when one has a hundredth', () => {
    expect(weightReadingText(70_550, 'kg')).toBe('70.55 kg');
    expect(weightReadingText(72_400, 'kg')).toBe('72.4 kg');
    expect(weightReadingsText(70_550, [70_550], 'kg')).toBe('70.55 kg');
    expect(weightReadingsText(72_450, [72_400, 72_500], 'kg')).toBe('72.5 kg');
    expect(weightReadingDecimals([72_400, 70_550], 'kg')).toBe(2);
    expect(weightReadingDecimals([72_400], 'kg')).toBe(1);
    expect(weightChartValue(70_550, 'kg', 2)).toEqual({value: '7055', decimals: 2, unit: 'kg'});
    expect(weightChartValue(72_400, 'kg')).toEqual({value: '724', decimals: 1, unit: 'kg'});
  });
  test('a change is signed with the minus sign, as the coach writes it', () => {
    expect(weightChangeText(-272, 'lb')).toBe('−0.6 lb');
    expect(weightChangeText(400, 'kg')).toBe('+0.4 kg');
  });
});

describe('MO-007, MO-107: a barcode is kept as typed and checked as EAN/UPC', () => {
  test('0000000000000 stays 13 digits in the draft and the sentence', () => {
    expect(barcodeCodeHint('0000000000000')).toBe('');
    expect(missingFoodDraft('0000000000000')).toMatchObject({name: 'Product 0000000000000', notes: 'Barcode 0000000000000'});
    expect(lookupFailure(503, '0000000000000').message).toContain(' 0000000000000 could not be looked up');
  });
  test('the check digit is checked for EAN-8, UPC-A, EAN-13 and GTIN-14', () => {
    for (const ok of ['3017620422003', '036000291452', '96385074', '00012345600012']) expect(gtinCheckDigitOk(ok), ok).toBe(true);
    expect(barcodeCodeHint('3017620422004')).toBe('The last digit of this EAN-13 code does not match the others (its check digit). Check the number on the package.');
    expect(barcodeCodeHint('12')).toBe('A barcode has 8, 12, 13 or 14 digits; this one has 2.');
    expect(barcodeCodeHint('30176 2042')).toBe('A barcode has digits only, with no spaces.');
  });
});

describe('C-DVG-41: the fasting reminder follows the fast, not a clock time', () => {
  test('due as soon as the running fast passes its target, outside quiet hours; never without one', () => {
    const p = setPlanItem(emptyRemindersPlan(), 'fasting-end', {on: true}), at = (clock: string) => new Date(`2026-10-07T${clock}:00`);
    const ctx = {weekday: 3, reviewWeekday: 0, fastDone: true};
    expect(planDue(p, at('08:30'), '2026-10-07', ctx).map(d => d.line)).toEqual(['Your fast has reached its target hours.']);
    expect(planDue(p, at('08:30'), '2026-10-07', {...ctx, fastDone: false})).toEqual([]);
    expect(planDue(p, at('23:00'), '2026-10-07', ctx)).toEqual([]); // quiet hours
  });
});
