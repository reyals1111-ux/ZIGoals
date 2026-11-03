import {describe, expect, test} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {HEALTH_NUMBERS, HEALTH_NUMBERS_KEY, MAX_NUMBERS, emptyHealthNumbers, healthNumbersSchema, type HealthNumber} from './store';
import {BP_LINE, LIMIT_MESSAGE, VERDICT_WORDS, addNumbers, bpEntry, bpReadings, knownNames, labEntry, markers, rangeText, removeNumber, restoreNumber, verdictOf} from './engine';
import {LAB_SHEET_SYSTEM, labSheetRequest, readLabSheetReply, runLabSheetScan} from './scan';
import {showcaseHealthNumbers} from './showcase';
import type {ChatEvent} from '../ai/types';

const TODAY = '2026-11-01';
const mem = () => { const m = new Map<string, string>(); return {getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, m}; };
const lab = (over: Partial<Record<string, string>> = {}) => labEntry({date: TODAY, name: 'Glucose', value: '5,4', unit: 'mmol/L', ...over}, `l${Math.random().toString(36).slice(2, 8)}`, TODAY);

/** The frozen fixture the lead's frozen reader can copy: one of each kind, as stored. */
export const FROZEN_HEALTH_NUMBERS = {version: 1, entries: [
  {id: 'bp1', date: '2026-10-30', kind: 'bp', systolic: 124, diastolic: 80, pulse: 66, note: 'Morning, seated'},
  {id: 'lab1', date: '2026-10-28', kind: 'lab', name: 'Glucose (fasting)', value: 5.4, unit: 'mmol/L', refLow: 3.9, refHigh: 5.6},
  {id: 'lab2', date: '2026-10-28', kind: 'lab', name: 'Total cholesterol', value: 5.6, unit: 'mmol/L', refHigh: 5.2},
]};

describe('Your numbers (BUILD list 2 #4)', () => {
  test('the frozen fixture reads as stored; unknown fields are kept (loose)', () => {
    const s = mem(); s.setItem(HEALTH_NUMBERS_KEY, JSON.stringify({...FROZEN_HEALTH_NUMBERS, later: true}));
    const read = readDeviceRecord(s, HEALTH_NUMBERS);
    expect(read.unreadable).toBe(false);
    expect(read.data.entries).toHaveLength(3);
    expect((read.data as Record<string, unknown>).later).toBe(true);
  });
  test('bounds: the cap refuses with a reason, nothing is dropped; out-of-range numbers are refused', () => {
    const many = Array.from({length: MAX_NUMBERS}, (_, i) => ({id: `b${i}`, date: TODAY, kind: 'bp' as const, systolic: 120, diastolic: 80}));
    const full = healthNumbersSchema.parse({version: 1, entries: many});
    expect(() => addNumbers(full, [lab()])).toThrow(LIMIT_MESSAGE);
    expect(healthNumbersSchema.safeParse({version: 1, entries: [...many, many[0]]}).success).toBe(false);
    expect(() => bpEntry({date: TODAY, systolic: '400', diastolic: '80'}, 'x', TODAY)).toThrow(/Upper number/);
    expect(() => bpEntry({date: TODAY, systolic: '80', diastolic: '120'}, 'x', TODAY)).toThrow(/larger one/);
    expect(() => bpEntry({date: '2026-11-02', systolic: '120', diastolic: '80'}, 'x', TODAY)).toThrow(/today or earlier/);
    expect(() => lab({value: '-3'})).toThrow(/Value/);
    expect(() => lab({refLow: '6', refHigh: '4'})).toThrow(/low end/);
    expect(healthNumbersSchema.safeParse({version: 1, entries: [{id: 'x', date: TODAY, kind: 'lab', name: 'A'}]}).success).toBe(false);
  });
  test('units are kept exactly as typed, and different units are never one line', () => {
    const a = lab({unit: ' mg/dL '}), b = lab({value: '5.1', unit: 'mmol/L'}), c = lab({name: 'GLUCOSE', value: '5.0', unit: 'mmol/L', date: '2026-10-01'});
    expect(a.unit).toBe('mg/dL');
    expect(b.value).toBe(5.1);
    const rec = addNumbers(emptyHealthNumbers(), [a, b, c]), m = markers(rec);
    expect(m.map(x => [x.unit, x.points.length])).toEqual([['mg/dL', 1], ['mmol/L', 2]]);
    expect(m[1]!.points.map(p => p.date)).toEqual(['2026-10-01', TODAY]);
    expect(knownNames(rec)).toEqual([{name: 'Glucose', unit: 'mg/dL'}, {name: 'Glucose', unit: 'mmol/L'}]);
  });
  test('the only verdict is the copied range; no range copied = no verdict', () => {
    expect(verdictOf(lab())).toBeNull();
    expect(verdictOf(lab({refLow: '3.9', refHigh: '5.6'}))).toBe('inside');
    expect(verdictOf(lab({refHigh: '5.2'}))).toBe('above');
    expect(verdictOf(lab({refLow: '6'}))).toBe('below');
    expect(verdictOf(lab({value: '5.6', refLow: '3.9', refHigh: '5.6'}))).toBe('inside');
    expect(verdictOf({kind: 'bp'})).toBeNull();
    expect(rangeText({refHigh: 5.2})).toBe('up to 5.2');
    expect(rangeText({})).toBeNull();
    for (const w of [...Object.values(VERDICT_WORDS), BP_LINE]) expect(w).not.toMatch(/\b(normal|healthy|good|bad|high risk|abnormal|should)\b/i);
  });
  test('remove, then Undo puts it back once; blood pressure in date order', () => {
    const one = bpEntry({date: '2026-10-02', systolic: '125', diastolic: '82', pulse: '', note: ' after a walk '}, 'b1', TODAY), two = bpEntry({date: '2026-10-01', systolic: '120', diastolic: '79'}, 'b2', TODAY);
    expect(one).toEqual({id: 'b1', date: '2026-10-02', kind: 'bp', systolic: 125, diastolic: 82, note: 'after a walk'});
    let rec = addNumbers(emptyHealthNumbers(), [one, two]);
    expect(bpReadings(rec).map(e => e.id)).toEqual(['b2', 'b1']);
    rec = removeNumber(rec, 'b1');
    rec = restoreNumber(restoreNumber(rec, one), one);
    expect(rec.entries.filter(e => e.id === 'b1')).toHaveLength(1);
  });
  test('writes go through the device record and validate', () => {
    const s = mem();
    updateDeviceRecord(s, HEALTH_NUMBERS, r => addNumbers(r, [lab()]));
    expect(readDeviceRecord(s, HEALTH_NUMBERS).data.entries).toHaveLength(1);
    expect(() => updateDeviceRecord(s, HEALTH_NUMBERS, r => ({...r, entries: [{...r.entries[0]!, value: Number.NaN} as HealthNumber]}))).toThrow();
  });
  test('the Showcase example is valid, labelled and shows both verdicts', () => {
    const rec = showcaseHealthNumbers(TODAY);
    expect(rec.entries.filter(e => e.note).every(e => /Showcase/.test(e.note!))).toBe(true);
    const verdicts = new Set(rec.entries.map(verdictOf));
    expect(verdicts.has('inside') && verdicts.has('above')).toBe(true);
    // The latest value on a card shows both ways too: Vitamin D below its copied range, Total cholesterol inside it now.
    const latest = Object.fromEntries(markers(rec).map(m => [m.name, verdictOf(m.latest)]));
    expect(latest).toMatchObject({'Vitamin D (25-OH)': 'below', 'Total cholesterol': 'inside', 'Glucose (fasting)': 'inside'});
    expect(rec.entries.every(e => e.date <= TODAY)).toBe(true);
  });
});

