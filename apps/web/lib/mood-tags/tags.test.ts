import {describe, expect, test} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {addLocalDays} from '../local-date';
import {FORBIDDEN_INSIGHT_WORDS} from '../insights/engine';
import {MOOD_TAGS, MOOD_TAGS_KEY, emptyMoodTags, moodTagsSchema} from './schema';
import {GOES_WITH, addTag, cleanTag, goodDayTags, recentTags, removeTag, tagsOn} from './tags';

// Session AP (feature 1): tags on a mood check-in, kept in their own device record. Fictional days and words.
const TODAY = '2026-11-14';
const memory = (init: Record<string, string> = {}) => { const m = new Map(Object.entries(init)); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m}; };

describe('the mood-tags record', () => {
  test('is its own key, empty when missing, unreadable bytes read as empty and are never rewritten', () => {
    expect(MOOD_TAGS.key).toBe('zigoals:mood-tags:v1');
    expect(readDeviceRecord(memory(), MOOD_TAGS)).toEqual({data: emptyMoodTags(), unreadable: false});
    const s = memory({[MOOD_TAGS_KEY]: '{"version":1,"entries":{"2026-11-01":["x","X"]}}'});
    expect(readDeviceRecord(s, MOOD_TAGS).unreadable).toBe(true);
    expect(s.m.get(MOOD_TAGS_KEY)).toContain('"X"');
  });
  test('refuses more than eight tags, a tag over 24 characters, and a key that is not a day', () => {
    expect(moodTagsSchema.safeParse({version: 1, entries: {[TODAY]: Array.from({length: 9}, (_, i) => `t${i}`)}}).success).toBe(false);
    expect(moodTagsSchema.safeParse({version: 1, entries: {[TODAY]: ['x'.repeat(25)]}}).success).toBe(false);
    expect(moodTagsSchema.safeParse({version: 1, entries: {'mood-1': ['walk']}}).success).toBe(false);
    expect(moodTagsSchema.safeParse({version: 1, entries: {[TODAY]: ['walk']}, extra: 1}).success).toBe(false);
  });
});

describe('adding and removing tags', () => {
  test('a tag is cleaned, kept once whatever its case, and a ninth is refused', () => {
    let r = addTag(emptyMoodTags(), TODAY, '  long   walk ');
    expect(tagsOn(r, TODAY)).toEqual(['long walk']);
    expect(addTag(r, TODAY, 'Long Walk')).toBe(r);
    for (let i = 0; i < 7; i++) r = addTag(r, TODAY, `t${i}`);
    expect(() => addTag(r, TODAY, 'ninth')).toThrow(/up to 8 tags/);
    expect(() => cleanTag('   ')).toThrow(/Type a word/);
    expect(() => cleanTag('x'.repeat(25))).toThrow(/up to 24 characters/);
  });
  test('removing the last tag removes the day; writes go through the device-record pattern', () => {
    const s = memory();
    updateDeviceRecord(s, MOOD_TAGS, r => addTag(r, TODAY, 'friends'));
    expect(readDeviceRecord(s, MOOD_TAGS).data.entries).toEqual({[TODAY]: ['friends']});
    updateDeviceRecord(s, MOOD_TAGS, r => removeTag(r, TODAY, 'FRIENDS'));
    expect(readDeviceRecord(s, MOOD_TAGS).data.entries).toEqual({});
  });
  test('recent tags: most used first, then the latest', () => {
    let r = emptyMoodTags();
    r = addTag(r, '2026-11-01', 'walk'); r = addTag(r, '2026-11-02', 'Walk'); r = addTag(r, '2026-11-03', 'coffee'); r = addTag(r, '2026-11-04', 'tea');
    expect(recentTags(r)).toEqual(['Walk', 'tea', 'coffee']);
  });
});

describe('what goes with your good days', () => {
  // 20 days with a mood: "walk" on 6 of them (5 good), "late screen" on 6 (1 good), "rain" on 3; the rest mostly okay.
  const moods: Record<string, {mood: number}> = {}, tags: Record<string, string[]> = {};
  for (let i = 0; i < 20; i++) { const d = addLocalDays(TODAY, -i); moods[d] = {mood: 3}; }
  for (let i = 0; i < 6; i++) { const d = addLocalDays(TODAY, -i); tags[d] = ['walk']; moods[d] = {mood: i === 0 ? 3 : 4}; }
  for (let i = 6; i < 12; i++) { const d = addLocalDays(TODAY, -i); tags[d] = ['late screen']; moods[d] = {mood: i === 6 ? 5 : 2}; }
  for (let i = 12; i < 15; i++) tags[addLocalDays(TODAY, -i)] = ['rain'];
  const record = moodTagsSchema.parse({version: 1, entries: tags});
  test('a tag needs five days with a mood; findings are counts with "goes with, not a cause"', () => {
    const r = goodDayTags(moods, record, TODAY);
    expect(r.moodDays).toBe(20);
    expect(r.ready).toEqual([{tag: 'walk', withDays: 6, withGood: 5, otherDays: 14, otherGood: 1,
      sentence: `On 5 of the 6 days you tagged “walk”, your mood was Good or Great; on the other 14 days with a mood, 1. ${GOES_WITH}`}]);
    expect(r.pending).toEqual([{tag: 'rain', days: 3, need: 5}]);
    // "late screen" goes with fewer good days, so it is no finding about good days.
    expect(r.ready.map(f => f.tag)).not.toContain('late screen');
    for (const f of r.ready) for (const w of FORBIDDEN_INSIGHT_WORDS) expect(f.sentence).not.toMatch(new RegExp(`\\b${w}\\b`, 'i'));
  });
  test('a tag on a day without a mood is not counted, and days older than a year are left out', () => {
    const old = addLocalDays(TODAY, -400);
    const r = goodDayTags({...moods, [old]: {mood: 5}}, moodTagsSchema.parse({version: 1, entries: {...tags, [old]: ['walk'], '2026-11-20': ['walk']}}), TODAY);
    expect(r.ready[0]).toMatchObject({tag: 'walk', withDays: 6});
  });
  test('nothing is made up: no moods, no findings', () => {
    expect(goodDayTags({}, record, TODAY)).toMatchObject({ready: [], pending: [], moodDays: 0});
  });
});
