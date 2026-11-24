import {describe, expect, test} from 'vitest';
import {HABIT_EXTRAS, emptyHabitExtras, habitExtrasSchema} from '../habits-extras/schema';
import {ENERGY, emptyEnergy, energySchema} from '../energy/schema';
import {identitiesOf} from './identity';
import {stepUpOf} from '../habits-v2/step-up';
import {spotsOn} from '../mood-words/body';
import {ownMeanings} from '../mood-words/meanings';
import {wordsOf} from '../mood-words/schema';
import {readCheckin} from '../checkin-extras/rule';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {nextValue, planParts, type PlannedPart} from '../restore/plan';

/**
 * Session AV lane 2 (r4-mind; TIER 3 (stored format), additive and optional): the habit extras' `identities` (LEDGER #323)
 * and `stepUp` (#327), a mood-word day's `body` (#326) and the check-in's `ownMeanings` (#324) — read on their own (an
 * odd value is left out where it is read, never failing the record), older records read as before, and Export everything
 * → erase → Restore gives each back.
 */
const AT = '2026-11-20T09:00:00.000Z', H = '11111111-1111-4111-8111-111111111111';
const EXTRAS = habitExtrasSchema.parse({version: 1,
  identities: [{id: 'id-mover01', text: 'I am someone who moves every day', habits: [H]}, {id: 'not an id', text: 'x'}],
  stepUp: {[H]: {small: 'one page', next: 'two pages', now: 'small', since: '2026-11-01', card: true}}});
const ENERGY_RECORD = energySchema.parse({version: 1, days: {'2026-11-20': {energy: 3, at: AT}},
  words: {'2026-11-20': {energy: 'high', pleasantness: 'unpleasant', word: 'tense', at: AT, body: [{area: 'shoulders', feel: 'tight'}, {area: 'nose', feel: 'tight'}]}},
  checkin: {ownWords: {'low-pleasant': ['snug']}, ownMeanings: {snug: 'wrapped up warm on the sofa'}}});
describe('the round-4 habit and feeling fields read on their own', () => {
  test('a full record keeps them; an item this build cannot read is left out where read', () => {
    expect(identitiesOf(EXTRAS)).toEqual([{id: 'id-mover01', text: 'I am someone who moves every day', habits: [H]}]);
    expect(stepUpOf(EXTRAS, H)).toEqual({small: 'one page', next: 'two pages', now: 'small', since: '2026-11-01', card: true});
    expect(spotsOn(ENERGY_RECORD, '2026-11-20')).toEqual([{area: 'shoulders', feel: 'tight'}]);
    expect(ownMeanings(ENERGY_RECORD)).toEqual({snug: 'wrapped up warm on the sofa'});
    expect(readCheckin(ENERGY_RECORD).ownWords['low-pleasant']).toEqual(['snug']);
  });
  test('odd values never fail the record', () => {
    const extras = habitExtrasSchema.parse({version: 1, identities: 'me', stepUp: 'up'});
    expect(identitiesOf(extras)).toEqual([]);
    expect(stepUpOf(extras, H)).toEqual({now: 'full', card: false});
    const energy = energySchema.parse({...ENERGY_RECORD, words: {'2026-11-20': {...ENERGY_RECORD.words!['2026-11-20'] as object, body: 'chest'}}, checkin: {ownMeanings: ['x']}});
    expect(wordsOf(energy)['2026-11-20']!.word).toBe('tense');
    expect(spotsOn(energy, '2026-11-20')).toEqual([]);
    expect(ownMeanings(energy)).toEqual({});
  });
  test('records from earlier releases read as before', () => {
    expect(habitExtrasSchema.parse(emptyHabitExtras())).toEqual(emptyHabitExtras());
    expect(energySchema.parse(emptyEnergy())).toEqual(emptyEnergy());
    const old = habitExtrasSchema.parse({version: 1, intentions: {[H]: {when: 'After coffee'}}});
    expect(identitiesOf(old)).toEqual([]);
    expect(stepUpOf(old, H).now).toBe('full');
  });
});
describe('Export everything → erase → Restore keeps them', () => {
  const NOW = new Date('2026-11-22T09:00:00.000Z'), APP = {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null};
  const value = (part: PlannedPart, mode: 'replace' | 'merge', current?: unknown) => { const next = nextValue(part, mode, current); if ('error' in next) throw Error(next.error); return next.value; };
  test('Replace on an erased device', async () => {
    const zip = buildEverythingZip(collectEverything({[HABIT_EXTRAS.key]: JSON.stringify(EXTRAS), [ENERGY.key]: JSON.stringify(ENERGY_RECORD)}, APP), {date: '2026-11-22', showcase: false, now: NOW});
    const parts = planParts((await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]))).json);
    const extras = habitExtrasSchema.parse(value(parts.find(p => p.id === 'device:habitExtras')!, 'replace'));
    expect(extras).toEqual(EXTRAS);
    const energy = energySchema.parse(value(parts.find(p => p.id === 'device:energy')!, 'replace'));
    expect(energy).toEqual(ENERGY_RECORD);
    expect(spotsOn(energy, '2026-11-20')).toEqual([{area: 'shoulders', feel: 'tight'}]);
  });
});
