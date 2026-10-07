import {describe, expect, test} from 'vitest';
import {buildStoredZip} from '../export/zip';
import {entryStream, entryText, listZip, ZIP_ERRORS, crcStep} from './zip-stream';
import {decodeEntities, parseAttrs, scanXml, XML_ERRORS, type XmlStart} from './xml-scan';

// Session W Part 7: the ZIP reader and the XML scanner the importers stand on. Archives are built here, byte by byte, to
// the ZIP specification (PKWARE APPNOTE): stored and deflated entries, data descriptors, Zip64. Everything is fictional.
const enc = new TextEncoder();
const crc = (b: Uint8Array) => (crcStep(0xFFFFFFFF, b) ^ 0xFFFFFFFF) >>> 0;
async function deflate(data: Uint8Array): Promise<Uint8Array> { return new Uint8Array(await new Response(new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer()); }
type Spec = {name: string; data: Uint8Array; method?: 0 | 8; descriptor?: boolean; flags?: number; badCrc?: boolean};
/** A ZIP with each entry as asked; `zip64` writes the Zip64 end record, locator and 0xFFFFFFFF fields with the extra field. */
async function zip(specs: Spec[], {zip64 = false} = {}): Promise<Blob> {
  const parts: Uint8Array[] = [], central: Uint8Array[] = [];
  let offset = 0;
  for (const spec of specs) {
    const method = spec.method ?? 0, body = method === 8 ? await deflate(spec.data) : spec.data, name = enc.encode(spec.name);
    const flags = (spec.flags ?? 0) | 0x0800 | (spec.descriptor ? 0x0008 : 0), sum = spec.badCrc ? crc(spec.data) ^ 1 : crc(spec.data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034B50, true); local.setUint16(4, 45, true); local.setUint16(6, flags, true); local.setUint16(8, method, true);
    if (!spec.descriptor) { local.setUint32(14, sum, true); local.setUint32(18, body.length, true); local.setUint32(22, spec.data.length, true); }
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, body);
    if (spec.descriptor) { const d = new DataView(new ArrayBuffer(16)); d.setUint32(0, 0x08074B50, true); d.setUint32(4, sum, true); d.setUint32(8, body.length, true); d.setUint32(12, spec.data.length, true); parts.push(new Uint8Array(d.buffer)); }
    const extra = zip64 ? new DataView(new ArrayBuffer(28)) : null;
    if (extra) { extra.setUint16(0, 0x0001, true); extra.setUint16(2, 24, true); extra.setBigUint64(4, BigInt(spec.data.length), true); extra.setBigUint64(12, BigInt(body.length), true); extra.setBigUint64(20, BigInt(offset), true); }
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014B50, true); c.setUint16(4, 45, true); c.setUint16(6, 45, true); c.setUint16(8, flags, true); c.setUint16(10, method, true);
    c.setUint32(16, sum, true); c.setUint32(20, zip64 ? 0xFFFFFFFF : body.length, true); c.setUint32(24, zip64 ? 0xFFFFFFFF : spec.data.length, true);
    c.setUint16(28, name.length, true); c.setUint16(30, extra ? 28 : 0, true); c.setUint32(42, zip64 ? 0xFFFFFFFF : offset, true);
    central.push(new Uint8Array(c.buffer), name, ...(extra ? [new Uint8Array(extra.buffer)] : []));
    offset += 30 + name.length + body.length + (spec.descriptor ? 16 : 0);
  }
  const dirSize = central.reduce((t, b) => t + b.length, 0), tail: Uint8Array[] = [];
  if (zip64) {
    const r = new DataView(new ArrayBuffer(56));
    r.setUint32(0, 0x06064B50, true); r.setBigUint64(4, 44n, true); r.setUint16(12, 45, true); r.setUint16(14, 45, true);
    r.setBigUint64(24, BigInt(specs.length), true); r.setBigUint64(32, BigInt(specs.length), true); r.setBigUint64(40, BigInt(dirSize), true); r.setBigUint64(48, BigInt(offset), true);
    const l = new DataView(new ArrayBuffer(20));
    l.setUint32(0, 0x07064B50, true); l.setBigUint64(8, BigInt(offset + dirSize), true); l.setUint32(16, 1, true);
    tail.push(new Uint8Array(r.buffer), new Uint8Array(l.buffer));
  }
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054B50, true); e.setUint16(8, zip64 ? 0xFFFF : specs.length, true); e.setUint16(10, zip64 ? 0xFFFF : specs.length, true);
  e.setUint32(12, zip64 ? 0xFFFFFFFF : dirSize, true); e.setUint32(16, zip64 ? 0xFFFFFFFF : offset, true);
  return new Blob([...parts, ...central, ...tail, new Uint8Array(e.buffer)] as BlobPart[]);
}
const text = 'Date,Value\n' + Array.from({length: 2000}, (_, i) => `2026-10-${String(1 + i % 28).padStart(2, '0')},${i}`).join('\n');

