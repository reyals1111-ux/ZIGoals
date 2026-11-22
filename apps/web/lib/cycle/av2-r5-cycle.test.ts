import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {CYCLE_LINE, cycleLengths, nextPeriodEstimate, setCycleDay, setCycleOn} from './engine';
import {emptyCycle, type Cycle} from './store';
import {cycleGlance, cycleHistory, cycleStats, setLeftOut} from './history';
import {addOwnWord, allWords, chipWords, moveWord, removeOwnWord, setCycleChoice, setWordHidden, wordIdOf, wordLabel} from './words';
import {cyclePlanDays} from './plan-days';
import {showcaseCycle} from './showcase';

/**
 * Session AV lane 2 (r5-body; LEDGER #379–#383): your cycles with their averages and spread, a cycle at a glance, a cycle
 * left out, your own words, "No period" and the perimenopause words — a look back, never a forecast.
 */
const TODAY = '2026-11-20';
const periods = (spec: readonly (readonly [string, number])[], rec: Cycle = setCycleOn(emptyCycle(), true)) => {
  for (const [start, n] of spec) for (let i = 0; i < n; i++) rec = setCycleDay(rec, addLocalDays(start, i), {flow: i === 0 ? 'heavy' : 'light'}, TODAY);
  return rec;
};
const REC = periods([['2026-07-01', 5], ['2026-07-29', 4], ['2026-08-30', 6], ['2026-09-27', 5], ['2026-10-25', 5], ['2026-11-19', 2]]);

describe('Your cycles (#379)', () => {
  test('each cycle, newest first: its first day, length and period length; the one still going so far', () => {
    const h = cycleHistory(REC, TODAY);
    expect(h.map(c => [c.start, c.length, c.periodLength, c.complete])).toEqual([
      ['2026-11-19', 2, 2, false], ['2026-10-25', 25, 5, true], ['2026-09-27', 28, 5, true], ['2026-08-30', 28, 6, true], ['2026-07-29', 32, 4, true], ['2026-07-01', 28, 5, true],
    ]);
    expect(h[0]!.periodSoFar).toBe(true);
  });
  test('averages and spread: complete cycles only; periods that are over only', () => {
    expect(cycleStats(cycleHistory(REC, TODAY))).toEqual({cycle: {average: 28.2, shortest: 25, longest: 32, count: 5}, period: {average: 5, shortest: 4, longest: 6, count: 5}, leftOut: 0});
  });
  test('a pause over 90 days is listed but never a cycle', () => {
    const rec = periods([['2026-01-01', 3], ['2026-06-01', 3], ['2026-06-29', 3]]);
    const h = cycleHistory(rec, TODAY);
    expect(h.find(c => c.start === '2026-01-01')).toMatchObject({pause: true});
    expect(cycleStats(h).cycle).toEqual({average: 28, shortest: 28, longest: 28, count: 1});
  });
  test('nothing logged: no cycles', () => { expect(cycleHistory(emptyCycle(), TODAY)).toEqual([]); expect(cycleStats([])).toEqual({cycle: null, period: null, leftOut: 0}); });
});

describe('Leave a cycle out of the averages (#382)', () => {
  test('left out: not in the averages, nor in the estimate; still listed; put back', () => {
    const out = setLeftOut(REC, '2026-07-29', true);
    const h = cycleHistory(out, TODAY);
    expect(h.find(c => c.start === '2026-07-29')).toMatchObject({leftOut: true, length: 32});
    expect(cycleStats(h)).toMatchObject({cycle: {average: 27.3, shortest: 25, longest: 28, count: 4}, leftOut: 1});
    expect(cycleLengths(out)).toEqual([28, 28, 28, 25]);
    expect(nextPeriodEstimate(out, TODAY)).toMatchObject({kind: 'range', shortest: 25, longest: 28});
    expect(nextPeriodEstimate(REC, TODAY)).toMatchObject({kind: 'range', shortest: 25, longest: 32});
    expect(setLeftOut(out, '2026-07-29', false).leftOut).toEqual([]);
  });
});

describe('A cycle at a glance (#381)', () => {
  test('the chosen cycle day by day, then the same days of up to five earlier cycles; days that happened only', () => {
    const rec = setCycleDay(REC, '2026-10-26', {symptoms: ['cramps'], note: 'Fictional'}, TODAY);
    const rows = cycleGlance(rec, TODAY, '2026-10-25');
    expect(rows.map(r => r.start)).toEqual(['2026-10-25', '2026-09-27', '2026-08-30', '2026-07-29', '2026-07-01']);
    expect(rows[0]!.days).toHaveLength(25);
    expect(rows[0]!.days[1]).toEqual({n: 2, date: '2026-10-26', flow: 'light', words: ['cramps'], note: true});
    expect(rows[0]!.days[10]).toMatchObject({flow: null, words: [], note: false});
    expect(cycleGlance(REC, TODAY)[0]!.days.map(d => d.date)).toEqual(['2026-11-19', '2026-11-20']);
  });
});

