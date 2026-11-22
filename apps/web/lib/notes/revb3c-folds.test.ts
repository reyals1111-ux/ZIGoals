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
