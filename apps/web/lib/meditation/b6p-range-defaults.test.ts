import {afterEach, describe, expect, test} from 'vitest';
import {emptyDayEnds, setCurrentDayEnds} from '../day-boundary-core';
import {rangeDefaults} from './stats';

/**
 * Review B6P-9 (Session AV lane 2, r6-body; LEDGER #413): "Several days" defaults to the week up to the Meditation view's
 * today, which follows "My day ends at"; the calendar day now is the latest day it takes.
 */
const AMS = 'Europe/Amsterdam', NIGHT = Date.parse('2026-11-22T00:00:00.000Z'); // 01:00 in Amsterdam
afterEach(() => { setCurrentDayEnds(emptyDayEnds()); });
describe('B6P-9: Several days follows the view’s today', () => {
  test('at 01:00 with the day ending at 03:00 the last day is the 21st, the latest the 22nd', () => {
    setCurrentDayEnds({version: 1, endsAt: 180});
    expect(rangeDefaults(NIGHT, AMS)).toEqual({from: '2026-11-15', to: '2026-11-21', max: '2026-11-22'});
  });
  test('with the day ending at midnight, the calendar week as before', () => {
    expect(rangeDefaults(NIGHT, AMS)).toEqual({from: '2026-11-16', to: '2026-11-22', max: '2026-11-22'});
  });
});
