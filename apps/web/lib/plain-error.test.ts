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

// Session AH Part 5 (VA1, C1, C2): a schema issue becomes a short sentence when one fits.
describe('issue sentences', () => {
  const fallback = 'Check the form.';
  it('lengths, empty fields and number bounds read as sentences; the app\'s own refine messages stay', () => {
    expect(plainErrorMessage(z.object({title: z.string().max(100)}).safeParse({title: 'x'.repeat(101)}).error, fallback)).toBe('Use at most 100 characters.');
    expect(plainErrorMessage(z.string().min(1).safeParse('').error, fallback)).toBe('This can’t be empty.');
    expect(plainErrorMessage(z.number().positive().safeParse(0).error, fallback)).toBe('Enter an amount above zero.');
    expect(plainErrorMessage(z.number().max(400).safeParse(720).error, fallback)).toBe('Enter 400 or less.');
    expect(plainErrorMessage(z.string().refine(v => v === 'a', 'Choose a listed currency.').safeParse('b').error, fallback)).toBe('Choose a listed currency.');
    expect(plainErrorMessage(z.object({a: z.string()}).safeParse({a: 1}).error, fallback)).toBe(fallback);
  });
  it('a record from a newer build names its schemaVersion plainly', () => {
    const newer = z.object({schemaVersion: z.literal(1)}).safeParse({schemaVersion: 9}).error;
    expect(plainErrorMessage(newer, 'fallback')).toMatch(/^This file was made by a newer version of ZIGoals \(its schemaVersion/);
    const versions = z.union([z.object({schemaVersion: z.literal(1), a: z.string()}), z.object({schemaVersion: z.literal(2), a: z.string()})]);
    expect(plainErrorMessage(versions.safeParse({schemaVersion: 999, a: 'x'}).error, 'fallback')).toMatch(/newer version of ZIGoals/);
    // A known version with another broken field is not called newer.
    expect(plainErrorMessage(versions.safeParse({schemaVersion: 1, a: 3}).error, 'fallback')).not.toMatch(/newer version/);
  });
});
