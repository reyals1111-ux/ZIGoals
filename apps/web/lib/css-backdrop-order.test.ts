import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';

// Session AE (Part 5, ADR-027): written as `backdrop-filter: …; -webkit-backdrop-filter: …`, the production build kept
// only the prefixed one (which Chrome ignores), so frosted bars and sheets lost their blur. The prefixed one comes first.
const roots = ['app', 'components', 'themes'];
function* cssFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* cssFiles(path);
    else if (name.endsWith('.css')) yield path;
  }
}

test('every hand-written blur names the prefixed backdrop-filter first, so the build keeps the standard one', () => {
  const late: string[] = [];
  for (const root of roots) for (const file of cssFiles(join(__dirname, '..', root))) {
    readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
      if (/(?<!-webkit-)backdrop-filter\s*:[^;}]*;\s*-webkit-backdrop-filter\s*:/.test(line)) late.push(`${file}:${i + 1}`);
    });
  }
  expect(late).toEqual([]);
});
