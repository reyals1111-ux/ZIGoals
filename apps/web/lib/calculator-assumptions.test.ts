import {expect, test} from 'vitest';
import {assumptionsText} from '../components/calculator/calculator';
import {DEFAULT_INPUT} from './compound/engine';

// Session AH (TR14, B-021, N-029): every assumption behind a result, in words beside it.
test('the assumptions name every input, raises and inflation included', () => {
  const text = assumptionsText({...DEFAULT_INPUT, increasePercent: 3, inflationPercent: 2.5, months: 6});
  for (const part of ['to start', 'every month', 'at the end of each period', 'raised 3', '5 % yearly return', 'added every month', '20 years 6 months', '2.5 % inflation', 'no fees or taxes']) expect(text).toContain(part);
  expect(assumptionsText(DEFAULT_INPUT)).toContain('never raised');
  expect(assumptionsText(DEFAULT_INPUT)).toContain('no inflation');
});
