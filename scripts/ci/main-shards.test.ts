// Session AU ([TIER 3] (CI), ADR-044 D-CI): the main browser suite's shard lists cover every selected spec exactly once.
// Session AV lane 2 ([TIER 3] (CI), owner follow-up 7): twenty lists.
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {MAIN_SHARDS, MAIN_SHARD_MINUTES, mainShardMatch, mainSpecFiles, partitionProblems} from '../../apps/web/playwright.main.shards';

const TESTS = fileURLToPath(new URL('../../apps/web/tests', import.meta.url));

describe('main shard lists', () => {
  test('every main-suite spec under apps/web/tests is in exactly one of the twenty lists', () => {
    const files = mainSpecFiles(TESTS);
    expect(files.length).toBeGreaterThan(0);
    // The failure lists each problem with its fix, e.g. "… is a main-suite spec in no shard list: add it to shard 2's …".
    expect(partitionProblems(files), partitionProblems(files).join('\n')).toEqual([]);
    expect(MAIN_SHARDS).toHaveLength(20);
    expect(MAIN_SHARD_MINUTES).toHaveLength(20);
    for (const list of MAIN_SHARDS) expect(list.length).toBeGreaterThan(0);
    expect([...MAIN_SHARDS.flat()].sort()).toEqual(files);
  });

  test('no list names a missing file or a file of the accessibility sweep', () => {
    for (const f of MAIN_SHARDS.flat()) {
      expect(existsSync(join(TESTS, f)), `${f} is listed but missing`).toBe(true);
      expect(f, `${f} belongs to the a11y suite`).not.toMatch(/p6-(axe-all|axe-surfaces|keyboard)\.spec\.ts$/);
    }
  });

  test('new specs, a duplicate and a stale entry are each named with the fix', () => {
    const shards = [['a.spec.ts'], ['b.spec.ts', 'old.spec.ts'], ['b.spec.ts']];
    expect(partitionProblems(['a.spec.ts', 'au/new-1.spec.ts', 'au/new-2.spec.ts', 'b.spec.ts'], shards, [9, 8, 7.5])).toEqual([
      "au/new-1.spec.ts is a main-suite spec in no shard list: add it to shard 3's list in apps/web/playwright.main.shards.ts (the fewest minutes, 7.5)",
      "au/new-2.spec.ts is a main-suite spec in no shard list: add it to shard 2's list in apps/web/playwright.main.shards.ts (the fewest minutes, 8.0)",
      'b.spec.ts is in more than one main shard list (2, 3): keep it in one list in apps/web/playwright.main.shards.ts',
      'old.spec.ts is listed in main shard 2 but is not a main-suite spec under tests/: remove it from apps/web/playwright.main.shards.ts',
    ]);
  });

  test('MAIN_SHARD selects only its own files, anchored to tests/', () => {
    const [first] = mainShardMatch('1/20', TESTS);
    const name = MAIN_SHARDS[0]![0]!;
    expect(first!.test(`/x/apps/web/tests/${name}`)).toBe(true);
    expect(first!.test(`/x/apps/web/tests/x${name}`)).toBe(false);
    expect(first!.test(`C:\\x\\apps\\web\\tests\\${name.split('/').join('\\')}`)).toBe(true);
    const all = MAIN_SHARDS.map((_, i) => mainShardMatch(`${i + 1}/20`, TESTS));
    for (const f of mainSpecFiles(TESTS)) {
      const hits = all.filter(rs => rs.some(r => r.test(`/x/apps/web/tests/${f}`))).length;
      expect(hits, `${f} matches ${hits} shards`).toBe(1);
    }
    expect(() => mainShardMatch('21/20', TESTS)).toThrow(/expected n\/20/);
    expect(() => mainShardMatch('1/14', TESTS)).toThrow(/expected n\/20/);
  });
});
