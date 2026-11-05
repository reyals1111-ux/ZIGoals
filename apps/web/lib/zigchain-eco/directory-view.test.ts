import {expect, test} from 'vitest';
import {directoryEntries} from '@zigoals/ecosystem-registry/providers';
import {directoryStatusOf} from './directory-status';
import {VALUE_SORT, sourcesReadDay, viewDirectory} from './directory-view';

// Session AL (Part 15, P-BN-82/P-BN-83; BN-096): status filter and sort on the Ecosystem directory.
test('C-BN-18: Live keeps live projects only; Closing or paused keeps Zignaly and PermaPod', () => {
  const live = viewDirectory(directoryEntries, 'live', 'directory');
  expect(live.length).toBeGreaterThan(0);
  for (const e of live) expect(['live', 'tool']).toContain(directoryStatusOf(e.id)?.kind);
  const ending = viewDirectory(directoryEntries, 'ending', 'directory').map(e => e.id);
  expect(ending).toEqual(expect.arrayContaining(['zignaly', 'permapod']));
  const counts = ['live', 'ending', 'other'].map(f => viewDirectory(directoryEntries, f as 'live', 'directory').length);
  expect(counts.reduce((a, b) => a + b, 0)).toBe(directoryEntries.length); // every project in exactly one group
});
test('C-BN-17: name sort is A to Z ignoring case; status sort puts live first and keeps the directory order within', () => {
  const names = viewDirectory(directoryEntries, 'any', 'name').map(e => e.name);
  expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'})));
  const byStatus = viewDirectory(directoryEntries, 'any', 'status');
  expect(['live', 'tool']).toContain(directoryStatusOf(byStatus[0]!.id)?.kind);
  expect(viewDirectory(directoryEntries, 'any', 'directory')).toEqual(directoryEntries);
});
test('C-BN-15: "audit report listed" keeps exactly the projects whose record lists one, in the same order', async () => {
  const {withAuditReports} = await import('./directory-view');
  const kept = withAuditReports(directoryEntries, true);
  expect(kept.map(e => e.id)).toEqual(directoryEntries.filter(e => e.provider.audits.length > 0).map(e => e.id));
  expect(kept.map(e => e.id)).toEqual(expect.arrayContaining(['valdora', 'oroswap', 'nawa', 'permapod']));
  expect(withAuditReports(directoryEntries, false)).toEqual(directoryEntries);
});

// Session AL fourth pass (C-BN-17): value locked, largest first; projects without a read follow in directory order.
test('C-BN-17: "Value locked, largest first" sorts the projects with a read and keeps the rest in directory order', () => {
  const tvl: Record<string, number | null> = {valdora: 75_100_000, oroswap: 12_000_000, nawa: 900_000, permapod: null};
  const sorted = viewDirectory(directoryEntries, 'any', VALUE_SORT[0], id => tvl[id] ?? null);
  expect(sorted.slice(0, 3).map(e => e.id)).toEqual(['valdora', 'oroswap', 'nawa']);
  const rest = directoryEntries.filter(e => !['valdora', 'oroswap', 'nawa'].includes(e.id)).map(e => e.id);
  expect(sorted.slice(3).map(e => e.id)).toEqual(rest);
  expect(sorted).toHaveLength(directoryEntries.length);
  // Without any read the order is the directory's own (unknown is never ranked as zero).
  expect(viewDirectory(directoryEntries, 'any', 'value').map(e => e.id)).toEqual(directoryEntries.map(e => e.id));
  expect(VALUE_SORT[1]).toContain('projects with a read');
});

// Session AL fourth pass (BN-027, B-122): the header date is the newest read on the page.
test('BN-027/B-122: "Sources last read" takes the live value-locked read when it is newer', () => {
  const day = (iso: string) => iso.slice(0, 10);
  expect(sourcesReadDay('2026-11-04', '2026-11-05T06:07:00.000Z', day)).toBe('2026-11-05');
  expect(sourcesReadDay('2026-11-04', '2026-11-03T06:07:00.000Z', day)).toBe('2026-11-04');
  expect(sourcesReadDay('2026-11-04', null, day)).toBe('2026-11-04');
  expect(sourcesReadDay('2026-11-04', 'not a time', day)).toBe('2026-11-04');
});
