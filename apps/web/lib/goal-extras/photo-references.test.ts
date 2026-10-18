import {test, expect} from 'vitest';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {GOAL_EXTRAS_KEYS_FOR_PHOTOS, referencedPhotoIds} from './photo-references';
// Session AF Part 11 A10: photo references come from v1 and a future v2, by bytes; an unreadable record deletes nothing.
const store = (items: Record<string, string>) => ({getItem: (k: string) => items[k] ?? null});
const v1 = JSON.stringify({version: 1, goals: {'private:1': {vision: {kind: 'photo', imageId: 'a'}}, 'private:2': {vision: {kind: 'emoji', emoji: '🌟'}}}, dormant: {'private:3': {vision: {kind: 'photo', imageId: 'b'}, dormantAt: '2026-10-01'}}});
const v2 = JSON.stringify({version: 2, entries: [{key: 'private:9', looks: {vision: {kind: 'photo', imageId: 'c'}}}]});

test('references are read from v1 and from a future v2 of any shape', () => {
  expect([...referencedPhotoIds(store({[GOAL_EXTRAS_KEYS_FOR_PHOTOS[0]]: v1})).ids].sort()).toEqual(['a', 'b']);
  const both = referencedPhotoIds(store({[GOAL_EXTRAS_KEYS_FOR_PHOTOS[0]]: v1, [GOAL_EXTRAS_KEYS_FOR_PHOTOS[1]]: v2}));
  expect([...both.ids].sort()).toEqual(['a', 'b', 'c']); expect(both.unreadable).toBe(false);
  // A rollback to a v1-only build after a v2 write: the v2 record's photos still count as used.
  expect([...referencedPhotoIds(store({[GOAL_EXTRAS_KEYS_FOR_PHOTOS[1]]: v2})).ids]).toEqual(['c']);
  expect(referencedPhotoIds(store({})).ids.size).toBe(0);
});

test('fail closed: a record that exists but cannot be parsed or read means delete nothing', () => {
  expect(referencedPhotoIds(store({[GOAL_EXTRAS_KEYS_FOR_PHOTOS[1]]: '{not json'})).unreadable).toBe(true);
  expect(referencedPhotoIds({getItem: () => { throw Error('SecurityError'); }}).unreadable).toBe(true);
});

test('both photo deletions in the extras keeper skip every referenced id and stop when the references are unreadable', () => {
  const keeper = readFileSync(new URL('../../components/goals/extras-keeper.tsx', import.meta.url), 'utf8');
  expect(keeper).toContain('referencedPhotoIds(getAppStorage())');
  expect((keeper.match(/refs\.unreadable/g) ?? []).length).toBeGreaterThanOrEqual(2);
});

test('version guard: only photo-references.ts may name the reserved goal-extras v2 key', () => {
  const root = new URL('../../', import.meta.url).pathname, needle = 'goal-extras:' + 'v2', hits: string[] = [];
  const walk = (dir: string) => { for (const name of readdirSync(dir)) { if (name === 'node_modules' || name.startsWith('.')) continue; const full = join(dir, name); if (statSync(full).isDirectory()) walk(full); else if (/\.(ts|tsx|mjs|js|json)$/.test(name) && readFileSync(full, 'utf8').includes(needle)) hits.push(relative(root, full)); } };
  for (const dir of ['lib', 'components', 'app']) walk(join(root, dir));
  expect(hits.sort()).toEqual(['lib/goal-extras/photo-references.ts']);
});
