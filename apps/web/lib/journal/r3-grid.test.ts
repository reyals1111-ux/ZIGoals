import {describe, expect, test} from 'vitest';
import {MANDALA_PLACES, gridOf, gridText} from './grid';
import {ALL_TEMPLATES, JOURNAL_TEMPLATES, MORE_TEMPLATES, TEMPLATE_IDS, onlyHeadings, startFrom, templateById, templateText} from '../journal-prompts/templates';
import {answersTo} from './prompt-answers';
import {journalSchema} from './schema';
import {hasVisibleText} from '../visible-text';
import {FORBIDDEN} from '../checkin/checkin';
import {TONE_FORBIDDEN} from '../ai/local-answers/words';

/** Session AV lane 2 (r3-notes; LEDGER #266, #269): the grid, the Mandala and the month and year look-backs. */
const mandala = templateById('mandala')!;
describe('the round-3 templates', () => {
  test('the eight stay as they were; three more follow, each in English and Dutch with as many headings', () => {
    expect(TEMPLATE_IDS).toHaveLength(8);
    expect(JOURNAL_TEMPLATES.map(t => t.id)).not.toContain('mandala');
    expect(MORE_TEMPLATES.map(t => t.id)).toEqual(['mandala', 'month-look-back', 'year-look-back']);
    expect(ALL_TEMPLATES).toHaveLength(11);
    for (const t of MORE_TEMPLATES) expect(t.headings.nl.length).toBe(t.headings.en.length);
    expect(mandala.headings.en).toHaveLength(9);
    expect(templateById('week-look-back')!.period).toBe('week');
    expect(templateById('month-look-back')!.period).toBe('month');
    expect(templateById('year-look-back')!.period).toBe('year');
  });
  test('the same word checks as the eight: visible, at most 60 characters, no forbidden or loud words', () => {
    for (const t of MORE_TEMPLATES) for (const lang of ['en', 'nl'] as const) for (const w of [t.title[lang], ...t.headings[lang]]) {
      expect(hasVisibleText(w)).toBe(true);
      expect(w.length).toBeLessThanOrEqual(60);
      for (const bad of FORBIDDEN[lang]) expect(w.toLowerCase()).not.toContain(bad);
      if (lang === 'en') expect(w).not.toMatch(TONE_FORBIDDEN);
      expect(w).not.toMatch(/!/);
    }
  });
  test('an untouched round-3 template is still only headings, and is swapped when another is picked', () => {
    expect(onlyHeadings(templateText(mandala, 'nl'))).toBe(true);
    expect(startFrom(templateText(mandala, 'en'), templateById('gratitude')!, 'en')).toBe(templateText(templateById('gratitude')!, 'en'));
  });
});
describe('a grid of cards', () => {
  test('boxes read from the text, the words above kept, and written back as text with headings', () => {
    const text = 'A fictional quiet day.\n\nMy theme, in the centre:\nRest\n\nMoney:\nSave a little\n';
    const g = gridOf(text, mandala);
    expect(g.prefix).toBe('A fictional quiet day.');
    expect(g.cells[0]).toBe('Rest'); expect(g.cells[3]).toBe('Save a little'); expect(g.cells[1]).toBe('');
    const back = gridText({...g, cells: g.cells.map((c, i) => i === 1 ? 'Walk daily' : c)}, mandala, 'en');
    expect(back.startsWith('A fictional quiet day.\n\nMy theme, in the centre:\nRest\n\nBody and health:\nWalk daily\n\nWork and learning:\n\nMoney:\nSave a little\n')).toBe(true);
    expect(gridOf(back, mandala).cells.slice(0, 4)).toEqual(['Rest', 'Walk daily', '', 'Save a little']);
  });
  test('an empty grid is exactly the template’s headings, so it is never saved empty', () => {
    expect(gridText({prefix: '', cells: []}, mandala, 'en')).toBe(templateText(mandala, 'en'));
    expect(onlyHeadings(gridText({prefix: '', cells: []}, mandala, 'nl'))).toBe(true);
  });
  test('a Dutch grid reads in either language, and Every answer to a prompt splits it', () => {
    const nl = gridText({prefix: '', cells: ['Rust', 'Wandelen']}, mandala, 'nl');
    expect(gridOf(nl, mandala).cells.slice(0, 2)).toEqual(['Rust', 'Wandelen']);
    const j = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [{id: 'm', date: '2026-11-20', text: nl, createdAt: '2026-11-20T20:00:00.000Z', template: 'mandala'}]});
    expect(answersTo(j, 'mandala')!.headings[0]!.answers[0]!.words).toBe('Rust');
  });
  test('the Mandala’s places: the centre in the middle, eight around it clockwise from the top left', () => {
    expect(MANDALA_PLACES[0]).toEqual([2, 2]);
    expect(new Set(MANDALA_PLACES.map(p => p.join(','))).size).toBe(9);
    expect(MANDALA_PLACES.slice(1)).toEqual([[1, 1], [1, 2], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [2, 1]]);
  });
});
