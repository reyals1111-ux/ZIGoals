import {describe, expect, test} from 'vitest';
import {gridOf, gridText} from './grid';
import {headingOf, splitAtHeadings} from './prompt-answers';
import {ALL_TEMPLATES, templateById, templateText, type JournalTemplate} from '../journal-prompts/templates';

/** Session AV lane 2 (review B3C-1): Write as a grid never loses a word. */
const letter = templateById('letter-future-you')!;
const altsOf = (t: JournalTemplate) => t.headings.en.map((h, i) => [h, t.headings.nl[i] ?? h]);
const isHeading = (line: string, t: JournalTemplate) => [...t.headings.en, ...t.headings.nl].some(h => h.trim().toLowerCase() === line.trim().toLowerCase());
/** Every word of the text, in order, leaving out the template's heading lines. */
const words = (text: string, t: JournalTemplate) => text.split('\n').filter(l => !isHeading(l, t)).join(' ').split(/\s+/).filter(Boolean)
  .flatMap(w => [...t.headings.en, ...t.headings.nl].some(h => h.split(/\s+/).includes(w)) ? [] : [w]);
/** The grid as the compose view keeps it, with one box changed, written back. */
const roundTrip = (text: string, t: JournalTemplate, box = 1, add = 'busy') => {
  const g = gridOf(text, t);
  return gridText({...g, cells: g.cells.map((c, i) => i === box ? (c ? `${c}\n${add}` : add) : c)}, t, 'en');
};

describe('the letter template in a grid', () => {
  test('words written on the line of "Dear future me," go into its box, the next line too', () => {
    const text = 'Dear future me, I hope you are well.\nI moved to Utrecht.\n\nRight now I am…\n\nWhat I hope for you:\n';
    const g = gridOf(text, letter);
    expect(g.prefix).toBe('');
    expect(g.cells[0]).toBe('I hope you are well.\nI moved to Utrecht.');
    const back = roundTrip(text, letter);
    expect(back).toContain('I hope you are well.');
    expect(back).toContain('I moved to Utrecht.');
    expect(back.startsWith('Dear future me,\nI hope you are well.\nI moved to Utrecht.\n\nRight now I am…\nbusy\n')).toBe(true);
  });
  test('the template as it starts, written under each heading, keeps every line', () => {
    const text = `${templateText(letter, 'en').replace('Dear future me,\n', 'Dear future me,\nI hope you are well.\n')}`;
    const back = roundTrip(text, letter, 2, 'peace');
    for (const w of ['I hope you are well.', 'peace']) expect(back).toContain(w);
  });
  test('lines before the first heading are kept above the grid, never dropped', () => {
    const text = 'A quiet Sunday.\nRain all day.\nDear future me, hello.\nRight now I am…\ntired\n';
    const g = gridOf(text, letter);
    expect(g.prefix).toBe('A quiet Sunday.\nRain all day.');
    expect(g.cells).toEqual(['hello.', 'tired', '']);
    expect(words(roundTrip(text, letter), letter)).toEqual(expect.arrayContaining(words(text, letter)));
  });
  test('Dutch: "Lieve toekomstige ik," with words on its line', () => {
    const g = gridOf('Lieve toekomstige ik, hoe gaat het?\nOp dit moment ben ik…\nmoe\n', letter);
    expect(g.cells.slice(0, 2)).toEqual(['hoe gaat het?', 'moe']);
  });
  test('a heading that ends in a letter counts only on its own line', () => {
    const own: JournalTemplate = {id: 'own-x', title: {en: 'Own', nl: 'Eigen'}, headings: {en: ['Today', 'Tomorrow'], nl: ['Vandaag', 'Morgen']}};
    expect(headingOf('Today was hard', altsOf(own))).toBeNull();
    expect(headingOf('today', altsOf(own))).toEqual({at: 0, rest: ''});
    const text = 'Today was hard.\nToday\nA walk.\nTomorrow\nRest.';
    const g = gridOf(text, own);
    expect(g.prefix).toBe('Today was hard.');
    expect(g.cells).toEqual(['A walk.', 'Rest.']);
    expect(roundTrip(text, own, 0, 'Tea.')).toContain('Today was hard.');
  });
  test('every template, any order of lines: no word is lost on the way through the grid', () => {
    const extra = ['Before anything.', 'More words here.', 'and on.', 'Last line.'];
    for (const t of ALL_TEMPLATES) for (const lang of ['en', 'nl'] as const) {
      const hs = t.headings[lang];
      // Words before the first heading, on a heading's line, under a heading, and a heading written twice.
      const text = [extra[0], `${hs[0]} ${extra[1]}`, extra[2], ...hs.slice(1).flatMap((h, i) => [h, `answer ${i}`]), hs[0], extra[3]].join('\n');
      const back = roundTrip(text, t);
      for (const w of words(text, t)) expect(words(back, t), `${t.id} ${lang}: ${w}`).toContain(w);
    }
  });
  test('Every answer to a prompt reads a letter written on the heading’s line', () => {
    expect(splitAtHeadings('Dear future me, hello.\nRight now I am… calm', altsOf(letter))).toEqual([{at: 0, words: 'hello.'}, {at: 1, words: 'calm'}]);
  });
});