describe('the lab sheet photo (label-scan pattern)', () => {
  const settings = {provider: 'local' as const, model: 'vision', localServer: 'ollama' as const, baseUrl: null, maxOutputTokens: 8000};
  test('one request: the photo and the instructions only, the output cap kept', () => {
    const r = labSheetRequest({settings, key: null, image: {mime: 'image/jpeg', data: 'AAA'}});
    expect(r.messages).toHaveLength(1);
    expect(r.system).toBe(LAB_SHEET_SYSTEM);
    expect(r.maxOutputTokens).toBe(3000);
    expect(LAB_SHEET_SYSTEM).toMatch(/never interpret/);
  });
  test('a reply becomes an editable draft; bad rows are skipped, wrong-way ranges dropped, future dates refused', () => {
    const text = 'Here: ```json\n' + JSON.stringify({readable: true, date: '2026-10-28', results: [
      {name: 'Glucose', value: 5.4, unit: 'mmol/L', ref_low: 3.9, ref_high: 5.6},
      {name: 'LDL', value: '3,1', unit: 'mmol/L', ref_low: null, ref_high: 3.0},
      {name: 'Ferritin', value: 40, unit: 'µg/L', ref_low: 300, ref_high: 30},
      {name: '', value: 1}, {name: 'Neg', value: -1}, {name: 'Text', value: 'negative'},
    ]}) + '\n```';
    const out = readLabSheetReply(text, TODAY);
    expect(out).toEqual({ok: true, date: '2026-10-28', skipped: 3, rows: [
      {name: 'Glucose', value: '5.4', unit: 'mmol/L', refLow: '3.9', refHigh: '5.6'},
      {name: 'LDL', value: '3.1', unit: 'mmol/L', refLow: '', refHigh: '3'},
      {name: 'Ferritin', value: '40', unit: 'µg/L', refLow: '', refHigh: ''},
    ]});
    const future = readLabSheetReply(JSON.stringify({readable: true, date: '2027-01-01', results: [{name: 'A', value: 1}]}), TODAY);
    expect(future.ok && future.date).toBeNull();
    expect(readLabSheetReply('no json here', TODAY).ok).toBe(false);
    expect(readLabSheetReply('{"readable": false, "results": []}', TODAY)).toMatchObject({ok: false});
  });
  test('the run reads a streamed reply through a fake (no model is called in tests)', async () => {
    async function* fake(): AsyncIterable<ChatEvent> { yield {type: 'text', delta: '{"readable":true,"results":[{"name":"HbA1c","value":38,"unit":"mmol/mol"}]}'}; yield {type: 'usage', input: 10, output: 5}; }
    const out = await runLabSheetScan(labSheetRequest({settings, key: null, image: {mime: 'image/jpeg', data: 'A'}}), fake, TODAY);
    expect(out).toMatchObject({ok: true, requests: 1, usage: {input: 10, output: 5}});
  });
});
