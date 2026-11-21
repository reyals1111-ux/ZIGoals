import {describe, expect, it} from 'vitest';
import {goodThingsIn, goodThingsInMonth, goodThingsText} from './good-things';
import {showcaseJournal} from './showcase';
import {journalEntrySchema} from './schema';

/** Session AV (owner follow-up 1, F-GOOD-THINGS): three good things as one ordinary journal entry, counted per month. */
describe('Session AV (F-GOOD-THINGS)', () => {
  it('the text: each heading with its thing, the empty ones left out, in English or Dutch', () => {
    expect(goodThingsText(['Sun on my face', '', '  A call   with Sam '])).toBe('A good thing today: Sun on my face\nAnother good thing: A call with Sam');
    expect(goodThingsText(['Koffie met Ans', 'Wandeling'], 'nl')).toBe('Iets goeds vandaag: Koffie met Ans\nNog iets goeds: Wandeling');
    expect(goodThingsText(['', '', ''])).toBe('');
  });
  it('counts only entries from the template, and only lines that say something', () => {
    expect(goodThingsIn({template: 'three-good-things', text: 'A good thing today: tea\nAnother good thing:\nOne more: a nap'})).toBe(2);
    expect(goodThingsIn({template: 'three-good-things', text: 'Iets goeds vandaag: thee'})).toBe(1);
    expect(goodThingsIn({template: 'gratitude', text: 'A good thing today: tea'})).toBe(0);
  });
  it('per month: the things and the days', () => {
    const e = (date: string, text: string) => ({date, text, template: 'three-good-things'});
    expect(goodThingsInMonth([e('2026-11-02', 'A good thing today: a\nOne more: b'), e('2026-11-02', 'A good thing today: c'), e('2026-10-30', 'A good thing today: d')], '2026-11')).toEqual({things: 3, days: 1});
  });
  it('the Showcase has one, labelled, and it is a valid journal entry', () => {
    const entries = showcaseJournal('2026-11-23').entries, made = entries.filter(x => x.template === 'three-good-things');
    expect(made).toHaveLength(1);
    expect(made[0]!.text).toContain('SHOWCASE DATA');
    expect(goodThingsIn(made[0]!)).toBe(3);
    expect(journalEntrySchema.safeParse(made[0]).success).toBe(true);
  });
});
