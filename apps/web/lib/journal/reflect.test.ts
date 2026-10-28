import {describe, expect, test} from 'vitest';
import {followUpFor, patternLine, patterns, themesOf} from './reflect';
import {journalSchema} from './schema';
import {showcaseJournal} from './showcase';
import {showcaseEnergy} from '../energy/showcase';

describe('journal reflection (feature 6)', () => {
  test('one question from what the entry says, in English and Dutch', () => {
    expect(followUpFor({text: 'So tired, slept badly'}, [], 'en')).toBe('What helped you rest the last time you slept well?');
    expect(followUpFor({text: 'Gestrest door het werk'}, [], 'nl')).toBe('Van welk deel van je werk vandaag wil je meer, en van welk minder?');
    expect(followUpFor({text: 'Nothing special today'}, [], 'en')).toMatch(/a year from now/);
  });
  test('never the same question twice in a row', () => {
    const last = {id: 'a', date: '2026-10-27', text: 'tired', createdAt: '2026-10-27T21:00:00.000Z', followUp: {question: 'What helped you rest the last time you slept well?', from: 'device' as const}};
    expect(followUpFor({text: 'tired again'}, [last], 'en')).not.toBe(last.followUp.question);
  });
  test('themes are read in both languages', () => expect(themesOf('Dinner with friends after the gym, dankbaar')).toEqual(['gratitude', 'people', 'exercise']));
  test('patterns: counts and energy on and off a theme, never a diagnosis', () => {
    const j = showcaseJournal('2026-10-28');
    expect(journalSchema.safeParse(j).success).toBe(true);
    const sleep = patterns(j, showcaseEnergy('2026-10-28')).find(p => p.theme === 'sleep')!;
    expect(sleep.entries).toBeGreaterThanOrEqual(3);
    expect(sleep.energy!).toBeLessThan(sleep.energyElse!);
    expect(patternLine(sleep, 'en')).toMatch(/^You wrote about sleep and tiredness in \d+ of your last 10 entries\. Your energy on those days: [\d.]+ of 5 on average \(other days [\d.]+\)\.$/);
  });
});
