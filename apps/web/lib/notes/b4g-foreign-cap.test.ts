import {describe, expect, test} from 'vitest';
import {ENEX_TOTAL_MAX_BYTES, FOREIGN_MAX_FILES, readForeignFiles, type PickedFile} from './read-files';

/**
 * Session AV lane 2 (review b4g B4G-12; LEDGER #321): Evernote and Bear files past the first fifty are said under
 * "Skipped and why", and all .enex files together are held to one reading budget.
 */
const enex = (title: string) => `<?xml version="1.0"?><en-export><note><title>${title}</title><content><![CDATA[<en-note>Words.</en-note>]]></content></note></en-export>`;
const file = (name: string, text: string, size = text.length): PickedFile => ({name, size, type: 'application/xml', arrayBuffer: async () => new TextEncoder().encode(text).buffer as ArrayBuffer});
describe('many Evernote files', () => {
  test('past the first fifty, each is named with its reason', async () => {
    const list = Array.from({length: FOREIGN_MAX_FILES + 3}, (_, i) => file(`n${i}.enex`, enex(`Fictional ${i}`)));
    const out = await readForeignFiles(list);
    expect(out.notes).toHaveLength(FOREIGN_MAX_FILES);
    expect(out.skipped.map(s => s.name)).toEqual(['n50.enex', 'n51.enex', 'n52.enex']);
    expect(out.skipped[0]!.reason).toMatch(/only the first 50 Evernote or Bear files/);
  });
  test('one budget for all of them', async () => {
    const big = 40 * 1024 * 1024, out = await readForeignFiles([file('a.enex', enex('A'), big), file('b.enex', enex('B'), big), file('c.enex', enex('C'), big)]);
    expect(ENEX_TOTAL_MAX_BYTES).toBeLessThan(3 * big);
    expect(out.notes.map(n => n.title)).toEqual(['A', 'B']);
    expect(out.skipped).toEqual([{name: 'c.enex', reason: 'the Evernote files hold more than ZIGoals reads at once (100 MB)'}]);
  });
});
