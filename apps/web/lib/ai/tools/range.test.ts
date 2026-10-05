import {expect, test} from 'vitest';
import {healthDay} from '../../health-daily';
import {eachDay, findRange, MAX_RANGE_DAYS, parseRange, weekStart} from './range';

// Session V Part 2: ranges as people say them, resolved against the journal's own day. 2026-10-05 is a Monday.
const TODAY = '2026-10-05';
const range = (input: string, today = TODAY, future = false) => { const r = parseRange(input, today, {future}); return r.ok ? `${r.from}..${r.to}` : `refused: ${r.message}`; };

test('fixed phrases: today, yesterday, weeks from Monday, months and years, ending today', () => {
  expect(range('today')).toBe('2026-10-05..2026-10-05');
  expect(range('')).toBe('2026-10-05..2026-10-05');
  expect(range('yesterday')).toBe('2026-10-04..2026-10-04');
  expect(range('this week')).toBe('2026-10-05..2026-10-05'); // Monday: the week has just begun
  expect(range('this week', '2026-10-11')).toBe('2026-10-05..2026-10-11'); // Sunday closes it
  expect(range('last week')).toBe('2026-09-28..2026-10-04');
  expect(range('This month?')).toBe('2026-10-01..2026-10-05');
  expect(range('last month')).toBe('2026-09-01..2026-09-30');
  expect(range('this year')).toBe('2026-01-01..2026-10-05');
  expect(range('last year')).toBe('2025-01-01..2025-12-31');
  expect(range('in the last week')).toBe('2026-09-28..2026-10-04');
});
test('month ends and leap years', () => {
  expect(range('last month', '2026-03-31')).toBe('2026-02-01..2026-02-28');
  expect(range('last month', '2024-03-31')).toBe('2024-02-01..2024-02-29');
  expect(range('last month', '2026-01-15')).toBe('2025-12-01..2025-12-31');
  expect(range('the last 1 months', '2026-03-31')).toBe('2026-03-01..2026-03-31');
  expect(range('the last 3 months', '2026-05-31')).toBe('2026-03-01..2026-05-31');
  expect(range('February', '2024-10-05')).toBe('2024-02-01..2024-02-29');
});
test('counted ranges, since, between and ISO forms', () => {
  expect(range('last 7 days')).toBe('2026-09-29..2026-10-05');
  expect(range('the past 14 days')).toBe('2026-09-22..2026-10-05');
  expect(range('last 2 weeks')).toBe('2026-09-22..2026-10-05');
  expect(range('since 2026-09-20')).toBe('2026-09-20..2026-10-05');
  expect(range('since 1 September')).toBe('2026-09-01..2026-10-05');
  expect(range('since September 1st')).toBe('2026-09-01..2026-10-05');
  expect(range('between 2026-09-01 and 2026-09-15')).toBe('2026-09-01..2026-09-15');
  expect(range('from 15 September to 1 September')).toBe('2026-09-01..2026-09-15');
  expect(range('2026-09-01..2026-09-15')).toBe('2026-09-01..2026-09-15');
  expect(range('2026-09-03')).toBe('2026-09-03..2026-09-03');
  expect(range('3 September')).toBe('2026-09-03..2026-09-03');
});
test('month names take the most recent one unless a year is given; weekdays the most recent day', () => {
  expect(range('September')).toBe('2026-09-01..2026-09-30');
  expect(range('in November')).toBe('2025-11-01..2025-11-30');
  expect(range('November 2025')).toBe('2025-11-01..2025-11-30');
  expect(range('October')).toBe('2026-10-01..2026-10-05');
  expect(range('on Monday')).toBe('2026-10-05..2026-10-05');
  expect(range('last Monday')).toBe('2026-09-28..2026-09-28');
  expect(range('Friday')).toBe('2026-10-02..2026-10-02');
  expect(range('25 December')).toBe('2025-12-25..2025-12-25');
});
test('Dutch, French and German range words', () => {
  for (const [phrase, expected] of [['vandaag', '2026-10-05..2026-10-05'], ['gisteren', '2026-10-04..2026-10-04'], ['vorige week', '2026-09-28..2026-10-04'], ['deze maand', '2026-10-01..2026-10-05'],
    ['la semaine dernière', '2026-09-28..2026-10-04'], ['ce mois-ci', '2026-10-01..2026-10-05'], ['le mois dernier', '2026-09-01..2026-09-30'], ['hier', '2026-10-04..2026-10-04'],
    ['letzte woche', '2026-09-28..2026-10-04'], ['diesen monat', '2026-10-01..2026-10-05'], ['gestern', '2026-10-04..2026-10-04'], ['seit 2026-09-30', '2026-09-30..2026-10-05'],
    ['afgelopen 10 dagen', '2026-09-26..2026-10-05'], ['die letzten 3 tage', '2026-10-03..2026-10-05'], ['septembre', '2026-09-01..2026-09-30'], ['maart 2026', '2026-03-01..2026-03-31']] as const) expect(range(phrase), phrase).toBe(expected);
});
test('nothing is guessed: future ranges, oversize ranges and unknown phrases are refused with a reason', () => {
  expect(range('tomorrow')).toMatch(/^refused: That range \(tomorrow\) has not started yet/);
  expect(range('next week')).toMatch(/^refused: .*has not started yet/);
  expect(range('the next 7 days')).toMatch(/^refused: That range is in the future/);
  expect(range('2026-11-01')).toMatch(/^refused: .*has not started yet/);
  expect(range('last 400 days')).toBe(`refused: That range is longer than ${MAX_RANGE_DAYS} days; ask about a year or less at a time.`);
  expect(range('since 2020-01-01')).toMatch(/longer than 366 days/);
  expect(range('last 0 days')).toBe('refused: Ask about at least one day.');
  expect(range('the blue moon')).toMatch(/^refused: ZIGi could not read "the blue moon" as a period/);
  expect(range('2026-02-30')).toMatch(/^refused/);
  expect(range('since 31 February')).toMatch(/could not read the date/);
});
test('plans may look ahead: whole weeks and months, tomorrow, next week, the next N days, coming weekdays and months', () => {
  expect(range('this week', TODAY, true)).toBe('2026-10-05..2026-10-11');
  expect(range('next week', TODAY, true)).toBe('2026-10-12..2026-10-18');
  expect(range('tomorrow', TODAY, true)).toBe('2026-10-06..2026-10-06');
  expect(range('the next 7 days', TODAY, true)).toBe('2026-10-05..2026-10-11');
  expect(range('this month', TODAY, true)).toBe('2026-10-01..2026-10-31');
  expect(range('next month', TODAY, true)).toBe('2026-11-01..2026-11-30');
  expect(range('Friday', TODAY, true)).toBe('2026-10-09..2026-10-09');
  expect(range('last Friday', TODAY, true)).toBe('2026-10-02..2026-10-02');
  expect(range('January', TODAY, true)).toBe('2027-01-01..2027-01-31');
  expect(range('3 January', TODAY, true)).toBe('2027-01-03..2027-01-03');
  expect(range('volgende week', TODAY, true)).toBe('2026-10-12..2026-10-18');
});
test('weeks start on Monday and day lists cross DST changes and month ends without gaps', () => {
  expect(weekStart('2026-10-05')).toBe('2026-10-05'); expect(weekStart('2026-10-11')).toBe('2026-10-05'); expect(weekStart('2026-10-04')).toBe('2026-09-28');
  expect(eachDay('2026-10-24', '2026-10-26')).toEqual(['2026-10-24', '2026-10-25', '2026-10-26']); // Europe/Brussels leaves summer time on 25 October
  expect(eachDay('2026-10-31', '2026-11-02')).toEqual(['2026-10-31', '2026-11-01', '2026-11-02']); // America/New_York on 1 November
  expect(eachDay('2026-03-28', '2026-03-30')).toHaveLength(3);
  expect(eachDay('2024-02-28', '2024-03-01')).toEqual(['2024-02-28', '2024-02-29', '2024-03-01']);
  // The journal's day comes from its own zone, whatever the device clock: one instant, three days.
  const instant = new Date('2026-10-25T23:30:00Z');
  expect(healthDay('Europe/Brussels', instant)).toBe('2026-10-26'); // 00:30 CET
  expect(healthDay('America/New_York', instant)).toBe('2026-10-25'); // 19:30 EDT
  expect(healthDay('Pacific/Auckland', instant)).toBe('2026-10-26');
  expect(range('last week', healthDay('Europe/Brussels', instant))).toBe('2026-10-19..2026-10-25');
  expect(range('last week', healthDay('America/New_York', instant))).toBe('2026-10-12..2026-10-18');
});
test('a range inside a question: the owner\'s example and everyday words that are not months', () => {
  const found = (q: string, today = TODAY) => { const r = findRange(q, today); return r ? `${r.from}..${r.to} (${r.phrase})` : null; };
  expect(found('How many minutes did I meditate this month?')).toBe('2026-10-01..2026-10-05 (this month)');
  expect(found('How much water did I drink yesterday')).toBe('2026-10-04..2026-10-04 (yesterday)');
  expect(found('my steps over the last 14 days please')).toBe('2026-09-22..2026-10-05 (the last 14 days)');
  expect(found('What did I eat on Friday?')).toBe('2026-10-02..2026-10-02 (on friday)');
  expect(found('compare September')).toBe('2026-09-01..2026-09-30 (september)');
  expect(found('May I ask how my habits are going?')).toBeNull();
  expect(found('march on with my reading')).toBeNull();
  expect(found('how was my sleep in may')).toBe('2026-05-01..2026-05-31 (in may)');
  expect(found('Hoeveel stappen deze week?')).toBe('2026-10-05..2026-10-05 (deze week)');
  expect(found('since 2026-09-14 how many check-ins')).toBe('2026-09-14..2026-10-05 (since 2026-09-14)');
  expect(found('How am I doing?')).toBeNull();
});
