import {describe, expect, it} from 'vitest';
import {DAILY_QUESTIONS, questionOfTheDay, withQuestion} from './daily';

describe('Session AV (F-PROMPT): one journal question a day', () => {
  it('is the same all day, changes the next day, and walks the whole list before repeating', () => {
    expect(questionOfTheDay('2026-11-20')).toBe(questionOfTheDay('2026-11-20'));
    expect(questionOfTheDay('2026-11-21')).not.toBe(questionOfTheDay('2026-11-20'));
    const seen = new Set(Array.from({length: DAILY_QUESTIONS.length}, (_, i) => questionOfTheDay('2026-11-01', i)));
    expect(seen.size).toBe(DAILY_QUESTIONS.length);
    expect(questionOfTheDay('2026-11-01', DAILY_QUESTIONS.length)).toBe(questionOfTheDay('2026-11-01'));
  });
  it('"Another question" steps on; a bad date still gives a question', () => {
    expect(questionOfTheDay('2026-11-20', 1)).toBe(questionOfTheDay('2026-11-21'));
    expect(DAILY_QUESTIONS).toContain(questionOfTheDay('not a date'));
  });
  it('using it puts the question first and keeps the words already written', () => {
    expect(withQuestion('', 'What made you smile today?')).toBe('What made you smile today?\n');
    expect(withQuestion('Coffee with Sam.', 'What made you smile today?')).toBe('What made you smile today?\nCoffee with Sam.');
  });
});
