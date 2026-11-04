import {describe, expect, it} from 'vitest';
import {readAverageValue} from './average-limits';

// Session AL (L4): DV-052a, P-DV-02 — an average goal's target and days within their measure.
describe('readAverageValue', () => {
  it('refuses 25 hours of sleep a night and 30 for a day', () => {
    expect(readAverageValue('sleep-hours', '25', true).ok).toBe(false);
    expect(readAverageValue('sleep-hours', '30').ok).toBe(false);
    expect(readAverageValue('sleep-hours', '7,5')).toEqual({ok: true, value: 7.5});
  });
  it('steps at most 100,000 a day, water at most 10,000 mL a day', () => {
    expect(readAverageValue('steps', '99999999', true).ok).toBe(false);
    expect(readAverageValue('steps', '8000', true)).toEqual({ok: true, value: 8000});
    expect(readAverageValue('water-ml', '12000').ok).toBe(false);
  });
  it('a target is above 0; a day may be 0', () => {
    expect(readAverageValue('custom', '0', true)).toEqual({ok: false, error: 'Choose a target above zero.'});
    expect(readAverageValue('custom', '0')).toEqual({ok: true, value: 0});
    expect(readAverageValue('custom', '')).toEqual({ok: false, error: 'Write a number, zero or more.'});
  });
});