describe('Your own words, hidden and in your order (#380)', () => {
  test('an own word is kept as an id in the day’s own form, with its word; a duplicate is refused; 30 at most', () => {
    const out = addOwnWord(REC, '  Migräne ');
    if (!out.ok) throw new Error(out.message);
    expect(out.id).toBe('migrane');
    expect(wordLabel(out.value, 'migrane')).toBe('Migräne');
    expect(addOwnWord(out.value, 'migräne')).toEqual({ok: false, message: '“Migräne” is already in your words.'});
    expect(addOwnWord(out.value, 'Cramps')).toMatchObject({ok: false});
    expect(addOwnWord(out.value, '   ')).toMatchObject({ok: false});
    expect(wordIdOf('日本', new Set())).toBe('own-word');
    expect(wordIdOf('Sore feet', new Set(['sore-feet']))).toBe('sore-feet-a');
    let rec = out.value;
    for (let i = 0; i < 29; i++) { const r = addOwnWord(rec, `Word ${'abcdefghijklmnopqrstuvwxyz'[i % 26]}${i >= 26 ? 'z' : ''}`); if (!r.ok) throw new Error(r.message); rec = r.value; }
    expect(addOwnWord(rec, 'One more')).toEqual({ok: false, message: 'You have 30 words of your own. Remove one to add another.'});
  });
  test('removing an own word keeps its past days and its name there; typed again, it comes back', () => {
    const added = addOwnWord(REC, 'Migraine'); if (!added.ok) throw new Error();
    let rec = setCycleDay(added.value, '2026-11-01', {symptoms: ['migraine']}, TODAY);
    rec = removeOwnWord(rec, 'migraine');
    expect(rec.days['2026-11-01']!.symptoms).toEqual(['migraine']);
    expect(wordLabel(rec, 'migraine')).toBe('Migraine');
    expect(chipWords(rec)).not.toContain('migraine');
    expect(chipWords(rec, ['migraine'])).toContain('migraine');
    const back = addOwnWord(rec, 'migraine'); if (!back.ok) throw new Error();
    expect(back.id).toBe('migraine');
    expect(chipWords(back.value)).toContain('migraine');
  });
  test('the new everyday words; a built-in word hidden and shown; the order kept', () => {
    expect(chipWords(REC)).toEqual(expect.arrayContaining(['low-energy', 'lots-of-energy', 'slept-badly']));
    expect(wordLabel(REC, 'slept-badly')).toBe('Slept badly');
    expect(wordLabel(REC, 'slept-badly', 'nl')).toBe('Slecht geslapen');
    const hidden = setWordHidden(REC, 'acne', true);
    expect(chipWords(hidden)).not.toContain('acne');
    expect(allWords(hidden).find(w => w.id === 'acne')).toMatchObject({hidden: true, label: 'Skin changes'});
    expect(chipWords(setWordHidden(hidden, 'acne', false))).toContain('acne');
    const moved = moveWord(REC, 'tired', -1);
    expect(chipWords(moved).indexOf('tired')).toBe(chipWords(REC).indexOf('tired') - 1);
    expect(moveWord(REC, 'cramps', -1)).toBe(REC);
  });
});

describe('No period and the perimenopause words (#383)', () => {
  test('No period: no next-period line, on the plan either; the words and notes stay', () => {
    const rec = setCycleDay(setCycleChoice(REC, 'noPeriod', true), TODAY, {symptoms: ['tired'], note: 'Fictional'}, TODAY);
    expect(nextPeriodEstimate(rec, TODAY)).toEqual({kind: 'off', cycles: 5});
    expect(cyclePlanDays(rec, addLocalDays(TODAY, 1), addLocalDays(TODAY, 40), TODAY).some(d => d.period === 'estimated')).toBe(false);
    expect(rec.days[TODAY]).toMatchObject({symptoms: ['tired'], note: 'Fictional'});
    expect(setCycleChoice(rec, 'noPeriod', false).noPeriod).toBeUndefined();
  });
  test('perimenopause words only when chosen; days that have them keep them after', () => {
    expect(chipWords(REC)).not.toContain('hot-flushes');
    const peri = setCycleChoice(REC, 'peri', true);
    expect(chipWords(peri)).toEqual(expect.arrayContaining(['hot-flushes', 'night-sweats', 'joint-aches', 'brain-fog']));
    const day = setCycleDay(peri, TODAY, {symptoms: ['brain-fog']}, TODAY);
    expect(chipWords(setCycleChoice(day, 'peri', false), day.days[TODAY]!.symptoms)).toContain('brain-fog');
    expect(wordLabel(day, 'hot-flushes', 'nl')).toBe('Opvliegers');
  });
});

describe('the rules', () => {
  test('the log’s own line stays; no forecast words in the words offered', () => {
    expect(CYCLE_LINE).toBe('Information for you, not a contraceptive or a diagnosis.');
    const all = allWords(setCycleChoice(REC, 'peri', true)).map(w => w.label.toLowerCase()).join(' ');
    for (const w of ['fertile', 'ovulation', 'pms', 'predict', 'phase']) expect(all).not.toContain(w);
  });
  test('the Showcase cycle still reads with the new parts', () => {
    expect(cycleHistory(showcaseCycle(TODAY), TODAY).length).toBeGreaterThanOrEqual(4);
  });
});
