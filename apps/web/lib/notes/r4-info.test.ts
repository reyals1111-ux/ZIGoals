import {describe, expect, test} from 'vitest';
import {countCharacters, countWords, readMinutes} from './table';

/** Session AV lane 2 (r4-notes; LEDGER #311, Bear's info panel): words, characters and minutes to read. */
describe('note info', () => {
  test('words count letters and digits, not marks; characters count what is written', () => {
    expect(countWords('# Plan\n\n- [ ] pack 2 bags — then go!')).toBe(6);
    expect(countWords('Fictional words.\n\n(SHOWCASE DATA)')).toBe(2);
    expect(countCharacters('Héllo 👋')).toBe(7);
    expect(countCharacters('Ab\n\n(SHOWCASE DATA)')).toBe(2);
  });
  test('minutes to read are an estimate at 230 words a minute, at least one', () => {
    expect(readMinutes(0)).toBe(1); expect(readMinutes(230)).toBe(1); expect(readMinutes(460)).toBe(2); expect(readMinutes(1000)).toBe(4);
  });
});
