import {expect, test} from '@playwright/test';
import {readStoredZip} from '../lib/export/zip-reader';
import {JOURNAL_MEDIA_EXPORT_NOTE} from '../lib/export/make-everything';
import {openAllSettingsGroups} from './settings-open';

/**
 * Session AV lane 2 (review b1 #3, Major): Export everything carries the journal's photos and voice notes as files beside
 * the notes', receipts' and tasks' (journal/photos/<id>.webp, journal/audios/<id>.webm), and says what Restore does with
 * them. Fictional data.
 */
test.use({timezoneId: 'Europe/Brussels'});
test('Export everything holds the journal’s photo and voice note', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-20T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    localStorage.setItem('zigoals:journal:v1', JSON.stringify({version: 1, shareWithAi: false, followUps: true, entries: [
      {id: 'e1', date: '2026-11-19', text: 'A fictional walk by the sea.', createdAt: '2026-11-19T18:00:00.000Z', photos: ['m-photo0001'], audio: [{id: 'm-audio0001', seconds: 3}]}]}));
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open('zigoals-journal-media-v1', 1); r.onupgradeneeded = () => r.result.createObjectStore('media'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction('media', 'readwrite'), s = t.objectStore('media'), at = '2026-11-19T18:00:00.000Z';
      s.put({kind: 'photo', blob: new Blob([new Uint8Array(4).fill(7)], {type: 'image/webp'}), type: 'image/webp', bytes: 4, at}, 'local:m-photo0001');
      s.put({kind: 'audio', blob: new Blob([new Uint8Array(9).fill(3)], {type: 'audio/webm'}), type: 'audio/webm', bytes: 9, seconds: 3, at}, 'local:m-audio0001');
      t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error);
    });
  });
  await page.reload();
  await openAllSettingsGroups(page);
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const file = await waiting;
  const stream = await file.createReadStream(); const chunks: Buffer[] = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const names = readStoredZip(new Uint8Array(Buffer.concat(chunks))).map(e => e.name);
  expect(names).toEqual(expect.arrayContaining(['everything.json', 'journal/photos/m-photo0001.webp', 'journal/audios/m-audio0001.webm']));
  await expect(section).toContainText(JOURNAL_MEDIA_EXPORT_NOTE);
});
