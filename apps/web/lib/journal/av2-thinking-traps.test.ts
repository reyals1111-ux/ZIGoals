import {describe, expect, test} from 'vitest';
import {HEADINGS, possibleTraps, thoughtCheckStats, thoughtEntryText, THOUGHT_CHECK_ID, TRAPS} from './thinking-traps';

/** Session AV lane 2 (bodymind-r2; LEDGER #233, Moodnotes' thinking traps and thought checker), pure. */
describe('thinking traps', () => {
  test('about ten, each named with one plain line and a question, in English and Dutch; no clinical or treatment words', () => {
    expect(TRAPS.length).toBeGreaterThanOrEqual(10);
    expect(new Set(TRAPS.map(x => x.id)).size).toBe(TRAPS.length);
    for (const x of TRAPS) for (const lang of ['en', 'nl'] as const) {
      expect(x.name[lang].length, x.id).toBeLessThanOrEqual(30);
      expect(x.line[lang], x.id).toMatch(/\.$/);
      expect(x.ask[lang], x.id).toMatch(/\?$/);
      for (const text of [x.name[lang], x.line[lang], x.ask[lang]]) expect(text, x.id).not.toMatch(/\b(?:disorder|diagnos\w*|therapy|treatment|symptom|depress\w*|anxiety disorder|stoornis|therapie|behandeling|symptoom)\b/i);
    }
  });
  test('the checker points at words that often go with a trap; the person chooses', () => {
    expect(possibleTraps('')).toEqual([]);
    expect(possibleTraps('I always mess this up and I should have known')).toEqual(['always-never', 'shoulds']);
    expect(possibleTraps('Everyone thinks I am an idiot. It will be a disaster.')).toEqual(expect.arrayContaining(['worst-case', 'mind-reading', 'labelling']));
    expect(possibleTraps('Ik moet dit altijd alleen doen')).toEqual(['always-never', 'shoulds']);
    expect(possibleTraps('The meeting moved to Thursday.')).toEqual([]);
  });
  test('the entry: four headed parts in the chosen language; the thought is needed', () => {
    const c = {situation: 'Fictional: a message left on read.', thought: 'They must be angry with me.', traps: ['mind-reading', 'worst-case'], other: 'They may just be busy.'};
    expect(thoughtEntryText(c, 'en')).toBe('Thought check\nWhat happened: Fictional: a message left on read.\nThe thought: They must be angry with me.\nThinking traps I noticed: Mind reading, Expecting the worst\nAnother way to see it: They may just be busy.');
    expect(thoughtEntryText({...c, traps: [], other: ''}, 'nl')).toBe('Gedachtecheck\nWat er gebeurde: Fictional: a message left on read.\nDe gedachte: They must be angry with me.\nDenkvalkuilen die ik zag: geen\nEen andere kijk: —');
    expect(() => thoughtEntryText({...c, thought: '  '}, 'en')).toThrow('Write the thought first.');
  });
  test('counts thought checks and the traps named most, from either language', () => {
    const en = thoughtEntryText({situation: '', thought: 'x', traps: ['shoulds', 'always-never'], other: ''}, 'en'), nl = thoughtEntryText({situation: '', thought: 'y', traps: ['shoulds'], other: ''}, 'nl');
    expect(thoughtCheckStats([{template: THOUGHT_CHECK_ID, text: en}, {template: THOUGHT_CHECK_ID, text: nl}, {text: `${HEADINGS.en.traps}: Shoulds and musts`}])).toEqual({checks: 2, traps: [{id: 'shoulds', count: 2}, {id: 'always-never', count: 1}]});
  });
});
