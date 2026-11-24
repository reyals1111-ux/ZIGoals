import {describe, expect, test} from 'vitest';
import {hasMarks} from './has-marks';
import {markLines, tickEntry, wrapWords} from './marks';
import {journalSchema} from './schema';
import {showcaseJournal} from './showcase';
import {undoEntryChange, versionsOf} from './versions';
import {parseBlocks, parseInline} from '../ai/safe-render';

/**
 * Session AV lane 2 (r4-mind; LEDGER #308, Journey's formatting and checklists): which entries are drawn with their
 * Markdown, the format bar's edits, ticking a box in an entry (an earlier version kept, Undo), and the parser's line
 * breaks switched on only with the notes marks — never for ZIGi's replies.
 */
const AT = '2026-11-20T09:00:00.000Z';
describe('which entries carry marks', () => {
  test('headings, lists, tick boxes, quotes, bold, italics, highlights and code', () => {
    for (const t of ['## Morning', '- milk', '- [ ] call Anna', '1. first', '> a line I liked', 'a **good** day', 'a *quiet* day', 'an _odd_ day', 'it was ==bright==', 'ran `5k`']) expect(hasMarks(t), t).toBe(true);
  });
  test('plain entries keep their plain paragraph: template headings, stars in passing, maths', () => {
    for (const t of ['How the run went:\nA fictional easy 6 km.', 'Dear future me,', '5 * 3 = 15 and 2 * 4', 'snake_case_words in a sentence', 'A good thing today: tea', '#gratitude day', '-5 degrees outside']) expect(hasMarks(t), t).toBe(false);
  });
  test('no Showcase entry changes how it is drawn', () => {
    for (const e of showcaseJournal('2026-11-22').entries) expect(hasMarks(e.text), e.text).toBe(false);
  });
});
describe('the format bar', () => {
  test('bold and italics round the chosen words, spaces outside; nothing chosen gives words to type over', () => {
    expect(wrapWords('a good day', 2, 7, 'bold')).toEqual({text: 'a **good** day', start: 4, end: 8});
    expect(wrapWords('a good day', 1, 7, 'italic')).toEqual({text: 'a *good* day', start: 3, end: 7});
    expect(wrapWords('x', 1, 1, 'bold')).toEqual({text: 'x**bold words**', start: 3, end: 13});
  });
  test('heading, list and quote mark each chosen line; a second press takes the mark off; another mark is replaced', () => {
    expect(markLines('one\ntwo\nthree', 4, 4, 'heading').text).toBe('one\n## two\nthree');
    expect(markLines('one\ntwo\nthree', 0, 7, 'list').text).toBe('- one\n- two\nthree');
    expect(markLines('- one\n- two', 0, 11, 'list').text).toBe('one\ntwo');
    expect(markLines('## two', 3, 3, 'quote').text).toBe('> two');
    expect(markLines('- [ ] a box', 0, 0, 'list').text).toBe('- a box');
  });
});
describe('ticking a box in an entry', () => {
  const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [{id: 'e1', date: '2026-11-20', text: 'Packing:\n- [ ] passport\n- [x] tickets', createdAt: AT}]});
  test('writes - [x] into that line, keeps the words it had as an earlier version, and Undo puts both back', () => {
    const out = tickEntry(journal, 'e1', 1, true, '2026-11-21T10:00:00.000Z');
    expect(out.journal.entries[0]!.text).toBe('Packing:\n- [x] passport\n- [x] tickets');
    expect(out.journal.entries[0]!.updatedAt).toBe('2026-11-21T10:00:00.000Z');
    expect(versionsOf(out.journal, 'e1').map(v => v.text)).toEqual(['Packing:\n- [ ] passport\n- [x] tickets']);
    const back = undoEntryChange(out.journal, out.undo!);
    expect(back.entries[0]).toEqual(journal.entries[0]);
    expect(back.versions ?? []).toEqual([]);
  });
  test('a line that is no longer a tick box says so and changes nothing', () => {
    expect(() => tickEntry(journal, 'e1', 0, true, AT)).toThrow('That tick box has changed');
    expect(() => tickEntry(journal, 'gone', 1, true, AT)).toThrow('no longer on this device');
  });
});
describe('the parser: line breaks only with the notes marks; ZIGi’s replies unchanged', () => {
  test('a journal paragraph keeps its lines', () => {
    expect(parseBlocks('How it went:\n**well**', {notes: true, breaks: true})).toEqual([{type: 'paragraph', children: [{type: 'text', text: 'How it went:\n'}, {type: 'strong', children: [{type: 'text', text: 'well'}]}]}]);
  });
  test('without notes, breaks is ignored and the old tree comes back', () => {
    const reply = 'One line\nand another ==not a mark==\n\n- [ ] not a box';
    expect(parseBlocks(reply, {breaks: true})).toEqual(parseBlocks(reply));
    expect(parseBlocks(reply)).toEqual([{type: 'paragraph', children: parseInline('One line and another ==not a mark==')}, {type: 'list', ordered: false, items: [parseInline('[ ] not a box')]}]);
  });
});