describe('the ZIP reader', () => {
  test('lists and reads stored and deflated entries, with and without data descriptors', async () => {
    const archive = await zip([{name: 'Habits.csv', data: enc.encode('Position,Name\n001,Walk\n')}, {name: 'Walk/Checkmarks.csv', data: enc.encode(text), method: 8, descriptor: true}]);
    const entries = await listZip(archive);
    expect(entries.map(e => [e.name, e.method])).toEqual([['Habits.csv', 0], ['Walk/Checkmarks.csv', 8]]);
    expect(await entryText(archive, entries[0]!)).toBe('Position,Name\n001,Walk\n');
    expect(await entryText(archive, entries[1]!)).toBe(text);
  });
  test('reads the archives "Export everything" writes', async () => {
    const bytes = buildStoredZip([{name: 'README.txt', data: enc.encode('hello'), modified: new Date('2026-10-07T10:00:00Z')}]);
    const archive = new Blob([bytes as BlobPart]), [entry] = await listZip(archive);
    expect(entry!.name).toBe('README.txt');
    expect(await entryText(archive, entry!)).toBe('hello');
  });
  test('Zip64: sizes and offsets from the extra field, the counts from the Zip64 end record', async () => {
    const archive = await zip([{name: 'apple_health_export/export.xml', data: enc.encode('<HealthData/>'), method: 8}, {name: 'b.txt', data: enc.encode('b')}], {zip64: true});
    const entries = await listZip(archive);
    expect(entries.map(e => e.name)).toEqual(['apple_health_export/export.xml', 'b.txt']);
    expect(await entryText(archive, entries[0]!)).toBe('<HealthData/>');
    expect(await entryText(archive, entries[1]!)).toBe('b');
  });
  test('refuses what it cannot read, in plain words', async () => {
    await expect(listZip(new Blob([enc.encode('not a zip at all, just text that is long enough')]))).rejects.toThrow(ZIP_ERRORS.notZip);
    const good = await zip([{name: 'a.csv', data: enc.encode(text), method: 8}]);
    await expect(listZip(good.slice(0, good.size - 30))).rejects.toThrow();
    const bad = await zip([{name: 'a.csv', data: enc.encode(text), badCrc: true}]);
    await expect(entryText(bad, (await listZip(bad))[0]!)).rejects.toThrow(ZIP_ERRORS.crc);
    const locked = await zip([{name: 'a.csv', data: enc.encode('x'), flags: 0x0001}]);
    await expect(entryStream(locked, (await listZip(locked))[0]!)).rejects.toThrow(ZIP_ERRORS.encrypted);
    const [entry] = await listZip(good);
    await expect(entryStream(good, {...entry!, method: 12})).rejects.toThrow(ZIP_ERRORS.method);
    await expect(entryText(good, entry!, 10)).rejects.toThrow('larger than ZIGoals reads in one piece');
  });
  test('a large deflated entry streams in pieces, never as one buffer', async () => {
    const big = enc.encode('<Record type="HKQuantityTypeIdentifierStepCount" value="12"/>\n'.repeat(80_000));
    const archive = await zip([{name: 'export.xml', data: big, method: 8}]), [entry] = await listZip(archive);
    const reader = (await entryStream(archive, entry!)).getReader();
    let pieces = 0, total = 0, largest = 0;
    for (;;) { const {done, value} = await reader.read(); if (done) break; pieces++; total += value.length; largest = Math.max(largest, value.length); }
    expect(total).toBe(big.length);
    expect(pieces).toBeGreaterThan(5);
    expect(largest).toBeLessThan(big.length / 4);
  });
});

