import {describe, expect, it} from 'vitest';
import {scaleStats} from './stats';

/** Session AV lane 2 (habits; LEDGER #189, Daylio's scale statistics): one scale over 30, 90 and 365 days. */
const rec = {days: {'2026-11-01': {stress: 2}, '2026-11-02': {stress: 4, focus: 3}, '2026-11-03': {stress: 2}, '2026-08-20': {stress: 5}, '2025-12-01': {stress: 1}, '2026-11-05': {stress: 3}}};
describe('scale statistics', () => {
  it('days rated, average, lowest, highest and each level, inside the span only (a later day is left out)', () => {
    expect(scaleStats(rec, 'stress', '2026-11-04', 30)).toEqual({span: 30, from: '2026-10-06', to: '2026-11-04', rated: 3, average: 2.7, low: 2, high: 4, counts: [0, 2, 0, 1, 0], mostly: 2,
      points: [{date: '2026-11-01', value: 2}, {date: '2026-11-02', value: 4}, {date: '2026-11-03', value: 2}]});
    expect(scaleStats(rec, 'stress', '2026-11-04', 90)).toMatchObject({rated: 4, average: 3.3, high: 5, counts: [0, 2, 0, 1, 1]});
    expect(scaleStats(rec, 'stress', '2026-11-04', 365)).toMatchObject({rated: 5, low: 1, counts: [1, 2, 0, 1, 1], mostly: 2});
  });
  it('nothing rated is nothing, never a level', () => {
    expect(scaleStats(rec, 'calm', '2026-11-04', 30)).toMatchObject({rated: 0, average: null, low: null, high: null, mostly: null, counts: [0, 0, 0, 0, 0], points: []});
  });
});
