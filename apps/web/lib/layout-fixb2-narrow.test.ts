import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {expect, test} from 'vitest';

/**
 * Session AV lane 2 (fixb2): three parts that pushed the page sideways at 320 px when a computer's window is narrowed
 * (tests/av2-habit-imports.spec.ts, av2-workout-progress.spec.ts, av2-money-crypto.spec.ts): a grid whose implicit
 * column took its widest part (a computer's file field, the weeks table) and a header that kept its range buttons at their
 * full width. The browser specs measure the page; this keeps the rules that make them fit (jsdom draws no layout).
 */
const WEB = join(dirname(fileURLToPath(import.meta.url)), '..');
const css = (path: string) => readFileSync(join(WEB, path), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

test('the import panel and the workout report are one column that may shrink', () => {
  expect(css('components/import/import.css')).toMatch(/\.switch-import \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  expect(css('components/import/import.css')).toMatch(/\.switch-import input\[type=file\] \{ max-width: 100%; \}/);
  expect(css('components/import/import.css')).toContain('.switch-more p { overflow-wrap: anywhere; }');
  expect(css('components/health/workouts/av2-body.css')).toMatch(/\.av2-progress \{[^}]*grid-template-columns: minmax\(0, 1fr\)/);
});
test('the value chart\'s range buttons may shrink and wrap beside its title', () => {
  expect(css('components/portfolio/value-chart.css')).toContain(':root .portfolio-section-head > .portfolio-ranges:not(:first-child){flex:0 1 auto;min-width:0;max-width:100%;}');
});
