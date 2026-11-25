import {describe, expect, test} from 'vitest';
import {addNamedDay, namedDaysOf, projectOn, removeNamedDay, restoreNamedDay} from './predict';
import {setWeighNote, weighIns, weighInsCsv, weighNoteForExport} from './weigh-notes';
import {bodyExtrasSchema, emptyBodyExtras, NAMED_DAYS_MAX} from './schema';
import {weekCompare, weeklyRateOf, weightTrend} from '../health-aa/trend';
import {addLocalDays} from '../local-date';
import type {HealthData, HealthWeight} from '../health';

const TODAY = '2026-11-25', AT = '2026-11-25T08:00:00.000Z';
const w = (date: string, grams: number, id = `health_weight-${date}`): HealthWeight => ({id, date, grams, createdAt: AT, updatedAt: AT});
/** A steady −0.5 kg a week: a reading every other day for six weeks, ending today. */
const steady = (): HealthWeight[] => Array.from({length: 22}, (_, i) => { const d = addLocalDays(TODAY, -42 + i * 2); return w(d, Math.round(84_000 - i * 2 * 500 / 7)); });
const data = (weights: HealthWeight[]): Pick<HealthData, 'weights' | 'targets'> => ({weights, targets: {weightGrams: null} as HealthData['targets']});

describe('#456: what the trend reaches on a day you name', () => {
  test('the trend now plus the four-week rate times the weeks, with the sum to show', () => {
    const d = data(steady()), p = projectOn(d, TODAY, '2026-12-23');
    expect(p.kind).toBe('estimate');
    if (p.kind !== 'estimate') return;
    expect(p.days).toBe(28); expect(p.weeks).toBe(4);
    expect(p.weeklyGrams).toBe(weeklyRateOf(d.weights, TODAY));
    expect(p.nowGrams).toBe(weightTrend(d, TODAY, 42).latestTrend);
    expect(p.grams).toBe(Math.round(p.nowGrams + p.weeklyGrams * 4));
    expect(p.weeklyGrams).toBeLessThan(0);
  });
  test('no rate, a passed day, too far, out of range: said, never guessed', () => {
    expect(projectOn(data([w(TODAY, 80_000)]), TODAY, '2026-12-20').kind).toBe('no-rate');
    expect(projectOn(data(steady()), TODAY, TODAY).kind).toBe('passed');
    expect(projectOn(data(steady()), TODAY, '2028-01-01').kind).toBe('too-far');
    const fast = [w(addLocalDays(TODAY, -21), 60_000), w(addLocalDays(TODAY, -14), 50_000), w(addLocalDays(TODAY, -7), 40_000), w(TODAY, 30_000)];
    expect(projectOn(data(fast), TODAY, '2027-06-01').kind).toBe('out-of-range');
  });
  test('up to five named days, nearest first, passed ones last; checked; removed and restored', () => {
    let r = emptyBodyExtras();
    r = addNamedDay(r, {name: '  The   wedding ', on: '2026-12-20'}, TODAY, 'nd-aaaa1');
    r = addNamedDay(r, {name: 'Holiday', on: '2026-12-05'}, TODAY, 'nd-aaaa2');
    expect(r.namedDays![0]!.name).toBe('The wedding');
    expect(namedDaysOf(r, TODAY).map(d => d.id)).toEqual(['nd-aaaa2', 'nd-aaaa1']);
    expect(namedDaysOf(r, '2026-12-10').map(d => d.id)).toEqual(['nd-aaaa1', 'nd-aaaa2']);
    expect(() => addNamedDay(r, {name: '', on: '2026-12-20'}, TODAY)).toThrow('Give the day a name');
    expect(() => addNamedDay(r, {name: 'Past', on: TODAY}, TODAY)).toThrow('after today');
    expect(() => addNamedDay(r, {name: 'Far', on: '2028-01-01'}, TODAY)).toThrow('within a year');
    for (let i = 3; i <= NAMED_DAYS_MAX; i++) r = addNamedDay(r, {name: `Day ${i}`, on: `2027-01-0${i}`}, TODAY, `nd-aaaa${i}`);
    expect(() => addNamedDay(r, {name: 'Sixth', on: '2027-02-01'}, TODAY)).toThrow('Up to 5');
    const gone = r.namedDays![0]!, less = removeNamedDay(r, gone.id);
    expect(less.namedDays).toHaveLength(4);
    expect(restoreNamedDay(less, gone).namedDays).toHaveLength(5);
    expect(removeNamedDay(addNamedDay(emptyBodyExtras(), {name: 'One', on: '2026-12-01'}, TODAY, 'nd-bbbb1'), 'nd-bbbb1')).toEqual({version: 1});
  });
  test('an older record (no named days) and a newer one (an unknown field) both read', () => {
    expect(bodyExtrasSchema.parse({version: 1, heightCm: 180}).namedDays).toBeUndefined();
    const later = bodyExtrasSchema.parse({version: 1, namedDays: [{id: 'nd-cccc1', name: 'Race', on: '2027-03-01', colour: 'blue'}], later: true});
    expect(later.namedDays![0]!.name).toBe('Race');
    expect(bodyExtrasSchema.parse({version: 1, namedDays: 'nonsense'}).namedDays).toBeUndefined();
  });
});

