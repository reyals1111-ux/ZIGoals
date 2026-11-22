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
  test('every line ends at a full stop, and an excerpt marked "…" in English is marked in Dutch', () => {
    for (const q of STOIC_QUOTES) {
      expect(q.en, q.id).toMatch(/[.?]$/);
      expect(q.en.startsWith('…'), q.id).toBe(q.nl.startsWith('…'));
    }
  });
});
