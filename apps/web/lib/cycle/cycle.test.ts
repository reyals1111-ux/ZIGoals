import {describe, expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {addLocalDays} from '../local-date';
import {compare, factorOptions} from '../compare/engine';
import {CYCLE, CYCLE_KEY, MAX_CYCLE_DAYS, cycleOn, emptyCycle, periodDays, type Cycle} from './store';
import {CYCLE_LINE, clearCycleDays, cycleDay, cycleLengths, nextPeriodEstimate, periodStarts, setCycleDay, setCycleOn} from './engine';
import {showcaseCycle} from './showcase';

const TODAY = '2026-11-01';
/** The frozen fixture for the lead's frozen reader. */
export const FROZEN_CYCLE = {version: 1, on: true, days: {'2026-10-03': {flow: 'medium', symptoms: ['cramps']}, '2026-10-04': {flow: 'light'}, '2026-10-20': {symptoms: ['headache'], note: 'Slept badly'}}};
const withPeriods = (starts: readonly string[], length = 4): Cycle => {
  let rec = setCycleOn(emptyCycle(), true);
  for (const s of starts) for (let i = 0; i < length; i++) rec = setCycleDay(rec, addLocalDays(s, i), {flow: i === 0 ? 'heavy' : 'light'}, TODAY);
  return rec;
};

describe('Cycle log (BUILD list 2 #16)', () => {
  test('hidden by default; the frozen fixture reads; an unknown flow is dropped, not failed', () => {
    expect(cycleOn(emptyCycle())).toBe(false);
    const read = readDeviceRecord({getItem: k => k === CYCLE_KEY ? JSON.stringify({...FROZEN_CYCLE, days: {...FROZEN_CYCLE.days, '2026-10-21': {flow: 'other', note: 'x'}}}) : null}, CYCLE);
    expect(read.unreadable).toBe(false);
    expect(cycleOn(read.data)).toBe(true);
    expect(read.data.days['2026-10-21']).toEqual({note: 'x'});
    expect(periodDays(read.data)).toEqual(['2026-10-03', '2026-10-04']);
  });
  test('a day: flow, chips and note; clearing everything removes the day; never a future day', () => {
    let rec = setCycleDay(emptyCycle(), TODAY, {flow: 'medium', symptoms: ['cramps', 'cramps', 'tired'], note: '  heavy  morning '}, TODAY);
    expect(rec.days[TODAY]).toEqual({flow: 'medium', symptoms: ['cramps', 'tired'], note: 'heavy morning'});
    rec = setCycleDay(rec, TODAY, {flow: null, symptoms: [], note: ''}, TODAY);
    expect(rec.days).toEqual({});
    expect(() => setCycleDay(rec, '2026-11-02', {flow: 'light'}, TODAY)).toThrow(/today or an earlier day/);
  });
  test('fewer than three cycles: no estimate', () => {
    expect(nextPeriodEstimate(withPeriods(['2026-08-01', '2026-08-29', '2026-09-26']), TODAY)).toEqual({kind: 'not-yet', cycles: 2, need: 3});
    expect(nextPeriodEstimate(emptyCycle(), TODAY)).toMatchObject({kind: 'not-yet', cycles: 0});
  });
  test('irregular cycles: a range from the shortest to the longest, never one date', () => {
    const rec = withPeriods(['2026-06-01', '2026-06-27', '2026-07-30', '2026-08-27', '2026-09-28']);
    expect(cycleLengths(rec)).toEqual([26, 33, 28, 32]);
    expect(nextPeriodEstimate(rec, '2026-10-05')).toEqual({kind: 'range', from: addLocalDays('2026-09-28', 26), to: addLocalDays('2026-09-28', 33), cycles: 4, shortest: 26, longest: 33, passed: false});
    expect(nextPeriodEstimate(rec, '2026-11-15')).toMatchObject({passed: true});
  });
  test('a one-day gap stays one period; a pause in logging over 90 days is not a cycle', () => {
    let rec = withPeriods(['2026-01-01', '2026-05-01', '2026-05-29']);
    rec = setCycleDay(rec, '2026-05-31', {flow: null}, TODAY); // a gap inside the period
    expect(periodStarts(rec)).toEqual(['2026-01-01', '2026-05-01', '2026-05-29']);
    expect(cycleLengths(rec)).toEqual([28]);
    expect(cycleDay(rec, '2026-06-02')).toBe(5);
    expect(cycleDay(rec, '2026-12-31')).toBeNull();
  });
  test('bounds: the newest 1,500 days are kept; delete all keeps the choice', () => {
    let rec = setCycleOn(emptyCycle(), true);
    const days: Cycle['days'] = {};
    for (let i = 0; i < MAX_CYCLE_DAYS; i++) days[addLocalDays(TODAY, -i - 1)] = {note: 'n'};
    rec = {...rec, days};
    rec = setCycleDay(rec, TODAY, {flow: 'light'}, TODAY);
    expect(Object.keys(rec.days)).toHaveLength(MAX_CYCLE_DAYS);
    expect(rec.days[addLocalDays(TODAY, -MAX_CYCLE_DAYS)]).toBeUndefined();
    expect(clearCycleDays(rec)).toEqual({version: 1, on: true, days: {}});
  });
  test('period days as a Compare factor, only within the logged span', () => {
    const rec = withPeriods(['2026-08-05', '2026-09-02', '2026-09-30']);
    const src = {cycle: {periodDays: periodDays(rec)}, energy: {days: Object.fromEntries(Array.from({length: 89}, (_, i) => { const d = addLocalDays(TODAY, -i); return [d, {energy: periodDays(rec).includes(d) ? 2 : 4}]; }))}};
    expect(factorOptions(src, TODAY).map(f => f.id)).toEqual(['cycle']);
    const r = compare(src, 'cycle', 'energy', 'same', TODAY)!;
    expect(r.withDays).toBe(12);
    expect(r.withoutDays).toBe(60 - 12); // the 60 days from 2026-08-05 to 2026-10-03, minus the period days; after it, unknown
    expect(factorOptions({cycle: null}, TODAY)).toEqual([]);
  });
  test('the words: information, not advice', () => {
    expect(CYCLE_LINE).toBe('Information for you, not a contraceptive or a diagnosis.');
  });
  test('the Showcase example is on, labelled, and has an estimate', () => {
    const rec = showcaseCycle(TODAY);
    expect(cycleOn(rec)).toBe(true);
    expect(Object.values(rec.days).some(d => /Showcase/.test(d.note ?? ''))).toBe(true);
    expect(nextPeriodEstimate(rec, TODAY).kind).toBe('range');
  });
});
