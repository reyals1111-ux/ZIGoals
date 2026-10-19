import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, test} from 'vitest';
import {AF_EXTRAS_CATALOG_LABELS, AF_EXTRAS_DISPLAY_KEYS, AF_EXTRAS_ERASE_KEYS, AF_EXTRAS_EXPORT_KEYS, AF_EXTRAS_PERSONAL_KEYS, AF_EXTRAS_TODAY_CARD_IDS, DAY_TIMELINE_KEY, STORIES_KEY, STORIES_ROUTE, TIMELINE_ROUTE, UNIVERSE_KEY, UNIVERSE_ROUTE} from './af-extras-keys';
import {MODULE_KEYS} from './export/everything';
import {SYNCED} from './data-health/catalog';
import {DEVICE_PARTS} from './restore/plan';
import {EXTRAS_DEVICE_KEYS} from './vault/extras-keys';
import {UNIVERSE} from './universe/store';
import {DAY_TIMELINE} from './timeline/store';
import {STORIES} from './stories/store';

/**
 * Session AF (L5b; TIER 3 storage, ADR-028 H29, H73, H76–H78): the three extras' device keys — versioned, device only,
 * never synced or restored — and the rows the lead wires into the shared registries (the positive half of this guard,
 * "every row landed", is the lead's lib/af-lead-registries.test.ts once wired).
 */
describe('Session AF extras keys: My Universe, Day Timeline, Stories', () => {
  test('the key names, the records that own them and the rows the lead wires', () => {
    expect(UNIVERSE_KEY).toBe('zigoals:universe:v1'); expect(DAY_TIMELINE_KEY).toBe('zigoals:day-timeline:v1'); expect(STORIES_KEY).toBe('zigoals:stories:v1');
    expect([UNIVERSE.key, DAY_TIMELINE.key, STORIES.key]).toEqual([UNIVERSE_KEY, DAY_TIMELINE_KEY, STORIES_KEY]);
    expect(AF_EXTRAS_PERSONAL_KEYS).toEqual([UNIVERSE_KEY, DAY_TIMELINE_KEY]);
    expect(AF_EXTRAS_DISPLAY_KEYS).toEqual([STORIES_KEY]);
    expect([...AF_EXTRAS_ERASE_KEYS].sort()).toEqual([...AF_EXTRAS_PERSONAL_KEYS, ...AF_EXTRAS_DISPLAY_KEYS].sort());
    expect(Object.values(AF_EXTRAS_EXPORT_KEYS).sort()).toEqual([...AF_EXTRAS_ERASE_KEYS].sort());
    expect(Object.keys(AF_EXTRAS_CATALOG_LABELS).sort()).toEqual(Object.keys(AF_EXTRAS_EXPORT_KEYS).sort());
    for (const [label, area] of Object.values(AF_EXTRAS_CATALOG_LABELS)) { expect(label.length).toBeGreaterThan(8); expect(['Journey', 'Today', 'Life review']).toContain(area); }
    for (const key of AF_EXTRAS_ERASE_KEYS) expect(key).toMatch(/^zigoals:[a-z-]+:v1$/);
    expect([TIMELINE_ROUTE, STORIES_ROUTE, UNIVERSE_ROUTE]).toEqual(['/app/timeline', '/app/stories', '/app/journey#universe']);
    expect([...AF_EXTRAS_TODAY_CARD_IDS]).toEqual(['universe', 'timeline', 'stories']);
    // The empty records are versioned.
    for (const spec of [UNIVERSE, DAY_TIMELINE, STORIES]) expect(spec.empty()).toMatchObject({version: 1});
  });
  test('never synced or restored: no module record, extras-sync key, synced catalog entry or restore part', () => {
    for (const key of AF_EXTRAS_ERASE_KEYS) {
      expect(Object.values(MODULE_KEYS)).not.toContain(key);
      expect(EXTRAS_DEVICE_KEYS).not.toContain(key);
      expect(SYNCED.some(e => e.key === key)).toBe(false);
      expect(DEVICE_PARTS.some(p => p.key === key)).toBe(false);
    }
  });
  test('no sync module or Worker names the keys', () => {
    const lib = join(__dirname);
    const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : files(path)) : /\.(ts|tsx|mjs|js)$/.test(name) ? [path] : []; });
    const sync = [...files(join(lib, 'vault')), ...files(join(lib, 'sync-offer')), join(lib, 'sync-homes-store.ts'), ...files(join(lib, '..', '..', '..', 'workers'))];
    expect(sync.length).toBeGreaterThan(20);
    // The frozen-reader proof (vault/frozen-fixtures.test.ts) may name them once the lead registers the records there.
    const naming = sync.filter(file => /zigoals:(universe|day-timeline|stories):v1|UNIVERSE_KEY|DAY_TIMELINE_KEY|STORIES_KEY|af-extras-keys/.test(readFileSync(file, 'utf8'))).map(file => relative(lib, file));
    expect(naming.filter(f => f !== join('vault', 'frozen-fixtures.test.ts'))).toEqual([]);
  });
  test('the synced habit record keeps no clock time: the timeline’s times live in their own device key only', () => {
    const habits = readFileSync(join(__dirname, 'habits.ts'), 'utf8');
    expect(habits).not.toMatch(/day-timeline|clockTime|timeline/);
    expect(readFileSync(join(__dirname, 'timeline', 'store.ts'), 'utf8')).not.toMatch(/HABITS_KEY|habitDataSchema/);
  });
});
