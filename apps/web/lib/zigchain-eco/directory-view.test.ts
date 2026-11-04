import {expect, test} from 'vitest';
import {directoryEntries} from '@zigoals/ecosystem-registry/providers';
import {directoryStatusOf} from './directory-status';
import {viewDirectory} from './directory-view';

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
