import {describe, expect, test} from 'vitest';
import {createEmptyHealth, healthSchema} from '../../health';
import {emptyHabitData, habitDataSchema} from '../../habits';
import {buildStoredZip} from '../../export/zip';
import {readFiles} from './read';
import {previewImport} from './apply';
import {previewHabits} from './loop';
import type {ImportFile} from './source';
import {APPLE_XML, FITBIT, LOOP, OURA, SAMSUNG, fileOf} from './test-fixtures';

// Session X P2.4: hostile and broken exports into "Switch to ZIGoals". Each vendor's fictional export (test-fixtures)
// is cut short, has bytes swapped, absurd numbers and dates, bidirectional and emoji text, another encoding, or comes
// inside a broken ZIP; seeded, so every run is the same. Whatever arrives, the reader either refuses in words or hands
// back a plan whose result passes the Health or Habits schema: never a crash, never a value the journal cannot hold.
const ctx = {zone: 'Europe/Brussels', now: Date.parse('2026-10-07T00:00:00Z')};
function rng(seed: number) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const NUMBERS = ['1e308', '-1', 'NaN', '999999999999999', '0', '-0', 'Infinity', '١٢٣', '1,5', '0x10', ''];
const DATES = ['0000-00-00', '9999-12-31', '1800-01-01', '2026-02-30', '2026-13-01', '2026-10-01T25:61:00', ''];
const TEXT = ['‮evil‬', '🏃‍♀️ Run', 'שינה', 'نوم', '"; DROP', '=HYPERLINK("x")', '\u0000', '<script>'];
type Files = Record<string, string>;
type Mutation = (text: string, r: () => number) => string;
const pick = <T,>(list: readonly T[], r: () => number) => list[Math.floor(r() * list.length)]!;
const MUTATIONS: Record<string, Mutation> = {
  'cut short': (t, r) => t.slice(0, Math.floor(r() * t.length)),
  'bytes swapped': (t, r) => { const a = [...t]; for (let i = 0; i < 1 + Math.floor(r() * 6); i++) a[Math.floor(r() * a.length)] = pick(['<', '>', '"', ',', ';', '\n', '\r', '\0', '{', '}', 'é'], r); return a.join(''); },
  'absurd numbers': (t, r) => t.replace(/(?<![\w-])\d+(?:\.\d+)?(?![\w-])/g, m => r() < 0.3 ? pick(NUMBERS, r) : m),
  'absurd dates': (t, r) => t.replace(/\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2})?)?/g, m => r() < 0.3 ? pick(DATES, r) : m),
  'hostile text': (t, r) => t.replace(/Fictional [A-Za-z]+|Meditate|Run|Water/g, m => r() < 0.5 ? pick(TEXT, r) : m),
  'lines doubled and dropped': (t, r) => t.split('\n').flatMap(line => { const x = r(); return x < 0.1 ? [] : x < 0.2 ? [line, line] : [line]; }).join('\n'),
};
const EXPORTS: Record<string, Files> = {'Apple Health': {'apple_health_export/export.xml': APPLE_XML}, Fitbit: FITBIT, Samsung: SAMSUNG, Oura: OURA, Loop: LOOP};
// What a refusal or a thrown error must never look like: a JavaScript or parser internal shown to a person.
const INTERNAL = /undefined|is not a function|Cannot read|Unexpected token|in JSON|RangeError|TypeError|ZodError|"code":|Maximum call stack|NaN/;

async function outcome(files: ImportFile[]) {
  let read;
  try { read = await readFiles(files, ctx); }
  catch (error) { expect(error, 'a thrown value is an Error').toBeInstanceOf(Error); return {error: (error as Error).message}; }
  if (read.kind === 'refused') return {error: read.message};
  if (read.kind === 'health') {
    const {next} = previewImport(createEmptyHealth(), read.plan.items, '2026-10-07T00:00:00.000Z');
    const parsed = healthSchema.safeParse(next);
    expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 2))).toBe(true);
    expect(JSON.stringify(next)).not.toMatch(/NaN|Infinity|null,null/);
    return {health: Object.values(read.plan.items).reduce((n, list) => n + list.length, 0)};
  }
  const {next} = previewHabits(emptyHabitData(), read.plan.habits);
  const parsed = habitDataSchema.safeParse(next);
  expect(parsed.success, parsed.success ? '' : JSON.stringify(parsed.error.issues.slice(0, 2))).toBe(true);
  return {habits: next.habits.length};
}
const filesFrom = (files: Files) => Object.entries(files).map(([path, text]) => fileOf(path, text));
const bytesFile = (path: string, bytes: Uint8Array): ImportFile => { const blob = new Blob([bytes as Uint8Array<ArrayBuffer>]); return {path, size: blob.size, open: async () => blob.stream() as ReadableStream<Uint8Array>}; };

