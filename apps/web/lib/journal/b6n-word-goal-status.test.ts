import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {goalLine, goalReachedWords} from './word-goal';

/**
 * Review b6n B6N-7 (Minor, a11y; LEDGER #400): the word-goal line is not a live region (its count changes with every
 * word typed); a status says once that the goal is reached, its words the same while more is written, nothing before.
 */
describe('B6N-7 the goal is announced once, never per keystroke', () => {
  test('nothing to say until the goal is reached; then the same words whatever is typed next', () => {
    expect(goalReachedWords(goalLine(140, 200).met, 200)).toBe('');
    expect(goalReachedWords(goalLine(200, 200).met, 200)).toBe('Your 200 words for today are written.');
    expect(goalReachedWords(goalLine(231, 200).met, 200)).toBe(goalReachedWords(goalLine(200, 200).met, 200));
  });
  test('the counting line carries no live region', () => {
    const src = readFileSync(join(__dirname, '../../components/journal/journal-word-goal.tsx'), 'utf8');
    expect(src).not.toMatch(/aria-live/);
    expect(src).toMatch(/role="status">\{goalReachedWords\(line\.met, goal\)\}/);
  });
});
