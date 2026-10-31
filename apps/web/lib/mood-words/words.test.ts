import {describe, expect, test} from 'vitest';
import {ENERGY, emptyEnergy, energySchema, rateEnergy} from '../energy/schema';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {TONE_FORBIDDEN} from '../ai/local-answers/words';
import {FORBIDDEN} from '../checkin/checkin';
import {MAX_MOOD_WORD_DAYS} from './schema';
import {QUADRANTS, clearFeeling, feelingOn, nextStepFor, nextStepLink, quadrantOf, quadrantOfWord, setFeeling, walkHabit} from './words';

const AT = '2026-10-31T08:00:00.000Z';
describe('mood words (Session AK lane S, item 6)', () => {
  test('four quadrants of twelve distinct, plain words', () => {
    expect(QUADRANTS).toHaveLength(4);
    const all = QUADRANTS.flatMap(q => q.words);
    for (const q of QUADRANTS) expect(q.words).toHaveLength(12);
    expect(new Set(all).size).toBe(48);
    for (const w of all) {
      expect(TONE_FORBIDDEN.test(w), w).toBe(false);
      expect(FORBIDDEN.en.some(f => w.includes(f)), w).toBe(false);
      expect(w.length).toBeLessThanOrEqual(32);
    }
    expect(quadrantOf('low', 'pleasant').words).toContain('calm');
  });
  test('only unpleasant words offer one next step, and each opens an existing route', () => {
    for (const w of QUADRANTS.filter(q => q.pleasantness === 'pleasant').flatMap(q => q.words)) expect(nextStepFor(w)).toBeNull();
    expect(nextStepFor('stressed')).toBe('breathe');
    expect(nextStepFor('sad')).toBe('write');
    expect(nextStepFor('restless')).toBe('walk');
    expect(nextStepFor('not a word')).toBeNull();
    expect(nextStepLink('breathe')).toEqual({label: 'Breathe for a minute', href: '/app/health?view=meditation', fullLoad: true});
    expect(nextStepLink('walk', 'h1').href).toBe('/app/habits#habit-h1');
    expect(nextStepLink('walk').href).toBe('/app/habits?add=habit');
    expect(nextStepLink('write').href).toBe('/app/journal#journal-write');
    expect(walkHabit([{id: 'a', title: 'Read'}, {id: 'b', title: 'Evening walk'}])?.id).toBe('b');
    expect(walkHabit([{id: 'a', title: 'Sidewalks'}])).toBeUndefined();
  });
  test('stored in the energy record\'s optional `words`, beside a rating, and kept when energy is rated again', () => {
    let r = setFeeling(emptyEnergy(), '2026-10-31', 'calm', AT);
    expect(feelingOn(r, '2026-10-31')).toEqual({energy: 'low', pleasantness: 'pleasant', word: 'calm', at: AT});
    r = rateEnergy(r, '2026-10-31', 4, AT);
    expect(feelingOn(r, '2026-10-31')?.word).toBe('calm');
    expect(energySchema.parse(r)).toEqual(r);
    r = setFeeling(r, '2026-10-31', 'tired', AT);
    expect(quadrantOfWord(feelingOn(r, '2026-10-31')!.word)?.id).toBe('low-unpleasant');
    expect(clearFeeling(r, '2026-10-31').words).toEqual({});
    expect(() => setFeeling(r, '2026-10-31', 'invented', AT)).toThrow();
  });
  test('an older energy record (no `words`) still reads; an unknown word written later still reads', () => {
    expect(energySchema.parse({version: 1, days: {'2026-10-27': {energy: 4, at: AT}}})).toEqual({version: 1, days: {'2026-10-27': {energy: 4, at: AT}}});
    expect(energySchema.safeParse({version: 1, days: {}, words: {'2026-10-27': {energy: 'low', pleasantness: 'pleasant', word: 'serene', at: AT}}}).success).toBe(true);
    // A day in a shape this build does not know: the record still reads (never unreadable), and that day has no word here.
    const later = energySchema.safeParse({version: 1, days: {}, words: {'2026-10-27': {energy: 'middle', pleasantness: 'pleasant', word: 'calm', at: AT}}});
    expect(later.success).toBe(true); expect(feelingOn(later.data!, '2026-10-27')).toBeUndefined();
  });
  test('bounded: the oldest words drop past the cap', () => {
    let r = emptyEnergy();
    const words: Record<string, {energy: 'low'; pleasantness: 'pleasant'; word: string; at: string}> = {};
    for (let i = 0; i < MAX_MOOD_WORD_DAYS; i++) words[new Date(Date.UTC(2020, 0, 1) + i * 86_400_000).toISOString().slice(0, 10)] = {energy: 'low', pleasantness: 'pleasant', word: 'calm', at: AT};
    r = {...r, words};
    r = setFeeling(r, '2030-01-01', 'calm', AT);
    expect(Object.keys(r.words!)).toHaveLength(MAX_MOOD_WORD_DAYS);
    expect(r.words!['2020-01-01']).toBeUndefined();
  });
  test('through the device record: a write validates and keeps the days', () => {
    const m = new Map<string, string>(), s = {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v)};
    updateDeviceRecord(s, ENERGY, c => rateEnergy(c, '2026-10-30', 2, AT));
    updateDeviceRecord(s, ENERGY, c => setFeeling(c, '2026-10-30', 'drained', AT));
    expect(readDeviceRecord(s, ENERGY).data).toMatchObject({days: {'2026-10-30': {energy: 2}}, words: {'2026-10-30': {word: 'drained'}}});
  });
});

test('a word another build wrote in a shape this build does not know never makes the energy record unreadable, and is kept', () => {
  const raw = {version: 1, days: {'2026-10-30': {energy: 3, at: AT}}, words: {'2026-10-30': {energy: 'medium', pleasantness: 'pleasant', word: 'a-word-from-a-later-build-that-is-very-long', at: AT}, '2026-10-29': {energy: 'low', pleasantness: 'pleasant', word: 'calm', at: AT}}};
  const read = energySchema.safeParse(raw);
  expect(read.success).toBe(true);
  expect(feelingOn(read.data!, '2026-10-30')).toBeUndefined();
  expect(feelingOn(read.data!, '2026-10-29')?.word).toBe('calm');
  const next = rateEnergy(read.data!, '2026-10-31', 4, AT);
  expect((next.words as Record<string, {word: string}>)['2026-10-30']!.word).toBe('a-word-from-a-later-build-that-is-very-long');
});
