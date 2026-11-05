import {describe, expect, it} from 'vitest';
import {readStepperValue} from './stepper-value';
import {validateValue} from '../limits/plausibility';

/** Session AL third pass (PRIMITIVES 3d, P-LS-20, LS-057): the Checklist's stepper reads numbers as every form does. */
describe('readStepperValue', () => {
  const water = {min: 1, max: 5_000, unit: 'ml'}, lb = {min: 45, max: 880, unit: 'lb'}, pages = {min: 1, max: 100_000, unit: 'pages'};
  it('reads a decimal comma and a plain number', () => {
    expect(readStepperValue('250', water)).toEqual({ok: true, value: 250, error: null});
    expect(readStepperValue('0,5', {min: 0.5, max: 100, unit: 'km'})).toEqual({ok: true, value: 0.5, error: null});
  });
  it('LS-057: a negative amount is refused with the shared sentence, never logged', () => {
    expect(readStepperValue('-250', water)).toMatchObject({ok: false, error: 'Enter a number that is not negative.'});
  });
  it('an empty field and an ambiguous grouping are asked about, never guessed', () => {
    expect(readStepperValue('', water).error).toBe('Enter a number.');
    expect(readStepperValue('1,234', water).ok).toBe(false);
  });
  it('the dot\'s own range keeps its own sentence', () => {
    expect(readStepperValue('6000', water).error).toBe('Choose 1 to 5,000 ml.');
    expect(readStepperValue('0', pages).error).toBe('Choose 1 to 100,000 pages.');
  });
  it('a health unit also passes the limits table (its decimals): what the stepper takes, the store takes', () => {
    expect(readStepperValue('70.123', {min: 20, max: 400, unit: 'kg'}).error).toBe('Use at most 2 decimal places.');
    for (const n of [45, 300, 880]) expect(validateValue('weight', String(n), 'lb').ok, `${n} lb`).toBe(true);
    expect(readStepperValue('45', lb).ok).toBe(true);
  });
  it('a habit\'s own unit keeps the dot\'s range only', () => {
    expect(readStepperValue('12.5', pages)).toEqual({ok: true, value: 12.5, error: null});
  });
});
