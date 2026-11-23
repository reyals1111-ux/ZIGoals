import {describe, expect, test} from 'vitest';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

/** Review b5i B5I-9 (Minor, a11y): Select moves focus to the chooser's first tick box (in the list, under the bar). */
describe('Select moves focus into the chooser', () => {
  test('the first tick box of the list is focused on mount, from the wrapper that also holds Esc', () => {
    const src = readFileSync(join(__dirname, '../../components/notes/notes-select.tsx'), 'utf8');
    expect(src).toMatch(/wrap\.current\?\.querySelector<HTMLInputElement>\('\.notes-select-list input\[type="checkbox"\]'\)\?\.focus\(\)/);
    expect(src).toMatch(/<div className="notes-select" ref=\{wrap\} onKeyDown=/);
    expect(src).toMatch(/<ul className="note-list notes-select-list"/);
  });
});
