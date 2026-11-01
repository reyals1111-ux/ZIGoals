import {describe, expect, it} from 'vitest';
import {energyProgress} from './energy-progress';

describe('energyProgress (R2-14: name the missing input)', () => {
  it('names the weigh-ins when the days are met (the Showcase: 28 days, 7 weights)', () => {
    expect(energyProgress({loggedDays: 28, weights: 7})).toEqual({figure: '7 of 10 weigh-ins', note: '3 more weigh-ins to go', share: 0.7});
  });
  it('never says "28 of 14 days"', () => {
    const p = energyProgress({loggedDays: 28, weights: 7});
    expect(`${p.figure} ${p.note}`).not.toMatch(/28 of 14/);
  });
  it('names the days when the weigh-ins are met, singular for one', () => {
    expect(energyProgress({loggedDays: 13, weights: 12})).toEqual({figure: '13 of 14 days', note: '1 more logged day to go', share: 13 / 14});
  });
  it('names both when both are short; an empty journal starts at zero share', () => {
    expect(energyProgress({loggedDays: 0, weights: 0})).toEqual({figure: '0 of 10 weigh-ins', note: '10 more weigh-ins and 14 more logged days to go', share: 0});
    expect(energyProgress({loggedDays: 2, weights: 9}).note).toBe('1 more weigh-in and 12 more logged days to go');
  });
  it('both met but no trend yet: says the trend needs spread readings', () => {
    expect(energyProgress({loggedDays: 20, weights: 11})).toEqual({figure: 'Almost there', note: 'the weight trend needs readings spread over a few weeks', share: 1});
  });
  it('implausible logs show no figure', () => {
    expect(energyProgress({loggedDays: 20, weights: 11, implausible: true}).figure).toBe('Not shown');
  });
  it('bounds: negative counts read as zero', () => {
    expect(energyProgress({loggedDays: -3, weights: -1}).share).toBe(0);
  });
});
