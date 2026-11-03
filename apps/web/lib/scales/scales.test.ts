import {describe, expect, test} from 'vitest';
import {readDeviceRecord} from '../device-record';
import {addLocalDays} from '../local-date';
import {compare, factorOptions, outcomeLabel, outcomeOptions, outcomeText, type CompareSources} from '../compare/engine';
import {experimentResult} from '../experiments/engine';
import {MAX_SCALES, MAX_SCALE_DAYS, SCALES, SCALES_KEY, emptyScales, scalesSchema, type Scales} from './store';
import {SCALE_LIMIT, addScale, editScale, rateScale, removeScale, scaleById, scaleSeries, valueWords} from './engine';
import {showcaseScales} from './showcase';

const TODAY = '2026-11-01';
const mem = (v: Record<string, string> = {}) => ({getItem: (k: string) => v[k] ?? null});
/** The frozen fixture for the lead's frozen reader. */
export const FROZEN_SCALES = {version: 1, scales: [{id: 'stress', name: 'Stress', low: 'calm', high: 'very tense'}], days: {'2026-10-30': {stress: 4}, '2026-10-31': {stress: 2, pain: 3}}, retired: [{id: 'pain', name: 'Pain', low: 'none', high: 'a lot'}]};

describe('Your own scales (BUILD list 2 #12)', () => {
  test('the frozen fixture reads; out-of-range ratings make the record unreadable, never coerced', () => {
    expect(readDeviceRecord(mem({[SCALES_KEY]: JSON.stringify(FROZEN_SCALES)}), SCALES).data.days['2026-10-31']).toEqual({stress: 2, pain: 3});
    expect(readDeviceRecord(mem({[SCALES_KEY]: JSON.stringify({...FROZEN_SCALES, days: {'2026-10-30': {stress: 6}}})}), SCALES).unreadable).toBe(true);
  });
  test('bounds: five scales at once; 730 days kept, the oldest make way; 1 to 5 only', () => {
    let rec = emptyScales();
    for (const n of ['A', 'B', 'C', 'D', 'E']) rec = addScale(rec, {name: n, low: 'low', high: 'high'});
    expect(rec.scales).toHaveLength(MAX_SCALES);
    expect(() => addScale(rec, {name: 'F', low: 'a', high: 'b'})).toThrow(SCALE_LIMIT);
    expect(() => addScale(emptyScales(), {name: '  ', low: 'a', high: 'b'})).toThrow(/name/);
    expect(() => rateScale(rec, TODAY, 'a', 6)).toThrow(/1 to 5/);
    for (let i = 0; i < MAX_SCALE_DAYS + 5; i++) rec = rateScale(rec, addLocalDays(TODAY, -i), 'a', 3);
    expect(Object.keys(rec.days)).toHaveLength(MAX_SCALE_DAYS);
    expect(rec.days[addLocalDays(TODAY, -(MAX_SCALE_DAYS + 4))]).toBeUndefined();
    expect(rec.days[TODAY]).toEqual({a: 3});
    expect(scalesSchema.safeParse({...rec, scales: [...rec.scales, {id: 'z', name: 'Z', low: 'a', high: 'b'}]}).success).toBe(false);
  });
  test('skipping is fine: clearing a rating leaves the day unknown, and an empty day is not kept', () => {
    let rec = addScale(emptyScales(), {name: 'Stress', low: 'calm', high: 'very tense'});
    rec = rateScale(rec, TODAY, 'stress', 4);
    rec = rateScale(rec, TODAY, 'stress', null);
    expect(rec.days).toEqual({});
  });
  test('removing a scale keeps its history readable; adding it back by name brings the history back', () => {
    let rec = addScale(emptyScales(), {name: 'Pain', low: 'none', high: 'a lot'});
    rec = rateScale(rec, '2026-10-30', 'pain', 2);
    rec = removeScale(rec, 'pain');
    expect(rec.scales).toEqual([]);
    expect(scaleById(rec, 'pain')).toMatchObject({name: 'Pain', removed: true});
    expect(scaleSeries(rec, 'pain')).toEqual([{date: '2026-10-30', value: 2}]);
    rec = addScale(rec, {name: 'pain', low: 'none', high: 'a lot'});
    expect(rec.scales[0]!.id).toBe('pain');
    expect(rec.retired).toEqual([]);
    rec = editScale(rec, 'pain', {name: 'Back pain', low: 'none', high: 'a lot'});
    expect(scaleSeries(rec, 'pain')).toHaveLength(1);
    // A new scale never takes the id of old ratings.
    const other = addScale(removeScale(rec, 'pain'), {name: 'Pain', low: 'x', high: 'y'});
    expect(other.scales[0]!.id).not.toBe('pain');
    expect(valueWords({low: 'calm', high: 'tense'}, 1)).toBe('calm');
  });
  test('a scale is a Compare factor (4–5 against 1–3, unrated days left out) and an outcome', () => {
    let rec: Scales = addScale(emptyScales(), {name: 'Stress', low: 'calm', high: 'very tense'});
    rec = addScale(rec, {name: 'Focus', low: 'scattered', high: 'sharp'});
    for (let i = 1; i <= 60; i++) {
      const d = addLocalDays(TODAY, -i);
      if (i % 10 === 0) continue;
      rec = rateScale(rec, d, 'stress', i % 2 ? 5 : 1);
      rec = rateScale(rec, d, 'focus', i % 2 ? 2 : 4);
    }
    const src: CompareSources = {scales: rec};
    expect(factorOptions(src, TODAY).map(f => f.id)).toEqual(['scale:stress', 'scale:focus']);
    expect(outcomeOptions(src).map(o => [o.id, o.label])).toEqual([['scale:stress', 'Stress (1–5)'], ['scale:focus', 'Focus (1–5)']]);
    const r = compare(src, 'scale:stress', 'scale:focus', 'same', TODAY)!;
    expect(r.withDays + r.withoutDays).toBe(54);
    expect(r.state).toBe('ready');
    expect(r.sentence).toContain('On days you rated “Stress” 4 or 5, your “Focus” rating that day averaged 2.0 of 5');
    expect(outcomeText('scale:focus', 3.25)).toBe('3.3 of 5');
    // A removed scale: no longer offered, its outcome still named for an experiment that used it.
    const gone = removeScale(rec, 'focus');
    expect(outcomeOptions({scales: gone}).map(o => o.id)).toEqual(['scale:stress']);
    expect(outcomeLabel('scale:focus', {scales: gone})).toBe('Focus (1–5)');
  });
  test('an experiment can look at a scale', () => {
    let rec: Scales = addScale(emptyScales(), {name: 'Calm', low: 'restless', high: 'settled'});
    for (let i = 0; i < 28; i++) rec = rateScale(rec, addLocalDays(TODAY, -i), 'calm', i < 14 ? 4 : 2);
    const src: CompareSources = {scales: rec, workouts: {workouts: Array.from({length: 14}, (_, i) => ({startedAt: `${addLocalDays(TODAY, -i)}T08:00:00.000Z`}))}, localTime: iso => ({date: iso.slice(0, 10), hour: 8})};
    const res = experimentResult(src, {id: 'x', title: 'Workouts', factor: 'workout', outcome: 'scale:calm', start: addLocalDays(TODAY, -13), days: 14}, TODAY);
    expect(res.outcome).toBe('scale:calm');
    expect(res.withDays).toBe(14);
    expect(res.withoutDays).toBe(14);
    expect(res.sentence).toContain('your “Calm” rating averaged 4.0 of 5');
  });
  test('the Showcase example is labelled and skips some days', () => {
    const rec = showcaseScales(TODAY);
    expect(rec.scales.every(s => s.name.includes('(Showcase)'))).toBe(true);
    expect(Object.keys(rec.days).length).toBeLessThan(60);
    expect(scalesSchema.safeParse(rec).success).toBe(true);
  });
});
