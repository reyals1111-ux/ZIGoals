import {readFileSync, readdirSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from 'vitest';
import {SAFETY_RULES} from './ai/context/specialists';

/**
 * Session AJ (item 8): the owner's own decisions, pinned so a later change has to say it is changing one.
 * The browser pins (GO3, TO1, ZI5) are in tests/aj-owner-decisions.spec.ts.
 */
test('I5: ZIGi calls Ramp Network and Banxa independent providers the person chooses, never integrated, partners or recommended', () => {
  expect(SAFETY_RULES).toContain('Add money opens Ramp Network or Banxa, independent providers the person chooses: never call them integrated, partners or recommended.');
});
const sources = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? sources(path) : /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
});
test('ST5: the setup chooser says "Fits your answers", and no screen says "our suggestion"', () => {
  const web = new URL('.', import.meta.url).pathname.replace(/lib\/$/, '');
  const chooser = readFileSync(join(web, 'components/ai/setup-chooser.tsx'), 'utf8');
  expect(chooser).toContain('<p className="eyebrow">Fits your answers</p>');
  const shown = [...sources(join(web, 'components')), ...sources(join(web, 'app'))]
    .filter(path => /our suggestion|onze suggestie/i.test(readFileSync(path, 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\/|\{\/\*[\s\S]*?\*\/\}/gm, '')));
  expect(shown).toEqual([]);
});
