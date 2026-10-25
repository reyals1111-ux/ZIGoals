import {describe, expect, it} from 'vitest';
import * as z from 'zod';
import {plainErrorMessage} from './plain-error';

describe('plainErrorMessage (Session AH, A7/VA1)', () => {
  const fallback = 'This file is not a Goal-plan backup, or it is damaged. Nothing was changed.';
  it('a schema error becomes the plain fallback, never its JSON', () => {
    const parsed = z.object({goals: z.record(z.string(), z.object({name: z.string()}))}).safeParse({goals: {a: 1}});
    expect(plainErrorMessage(parsed.error, fallback)).toBe(fallback);
    expect(plainErrorMessage(Error(JSON.stringify(parsed.error!.issues)), fallback)).toBe(fallback);
  });
  it('engine messages and stacks become the fallback; the app\'s own sentences stay', () => {
    expect(plainErrorMessage(new TypeError("Cannot read properties of undefined (reading 'x')"), fallback)).toBe(fallback);
    expect(plainErrorMessage(Error('Goal plans changed. Review again.'), fallback)).toBe('Goal plans changed. Review again.');
    expect(plainErrorMessage('nothing useful\n    at foo (bar.js:1:1)', fallback)).toBe(fallback);
    expect(plainErrorMessage(undefined, fallback)).toBe(fallback);
  });
});
