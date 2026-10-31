import {describe, expect, test} from 'vitest';
import {createHabit, emptyHabitData, logHabitCount, type HabitInput} from '../habits';
import {createEmptyHealth, type HealthData} from '../health';
import {addLocalDays} from '../local-date';
import {instantAt} from '../zone-time';
import {saveNight} from '../sleep/engine';
import {emptySleep, type Sleep} from '../sleep/schema';
import {MAX_RANGE_DAYS, buildReport, reportRange, sectionHasData, REPORT_SECTIONS} from './build';

const TODAY = '2026-10-31', UTC = 'UTC', HABIT = '92000000-0000-4000-8000-000000000601';
const INPUT: HabitInput = {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1};
function fixture() {
  let sleep: Sleep = emptySleep();
  for (let i = 0; i < 10; i++) {
    if (i === 3) continue; // a night not logged
    const day = addLocalDays(TODAY, -i), end = instantAt(day, '07:00', UTC);
    sleep = saveNight(sleep, {kind: 'night', start: end - 8 * 3_600_000, end, timeZone: UTC, latencyMin: 10, awakeMin: 20, quality: 4, ...(i === 1 ? {note: 'Woke at 3 <again>', tags: ['noise']} : {})}, new Date('2026-12-01T00:00:00Z'));
  }
  const moods = {version: 1, days: {[TODAY]: {mood: 4, at: `${TODAY}T20:00:00.000Z`, note: 'Headache in the afternoon'}, [addLocalDays(TODAY, -2)]: {mood: 2, at: `${TODAY}T20:00:00.000Z`}, '2025-01-01': {mood: 5, at: '2025-01-01T20:00:00.000Z'}}};
  const weights = [{id: 'w1', date: addLocalDays(TODAY, -8), grams: 72000, createdAt: `${TODAY}T08:00:00.000Z`, updatedAt: `${TODAY}T08:00:00.000Z`}, {id: 'w2', date: TODAY, grams: 71400, createdAt: `${TODAY}T08:00:00.000Z`, updatedAt: `${TODAY}T08:00:00.000Z`}];
  const health = {...createEmptyHealth(), schemaVersion: 4, sleep, moods, weights} as unknown as HealthData;
  let habits = createHabit(emptyHabitData(), INPUT, new Date(`${addLocalDays(TODAY, -20)}T08:00:00Z`), HABIT);
  for (let i = 1; i <= 6; i += 1) if (i % 2 === 0) habits = logHabitCount(habits, HABIT, addLocalDays(TODAY, -i), 1, '', new Date(`${addLocalDays(TODAY, -i)}T20:00:00Z`));
  const energy = {days: {[TODAY]: {energy: 3}, [addLocalDays(TODAY, -1)]: {energy: 5}}, words: {[TODAY]: {energy: 'low', pleasantness: 'unpleasant', word: 'tired', at: '2026-10-31T08:00:00.000Z'}, [addLocalDays(TODAY, -1)]: {energy: 'low', pleasantness: 'pleasant', word: 'calm', at: '2026-10-31T08:00:00.000Z'}, [addLocalDays(TODAY, -2)]: {energy: 'low', pleasantness: 'unpleasant', word: 'drained', at: '2026-10-31T08:00:00.000Z'}}};
  return {health, habits, energy};
}

describe('report for a visit (Session AK lane S, item 14)', () => {
  test('the range: in order, never after today, at most a year', () => {
    expect(reportRange('2026-10-20', '2026-10-01', TODAY)).toEqual({from: '2026-10-01', to: '2026-10-20', days: 20});
    expect(reportRange('2026-10-25', '2026-12-31', TODAY)).toEqual({from: '2026-10-25', to: TODAY, days: 7});
    expect(reportRange('2020-01-01', TODAY, TODAY).days).toBe(MAX_RANGE_DAYS);
    expect(reportRange('2027-01-01', '2027-02-01', TODAY)).toEqual({from: TODAY, to: TODAY, days: 1});
  });
  test('only the chosen sections are built', () => {
    const r = buildReport({...fixture(), from: addLocalDays(TODAY, -9), to: TODAY, today: TODAY, sections: ['weight']});
    expect(Object.keys(r).sort()).toEqual(['range', 'weight']);
    expect(r.weight).toMatchObject({first: 72000, last: 71400, change: -600, more: 0});
  });
  test('sleep: logged nights only; a missing night stays empty in the series, never zero', () => {
    const r = buildReport({...fixture(), from: addLocalDays(TODAY, -9), to: TODAY, today: TODAY, sections: ['sleep']});
    expect(r.sleep).toMatchObject({nights: 9, avgAsleep: 450, avgBed: '23:00', avgWake: '07:00', avgQuality: 4, estimated: false});
    expect(r.sleep!.series).toHaveLength(10);
    expect(r.sleep!.series.find(p => p.date === addLocalDays(TODAY, -3))!.asleep).toBeNull();
    expect(r.sleep!.rows.at(-2)).toMatchObject({tags: ['noise'], quality: 4, asleep: 450});
  });
  test('mood, energy and feeling words in the range', () => {
    const r = buildReport({...fixture(), from: addLocalDays(TODAY, -9), to: TODAY, today: TODAY, sections: ['mood']});
    expect(r.mood).toMatchObject({moodDays: 2, avgMood: 3, energyDays: 2, avgEnergy: 4, wordDays: 3});
    expect(r.mood!.words.map(w => [w.id, w.count])).toEqual([['low-unpleasant', 2], ['low-pleasant', 1]]);
  });
  test('notes: the person\'s own words, as they wrote them (escaping is the renderer\'s job, React)', () => {
    const r = buildReport({...fixture(), from: addLocalDays(TODAY, -9), to: TODAY, today: TODAY, sections: ['notes']});
    expect(r.notes!.rows).toEqual([{date: addLocalDays(TODAY, -1), kind: 'sleep', text: 'Woke at 3 <again>'}, {date: TODAY, kind: 'mood', text: 'Headache in the afternoon'}]);
  });
  test('habits: done of scheduled, skips apart; today still open is not counted as undone', () => {
    const r = buildReport({...fixture(), from: addLocalDays(TODAY, -6), to: TODAY, today: TODAY, sections: ['habits']});
    expect(r.habits!.rows).toEqual([{title: 'Walk', scheduled: 6, done: 3, skipped: 0, share: 0.5}]);
  });
  test('empty records: every section builds without inventing a value', () => {
    const r = buildReport({health: null, habits: null, energy: null, from: addLocalDays(TODAY, -6), to: TODAY, today: TODAY, sections: [...REPORT_SECTIONS]});
    expect(r.sleep).toMatchObject({nights: 0, avgAsleep: null, avgBed: null, rows: []});
    expect(r.mood).toMatchObject({moodDays: 0, avgMood: null, avgEnergy: null, words: []});
    expect(r.weight).toMatchObject({rows: [], first: null, change: null});
    expect(r.habits!.rows).toEqual([]);
    for (const id of REPORT_SECTIONS) expect(sectionHasData({health: null, habits: null, energy: null, from: TODAY, to: TODAY, today: TODAY}, id)).toBe(false);
  });
  test('which sections have data in the range', () => {
    const base = {...fixture(), from: addLocalDays(TODAY, -9), to: TODAY, today: TODAY};
    expect(REPORT_SECTIONS.filter(id => sectionHasData(base, id))).toEqual([...REPORT_SECTIONS]);
    expect(sectionHasData({...base, from: '2025-06-01', to: '2025-06-30'}, 'weight')).toBe(false);
  });
});
