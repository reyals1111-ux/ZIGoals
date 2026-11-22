import {describe, expect, test} from 'vitest';
import {STOIC_QUOTES, quoteById, quoteEntry} from './quotes';

/**
 * Session AV lane 2 (review B3C-7, B3C-8): the quotes as printed in the named public-domain translations, checked against
 * the Wikisource transcriptions (Long's Encheiridion 1877, section XXII; Gummere's Seneca, letter 1; Long's Meditations
 * 1862, VII.67). Pinned word for word.
 */
describe('the quotes as printed', () => {
  test('Encheiridion 22, Long: from inside the sentence to its full stop, marked with "…"', () => {
    expect(quoteById('ep-22')!.en).toBe('…hold on to the things which seem to you best as one appointed by God to this station.');
  });
  test('Seneca, letter 1, Gummere: whole sentences', () => {
    expect(quoteById('se-1-a')!.en).toBe('Therefore, Lucilius, do as you write me that you are doing: hold every hour in your grasp. Lay hold of to-day’s task, and you will not need to depend so much upon to-morrow’s.');
  });
  test('Meditations VII.67, Long: the original’s small letter, marked with "…"', () => {
    expect(quoteById('ma-7-67')!.en).toBe('…very little indeed is necessary for living a happy life.');
    expect(quoteEntry(quoteById('ma-7-67')!)).toBe('> …very little indeed is necessary for living a happy life.\n> — Marcus Aurelius, Meditations VII.67\n\n');
  });
  test('every line: a capital at a sentence start, or "…" and a small letter inside one; it ends at a full stop', () => {
    for (const q of STOIC_QUOTES) {
      expect(q.en, q.id).toMatch(/^(?:[A-Z]|…[a-z])/);
      expect(q.en, q.id).toMatch(/[.?]$/);
      expect(q.en.startsWith('…'), q.id).toBe(q.nl.startsWith('…'));
    }
  });
});
