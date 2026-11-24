import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AV lane 2 (fixb3c): guards for three layout fixes the browser specs found in the built app.
 * - Tasks (P-4): globals.css gives every `nav` `order: 3` on a phone, so the Task views stood under the list until the
 *   Tasks rule set its own order; a tablet in one column keeps the list first (Session AL A10-11).
 * - Sleep score (P-21): a flex row stretched the figure to the height of a wrapped part.
 * - Health: an empty meal's words and its "Add to …" button share one row (the phone page is pinned at 7 screens).
 */
const read = (...parts: string[]) => readFileSync(join(__dirname, '..', ...parts), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
/** Every `@media <media> { … }` block of the sheet, joined. */
const block = (css: string, media: string) => {
  const found: string[] = [];
  for (let start = css.indexOf(`@media ${media} {`); start >= 0; start = css.indexOf(`@media ${media} {`, start + 1)) {
    let depth = 0;
    for (let i = css.indexOf('{', start); i < css.length; i++) { if (css[i] === '{') depth++; else if (css[i] === '}' && --depth === 0) { found.push(css.slice(start, i + 1)); break; } }
  }
  expect(found.length, media).toBeGreaterThan(0);
  return found.join('\n');
};
describe('Tasks views in one column', () => {
  const tasks = read('components', 'tasks', 'tasks.css'), globals = read('app', 'globals.css');
  it('globals.css still orders a phone nav last, so Tasks sets its own order', () => {
    expect(block(globals, '(max-width: 700px)')).toMatch(/\n\s*nav \{[^}]*order: 3/);
    expect(block(tasks, '(max-width: 900px)')).toMatch(/\.tasks-layout > \.tasks-nav \{[^}]*order: 0/);
  });
  it('a phone shows compact chips that wrap; a tablet keeps the list first', () => {
    const phone = block(tasks, '(max-width: 900px)');
    expect(phone).toMatch(/\.tasks-layout > \.tasks-nav ul \{[^}]*display: flex; flex-wrap: wrap/);
    expect(phone).toMatch(/\.tasks-layout > \.tasks-nav \.tasks-nav-item \{[^}]*width: auto/);
    expect(block(tasks, '(min-width: 701px) and (max-width: 900px)')).toMatch(/\.tasks-layout > \.tasks-nav \{ order: 1; \}/);
  });
  it('every chip keeps its 44 px height', () => {
    expect(tasks).toMatch(/\.tasks-nav-item \{[^}]*min-height: 44px/);
  });
});
describe('Health', () => {
  const css = read('components', 'health', 'health-aa.css');
  it('a sleep-score figure is as tall as its one line, not stretched to its part', () => {
    expect(css).toMatch(/\.sleep-score-parts li \{[^}]*align-items: baseline/);
    expect(css).toMatch(/\.sleep-score-parts b \{[^}]*white-space: nowrap/);
  });
  it('an empty meal says so and offers its button on one row, the button 44 px', () => {
    expect(css).toMatch(/:root \.health-meal > \.health-meal-empty \{[^}]*display: flex; flex-wrap: wrap/);
    expect(css).toMatch(/\.health-meal-empty button \{[^}]*min-height: 44px/);
  });
});
