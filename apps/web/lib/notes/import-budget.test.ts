import {deflateRawSync} from 'node:zlib';
import {describe, expect, test} from 'vitest';
import {buildStoredZip} from '../export/zip';
import {notesExportEntries, notesExportName, planImport, applyImport} from './markdown';
import {readNoteFiles, type PickedFile} from './read-files';
import {emptyNotes, notesSchema} from './schema';
import {showcaseNotes} from './showcase';
import {MAX_DAMAGED, NOTE_ZIP_CAPS, STOPPED_MESSAGE, inflateBudget, inflateRaw, readZip, type Inflate} from './zip-read';

/** Session AK security review Z1B-5 (the notes ZIP reader's unpacking budget) and Z1B-6 (Showcase notes stay apart). */
const NOW = '2026-11-01T10:00:00.000Z', DAY = '2026-11-01', MB = 1024 * 1024;
const enc = new TextEncoder();
const le16 = (n: number) => [n & 255, (n >> 8) & 255], le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
const timed = async <T,>(run: () => Promise<T>): Promise<[T, number]> => { const t0 = performance.now(); const out = await run(); return [out, performance.now() - t0]; };

/** A ZIP of deflated entries with a WRONG check value each; `shared` points every central entry at one local entry. */
function damagedZip(count: number, body: Uint8Array, declared: number, {shared = false} = {}): Uint8Array {
  const out: number[] = [], central: number[] = [], offsets: number[] = [];
  for (let i = 0; i < (shared ? 1 : count); i++) {
    const name = enc.encode(`e${i}.md`);
    offsets.push(out.length);
    out.push(...le32(0x04034B50), ...le16(20), ...le16(0), ...le16(8), ...le16(0), ...le16(0), ...le32(0xdeadbeef), ...le32(body.length), ...le32(declared), ...le16(name.length), ...le16(0), ...name);
    for (const b of body) out.push(b);
  }
  for (let i = 0; i < count; i++) {
    const name = enc.encode(`n${i}.md`);
    central.push(...le32(0x02014B50), ...le16(20), ...le16(20), ...le16(0), ...le16(8), ...le16(0), ...le16(0), ...le32(0xdeadbeef), ...le32(body.length), ...le32(declared), ...le16(name.length), ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offsets[shared ? 0 : i]!), ...name);
  }
  const cd = out.length;
  out.push(...central, ...le32(0x06054B50), ...le16(0), ...le16(0), ...le16(count), ...le16(count), ...le32(central.length), ...le32(cd), ...le16(0));
  return new Uint8Array(out);
}
/** Counts what an inflater produced. */
function counting(): {inflate: Inflate; total: () => number} {
  let total = 0;
  return {inflate: async (c, max, signal) => { try { const out = await inflateRaw(c, max, signal); total += out.length; return out; } catch (e) { total += (e as {inflated?: number}).inflated ?? 0; throw e; } }, total: () => total};
}
const picked = (name: string, data: Uint8Array, type = ''): PickedFile => ({name, size: data.length, type, arrayBuffer: async () => data.slice().buffer});

