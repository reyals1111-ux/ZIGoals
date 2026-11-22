import {describe, expect, test} from 'vitest';
import {activityGroups, addActivity, moodLabel, readActivities, readMoodLook, removeActivity, resetMoodLook, setMoodLook, tagStats, MAX_ACTIVITIES} from './rule';
import {setOwnWord, readCheckin} from '../checkin-extras/rule';
import {ENERGY_KEY, emptyEnergy, energySchema, rateEnergy} from '../energy/schema';
import {MOOD_WORDS} from '../wrap-up/engine';
import {forgetAaDeviceRecords} from '../aa-device-forget';
import {DEVICE_PARTS} from '../restore/plan';
import {exportRecordSections, restoreRecordSection, sectionOf} from '../vault/backup-records';
import {showcaseAll, zigiEnv} from '../ai/evals/as/harness';
import {av2HabitsAnswer} from '../ai/local-answers/av2-habits';

describe('NOVA and ZIGi say the mood words (LEDGER #178)', () => {
  test('ZIGoals’ words, then your own, in English and Dutch; closed with Health', () => {
    const s = showcaseAll();
    const text = (q: string, energy: unknown, health = true) => { const r = av2HabitsAnswer(q, zigiEnv({...s, energy: energy as never}, health)); return r && 'text' in r ? r.text : ''; };
    expect(text('what are my mood words', {version: 1, days: {}})).toBe('Your moods use ZIGoals’ words: 5 Great, 4 Good, 3 Okay, 2 Low, 1 Hard. Health → Diary → How does today feel? → Your own words for the moods lets you name them your way, with a symbol.');
    const own = setMoodLook({version: 1, days: {}}, 5, {word: 'Sunny', symbol: '☀'});
    expect(text('what are my own mood words', own)).toBe('Your own mood words, from best to hardest: 5 ☀ Sunny, 4 Good, 3 Okay, 2 Low, 1 Hard. The mood kept is still 1 to 5.');
    expect(text('wat zijn mijn stemmingswoorden', own)).toMatch(/^Je eigen stemmingswoorden, van best tot zwaarst: 5 ☀ Sunny,/);
    expect(text('what are my mood words', own, false)).not.toContain('Sunny');
  });
});

/** Session AV lane 2 (habits; LEDGER #178, #179, #188): own mood words and symbols, activities in groups, tag statistics. */
const DAY = '2026-11-18', AT = '2026-11-18T20:00:00.000Z';
describe('your own mood words and symbols', () => {
  test('set, read, clear; the stored mood is untouched; other check-in fields kept; odd values ignored', () => {
    let e = setOwnWord(rateEnergy(emptyEnergy(), DAY, 4, AT), 'high-pleasant', 'buzzing', true);
    expect(readMoodLook(e)).toEqual({words: [...MOOD_WORDS], symbols: [null, null, null, null, null], custom: false});
    e = setMoodLook(setMoodLook(e, 5, {word: 'Sunny', symbol: '☀'}), 1, {word: 'Stormy'});
    const look = readMoodLook(e);
    expect(look.words).toEqual(['Stormy', 'Low', 'Okay', 'Good', 'Sunny']);
    expect(look.symbols[4]).toBe('☀');
    expect(moodLabel(look, 5)).toBe('☀ Sunny');
    expect(moodLabel(look, 1)).toBe('Stormy');
    expect(readCheckin(e).ownWords['high-pleasant']).toEqual(['buzzing']);
    expect(energySchema.parse(JSON.parse(JSON.stringify(e)))).toEqual(e);
    expect(readMoodLook(setMoodLook(e, 5, {word: ''})).words[4]).toBe(MOOD_WORDS[4]);
    expect(readMoodLook(resetMoodLook(e)).custom).toBe(false);
    expect(readCheckin(resetMoodLook(e)).ownWords['high-pleasant']).toEqual(['buzzing']);
    expect(() => setMoodLook(e, 6, {word: 'x'})).toThrow();
    expect(() => setMoodLook(e, 2, {symbol: '🙂'})).toThrow();
    expect(() => setMoodLook(e, 2, {word: 'a much too long mood word'})).toThrow();
    expect(readMoodLook({checkin: {moodLook: {'3': {word: '\u0007bad', symbol: 'x'}, '9': {word: 'nine'}}}}).custom).toBe(false);
  });
});

