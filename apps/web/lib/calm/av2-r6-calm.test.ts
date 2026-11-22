import {describe, expect, test} from 'vitest';
import {GROUNDING, GROUNDING_WORDS, groundingLine} from './grounding';
import {HELP_LINE, HELP_NUMBERS} from './help-line';
import {addLowDayLine, emptyLowDay, LOW_DAY_MAX, lowDayLines, lowDaySchema, removeLowDayLine, restoreLowDayLine, setLowDayNote} from './low-day';
import {GUARD_REPLIES} from '../ai/safety-guard';

/** Session AV lane 2, round 6 (r6-body; LEDGER #414, #416): grounding, and the person's own "On a low day" page. */
const AT = new Date('2026-11-22T09:00:00.000Z');
describe('#414: five, four, three, two, one', () => {
  test('five senses, counting down, in English and Dutch', () => {
    expect(GROUNDING.map(s => s.count)).toEqual([5, 4, 3, 2, 1]);
    expect(GROUNDING.map(s => s.sense)).toEqual(['see', 'touch', 'hear', 'smell', 'taste']);
    expect(GROUNDING.every(s => s.en && s.nl)).toBe(true);
  });
  test('the journal line keeps only the words given; nothing written makes no line', () => {
    expect(groundingLine([['lamp', ' window ', ''], [], ['rain'], [], ['tea']])).toBe('Five, four, three, two, one — See: lamp, window · Hear: rain · Taste: tea');
    expect(groundingLine([['lamp']], 'nl')).toBe('Vijf, vier, drie, twee, één — Zien: lamp');
    expect(groundingLine([[], [], [], [], []])).toBe('');
  });
  test('no reading of the answers, no advice or clinical words', () => {
    const all = JSON.stringify([GROUNDING, GROUNDING_WORDS]).toLowerCase();
    for (const banned of ['anxiety', 'panic', 'symptom', 'therapy', 'diagnos', 'treat', 'disorder', 'score', 'angst', 'therapie']) expect(all).not.toContain(banned);
  });
});

describe('#416: on a low day', () => {
  test('the person’s own lines, added, removed and put back; a line of their own', () => {
    let r = addLowDayLine(addLowDayLine(emptyLowDay(), 'helps', ' A shower ', AT), 'helps', 'Tea by the window', AT);
    r = addLowDayLine(r, 'people', 'Sam', AT);
    expect(r).toMatchObject({helps: ['A shower', 'Tea by the window'], people: ['Sam'], updatedAt: AT.toISOString()});
    const gone = removeLowDayLine(r, 'helps', 'A shower', AT);
    expect(gone.helps).toEqual(['Tea by the window']);
    expect(restoreLowDayLine(gone, 'helps', 'A shower', 0, AT).helps).toEqual(['A shower', 'Tea by the window']);
    r = setLowDayNote(r, 'This passes.', AT);
    expect(lowDayLines(r)).toBe(4);
    expect('note' in setLowDayNote(r, '  ', AT)).toBe(false);
    expect(lowDaySchema.parse(r)).toEqual(r);
  });
  test('says a sentence for an empty line, a repeat and a full part', () => {
    const r = addLowDayLine(emptyLowDay(), 'later', 'The inbox', AT);
    expect(() => addLowDayLine(r, 'later', ' ', AT)).toThrow('Type a line first.');
    expect(() => addLowDayLine(r, 'later', 'the inbox', AT)).toThrow('“the inbox” is on your page already.');
    let full = emptyLowDay();
    for (let i = 0; i < LOW_DAY_MAX.people; i++) full = addLowDayLine(full, 'people', `Friend ${i}`, AT);
    expect(() => addLowDayLine(full, 'people', 'One more', AT)).toThrow(`Up to ${LOW_DAY_MAX.people} lines fit here. Remove one first.`);
  });
  test('the help line is the one the app already shows: every number is in ZIGi’s reply to distress words', () => {
    for (const lang of ['en', 'nl'] as const) for (const n of HELP_NUMBERS[lang]) { expect(HELP_LINE[lang]).toContain(n); expect(GUARD_REPLIES.distress[lang]).toContain(n); }
  });
});