describe('every export, broken on purpose', () => {
  for (const [name, files] of Object.entries(EXPORTS)) {
    test(`${name}: 6 kinds of damage × 12 seeds: a plain refusal or a plan the journal can hold`, async () => {
      const seen = {refused: 0, read: 0};
      for (const [kind, mutate] of Object.entries(MUTATIONS)) for (let seed = 1; seed <= 12; seed++) {
        const r = rng(seed * 7919 + kind.length);
        const damaged = Object.fromEntries(Object.entries(files).map(([path, text]) => [path, mutate(text, r)]));
        const result = await outcome(filesFrom(damaged));
        if ('error' in result) { expect(result.error, `${name} ${kind} #${seed}`).toMatch(/\w{3}/); expect(result.error, `${name} ${kind} #${seed}: ${result.error}`).not.toMatch(INTERNAL); seen.refused++; }
        else seen.read++;
      }
      expect(seen.refused + seen.read).toBe(72);
    }, 120_000);
  }
});

describe('encodings and containers', () => {
  test('UTF-16 with a byte-order mark, Latin-1 bytes and an empty file are refused in words or read cleanly', async () => {
    const utf16 = (text: string) => { const out = new Uint8Array(2 + text.length * 2); out[0] = 0xff; out[1] = 0xfe; for (let i = 0; i < text.length; i++) { out[2 + i * 2] = text.charCodeAt(i) & 0xff; out[3 + i * 2] = text.charCodeAt(i) >> 8; } return out; };
    for (const files of [
      [bytesFile('apple_health_export/export.xml', utf16(APPLE_XML))],
      Object.entries(FITBIT).map(([path, text]) => bytesFile(path, utf16(text))),
      [bytesFile('apple_health_export/export.xml', Uint8Array.from(APPLE_XML.replace('Fictional', 'Fictíonal'), c => c.charCodeAt(0) & 0xff))],
      [bytesFile('apple_health_export/export.xml', new Uint8Array())],
    ]) {
      const result = await outcome(files);
      if ('error' in result) expect(result.error).not.toMatch(INTERNAL);
    }
  });
  test('a ZIP cut short or with its directory damaged is refused in words; nothing is read from it', async () => {
    const zip = buildStoredZip([{name: 'apple_health_export/export.xml', data: APPLE_XML, modified: new Date('2026-10-06T19:00:00Z')}]);
    for (const cut of [10, 100, Math.floor(zip.length / 2), zip.length - 30, zip.length - 1]) {
      const result = await outcome([bytesFile('export.zip', zip.slice(0, cut))]);
      expect('error' in result, `cut at ${cut}`).toBe(true);
      expect((result as {error: string}).error).not.toMatch(INTERNAL);
    }
    const damaged = zip.slice(); damaged.fill(0xff, zip.length - 22, zip.length - 12);
    const result = await outcome([bytesFile('export.zip', damaged)]);
    expect('error' in result).toBe(true); expect((result as {error: string}).error).not.toMatch(INTERNAL);
  });
  test('an XML export that declares entities (a "billion laughs" file) expands nothing and stays small', async () => {
    const laughs = APPLE_XML.replace('<!DOCTYPE HealthData [', '<!DOCTYPE HealthData [\n<!ENTITY a "aaaaaaaaaa"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;"><!ENTITY d "&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;">')
      .replace('sourceName="Fictional Watch"', 'sourceName="&d;"');
    const result = await outcome([fileOf('apple_health_export/export.xml', laughs)]);
    if ('error' in result) expect(result.error).not.toMatch(INTERNAL);
    else expect(JSON.stringify(result)).not.toContain('aaaaaaaaaaaaaaaaaaaa');
  });
});

describe('what the fuzz found, kept fixed', () => {
  test('Oura: a row with an impossible day (2026-02-30) is skipped and counted; the rest of the export is read', async () => {
    const files = {...OURA, 'oura-export/App Data/dailyactivity.csv': 'id;day;steps;active_calories;total_calories\nd1;2026-10-05;9000;420;2400\nd2;2026-02-30;500;10;1500\n'};
    const read = await readFiles(filesFrom(files), ctx);
    expect(read.kind).toBe('health');
    if (read.kind !== 'health') return;
    expect(read.plan.items.activity.map(a => a.date)).toEqual(['2026-10-05']);
    expect(healthSchema.safeParse(previewImport(createEmptyHealth(), read.plan.items, '2026-10-07T00:00:00.000Z').next).success).toBe(true);
  });
  test('Loop: a check-in on an impossible day is skipped; a habit listed twice is read once, and the person is told', async () => {
    const files = {...LOOP, 'Habits.csv': LOOP['Habits.csv'] + '001,Meditate,YES_NO,Did you meditate today?,,1,1,#FF8F00,,AT_LEAST,0,false\n', '002 Run/Checkmarks.csv': 'Date,Value,Notes\n2026-10-05,2,\n2026-02-30,2,\n2026-13-01,2,\n'};
    const read = await readFiles(filesFrom(files), ctx);
    expect(read.kind).toBe('habits');
    if (read.kind !== 'habits') return;
    expect(read.plan.habits.map(h => h.title)).toEqual(['Meditate', 'Run', 'Water', 'Old habit']);
    expect(read.plan.habits[1]!.entries.map(e => e.date)).toEqual(['2026-10-05']);
    expect(read.plan.warnings).toContain('1 habit is listed twice in Habits.csv; it was read once.');
    expect(habitDataSchema.safeParse(previewHabits(emptyHabitData(), read.plan.habits).next).success).toBe(true);
  });
});
