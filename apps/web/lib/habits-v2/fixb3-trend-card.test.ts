import {describe, expect, it} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Session AV lane 2 (fixb3): "Trend per habit" sits in the phone's swipe row of consistency cards (overflow-x: auto). Its
 * screen-reader sentences are position: absolute (.sr-only); without a positioned card they took their place from the
 * page, so the row did not clip them and the whole Habits page scrolled sideways (697 px wide at 390). On a phone it also
 * needs the same flex basis as its two neighbours, or it is squeezed to about 34 px.
 */
const css = readFileSync(join(__dirname, '..', '..', 'components', 'habits', 'habit-r3.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
describe('the Trend per habit card in the phone swipe row', () => {
  it('is the containing block of its hidden sentences', () => {
    expect(css).toMatch(/\.habit-trend-list\s*\{[^}]*position:\s*relative/);
  });
  it('takes the same share of the row as the month and the week on a phone', () => {
    const phone = /@media \(max-width: 767\.98px\), \(pointer: coarse\) and \(max-height: 500px\)\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(phone).toMatch(/\.habit-consistency > \.habit-trend-list\s*\{[^}]*flex:\s*0 0 88%[^}]*min-width:\s*0/);
    const neighbours = readFileSync(join(__dirname, '..', '..', 'components', 'phone', 'phone-habits.css'), 'utf8');
    expect(neighbours).toMatch(/\.habit-consistency > :is\(\.habit-consistency-month, \.habit-week-momentum\) \{ flex: 0 0 88%;/);
  });
});
