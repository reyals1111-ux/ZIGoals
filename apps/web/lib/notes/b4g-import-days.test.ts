import {describe, expect, test} from 'vitest';
import {foreignFiles, readBear} from './import-enex';
import {planImport} from './markdown';
import {notesSchema} from './schema';

/**
 * Session AV lane 2 (review b4g B4G-3; LEDGER #321): an Evernote or Bear note titled with a day that already has a daily
 * note is imported as its own note, so its photos are kept and its photo lines named — never appended to that day.
 */
const enc = (s: string) => new TextEncoder().encode(s);
describe('a foreign note titled with a day', () => {
  test('comes in as its own topic note, with its photo', () => {
    const {notes} = readBear([{name: 'x.textbundle/text.md', data: enc('# 2026-11-01\n\nhello\n\n![](assets/a.png)')}, {name: 'x.textbundle/assets/a.png', data: new Uint8Array([1])}]);
    const {files, images} = foreignFiles(notes);
    const record = notesSchema.parse({version: 1, notes: [{id: 'd1', kind: 'daily', title: '2026-11-01', day: '2026-11-01', body: 'Fictional day.', createdAt: '2026-11-01T09:00:00.000Z'}]});
    const plan = planImport(record, files, '2026-11-22T09:00:00.000Z', '2026-11-22');
    expect(plan.append).toEqual([]);
    expect(plan.add).toHaveLength(1);
    expect(plan.add[0]).toMatchObject({kind: 'topic', title: '2026-11-01'});
    expect(plan.add[0]!.body).toContain('![photo](imp-1)');
    expect(images.get(plan.from![0]!)).toHaveLength(1);
  });
});
