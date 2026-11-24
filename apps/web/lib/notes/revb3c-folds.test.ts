import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';

/**
 * Session AV lane 2 (review B3C-12): the Notes folds load their own chunk only when opened, as Properties and Earlier
 * versions do, and the Open tick boxes count is worked out once per change of the notes. Read from the source, as
 * fields.test.ts checks the Notes route's chunks.
 */
const workspace = readFileSync(join(__dirname, '..', '..', 'components', 'notes', 'notes-workspace.tsx'), 'utf8');

describe('B3C-12: Open tick boxes', () => {
  test('its chunk stays lazy and is mounted only while its fold is open', () => {
    expect(workspace).toMatch(/const NotesTicks = lazy\(\(\) => import\('\.\/notes-ticks'\)\)/);
    expect(workspace).toMatch(/\{ticksOpen && <LoadBoundary quiet><Suspense[^]*?<NotesTicks record=\{record\} change=\{change\}\/>/);
    expect(workspace.match(/<NotesTicks\b/g)).toHaveLength(1);
    expect(workspace).toMatch(/note-ticks-fold" open=\{ticksOpen \|\| undefined\} onToggle=\{e => setTicksOpen\(\(e\.currentTarget as HTMLDetailsElement\)\.open\)\}/);
  });
  test('the count is memoised on the notes, never worked out in the render itself', () => {
    expect(workspace).toMatch(/const openTickCount = useMemo\(\(\) => openTicks\(record\.notes\)\.length, \[record\.notes\]\);/);
    expect(workspace.match(/openTicks\(/g)).toHaveLength(1);
  });
});
describe('B3C-13: the Properties fold’s face', () => {
  test('a day and a number through the app’s formatters, like the table and the board', async () => {
    const {propFaceValue, propsFace} = await import('./prop-face');
    const {formatDate, formatNumber} = await import('../visual-format');
    expect(propFaceValue({k: 'Due', t: 'date', v: '2026-12-01'})).toBe(formatDate('2026-12-01'));
    expect(propFaceValue({k: 'Due', t: 'date', v: '2026-12-01'})).not.toBe('2026-12-01');
    expect(propFaceValue({k: 'Budget', t: 'number', v: 1200.5})).toBe(formatNumber(1200.5));
    expect(propsFace([{k: 'Due', t: 'date', v: '2026-12-01'}, {k: 'Budget', t: 'number', v: 1200.5}, {k: 'Booked', t: 'tick', v: true}, {k: 'Status', t: 'choice', v: 'Planning'}]))
      .toBe(`Due: ${formatDate('2026-12-01')}, Budget: ${formatNumber(1200.5)}, Booked: yes`);
    expect(propsFace([])).toBeNull();
    expect(propsFace(undefined)).toBeNull();
  });
  test('the editor uses it', () => {
    const editor = readFileSync(join(__dirname, '..', '..', 'components', 'notes', 'note-editor.tsx'), 'utf8');
    expect(editor).toMatch(/\{propsFace\(note\.props\) \?\? 'your own fields, such as a status or a day'\}/);
  });
});
