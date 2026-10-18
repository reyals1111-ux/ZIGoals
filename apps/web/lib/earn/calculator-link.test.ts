import {describe, expect, it} from 'vitest';
import {earnCalculatorPrefill} from './calculator-link';

/** Session AF (L1, ADR-028 H17): the calculator link's strict reader: exactly one of each key, a plain 0–100 rate. */
describe('the calculator link', () => {
  it.each([
    ['?from=earn&rate=5.06&label=illustration', '5.06'],
    ['?from=earn&rate=5.10&label=illustration', '5.1'],
    ['?label=illustration&rate=12&from=earn', '12'],
  ])('accepts %s', (search, want) => { expect(earnCalculatorPrefill(search)).toBe(want); });
  it.each(['', '?from=earn&rate=5.06', '?from=earns&rate=5.06&label=illustration', '?from=earn&rate=5.06&label=promise', '?from=earn&rate=0&label=illustration',
    '?from=earn&rate=101&label=illustration', '?from=earn&rate=-1&label=illustration', '?from=earn&rate=5.061&label=illustration', '?from=earn&rate=5e1&label=illustration',
    '?from=earn&rate=5.06&rate=6&label=illustration', '?from=earn&from=earn&rate=5&label=illustration', '?from=earn&rate=%3Cb%3E5&label=illustration'])('ignores %j', search => {
    expect(earnCalculatorPrefill(search)).toBeNull();
  });
});
