import {describe, expect, test} from 'vitest';
import {collectEverything} from '../export/everything';
import {nextValue, planParts} from '../restore/plan';
import {ENERGY_KEY, energySchema} from '../energy/schema';
import {moodWordDaySchema, wordsOf} from './schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #232; TIER 3 (stored formats), additive): a strength on the day's feeling word and
 * up to two more words, each with a strength, on the loose day of `zigoals:energy:v1` `words`. A day written before reads
 * as before (the one word); an unreadable new value is dropped, never the day; Export everything → erase → Restore keeps
 * every new field.
 */
const AT = '2026-11-20T08:00:00.000Z';
const DAY = {energy: 'low', pleasantness: 'pleasant', word: 'calm', at: AT, strength: 'quite', more: [{energy: 'low', pleasantness: 'unpleasant', word: 'tired', strength: 'little'}, {energy: 'high', pleasantness: 'pleasant', word: 'hopeful'}]};
const RECORD = {version: 1, days: {'2026-11-20': {energy: 3, at: AT}}, words: {'2026-11-20': DAY}};

describe('feeling words with a strength', () => {
  test('a day written before reads as before', () => {
    const old = moodWordDaySchema.parse({energy: 'low', pleasantness: 'pleasant', word: 'calm', at: AT});
    expect(old.strength).toBeUndefined();
    expect(old.more).toBeUndefined();
  });
  test('the new fields read as written; an unreadable one is dropped, the word kept', () => {
    expect(wordsOf(RECORD)['2026-11-20']).toEqual(DAY);
    const odd = moodWordDaySchema.parse({...DAY, strength: 'enormous', more: [{word: ''}, DAY.more[0], DAY.more[1], {...DAY.more[0], word: 'third'}]});
    expect(odd.word).toBe('calm');
    expect(odd.strength).toBeUndefined();
    expect(odd.more!.map(m => m.word)).toEqual(['tired', 'hopeful']);
    expect(moodWordDaySchema.parse({...DAY, more: 'x'}).more).toBeUndefined();
  });
  test('Export everything → erase → Restore keeps them', () => {
    const collected = collectEverything({[ENERGY_KEY]: JSON.stringify(energySchema.parse(RECORD))}, {now: new Date(AT), version: '0.1.0', commit: 'a'.repeat(40), localSimulation: null});
    const part = planParts(JSON.parse(JSON.stringify(collected.json))).find(p => p.kind === 'device' && p.key === ENERGY_KEY);
    expect(part).toBeDefined();
    const back = nextValue(part!, 'replace', undefined);
    expect('value' in back && wordsOf(energySchema.parse(back.value))['2026-11-20']).toEqual(DAY);
  });
});