describe('Z1B-5: every inflated byte counts, overlapping entries are refused, one budget per import', () => {
  test('the review\'s ZIP (2,000 entries sharing one bomb, all failing their check) costs one entry, not 2 GB', async () => {
    const comp = new Uint8Array(11_000);
    comp.set(deflateRawSync(Buffer.alloc(1_500_000, 0x61), {level: 9}));
    const zip = damagedZip(2000, comp, 1_000_000, {shared: true});
    expect(zip.length).toBeLessThan(200_000);
    const meter = counting();
    const [out, ms] = await timed(() => readZip(zip, () => true, {inflate: meter.inflate}));
    expect(ms).toBeLessThan(3000); // 13.8 s before the fix
    expect(out.files).toEqual([]);
    expect(out.skipped).toHaveLength(2000);
    expect(meter.total()).toBeLessThanOrEqual(NOTE_ZIP_CAPS.maxFile + 70_000);
    expect(out.skipped[0]!.reason).toBe('it is larger than ZIGoals reads');
    expect(out.skipped.filter(s => /overlaps another entry/.test(s.reason))).toHaveLength(MAX_DAMAGED);
    expect(out.skipped.at(-1)!.reason).toBe('the archive is damaged in too many places');
  });

  test('entries that fail their check are charged what they inflated; the rest wait for the budget', async () => {
    const comp = new Uint8Array(deflateRawSync(new Uint8Array(MB).fill(0x61)));
    // Ten separate entries, each 1 MB of real text with a wrong check; a 3 MB budget.
    const caps = {...NOTE_ZIP_CAPS, maxTotal: 3 * MB, maxRatio: 1e9}, meter = counting();
    const out = await readZip(damagedZip(10, comp, MB), () => true, {caps, inflate: meter.inflate});
    expect(out.files).toEqual([]);
    expect(out.skipped.map(s => s.reason)).toEqual([...Array(3).fill('it is damaged (its check does not match)'), ...Array(7).fill('the archive holds more than ZIGoals reads at once')]);
    expect(meter.total()).toBe(3 * MB);
  });

  test('a stored entry whose sizes disagree is damaged and never copied', async () => {
    const zip = buildStoredZip([{name: 'a.md', data: 'hello', modified: new Date(NOW)}]);
    // The central entry's uncompressed size (offset 24 of the central header) now says 4.
    const end = zip.length - 22, cd = zip[end + 16]! | (zip[end + 17]! << 8) | (zip[end + 18]! << 16);
    zip[cd + 24] = 4;
    expect((await readZip(zip, () => true)).skipped).toEqual([{name: 'a.md', reason: 'it is damaged'}]);
  });

  test('one budget across every file of one import: two 20 MB ZIPs give 30 MB of notes, then say why', async () => {
    const file = (i: number) => ({name: `f${i}.md`, data: new Uint8Array(MB).fill(0x62), modified: new Date(NOW)});
    const a = buildStoredZip(Array.from({length: 20}, (_, i) => file(i))), b = buildStoredZip(Array.from({length: 20}, (_, i) => file(20 + i)));
    const out = await readNoteFiles([picked('a.zip', a), picked('b.zip', b), picked('late.md', enc.encode('# late'))]);
    expect(out.files).toHaveLength(30);
    expect(out.skipped.map(s => s.name)).toEqual([...Array.from({length: 10}, (_, i) => `f${30 + i}.md`), 'late.md']);
    expect(new Set(out.skipped.map(s => s.reason))).toEqual(new Set(['the archive holds more than ZIGoals reads at once', 'the files hold more than ZIGoals reads at once']));
    // A budget passed in is the one used (a caller can share it further).
    const budget = inflateBudget();
    await readNoteFiles([picked('one.md', enc.encode('words'))], {budget});
    expect(budget.left).toBe(NOTE_ZIP_CAPS.maxTotal - 5);
  });

  test('Stop: an aborted import stops between files and inside an archive, with a plain message', async () => {
    const stop = new AbortController();
    stop.abort();
    await expect(readNoteFiles([picked('a.md', enc.encode('a'))], {signal: stop.signal})).rejects.toThrow(STOPPED_MESSAGE);
    const zip = buildStoredZip(Array.from({length: 5}, (_, i) => ({name: `n${i}.md`, data: 'x', modified: new Date(NOW)})));
    await expect(readZip(zip, () => true, {signal: stop.signal})).rejects.toThrow(STOPPED_MESSAGE);
    // Stopped while inflating: the inflater sees the signal between chunks.
    const later = new AbortController();
    const big = deflateRawSync(Buffer.alloc(900_000, 0x63));
    const stopping: Inflate = (c, max, signal) => { later.abort(); return inflateRaw(c, max, signal); };
    const zipped = damagedZip(1, new Uint8Array(big), 900_000);
    await expect(readZip(zipped, () => true, {inflate: stopping, signal: later.signal, caps: {...NOTE_ZIP_CAPS, maxRatio: 1e9}})).rejects.toThrow(STOPPED_MESSAGE);
  });

  test('ordinary files still read as before', async () => {
    const out = await readNoteFiles([picked('Ideas.md', enc.encode('# Ideas')), picked('pic.png', new Uint8Array([1])), picked('big.md', new Uint8Array(600 * 1024))]);
    expect(out.files.map(f => f.name)).toEqual(['Ideas.md']);
    expect(out.skipped).toEqual([{name: 'pic.png', reason: 'it is not a Markdown, text or ZIP file'}, {name: 'big.md', reason: 'it is over 512 kB'}]);
  });
});

describe('Z1B-6: Showcase example notes never join the person\'s own notes', () => {
  const exported = () => notesExportEntries(showcaseNotes(DAY), {goals: [], habits: []}, {now: new Date(NOW)})
    .filter(e => e.name.endsWith('.md') && !e.name.startsWith('ZIGoals/'))
    .map(e => ({name: e.name, data: typeof e.data === 'string' ? enc.encode(e.data) : e.data}));

  test('a Showcase export is named as one', () => {
    expect(notesExportName(DAY, true)).toBe('zigoals-example-notes-2026-11-01.zip');
    expect(notesExportName(DAY, false)).toBe('zigoals-notes-2026-11-01.zip');
  });

  test('importing a Showcase export into real notes adds nothing and says why, in a plain sentence', () => {
    const files = exported();
    expect(files).toHaveLength(8);
    const plan = planImport(emptyNotes(), files, NOW, DAY);
    expect(plan.add).toEqual([]);
    expect(plan.append).toEqual([]);
    expect(plan.skipped).toHaveLength(8);
    expect(new Set(plan.skipped.map(s => s.reason))).toEqual(new Set(['it is a Showcase example note, so it stays out of your own notes']));
  });

  test('without its front-matter, the "(SHOWCASE DATA)" line still marks it; a real note beside it is imported', () => {
    const plan = planImport(emptyNotes(), [
      {name: 'Japan.md', data: enc.encode('Kyoto in spring\n\n(SHOWCASE DATA)\n')},
      {name: 'Mine.md', data: enc.encode('---\nexample: false\n---\nMy own words')},
    ], NOW, DAY);
    expect(plan.skipped.map(s => s.name)).toEqual(['Japan.md']);
    expect(plan.add.map(n => [n.title, n.example])).toEqual([['Mine', undefined]]);
  });

  test('into the Showcase they are imported and keep their Example mark', () => {
    const plan = planImport(emptyNotes(), exported(), NOW, DAY, {showcase: true});
    expect(plan.add).toHaveLength(8);
    expect(plan.add.every(n => n.example === true)).toBe(true);
    expect(notesSchema.safeParse(applyImport(emptyNotes(), plan, NOW).record).success).toBe(true);
  });
});
