import {describe, expect, test} from 'vitest';
import {STOIC_QUOTES, WRITERS, quoteById, quoteEntry, quoteOfTheDay, quoteSource} from './quotes';
import {hasVisibleText} from '../visible-text';
import {TONE_FORBIDDEN} from '../ai/local-answers/words';

/** Session AV lane 2 (r3-notes; LEDGER #277, Stoic's quotes): a quote of the day from public-domain translations, EN and NL. */
describe('the Stoic quotes', () => {
  test('three writers, each with ten or more lines, ids unique, both languages written', () => {
    const per = (w: string) => STOIC_QUOTES.filter(q => q.writer === w).length;
    expect([per('marcus'), per('seneca'), per('epictetus')].every(n => n >= 10)).toBe(true);
    expect(new Set(STOIC_QUOTES.map(q => q.id)).size).toBe(STOIC_QUOTES.length);
    for (const q of STOIC_QUOTES) { expect(hasVisibleText(q.en)).toBe(true); expect(hasVisibleText(q.nl)).toBe(true); expect(q.nl).not.toBe(q.en); expect(q.id).toMatch(/^[a-z0-9-]{1,20}$/); }
    expect(WRITERS.marcus.translator).toBe('George Long, 1862');
  });
  test('calm words: nothing about death, illness or food; no loud punctuation in the Dutch lines', () => {
    for (const q of STOIC_QUOTES) {
      expect(q.en.toLowerCase()).not.toMatch(/\b(?:death|die|dies|dead|dying|disease|illness|food|eat)\b/);
      expect(q.nl.toLowerCase()).not.toMatch(/\b(?:dood|sterven|sterft|ziekte|ziek|eten)\b/);
      expect(q.nl).not.toMatch(/!/);
      expect(q.nl).not.toMatch(TONE_FORBIDDEN);
    }
  });
  test('one a day by the date alone; Another one steps on; it wraps round', () => {
    expect(quoteOfTheDay('2026-11-22')).toEqual(quoteOfTheDay('2026-11-22'));
    expect(quoteOfTheDay('2026-11-22', 1)).toEqual(quoteOfTheDay('2026-11-23'));
    expect(quoteOfTheDay('2026-11-22', STOIC_QUOTES.length)).toEqual(quoteOfTheDay('2026-11-22'));
    expect(new Set(Array.from({length: STOIC_QUOTES.length}, (_, i) => quoteOfTheDay('2026-11-22', i).id)).size).toBe(STOIC_QUOTES.length);
  });
  test('the writer named, and an entry that starts with the quote', () => {
    const q = quoteById('se-13')!;
    expect(quoteSource(q)).toBe('Seneca, Letters to Lucilius letter 13');
    expect(quoteSource(quoteById('ma-4-3')!, 'nl')).toBe('Marcus Aurelius, Overpeinzingen IV.3');
    expect(quoteEntry(quoteById('ep-12')!)).toBe('> Begin then from little things.\n> — Epictetus, Encheiridion 12\n\n');
    expect(quoteById('nope')).toBeNull();
  });
});
