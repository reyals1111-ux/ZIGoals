import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from 'vitest';
import {readDeviceRecord, updateDeviceRecord} from '../device-record';
import {EARN_ACADEMY_KEY, EARN_CATALOG_LABELS, EARN_DISPLAY_KEYS, EARN_ERASE_KEYS, EARN_EXPORT_KEYS, EARN_PATH_KEY, EARN_PERSONAL_KEYS, EARN_PREFS_KEY} from '../af-earn-keys';
import {EARN_ACADEMY, EARN_PATH, EARN_PREFS, dismissTodayCard, earnPrefsOf, lessonScore, markStep, markVisited, recordLesson, setEarnPref, stepsOf} from './records';

/** Session AF (L1, `TIER 3 (storage)`): the three Earn device records read loosely, write carefully, and never sync. */
const memory = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial)); let writes = 0;
  return {getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { writes++; data.set(k, v); }, get writes() { return writes; }, raw: (k: string) => data.get(k)};
};
const at = '2026-10-19T08:00:00.000Z';

describe('Earn device keys', () => {
  it('are the three versioned names, in a module with no imports', () => {
    expect([EARN_PATH_KEY, EARN_ACADEMY_KEY, EARN_PREFS_KEY]).toEqual(['zigoals:earn-path:v1', 'zigoals:earn-academy:v1', 'zigoals:earn-prefs:v1']);
    expect(EARN_PERSONAL_KEYS).toEqual([EARN_PATH_KEY, EARN_ACADEMY_KEY]);
    expect(EARN_DISPLAY_KEYS).toEqual([EARN_PREFS_KEY]);
    expect(Object.values(EARN_EXPORT_KEYS).sort()).toEqual([...EARN_ERASE_KEYS].sort());
    expect(Object.keys(EARN_CATALOG_LABELS).sort()).toEqual(Object.keys(EARN_EXPORT_KEYS).sort());
    expect(readFileSync(join(__dirname, '..', 'af-earn-keys.ts'), 'utf8')).not.toMatch(/^\s*import\b/m);
  });
  it('no sync, worker or extras-sync file names them', () => {
    const root = join(__dirname, '..', '..', '..', '..');
    const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => { const p = join(dir, name); if (name === 'node_modules' || name.startsWith('.')) return []; return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx|mjs|js)$/.test(name) && !/\.test\./.test(name) ? [p] : []; });
    const syncFiles = [...walk(join(root, 'workers')), ...walk(join(root, 'apps', 'web', 'lib')).filter(p => /sync|extras-sections|vault/i.test(p))];
    expect(syncFiles.length).toBeGreaterThan(5);
    for (const file of syncFiles) expect(readFileSync(file, 'utf8'), file).not.toMatch(/earn-path|earn-academy|earn-prefs|af-earn-keys/);
  });
});

describe('loose readers', () => {
  it('keep unknown fields and ids on every write, and ignore them on screen', () => {
    const s = memory({[EARN_PATH_KEY]: JSON.stringify({version: 1, future: {x: 1}, steps: {'get-wallet': {done: true, at, note: 'later'}, 'a-new-step': {done: true}}})});
    const read = readDeviceRecord(s, EARN_PATH);
    expect(read.unreadable).toBe(false);
    expect(stepsOf(read.data, ['get-wallet', 'practice'])).toEqual([{id: 'get-wallet', done: true, at}, {id: 'practice', done: false}]);
    const next = updateDeviceRecord(s, EARN_PATH, r => markVisited(markStep(r, 'practice', true, at), 'native-staking'));
    expect(next).toMatchObject({future: {x: 1}, steps: {'a-new-step': {done: true}, 'get-wallet': {note: 'later'}, practice: {done: true, at}}, visited: ['native-staking']});
    expect(JSON.parse(s.raw(EARN_PATH_KEY)!)).toEqual(next);
  });
  it('read unparsable or refused bytes as empty, say so, and never rewrite them by reading', () => {
    for (const bad of ['{', JSON.stringify({version: 2}), JSON.stringify({version: 1, todayCard: 'gone'}), JSON.stringify({version: 1, steps: {'BAD ID': {}}})]) {
      const s = memory({[EARN_PATH_KEY]: bad});
      expect(readDeviceRecord(s, EARN_PATH)).toEqual({data: {version: 1}, unreadable: true});
      expect(s.writes).toBe(0);
      expect(s.raw(EARN_PATH_KEY)).toBe(bad);
    }
    expect(readDeviceRecord(memory(), EARN_ACADEMY)).toEqual({data: {version: 1}, unreadable: false});
  });
  it('a score outside 0–3 is kept but not counted; a pass is dated once', () => {
    const s = memory({[EARN_ACADEMY_KEY]: JSON.stringify({version: 1, lessons: {'apr-vs-apy': {score: 7, read: true}, 'what-is-staking': {score: 2.5}}})});
    const r = readDeviceRecord(s, EARN_ACADEMY).data;
    expect(lessonScore(r, 'apr-vs-apy')).toBeUndefined();
    expect(lessonScore(r, 'what-is-staking')).toBeUndefined();
    let next = recordLesson(r, 'unbonding', {score: 3}, at);
    next = recordLesson(next, 'unbonding', {score: 2}, '2026-10-20T08:00:00.000Z');
    expect(next.lessons?.unbonding).toEqual({score: 2, attempts: 2, passedAt: at});
    expect(lessonScore(next, 'unbonding')).toBe(2);
    expect(next.lessons?.['apr-vs-apy']).toEqual({score: 7, read: true});
  });
  it('bounds what one device holds', () => {
    let r = EARN_PATH.empty();
    for (let i = 0; i < 24; i++) r = markStep(r, `step-${i}`, true, at);
    expect(() => markStep(r, 'one-more', true, at)).toThrow();
    let v = EARN_PATH.empty();
    for (let i = 0; i < 30; i++) v = markVisited(v, `s-${i}`);
    expect(v.visited).toHaveLength(24);
    expect(v.visited?.at(-1)).toBe('s-29');
    expect(() => markStep(EARN_PATH.empty(), '../x', true)).toThrow();
  });
  it('display choices default to shown, dock shown, not folded', () => {
    expect(earnPrefsOf(EARN_PREFS.empty())).toEqual({pageShown: true, dockShown: true, dockFolded: false, dockOrder: []});
    expect(earnPrefsOf(setEarnPref({version: 1, extra: 1} as never, {dockShown: false}))).toMatchObject({dockShown: false, pageShown: true});
    expect(setEarnPref({version: 1, extra: 1} as never, {dockFolded: true})).toEqual({version: 1, extra: 1, dockFolded: true});
    expect(() => setEarnPref(EARN_PREFS.empty(), {dockOrder: Array.from({length: 13}, (_, i) => `a${i}`)})).toThrow();
    expect(dismissTodayCard(EARN_PATH.empty()).todayCard).toBe('dismissed');
  });
});