describe('#457: a note on a weigh-in, and new lows', () => {
  const weights = [w('2026-03-03', 80_000), w('2026-03-10', 81_000), w('2026-03-20', 80_500), w('2026-04-01', 79_800), w('2026-04-03', 80_200), w('2026-04-04', 80_100)];
  test('lowest since the last reading at or below it (two weeks back, a reading between); the lowest of all; never the first', () => {
    const rows = weighIns(weights, emptyBodyExtras());
    expect(rows.map(r => r.date)).toEqual(['2026-04-04', '2026-04-03', '2026-04-01', '2026-03-20', '2026-03-10', '2026-03-03']);
    const low = Object.fromEntries(rows.map(r => [r.date, r.low]));
    expect(low['2026-03-03']).toBeNull();
    expect(low['2026-04-01']).toEqual({since: null}); // below every reading
    expect(low['2026-03-20']).toEqual({since: '2026-03-03'}); // under 10 Mar's, the lowest since 3 Mar's 80.0
    expect(low['2026-04-04']).toBeNull(); // 79.8 three days before
    const more = [...weights, w('2026-04-20', 79_900)];
    expect(weighIns(more, emptyBodyExtras()).find(r => r.date === '2026-04-20')!.low).toEqual({since: '2026-04-01'});
    const later = [...weights, w('2026-04-10', 80_300), w('2026-04-21', 79_700)];
    expect(weighIns(later, emptyBodyExtras()).find(r => r.date === '2026-04-21')!.low).toEqual({since: null});
    const back = [w('2026-01-01', 79_000), w('2026-01-20', 82_000), w('2026-02-01', 81_000), w('2026-02-10', 80_000)];
    expect(weighIns(back, emptyBodyExtras()).find(r => r.date === '2026-02-10')!.low).toEqual({since: '2026-01-01'});
  });
  test('a note is set, cleared and bounded; a note of a removed weigh-in is not shown and is dropped at the next write', () => {
    let r = setWeighNote(emptyBodyExtras(), weights, weights[1]!.id, '  after the   holiday ');
    expect(r.weighNotes).toEqual([{id: weights[1]!.id, note: 'after the holiday'}]);
    expect(weighIns(weights, r).find(x => x.id === weights[1]!.id)!.note).toBe('after the holiday');
    expect(() => setWeighNote(r, weights, weights[1]!.id, 'x'.repeat(81))).toThrow('80 characters');
    expect(() => setWeighNote(r, weights, 'health_weight-gone', 'x')).toThrow('no longer here');
    const fewer = weights.filter(x => x.id !== weights[1]!.id);
    expect(weighIns(fewer, r).some(x => x.note)).toBe(false);
    r = setWeighNote(r, fewer, weights[2]!.id, 'new scale');
    expect(r.weighNotes).toEqual([{id: weights[2]!.id, note: 'new scale'}]);
    expect(setWeighNote(r, fewer, weights[2]!.id, '  ')).toEqual({version: 1});
  });
  test('the CSV: oldest first, notes and marks, every cell safe', () => {
    const r = setWeighNote(emptyBodyExtras(), weights, weights[0]!.id, '=new scale');
    const lines = weighInsCsv(weighIns(weights, r)).split('\r\n');
    expect(lines[0]).toBe('"date","kg","lb_converted","note","lowest_since"');
    expect(lines[1]).toBe('"2026-03-03","80","176.37","\'=new scale",""');
    expect(lines.find(l => l.startsWith('"2026-04-01"'))).toBe('"2026-04-01","79.8","175.93","","all readings"');
    expect(weighNoteForExport(r, weights[0]!.id)).toBe('=new scale');
    expect(weighNoteForExport('nonsense', weights[0]!.id)).toBe('');
  });
});

describe('#458: this week against the week before', () => {
  test('the two 7-day means, each from three weigh-ins or more', () => {
    const weights = [w('2026-11-12', 82_000), w('2026-11-14', 82_400), w('2026-11-17', 82_200), w('2026-11-19', 81_900), w('2026-11-22', 81_700), w('2026-11-25', 81_500)];
    const c = weekCompare(weights, TODAY);
    expect(c).toEqual({ready: true, thisMean: 81_700, prevMean: 82_200, diff: -500, thisCount: 3, prevCount: 3});
  });
  test('not enough weigh-ins in either week: the counts, never a 0', () => {
    expect(weekCompare([w('2026-11-24', 81_000), w('2026-11-25', 81_000), w('2026-11-23', 81_000), w('2026-11-17', 81_500)], TODAY)).toEqual({ready: false, thisCount: 3, prevCount: 1});
    expect(weekCompare([], TODAY)).toEqual({ready: false, thisCount: 0, prevCount: 0});
  });
});

describe('the Showcase’s labelled examples', () => {
  test('two named days ahead and two notes on the Showcase’s own weigh-ins, each labelled', async () => {
    const {buildShowcase} = await import('../showcase-data'), {HEALTH_STORAGE_KEY, healthSchema} = await import('../health'), {BODY_EXTRAS_KEY} = await import('./schema');
    const {records} = buildShowcase('2026-11-17', 'UTC'), r = bodyExtrasSchema.parse(JSON.parse(records[BODY_EXTRAS_KEY]!)), health = healthSchema.parse(JSON.parse(records[HEALTH_STORAGE_KEY]!));
    expect(r.heightCm).toBeUndefined(); expect(r.milestones).toBeUndefined();
    expect(namedDaysOf(r, '2026-11-17').map(d => d.name)).toEqual(['Example · The wedding', 'Example · A holiday']);
    const rows = weighIns(health.weights, r);
    expect(rows.filter(x => x.note).map(x => x.note)).toEqual(['Example · new scale', 'Example · after the holiday']);
    expect(rows.some(x => x.low)).toBe(true);
    for (const d of r.namedDays!) expect(projectOn(health, '2026-11-17', d.on).kind).toBe('estimate');
  }, 60_000);
});
