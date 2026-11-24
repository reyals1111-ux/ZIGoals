import {describe, expect, test} from 'vitest';
import {emptyEnergy, energySchema} from '../energy/schema';
import {setOwnFeeling, setOwnWord} from '../checkin-extras/rule';
import {addMoreWord, feelingsLine, feelingsOn, keepMore, removeMoreWord, setStrength} from './more';
import {clearFeeling, setFeeling} from './words';
import {wordsOf} from './schema';

/** Session AV lane 2 (bodymind-r2; LEDGER #232, Moodnotes' feelings with a strength), pure. */
const DAY = '2026-11-20', AT = '2026-11-20T09:00:00.000Z';
describe('up to three feeling words a day, each with a strength', () => {
  test('the day\'s word keeps its place; a strength and two more words are added; older readers still read the word', () => {
    let r = setFeeling(emptyEnergy(), DAY, 'calm', AT);
    r = setStrength(r, DAY, 'calm', 'quite');
    r = addMoreWord(r, DAY, 'tired', 'little');
    r = addMoreWord(r, DAY, 'hopeful');
    expect(feelingsOn(r, DAY)).toEqual([{word: 'calm', strength: 'quite', main: true}, {word: 'tired', strength: 'little', main: false}, {word: 'hopeful', main: false}]);
    expect(feelingsLine(feelingsOn(r, DAY))).toBe('calm (quite) · tired (a little) · hopeful');
    expect(feelingsLine(feelingsOn(r, DAY), 'nl')).toBe('calm (best wel) · tired (een beetje) · hopeful');
    expect(wordsOf(r)[DAY]!.word).toBe('calm');
    expect(energySchema.parse(r)).toEqual(r);
    expect(() => addMoreWord(r, DAY, 'proud')).toThrow('Up to 3 words a day');
    expect(() => addMoreWord(r, DAY, 'tired')).toThrow('already one of today');
    r = setStrength(r, DAY, 'hopeful', 'very');
    r = setStrength(r, DAY, 'calm', null);
    expect(feelingsOn(r, DAY).map(f => f.strength)).toEqual([undefined, 'little', 'very']);
    r = removeMoreWord(r, DAY, 'tired');
    expect(feelingsOn(r, DAY).map(f => f.word)).toEqual(['calm', 'hopeful']);
  });
  test('words must be shown words or your own; a day needs its word first', () => {
    expect(() => addMoreWord(emptyEnergy(), DAY, 'tired')).toThrow('day’s word first');
    const r = setFeeling(emptyEnergy(), DAY, 'calm', AT);
    expect(() => addMoreWord(r, DAY, 'invented')).toThrow('Choose one of the words shown.');
    const own = setOwnWord(r, 'low-pleasant', 'mellow', true);
    expect(feelingsOn(addMoreWord(own, DAY, 'mellow', 'very'), DAY).at(-1)).toEqual({word: 'mellow', strength: 'very', main: false});
  });
  test('changing the day\'s word keeps the other words (not the new one twice); removing the word clears the day', () => {
    let r = addMoreWord(addMoreWord(setFeeling(emptyEnergy(), DAY, 'calm', AT), DAY, 'tired'), DAY, 'hopeful');
    r = keepMore(r, setFeeling(r, DAY, 'tired', AT), DAY);
    expect(feelingsOn(r, DAY).map(f => [f.word, f.main])).toEqual([['tired', true], ['hopeful', false]]);
    const own = setOwnWord(r, 'low-pleasant', 'mellow', true);
    r = keepMore(own, setOwnFeeling(own, DAY, 'mellow', 'low-pleasant', AT), DAY);
    expect(feelingsOn(r, DAY).map(f => f.word)).toEqual(['mellow', 'hopeful']);
    expect((r.words![DAY] as {own?: boolean}).own).toBe(true); // the own word's mark is kept
    expect(clearFeeling(r, DAY).words?.[DAY]).toBeUndefined();
  });
});
