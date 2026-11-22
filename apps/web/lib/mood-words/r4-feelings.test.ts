import {describe, expect, test} from 'vitest';
import {TONE_FORBIDDEN} from '../ai/local-answers/words';
import {FORBIDDEN} from '../checkin/checkin';
import {QUADRANTS, setFeeling} from './words';
import {MEANINGS, meaningOf, ownMeanings, setOwnMeaning} from './meanings';
import {STRATEGIES, strategiesFor} from './strategies';
import {BODY_AREAS, SENSATIONS, bodyCounts, keepBody, setSpot, spotsOn} from './body';
import {setOwnWord} from '../checkin-extras/rule';
import {emptyEnergy, energySchema, type Energy} from '../energy/schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #324, #325, #326, How We Feel): what each feeling word means (plain, never clinical)
 * and a line of the person's own for their own words; two or three choices per corner, each a tool or a one-line action;
 * and where a feeling is felt, up to three places a day, with the most common per corner over 90 days, as counts.
 */
const AT = '2026-11-20T09:00:00.000Z', DAY = '2026-11-20';
const CLINICAL = /\b(?:anxiety|anxious|depress\w*|disorder|symptom\w*|diagnos\w*|panic|trauma|clinical|therap\w*|treat\w*|should|must)\b/i;
describe('what a feeling word means', () => {
  test('one plain line for each of the 48 words, no clinical word, no advice', () => {
    const all = QUADRANTS.flatMap(q => q.words);
    expect(Object.keys(MEANINGS).sort()).toEqual([...all].sort());
    for (const w of all) {
      const m = meaningOf(w)!;
      expect(m.length, w).toBeGreaterThan(8);
      expect(m.length, w).toBeLessThanOrEqual(90);
      expect(TONE_FORBIDDEN.test(m), m).toBe(false);
      expect(FORBIDDEN.en.some(f => m.includes(f)), m).toBe(false);
      expect(CLINICAL.test(m), m).toBe(false);
    }
    expect(meaningOf('restless')).toBe('can’t settle; the body wants to move');
  });
  test('a line of your own for your own word: kept beside the rest of the check-in, cleared when empty', () => {
    const e = setOwnWord(emptyEnergy(), 'low-pleasant', 'snug', true);
    const with1 = setOwnMeaning(e, 'snug', '  wrapped up   warm ');
    expect(ownMeanings(with1)).toEqual({snug: 'wrapped up warm'});
    expect((with1 as {checkin?: {ownWords?: unknown}}).checkin?.ownWords).toEqual({'low-pleasant': ['snug']});
    expect(ownMeanings(setOwnMeaning(with1, 'snug', ''))).toEqual({});
    expect(() => setOwnMeaning(e, 'calm', 'mine')).toThrow('already has its line');
    expect(() => setOwnMeaning(e, 'snug', 'x'.repeat(121))).toThrow('Use up to 120 characters');
  });
});
describe('choices for a feeling', () => {
  test('two or three per corner; pleasant corners savour; nothing reads as advice', () => {
    for (const [q, list] of Object.entries(STRATEGIES)) {
      expect(list.length, q).toBeGreaterThanOrEqual(2);
      expect(list.length, q).toBeLessThanOrEqual(3);
      for (const s of list) { expect(!!s.href !== !!s.line, s.id).toBe(true); expect(CLINICAL.test(`${s.label} ${s.line ?? ''}`), s.id).toBe(false); }
    }
    expect(STRATEGIES['high-pleasant'].some(s => s.theme === 'savour')).toBe(true);
    expect(STRATEGIES['low-pleasant'].some(s => s.theme === 'savour')).toBe(true);
  });
  test('an unpleasant word’s one small step comes first, as before; a pleasant word gets savour choices; own words by their corner', () => {
    expect(strategiesFor('stressed').map(s => s.label)).toEqual(['Breathe for a minute', 'Check a thought', 'Step outside for a few minutes']);
    expect(strategiesFor('sad')[0]).toMatchObject({label: 'Write three lines', href: '/app/journal#journal-write'});
    expect(strategiesFor('restless', null, 'h1')[0]).toMatchObject({href: '/app/habits#habit-h1'});
    expect(strategiesFor('joyful').map(s => s.id)).toEqual(['savour', 'share', 'good-things']);
    expect(strategiesFor('snug', 'low-pleasant').map(s => s.id)).toEqual(['rest', 'good-things', 'savour']);
    expect(strategiesFor('snug')).toEqual([]);
    for (const w of QUADRANTS.flatMap(q => q.words)) expect(strategiesFor(w).length, w).toBe(3);
  });
});
describe('where you feel it', () => {
  const day = (r: Energy, d: string, word: string) => setFeeling(r, d, word, AT);
  test('up to three places a day, each with one word; a new word for the day keeps them; needs the day’s word', () => {
    let r = day(emptyEnergy(), DAY, 'tense');
    expect(() => setSpot(emptyEnergy(), DAY, 'chest', 'tight')).toThrow('Choose a feeling word first');
    r = setSpot(setSpot(setSpot(r, DAY, 'shoulders', 'tight'), DAY, 'jaw', 'tight'), DAY, 'chest', 'heavy');
    expect(spotsOn(r, DAY)).toEqual([{area: 'shoulders', feel: 'tight'}, {area: 'jaw', feel: 'tight'}, {area: 'chest', feel: 'heavy'}]);
    expect(() => setSpot(r, DAY, 'hands', 'warm')).toThrow('Up to 3 places');
    expect(spotsOn(setSpot(r, DAY, 'jaw', 'warm'), DAY)[2]).toEqual({area: 'jaw', feel: 'warm'});
    expect(spotsOn(setSpot(r, DAY, 'jaw', null), DAY)).toHaveLength(2);
    expect(spotsOn(keepBody(r, day(r, DAY, 'worried'), DAY), DAY)).toHaveLength(3);
    expect(energySchema.parse(r)).toBeTruthy();
    expect(BODY_AREAS).toHaveLength(8); expect(SENSATIONS).toHaveLength(5);
  });
  test('the most common place and word per corner over 90 days, as counts', () => {
    let r: Energy = emptyEnergy();
    for (const [d, w, area, feel] of [['2026-11-20', 'tense', 'shoulders', 'tight'], ['2026-11-19', 'stressed', 'shoulders', 'buzzing'], ['2026-11-18', 'nervous', 'stomach', 'buzzing'], ['2026-11-17', 'calm', 'chest', 'calm'], ['2026-07-01', 'tense', 'head', 'heavy']] as const) r = setSpot(day(r, d, w), d, area, feel);
    expect(bodyCounts(r, '2026-11-22')).toEqual([
      {quadrant: 'high-unpleasant', days: 3, area: {name: 'shoulders', count: 2}, feel: {name: 'buzzing', count: 2}},
      {quadrant: 'low-pleasant', days: 1, area: {name: 'chest', count: 1}, feel: {name: 'calm', count: 1}},
    ]);
    expect(bodyCounts(emptyEnergy(), '2026-11-22')).toEqual([]);
  });
});
