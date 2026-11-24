import {describe, expect, test} from 'vitest';
import {addLocalDays} from '../local-date';
import {experimentResults, MAX_OUTCOMES, outcomesOf, setMoreOutcomes, EXPERIMENT_FACTOR_KINDS} from './engine';
import {experimentsSchema, type Experiment} from './store';
import {factorOptions, outcomeLabel, outcomeOptions, outcomeText, type CompareSources} from '../compare/engine';

/** Session AV lane 2 (habits pillar; LEDGER #64, Bearable's experiments): up to eight outcomes; symptoms as change or outcome. */
const today = '2026-10-31', start = addLocalDays(today, -13);
function sources(): CompareSources {
  const days: Record<string, {energy: number}> = {}, sym: Record<string, Record<string, number>> = {}, entries: {date: string; tags?: string[]}[] = [];
  for (let d = addLocalDays(today, -40); d <= today; d = addLocalDays(d, 1)) {
    const tried = d >= start;
    entries.push({date: d, ...(tried ? {tags: ['walk']} : {})});
    days[d] = {energy: tried ? 4 : 2};
    sym[d] = {headache: tried ? 0 : 2, pollen: d.endsWith('5') ? 1 : 0};
  }
  return {journal: {entries}, energy: {days}, symptoms: {items: [{id: 'headache', name: 'Headache'}, {id: 'pollen', name: 'Pollen'}], days: sym}};
}
const x = (over: Partial<Experiment> = {}): Experiment => ({id: 'e1', title: 'Walk', factor: 'journal-tag:walk', outcome: 'energy', start, days: 14, ...over});

describe('several outcomes and symptoms', () => {
  test('a symptom is a factor and an outcome, in its own words', () => {
    const src = sources();
    expect(EXPERIMENT_FACTOR_KINDS).toContain('symptom');
    expect(factorOptions(src, today).filter(f => f.kind === 'symptom').map(f => f.label)).toEqual(['“Headache” noted', '“Pollen” noted']);
    expect(outcomeOptions(src).map(o => o.id)).toEqual(expect.arrayContaining(['energy', 'symptom:headache', 'symptom:pollen']));
    expect(outcomeLabel('symptom:headache', src)).toBe('Headache (0–3)');
    expect(outcomeText('symptom:headache', 1.25)).toBe('1.3 of 3');
  });
  test('each outcome is worked out as one experiment is; the first stays first; an older reading keeps working', () => {
    const src = sources(), rec = experimentsSchema.parse({version: 1, items: [x()]});
    const two = setMoreOutcomes(rec, 'e1', ['symptom:headache', 'energy']);
    expect(outcomesOf(two.items[0]!)).toEqual(['energy', 'symptom:headache']);
    const [first, second] = experimentResults(src, two.items[0]!, today);
    expect(first!.outcome).toBe('energy');
    expect(first!.state).toBe('ready');
    expect(second!.outcome).toBe('symptom:headache');
    expect(second!.state).toBe('ready');
    expect(second!.sentence).toContain('“Headache” averaged 0.0 of 3');
    // A loose record keeps the extra outcomes through a parse; clearing them removes the field.
    expect(experimentsSchema.parse(JSON.parse(JSON.stringify(two)))).toEqual(two);
    expect('more' in setMoreOutcomes(two, 'e1', []).items[0]!).toBe(false);
  });
  test('a symptom as the change tried', () => {
    const src = sources(), r = experimentResults(src, x({factor: 'symptom:pollen'}), today)[0]!;
    expect(r.factor?.kind).toBe('symptom');
    expect(['pending', 'unclear', 'ready']).toContain(r.state);
  });
  test('export → erase → restore keeps the extra outcomes', async () => {
    const {EXPERIMENTS_KEY} = await import('./store');
    const {forgetAaDeviceRecords} = await import('../aa-device-forget');
    const {DEVICE_PARTS} = await import('../restore/plan');
    const {exportRecordSections, restoreRecordSection, sectionOf} = await import('../vault/backup-records');
    const m = new Map<string, string>();
    const storage = {get length() { return m.size; }, key: (i: number) => [...m.keys()][i] ?? null, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); }, clear: () => m.clear()} as Storage;
    const rec = setMoreOutcomes(experimentsSchema.parse({version: 1, items: [x()]}), 'e1', ['mood', 'symptom:headache']);
    storage.setItem(EXPERIMENTS_KEY, JSON.stringify(rec));
    const {sections} = exportRecordSections(storage, {health: true});
    forgetAaDeviceRecords(storage);
    expect(m.has(EXPERIMENTS_KEY)).toBe(false);
    const section = sectionOf(DEVICE_PARTS.find(p => p.key === EXPERIMENTS_KEY)!)!;
    restoreRecordSection(storage, section, sections[section]!);
    expect(JSON.parse(m.get(EXPERIMENTS_KEY)!)).toEqual(rec);
  });
  test('at most eight outcomes; unknown ones refused', () => {
    const rec = experimentsSchema.parse({version: 1, items: [x()]});
    expect(MAX_OUTCOMES).toBe(8);
    expect(() => setMoreOutcomes(rec, 'e1', ['mood', 'sleep', 'habits', 'steps', 'feeling', 'symptom:a', 'symptom:b', 'symptom:c'])).toThrow(/at most 8/);
    expect(() => setMoreOutcomes(rec, 'e1', ['calories'])).toThrow();
    expect(outcomesOf({outcome: 'energy', more: ['mood', 7, 'mood', 'x'.repeat(50)]})).toEqual(['energy', 'mood']);
  });
});
