import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

/**
 * Session AK G2 (RELEASE_REVIEW R25): every link to Staking points at /app/staking itself. /app/goals/positions stays only
 * as the redirect for old links and bookmarks (app/app/goals/positions/page.tsx), plus the nav's legacy-path marker that
 * keeps Staking highlighted while that redirect runs; nothing in the app links to it.
 */
const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const ALLOWED = new Set(['app/app/goals/positions/page.tsx', 'components/app-nav.tsx', 'lib/pages/visibility.ts', 'lib/pages/visibility.test.ts', 'app/app/staking/page.tsx']);
function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap(name => {
    const rel = `${dir}/${name}`;
    return statSync(join(ROOT, rel)).isDirectory() ? files(rel) : /\.(tsx?|mjs|json|webmanifest)$/.test(name) ? [rel] : [];
  });
}

describe('links to Staking (R25)', () => {
  it('no component, page, library file or manifest links to /app/goals/positions', () => {
    const linking = ['app', 'components', 'lib'].flatMap(files).filter(f => !ALLOWED.has(f) && !f.endsWith('staking-links.test.ts'))
      .filter(f => readFileSync(join(ROOT, f), 'utf8').includes('/app/goals/positions'));
    expect(linking).toEqual([]);
    expect(readFileSync(join(ROOT, 'public/manifest.webmanifest'), 'utf8')).not.toContain('/app/goals/positions');
  });
  it('keeps the redirect for old links, with the query', () => {
    const page = readFileSync(join(ROOT, 'app/app/goals/positions/page.tsx'), 'utf8');
    expect(page).toContain("redirect(`/app/staking${rest?`?${rest}`:''}`)");
  });
});
