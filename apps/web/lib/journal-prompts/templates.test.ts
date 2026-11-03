import {describe, expect, test} from 'vitest';
import {hasVisibleText} from '../visible-text';
import {FORBIDDEN} from '../checkin/checkin';
import {TONE_FORBIDDEN} from '../ai/local-answers/words';
import {journalSchema} from '../journal/schema';
import {JOURNAL_TEMPLATES, TEMPLATE_IDS, onlyHeadings, startFrom, templateById, templateText} from './templates';

describe('Start from a prompt (BUILD list 2 #13)', () => {
  test('eight templates, each in English and Dutch with 2 to 4 headings', () => {
    expect(TEMPLATE_IDS).toEqual(['morning-intention', 'three-good-things', 'worry-next-step', 'gratitude', 'week-look-back', 'before-hard-talk', 'another-view', 'letter-future-you']);
    for (const t of JOURNAL_TEMPLATES) for (const lang of ['en', 'nl'] as const) {
      expect(t.headings[lang].length).toBeGreaterThanOrEqual(2);
      expect(t.headings[lang].length).toBeLessThanOrEqual(4);
      expect(t.headings[lang].length).toBe(t.headings.en.length);
    }
  });
  test('every template passes the visible-text and forbidden-word checks', () => {
    for (const t of JOURNAL_TEMPLATES) for (const lang of ['en', 'nl'] as const) {
      const words = [t.title[lang], ...t.headings[lang]];
      for (const w of words) {
        expect(hasVisibleText(w)).toBe(true);
        expect(w.length).toBeLessThanOrEqual(60);
        for (const bad of FORBIDDEN[lang]) expect(w.toLowerCase()).not.toContain(bad);
        if (lang === 'en') expect(w).not.toMatch(TONE_FORBIDDEN);
        expect(w).not.toMatch(/!/);
      }
    }
  });
  test('"Another way to see it" says it is a reflection, not therapy', () => {
    expect(templateById('another-view')!.note).toEqual({en: 'A reflection, not therapy.', nl: 'Een reflectie, geen therapie.'});
  });
  test('the headings fill an empty entry, are added after the person\'s own words, and replace untouched headings', () => {
    const t = templateById('three-good-things')!, g = templateById('gratitude')!;
    expect(templateText(t, 'en')).toBe('A good thing today:\n\nAnother good thing:\n\nOne more:\n');
    expect(startFrom('', t, 'en')).toBe(templateText(t, 'en'));
    expect(startFrom('Long day.  ', t, 'nl')).toBe(`Long day.\n\n${templateText(t, 'nl')}`);
    expect(startFrom(templateText(g, 'en'), t, 'en')).toBe(templateText(t, 'en'));
    expect(onlyHeadings(templateText(g, 'nl'))).toBe(true);
    expect(onlyHeadings(`${templateText(g, 'en')}My mother.`)).toBe(false);
  });
  test('the journal keeps the template id as an optional field; an unknown one is dropped, the entry kept', () => {
    const entry = {id: 'e1', date: '2026-11-01', text: 'Fine', createdAt: '2026-11-01T08:00:00.000Z'};
    const parsed = journalSchema.parse({version: 1, entries: [{...entry, template: 'gratitude'}, {...entry, id: 'e2', template: 'NOT VALID ID!'}]});
    expect(parsed.entries[0]!.template).toBe('gratitude');
    expect(parsed.entries[1]!.template).toBeUndefined();
    expect(parsed.entries).toHaveLength(2);
  });
});
