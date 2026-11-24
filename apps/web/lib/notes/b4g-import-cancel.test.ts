import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, test} from 'vitest';

/**
 * Session AV lane 2 (review b4g B4G-11; LEDGER #321): while an import keeps its photos, Cancel waits; and an import
 * cancelled before it is written writes nothing and deletes the photos it had kept. (The component has no pure part;
 * this reads its source, as fields.test.ts does.)
 */
const source = readFileSync(join(__dirname, '..', '..', 'components', 'notes', 'notes-files.tsx'), 'utf8');
describe('Cancel during an import', () => {
  test('is disabled while the photos are kept', () => {
    expect(source).toMatch(/<button type="button" className="quiet" disabled=\{busy\} onClick=\{\(\) => \{ cancelled\.current = true;[^}]*\}\}>Cancel<\/button>/);
  });
  test('a cancelled import writes nothing and deletes what it kept', () => {
    const confirm = source.slice(source.indexOf('const confirm = async'), source.indexOf('return <div className="note-files">'));
    const guard = confirm.indexOf('if (cancelled.current) { for (const id of kept) await deleteNotePhoto'), write = confirm.indexOf('const ok = change(');
    expect(guard).toBeGreaterThan(0); expect(write).toBeGreaterThan(guard);
  });
});