async function* pieces(text: string, size: number) { for (let i = 0; i < text.length; i += size) yield text.slice(i, i + size); }
describe('the XML scanner', () => {
  const doc = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE HealthData [
<!-- HealthKit Export Version: 14 -->
<!ELEMENT HealthData (ExportDate,Me,(Record|Correlation|Workout|ActivitySummary)*)>
<!ATTLIST HealthData locale CDATA #REQUIRED>
<!ELEMENT Record ((MetadataEntry|HeartRateVariabilityMetadataList)*)>
]>
<HealthData locale="en_BE">
 <ExportDate value="2026-10-06 21:00:00 +0200"/>
 <!-- a comment with <tags> inside -->
 <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Ann&apos;s iPhone" unit="count" startDate="2026-10-05 08:00:00 +0200" endDate="2026-10-05 08:10:00 +0200" value="1200"/>
 <Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Watch &amp; Co" value="HKCategoryValueSleepAnalysisAsleepDeep" startDate="2026-10-05 01:00:00 +0200" endDate="2026-10-05 01:40:00 +0200">
  <MetadataEntry key="HKTimeZone" value="Europe/Brussels"/>
 </Record>
 <Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="31.5" durationUnit="min" startDate="2026-10-05 18:00:00 +0200" endDate="2026-10-05 18:31:30 +0200">
  <WorkoutStatistics type="HKQuantityTypeIdentifierDistanceWalkingRunning" sum="5.1" unit="km"/>
  <![CDATA[ <Record type="never"/> ]]>
 </Workout>
</HealthData>`;
  test('reports starts with attributes, depth and parent, skipping the DTD, comments and CDATA, whatever the chunk size', async () => {
    for (const size of [1, 7, 64, 10_000]) {
      const seen: XmlStart[] = [], ends: string[] = [];
      const result = await scanXml(pieces(doc, size), e => { seen.push(e); }, {onEnd: name => ends.push(name)});
      expect(seen.map(e => e.name), `chunk ${size}`).toEqual(['HealthData', 'ExportDate', 'Record', 'Record', 'MetadataEntry', 'Workout', 'WorkoutStatistics']);
      expect(result.elements).toBe(7);
      expect(seen[2]!.attrs).toMatchObject({type: 'HKQuantityTypeIdentifierStepCount', sourceName: "Ann's iPhone", value: '1200', startDate: '2026-10-05 08:00:00 +0200'});
      expect(seen[3]!.attrs.sourceName).toBe('Watch & Co');
      expect(seen[4]).toMatchObject({name: 'MetadataEntry', depth: 2, parent: 'Record', selfClosing: true});
      expect(seen[6]).toMatchObject({parent: 'Workout', attrs: {sum: '5.1', unit: 'km'}});
      expect(ends).toEqual(['ExportDate', 'Record', 'MetadataEntry', 'Record', 'WorkoutStatistics', 'Workout', 'HealthData']);
    }
  });
  test('entities: the five named ones and numeric references, nothing from a DTD', () => {
    expect(decodeEntities('a &lt; b &amp;&amp; c &gt; d &quot;q&quot; &apos;s&apos; &#233; &#x1F600; &custom;')).toBe('a < b && c > d "q" \'s\' é 😀 &custom;');
  });
  test('a name written twice keeps both values (iOS 16.0 wrote WorkoutStatistics with startDate twice, the second being the end)', () => {
    expect(parseAttrs(' type="X" startDate="2026-10-03 18:00:00 +0200" startDate="2026-10-03 18:30:30 +0200" sum="300"')).toEqual({type: 'X', startDate: '2026-10-03 18:00:00 +0200', 'startDate#2': '2026-10-03 18:30:30 +0200', sum: '300'});
  });
  test('stops early on request, and refuses broken or endless input', async () => {
    let n = 0;
    expect((await scanXml(pieces(doc, 50), () => (++n === 3 ? 'stop' : undefined))).elements).toBe(3);
    await expect(scanXml(pieces('<a><b></a>', 3), () => undefined)).rejects.toThrow(XML_ERRORS.malformed);
    await expect(scanXml(pieces('<a><b>', 3), () => undefined)).rejects.toThrow(XML_ERRORS.malformed);
    await expect(scanXml(pieces('<Record value="' + 'x'.repeat(5000), 100), () => undefined, {maxTag: 1000})).rejects.toThrow(XML_ERRORS.tooLong);
    const controller = new AbortController(); controller.abort();
    await expect(scanXml(pieces(doc, 10), () => undefined, {signal: controller.signal})).rejects.toThrow(XML_ERRORS.stopped);
  });
  test('500 MB of generated records stream through in bounded memory', async () => {
    const record = '<Record type="HKQuantityTypeIdentifierStepCount" sourceName="Fictional phone" unit="count" startDate="2026-10-05 08:00:00 +0200" endDate="2026-10-05 08:10:00 +0200" value="12"/>\n';
    const target = 500 * 1024 * 1024, perChunk = Math.floor(1_048_576 / record.length), chunk = record.repeat(perChunk), count = Math.ceil(target / chunk.length);
    async function* generated() { yield '<HealthData locale="en">\n'; for (let i = 0; i < count; i++) yield chunk; yield '</HealthData>\n'; }
    const before = process.memoryUsage().heapUsed;
    let steps = 0, held = 0, heap = 0;
    const result = await scanXml(generated(), e => { if (e.name === 'Record') steps += Number(e.attrs.value); }, {onProgress: (_, buffered) => { held = Math.max(held, buffered); heap = Math.max(heap, process.memoryUsage().heapUsed - before); }});
    expect(result.chars).toBeGreaterThanOrEqual(target);
    expect(steps).toBe(count * perChunk * 12);
    // The scanner keeps only the unfinished tail of the last chunk: never more than one record here.
    expect(held).toBeLessThan(record.length);
    // And the process never holds the file: a loose bound, whatever the collector's timing.
    expect(heap).toBeLessThan(400 * 1024 * 1024);
  }, 240_000);
});
