import 'fake-indexeddb/auto';
import {beforeEach, describe, expect, test} from 'vitest';
import {dayLink, entriesLinkingTo, entrySegments, hasLinks, linkedDays} from './entry-links';
import {clipLength, forgetJournalMedia, keepJournalAudio} from './keep-media';
import {JOURNAL_MEDIA_DB, getJournalMedia, journalMediaIds} from './media';

/** Session AV lane 2 (journal; LEDGER #35 links and photos, #42 audio notes kept on the device). */
describe('[[links]] in an entry', () => {
  test('a day, a day with its own words, a name; plain words around them', () => {
    expect(entrySegments('Back to [[2026-11-03]] and [[2026-11-04|the day after]], see [[Run a 10k]].')).toEqual([
      {kind: 'text', text: 'Back to '}, {kind: 'day', day: '2026-11-03', label: '2026-11-03'}, {kind: 'text', text: ' and '},
      {kind: 'day', day: '2026-11-04', label: 'the day after'}, {kind: 'text', text: ', see '}, {kind: 'name', name: 'Run a 10k'}, {kind: 'text', text: '.'}]);
    expect(entrySegments('No links here.')).toEqual([{kind: 'text', text: 'No links here.'}]);
    expect(entrySegments('[[2026-13-45]]')).toEqual([{kind: 'name', name: '2026-13-45'}]);
    expect(hasLinks('a [[b]]')).toBe(true); expect(hasLinks('a [b]')).toBe(false); expect(hasLinks('[[\n]]')).toBe(false);
    expect(dayLink('2026-11-03')).toBe('[[2026-11-03]]');
  });
  test('the entries that link to a day, newest first, never the day itself', () => {
    const e = (id: string, date: string, text: string) => ({id, date, text});
    const entries = [e('a', '2026-11-03', 'Start [[2026-11-03]]'), e('b', '2026-11-05', 'As on [[2026-11-03]]'), e('c', '2026-11-09', 'Again [[2026-11-03]] [[2026-11-05]]')];
    expect(entriesLinkingTo(entries, '2026-11-03').map(x => x.id)).toEqual(['c', 'b']);
    expect(linkedDays(entries[2]!.text)).toEqual(['2026-11-03', '2026-11-05']);
  });
});

describe('a voice note kept on this device', () => {
  beforeEach(() => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(JOURNAL_MEDIA_DB); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }));
  test('kept in the journal media store with its length; a format or size it cannot keep is refused; forgotten on request', async () => {
    const id = await keepJournalAudio(new Blob([new Uint8Array(12)], {type: 'audio/webm;codecs=opus'}), 41.6);
    expect(await getJournalMedia('local', id)).toMatchObject({kind: 'audio', type: 'audio/webm', bytes: 12, seconds: 42});
    await expect(keepJournalAudio(new Blob([new Uint8Array(3)], {type: 'video/mp4'}), 3)).rejects.toThrow('a format the journal cannot keep');
    await expect(keepJournalAudio(new Blob([], {type: 'audio/mp4'}), 3)).rejects.toThrow('Nothing was recorded');
    await expect(keepJournalAudio(new Blob([new Uint8Array(3_000_001)], {type: 'audio/mp4'}), 3)).rejects.toThrow('too large');
    await forgetJournalMedia([id]);
    expect(await journalMediaIds('local')).toEqual([]);
  });
  test('the length as the player says it', () => {
    expect(clipLength(0)).toBe('0:00'); expect(clipLength(42)).toBe('0:42'); expect(clipLength(185)).toBe('3:05');
  });
});
