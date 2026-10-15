import {readdirSync, readFileSync, statSync} from 'node:fs';
import {join, relative} from 'node:path';
import {describe, expect, it} from 'vitest';

/**
 * Session AC (the owner's hosted check on Alpha #41 failed at stage 6: Settings → Reminders was titled "Reminders", not
 * "Reminders · ZIGoals Alpha"). In Next's metadata a layout's plain-string title resets the title template for every page
 * under it, so a layout that has pages below its own must carry the template on with `{default, template}` (as the Goals
 * and Settings layouts do). This guard reads every layout under app/app and fails on a plain title above child pages.
 */
const APP = join(__dirname, '..', 'app', 'app');
function files(dir: string): string[] { return readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? files(path) : [path]; }); }
const all = files(APP);

describe('route titles keep the " · ZIGoals Alpha" template', () => {
  const layouts = all.filter(f => /\/layout\.tsx$/.test(f));
  it('finds the layouts it guards', () => { expect(layouts.map(f => relative(APP, f))).toEqual(expect.arrayContaining(['layout.tsx', 'goals/layout.tsx', 'settings/layout.tsx'])); });
  for (const layout of layouts) {
    const dir = layout.replace(/\/layout\.tsx$/, ''), source = readFileSync(layout, 'utf8');
    const childPages = all.filter(f => f.startsWith(dir + '/') && /\/page\.tsx$/.test(f) && f !== join(dir, 'page.tsx'));
    it(`${relative(APP, layout)}: no plain-string title above ${childPages.length} child page(s)`, () => {
      const plain = /title\s*:\s*['"`]/.test(source);
      if (childPages.length) expect(plain, `${relative(APP, layout)} sets a plain title, which stops the template for ${childPages.map(f => relative(APP, f)).join(', ')}`).toBe(false);
    });
  }
});
