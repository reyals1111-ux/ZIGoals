import {describe, expect, test} from 'vitest';
import {journalSchema} from './schema';
import {journalDocx, journalEpub} from './ebook';
import {readZip} from '../notes/zip-read';

/**
 * Session AV lane 2 (review b4g B4G-16; LEDGER #320): a journal line that looks like a note's photo line
 * (`![sunset](IMG_1)`) stays its words in the e-book and the Word file, never left out.
 */
const AT = '2026-11-20T09:00:00.000Z';
const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [{id: 'e1', date: '2026-11-02', text: 'Evening.\n\n![sunset](IMG_1)\n\nCalm.', createdAt: AT}]});
const pick = {book: 'all', from: '2026-11-01', to: '2026-11-30', today: '2026-11-22'} as const;
const text = async (bytes: Uint8Array, name: RegExp) => new TextDecoder().decode((await readZip(bytes, n => name.test(n))).files[0]!.data);
describe('journal lines kept as written', () => {
  test('in the e-book and the Word file', async () => {
    expect(await text(journalEpub(journal, pick, new Map(), {id: 'x', now: new Date(AT)}), /month-2026-11\.xhtml$/)).toContain('<p>![sunset](IMG_1)</p>');
    expect(await text(journalDocx(journal, pick, new Map(), new Date(AT)), /word\/document\.xml$/)).toContain('![sunset](IMG_1)');
  });
});
