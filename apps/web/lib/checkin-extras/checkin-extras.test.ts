import {describe, expect, test} from 'vitest';
import {dayTotal, loggedStrip, readCheckin, readyMatches, setItemText, setLogged, setMoment, setOwnFeeling, setOwnWord, setTimes} from './rule';
import {ENERGY_KEY, emptyEnergy, energySchema, rateEnergy} from '../energy/schema';
import {wordsOf} from '../mood-words/schema';
import {addLocalDays} from '../local-date';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';

/** Session AV lane 2 (habits pillar; LEDGER #60–#63, #68): the evening check-in's own fields in the daily energy record. */
const DAY = '2026-11-17', AT = '2026-11-17T20:00:00.000Z';
describe('the check-in fields', () => {
  test('day logged, parts of the day, why and group, moods by part; unknown fields kept; the schema keeps it all', () => {
    let e = energySchema.parse({...emptyEnergy(), checkin: {later: 'kept'}});
    e = setLogged(e, DAY, true, AT);
    e = setTimes(e, DAY, 'headache', ['evening', 'morning']);
    e = setItemText(setItemText(e, 'notes', 'headache', 'Comes with screens'), 'groups', 'headache', 'Head');
    e = setMoment(e, DAY, 'morning', 4);
    e = rateEnergy(e, DAY, 3, AT); // the existing writer keeps the check-in fields
    const c = readCheckin(e);
    expect(c.logged).toEqual({[DAY]: AT});
    expect(c.times[DAY]).toEqual({headache: ['morning', 'evening']});
    expect(c.notes).toEqual({headache: 'Comes with screens'});
    expect(c.groups).toEqual({headache: 'Head'});
    expect(c.moments[DAY]).toEqual({morning: 4});
    expect((e as unknown as {checkin: {later: string}}).checkin.later).toBe('kept');
    expect(energySchema.parse(JSON.parse(JSON.stringify(e)))).toEqual(e);
    // Clearing removes empty maps.
    const cleared = setMoment(setTimes(setLogged(e, DAY, false, AT), DAY, 'headache', []), DAY, 'morning', null);
    expect(readCheckin(cleared).logged).toEqual({});
    expect(Object.keys((cleared as unknown as {checkin: object}).checkin).sort()).toEqual(['groups', 'later', 'notes']);
    expect(() => setMoment(e, DAY, 'morning', 6)).toThrow();
    expect(() => setItemText(e, 'groups', 'headache', 'x'.repeat(31))).toThrow();
  });
  test('own feeling words: added to a corner, chosen for the day, removed; at most twelve a corner', () => {
    let e = setOwnWord(emptyEnergy(), 'low-pleasant', 'snug', true);
    e = setOwnFeeling(e, DAY, 'snug', 'low-pleasant', AT);
    expect(wordsOf(e)[DAY]).toMatchObject({energy: 'low', pleasantness: 'pleasant', word: 'snug'});
    expect(readCheckin(e).ownWords['low-pleasant']).toEqual(['snug']);
    expect(() => setOwnFeeling(e, DAY, 'unknown', 'low-pleasant', AT)).toThrow();
    expect(readCheckin(setOwnWord(e, 'low-pleasant', 'SNUG', false)).ownWords['low-pleasant']).toEqual([]);
    let full = emptyEnergy();
    for (let i = 0; i < 12; i++) full = setOwnWord(full, 'high-pleasant', `w${i}`, true);
    expect(() => setOwnWord(full, 'high-pleasant', 'one more', true)).toThrow(/At most 12/);
  });
  test('odd stored values are left out of the reading', () => {
    const c = readCheckin({checkin: {logged: {nope: AT, [DAY]: 5}, times: {[DAY]: {'Bad Id': ['morning'], ok: ['noon']}}, notes: {ok: ''}, moments: {[DAY]: {morning: 9}}}});
    expect(c).toMatchObject({logged: {}, times: {}, notes: {}, moments: {}});
  });
  test('the strip, the day total and the ready list', () => {
    const e = setLogged(setLogged(emptyEnergy(), DAY, true, AT), addLocalDays(DAY, -2), true, AT);
    const strip = loggedStrip(readCheckin(e), DAY, 3, addLocalDays);
    expect(strip).toEqual([{day: addLocalDays(DAY, -2), logged: true}, {day: addLocalDays(DAY, -1), logged: false}, {day: DAY, logged: true}]);
    expect(dayTotal({a: 0, b: 2, c: 3})).toEqual({noted: 2, strong: 1, total: 5});
    expect(readyMatches('caf', [])).toEqual([{name: 'Caffeine', kind: 'factor'}]);
    expect(readyMatches('hoofd', [], 'nl')).toEqual([{name: 'Hoofdpijn', kind: 'symptom'}]);
    expect(readyMatches('', ['caffeine']).map(f => f.name)).not.toContain('Caffeine');
  });
  test('export → erase → restore keeps the check-in fields', () => {
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const e = setOwnWord(setTimes(setLogged(rateEnergy(emptyEnergy(), DAY, 4, AT), DAY, true, AT), DAY, 'pollen', ['afternoon']), 'high-pleasant', 'buzzing', true);
    storage.setItem(ENERGY_KEY, JSON.stringify(e));
    const {sections} = exportRecordSections(storage, {health: true});
    forgetAaDeviceRecords(storage);
    expect(m.has(ENERGY_KEY)).toBe(false);
    const section = sectionOf(DEVICE_PARTS.find(p => p.key === ENERGY_KEY)!)!;
    restoreRecordSection(storage, section, sections[section]!);
    expect(JSON.parse(m.get(ENERGY_KEY)!)).toEqual(e);
  });
  test('NOVA and ZIGi: whether the day is logged and the own words, EN and NL, under the Health gate', () => {
    const s = showcaseAll(), at = (energy: unknown) => ({...s, energy} as typeof s);
    const text = (q: string, src = s, health = true) => { const r = av2HabitsAnswer(q, zigiEnv(src, health)); return r && 'text' in r ? r.text : r?.kind ?? ''; };
    const e = setOwnWord(setLogged(emptyEnergy(), DAY, true, AT), 'low-pleasant', 'snug', true);
    expect(text('did i log today', at(e))).toMatch(/^Today is logged\. Last 14 days: 1 logged; not yet: .+ and 8 more\.$/);
    expect(text('welke dagen heb ik niet gelogd', at(e))).toMatch(/^Vandaag is gelogd\. Laatste 14 dagen: 1 gelogd; nog niet: /);
    expect(text('did i log today', at(emptyEnergy()))).toContain('No day is marked logged');
    expect(text('what are my own feeling words', at(e))).toBe('Your own feeling words: low energy, pleasant: snug.');
    expect(text('welke eigen gevoelswoorden heb ik', at(e))).toBe('Je eigen gevoelswoorden: weinig energie, prettig: snug.');
    expect(text('did i log today', at(e), false)).toContain('Health isn’t shared with ZIGi');
  });
});
