import {describe, expect, it} from 'vitest';
import {directoryEntries, filterDirectory} from '@zigoals/ecosystem-registry/providers';
import {search} from '../search/engine';
import {ECOSYSTEM_SEARCH_ITEMS} from '../search/records';

// Session AL (lane L6, second pass, step 6): guards for positives on Berlin's keep-list that no test covered.
describe('BN-095: Ecosystem search is safe with odd input and ignores case', () => {
  it('markup, regex characters, emoji, SQL and 500 characters find nothing and throw nothing', () => {
    for (const odd of ['<script>alert(1)</script>', '.*', '(a|b)+$', '🦄', "'; DROP TABLE x;--", 'x'.repeat(500)])
      expect(() => filterDirectory(directoryEntries, odd, 'All'), odd).not.toThrow();
    expect(filterDirectory(directoryEntries, '.*', 'All')).toEqual([]);
    expect(filterDirectory(directoryEntries, 'x'.repeat(500), 'All')).toEqual([]);
  });
  it('case does not matter', () => {
    expect(filterDirectory(directoryEntries, 'VALDORA', 'All').map(p => p.id)).toEqual(filterDirectory(directoryEntries, 'valdora', 'All').map(p => p.id));
  });
});
describe('BN-096: every Ecosystem link is https, every project is in global search', () => {
  it('each action link is https', () => {
    for (const p of directoryEntries) for (const a of p.actions) expect(a.url.startsWith('https://'), `${p.id} ${a.url}`).toBe(true);
  });
  it('each project the directory lists is found by its name in the global search', () => {
    for (const p of directoryEntries) expect(search(ECOSYSTEM_SEARCH_ITEMS, p.name).some(h => h.href === `/app/ecosystem#project-${p.id}`), p.name).toBe(true);
  });
});
