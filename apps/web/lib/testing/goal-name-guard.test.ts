import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';

// Session AJ (item 11): a spec or verifier step that types the Goal wizard's name straight into the field can lose the
// keystrokes on a busy runner (the Goal-name race). Every one types through apps/web/tests/goal-name.ts or
// scripts/run11/goal-name.mjs, which type until the field holds the name; this keeps a new raw fill from creeping back.
const RAW = /getByLabel\((['"])Goal name\1(?:\s*,\s*\{\s*exact:\s*true\s*\})?\)\s*\.\s*(?:fill|type|pressSequentially)\(/;
const files = (dir: string, ext: RegExp) => readdirSync(dir).filter(f => ext.test(f)).map(f => join(dir, f));
test('no spec or verifier step types a Goal name without the helper', () => {
  const web = new URL('../..', import.meta.url).pathname, root = new URL('../../../..', import.meta.url).pathname;
  const sources = [...files(join(web, 'tests'), /\.spec\.ts$/), ...files(join(root, 'scripts/lib'), /\.mjs$/), ...files(join(root, 'scripts/run11'), /\.mjs$/), ...files(join(root, 'scripts/run10'), /\.mjs$/)];
  const raw = sources.filter(f => RAW.test(readFileSync(f, 'utf8')) && !f.endsWith('goal-name.mjs'));
  expect(raw).toEqual([]);
  expect(sources.length).toBeGreaterThan(300);
});
