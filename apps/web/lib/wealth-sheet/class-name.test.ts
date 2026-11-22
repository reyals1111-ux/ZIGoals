import {readdirSync, readFileSync, statSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect, test} from 'vitest';

/**
 * Session AV lane 2 (fixb2): `.wealth-sheet` is the class of Wealth's dialogs (components/platform/financial-ui.css gives
 * it a dialog's width, min(820px, 100vw - 32px), and its dark ground). "Your sheet" in Accounts had taken the same class,
 * so at 768 px with Large text it stuck out and the page scrolled sideways (tests/customize-aj.spec.ts found it). Only a
 * <dialog> carries the class itself; parts use their own `wealth-sheet-…` names, and "Your sheet" is `.wealth-own-sheet`.
 */
const COMPONENTS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'components');
const files = (dir: string): string[] => readdirSync(dir).flatMap(name => { const full = join(dir, name); return statSync(full).isDirectory() ? files(full) : full.endsWith('.tsx') ? [full] : []; });

test('the wealth-sheet class is on dialogs only', () => {
  const found: string[] = [];
  for (const file of files(COMPONENTS)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/<([a-z]+)\b[^<>]*?className=\{?[`'"]([^`'"]*)/g)) {
      const classes = m[2]!.replace(/\$\{[^}]*\}/g, ' ').split(/\s+/);
      if (classes.includes('wealth-sheet')) found.push(`${file.slice(COMPONENTS.length + 1)} <${m[1]}>`);
    }
  }
  expect(found.length).toBeGreaterThan(0);
  expect(found.filter(f => !f.endsWith('<dialog>'))).toEqual([]);
  expect(readFileSync(join(COMPONENTS, 'wealth', 'wealth-sheet.tsx'), 'utf8')).toContain('className="wealth-own-sheet"');
});
