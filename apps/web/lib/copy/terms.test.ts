import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {activeCount, doneOf, sentenceStart, termFor} from './terms';

describe('one capitalisation rule for goal and habit (R31)', () => {
  it('builds counts in lowercase, singular for one', () => {
    expect(termFor('goal')).toBe('goal');
    expect(termFor('habit', 0)).toBe('habits');
    expect(activeCount('goal', 1)).toBe('1 active goal');
    expect(activeCount('goal', 4)).toBe('4 active goals');
    expect(doneOf('habit', 0, 0)).toBe('0 of 0 habits complete');
    expect(doneOf('habit', 1, 1)).toBe('1 of 1 habit complete');
    expect(sentenceStart('goals')).toBe('Goals');
    expect(sentenceStart('')).toBe('');
  });
  it('the shared copy on Today and in the widgets says goal and habit in lowercase mid-sentence', () => {
    const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
    for (const file of ['../../components/platform/today-intelligence.tsx', '../dashboard-metrics.ts', '../../components/bottom-sections.tsx', '../dashboard-widget-registry.ts']) {
      const text = read(file);
      expect(text, file).not.toMatch(/No active Goal|active Goals\b|\d+ Habits complete\b|} Habits complete\b|No Habits scheduled|across Habits|in a Goal’s plan|Add one in a Goal/);
    }
  });
});