describe('activities in groups', () => {
  test('add, group, remove; a name once; the cap; odd entries left out', () => {
    let e: object = {version: 1, days: {}};
    e = addActivity(e, {name: 'Walk', symbol: '☀', group: 'Outside'});
    e = addActivity(e, {name: 'Coffee', symbol: '☕', group: ''});
    e = addActivity(e, {name: 'Run', symbol: '⚽', group: 'outside'});
    expect(readActivities(e).map(a => [a.id, a.name, a.group])).toEqual([['walk', 'Walk', 'Outside'], ['coffee', 'Coffee', 'Other'], ['run', 'Run', 'outside']]);
    expect(activityGroups(readActivities(e)).map(g => [g.group, g.items.map(a => a.name)])).toEqual([['Outside', ['Walk', 'Run']], ['Other', ['Coffee']]]);
    expect(() => addActivity(e, {name: 'walk', symbol: '☀', group: ''})).toThrow('already');
    expect(() => addActivity(e, {name: 'Swim', symbol: 'nope', group: ''})).toThrow();
    expect(readActivities(removeActivity(e, 'walk')).map(a => a.name)).toEqual(['Coffee', 'Run']);
    let many: object = {version: 1};
    for (let i = 0; i < MAX_ACTIVITIES; i++) many = addActivity(many, {name: `Thing ${i}`, symbol: '★', group: ''});
    expect(() => addActivity(many, {name: 'One more', symbol: '★', group: ''})).toThrow();
    expect(readActivities({checkin: {activities: [{id: 'ok', name: 'Fine', symbol: '?', group: 7}, {id: 'Bad Id', name: 'x'}, 'odd']}})).toEqual([{id: 'ok', name: 'Fine', symbol: '★', group: 'Other'}]);
  });
  test('export → erase → restore keeps the mood words and the activities', () => {
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const e = addActivity(setMoodLook(rateEnergy(emptyEnergy(), DAY, 3, AT), 4, {word: 'Bright', symbol: '★'}), {name: 'Friends', symbol: '♥', group: 'People'});
    storage.setItem(ENERGY_KEY, JSON.stringify(e));
    const {sections} = exportRecordSections(storage, {health: true});
    forgetAaDeviceRecords(storage);
    expect(m.has(ENERGY_KEY)).toBe(false);
    const section = sectionOf(DEVICE_PARTS.find(p => p.key === ENERGY_KEY)!)!;
    restoreRecordSection(storage, section, sections[section]!);
    const back = JSON.parse(m.get(ENERGY_KEY)!);
    expect(back).toEqual(e);
    expect(readMoodLook(back).words[3]).toBe('Bright');
    expect(readActivities(back)[0]!.name).toBe('Friends');
  });
});

describe('each tag, month by month (LEDGER #188)', () => {
  test('days this month and last, the moods on its days, the most common; a day without a mood counts for the month only', () => {
    const moods = {'2026-11-02': {mood: 5}, '2026-11-09': {mood: 4}, '2026-10-20': {mood: 4}, '2026-10-21': {mood: 2}, '2025-10-01': {mood: 1}};
    const entries = {'2026-11-02': ['Walk'], '2026-11-09': ['walk', 'Work'], '2026-11-12': ['Walk'], '2026-10-20': ['Walk'], '2026-10-21': ['Work'], '2025-10-01': ['Walk'], '2026-11-30': ['Walk']};
    const rows = tagStats(moods, entries, '2026-11-22');
    expect(rows.map(r => [r.tag, r.thisMonth, r.lastMonth, r.spread, r.moodDays, r.mostly])).toEqual([
      ['Walk', 3, 1, [0, 0, 0, 2, 1], 3, 4],
      ['Work', 1, 1, [0, 1, 0, 1, 0], 2, 4],
    ]);
    expect(tagStats({}, {}, '2026-11-22')).toEqual([]);
  });
});
