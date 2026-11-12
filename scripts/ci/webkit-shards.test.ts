// Session AN ([TIER 3] (CI)): the WebKit job's shard lists cover every selected spec exactly once.
import {fileURLToPath} from 'node:url';
import {describe, expect, test} from 'vitest';
import {WEBKIT_SHARDS, partitionProblems, webkitShardMatch, webkitSpecFiles} from '../../apps/web/playwright.webkit.shards';

const TESTS = fileURLToPath(new URL('../../apps/web/tests', import.meta.url));

describe('WebKit shard lists', () => {
  test('every WebKit spec under apps/web/tests is in exactly one of the four lists', () => {
    const files = webkitSpecFiles(TESTS);
    expect(files.length).toBeGreaterThan(0);
    // The failure lists each problem with its fix, e.g. "… is a WebKit spec in no shard: add it to the shortest list …".
    expect(partitionProblems(files), partitionProblems(files).join('\n')).toEqual([]);
    expect(WEBKIT_SHARDS).toHaveLength(4);
    for (const list of WEBKIT_SHARDS) expect(list.length).toBeGreaterThan(0);
    expect(WEBKIT_SHARDS.flat().sort()).toEqual(files);
  });

  test('a new spec, a duplicate and a stale entry are each named with the fix', () => {
    const shards = [['a-zigi.spec.ts'], ['zigi-b.spec.ts', 'zigi-old.spec.ts'], ['zigi-b.spec.ts']];
    expect(partitionProblems(['a-zigi.spec.ts', 'zigi-b.spec.ts', 'zigi-new.spec.ts'], shards, [9, 8, 3])).toEqual([
      'zigi-b.spec.ts is in more than one WebKit shard (2, 3): keep it in one list in apps/web/playwright.webkit.shards.ts',
      'zigi-new.spec.ts is a WebKit spec in no shard: add it to the shortest list in apps/web/playwright.webkit.shards.ts (shard 3)',
      'zigi-old.spec.ts is listed in WebKit shard 2 but is not a WebKit spec under tests/: remove it from apps/web/playwright.webkit.shards.ts',
    ]);
  });

  test('WEBKIT_SHARD selects only its own files, anchored to tests/', () => {
    const [first] = webkitShardMatch('1/4', TESTS);
    expect(first!.test('/x/apps/web/tests/webkit-celebration.spec.ts')).toBe(true);
    expect(first!.test('/x/apps/web/tests/xwebkit-celebration.spec.ts')).toBe(false);
    const memory = webkitShardMatch('2/4', TESTS);
    expect(memory.some(r => r.test('/x/tests/zigi-memory.spec.ts'))).toBe(true);
    expect(memory.some(r => r.test('/x/tests/zigi-memory-af.spec.ts'))).toBe(false);
    expect(() => webkitShardMatch('5/4', TESTS)).toThrow(/expected n\/4/);
    expect(() => webkitShardMatch('1/3', TESTS)).toThrow(/expected n\/4/);
  });
});
