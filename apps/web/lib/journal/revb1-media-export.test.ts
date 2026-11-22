import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test} from 'vitest';
import {JOURNAL_MEDIA_DB, namedMedia, putJournalMedia} from './media';
import {JOURNAL_MEDIA_FILE, exportJournalMediaEntries, journalMediaFileName} from './export-media';
import {JOURNAL_KEY, journalSchema} from './schema';
import {buildEverythingZip, collectEverything} from '../export/everything';
import {openBackup} from '../restore/read-backup';
import {notRestoredNote} from '../../components/restore/restore-backup';

/**
 * Session AV lane 2 (review b1 #3): the journal's photos and voice notes go into Export everything as files, and the
 * Restore preview says they are not put back yet, and where they are.
 */
const AT = '2026-11-20T09:00:00.000Z';
const wipe = () => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(JOURNAL_MEDIA_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); });
const photo = (n = 4) => ({kind: 'photo' as const, blob: new Blob([new Uint8Array(n).fill(7)]), type: 'image/webp' as const, bytes: n, at: AT});
const audio = () => ({kind: 'audio' as const, blob: new Blob([new Uint8Array(9).fill(3)]), type: 'audio/webm' as const, bytes: 9, seconds: 3, at: AT});
beforeEach(wipe);

describe('journal media in Export everything', () => {
  test('each photo and voice note an entry names becomes a file named by its id; one not in this browser is counted', async () => {
    await putJournalMedia('local', 'm-photo0001', photo());
    await putJournalMedia('local', 'm-audio0001', audio());
    await putJournalMedia('local', 'm-unnamed01', photo());
    const journal = journalSchema.parse({version: 1, shareWithAi: false, followUps: true, entries: [
      {id: 'e1', date: '2026-11-19', text: 'Fictional walk.', createdAt: AT, photos: ['m-photo0001', 'm-missing01'], audio: [{id: 'm-audio0001', seconds: 3}]}]});
    const out = await exportJournalMediaEntries('local', namedMedia(journal.entries), new Date(AT));
    expect(out.files.map(f => [f.name, f.data.length])).toEqual([['journal/photos/m-photo0001.webp', 4], ['journal/audios/m-audio0001.webm', 9]]);
    expect(out.missing).toBe(1);
    expect(out.files.every(f => JOURNAL_MEDIA_FILE.test(f.name))).toBe(true);
    expect(journalMediaFileName('m-x/../y', 'audio', 'audio/mp4')).toBe('journal/audios/m-xy.m4a');
    expect(journalMediaFileName('m-x', 'photo', 'image/gif')).toBeNull();
    // In the ZIP beside everything.json; the Restore preview counts them as not put back, and says so.
    const NOW = new Date(AT), zip = buildEverythingZip(collectEverything({[JOURNAL_KEY]: JSON.stringify(journal)}, {now: NOW, version: '0.0.0-test', commit: 'abc1234', localSimulation: null}), {date: '2026-11-20', showcase: false, now: NOW}, out.files);
    const opened = await openBackup(new Blob([zip.bytes as Uint8Array<ArrayBuffer>]));
    expect(opened.notRestored).toBe(2);
    expect(opened.photos).toEqual([]);
    expect(notRestoredNote(2)).toContain('Restore does not put them back yet');
  });
});
