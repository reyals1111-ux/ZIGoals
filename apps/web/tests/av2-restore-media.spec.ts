import {expect, test, type Locator, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {TASKS_KEY} from '../lib/tasks/schema';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {NOTES_KEY} from '../lib/notes/schema';
import {openSettings} from './settings-open';

/**
 * Session AV lane 2 (review b1 #18): Restore from a backup puts the photos and voice notes of tasks, the journal and notes
 * back into this browser, under the ids their records keep. Export everything → erase → restore: the preview counts what
 * comes back, the result says it, the files are in their stores again, and Undo removes exactly the ones it added. A file
 * already here is never overwritten, and one whose record is not on this device stays in the ZIP and is counted.
 * Fictional data; the clock is fixed; no request leaves the page.
 */
test.use({timezoneId: 'Europe/Brussels'});
const DAY = '2026-11-20', AT = '2026-11-20T09:00:00.000Z';
const TASK_PHOTO = 'tp_0123456789abcdef', TASK_VOICE = 'tv_fedcba9876543210';
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${DAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});

/** Tiny files with real headers (the restore reads a photo's size from its header and a recording's container, never decoding them). */
const jpeg = (w = 64, h = 48) => [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 1, 1, 0, 0, 1, 0, 1, 0, 0, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9];
const webp = () => [...'RIFF'].map(c => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBPVP8X'].map(c => c.charCodeAt(0)), [10, 0, 0, 0, 0, 0, 0, 0, 63, 0, 0, 47, 0, 0], new Array(16).fill(0));
const webm = () => [0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 1, 2, 3];
type Put = {db: string; store: string; key: string; value: Record<string, unknown>; bytes: number[]; type: string};
/** Writes values into a media store (the blob made in the page), or reads a store's keys, or deletes the database. */
const putMedia = (page: Page, puts: Put[]) => page.evaluate(async list => {
  for (const p of list) {
    const db = await new Promise<IDBDatabase>((resolve, reject) => { const r = indexedDB.open(p.db, 1); r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(p.store)) r.result.createObjectStore(p.store); }; r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    await new Promise<void>((resolve, reject) => { const t = db.transaction(p.store, 'readwrite'); t.objectStore(p.store).put({...p.value, blob: new Blob([new Uint8Array(p.bytes)], {type: p.type})}, p.key); t.oncomplete = () => { db.close(); resolve(); }; t.onerror = () => reject(t.error); });
  }
}, puts);
const keysOf = (page: Page, db: string, store: string) => page.evaluate(({db, store}) => new Promise<string[]>((resolve, reject) => {
  const r = indexedDB.open(db, 1);
  r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(store)) r.result.createObjectStore(store); };
  r.onerror = () => reject(r.error);
  r.onsuccess = () => { const t = r.result.transaction(store, 'readonly'), q = t.objectStore(store).getAllKeys(); t.oncomplete = () => { r.result.close(); resolve(q.result.map(String).sort()); }; };
}), {db, store});
const sizeOf = (page: Page, db: string, store: string, key: string) => page.evaluate(({db, store, key}) => new Promise<number | null>((resolve, reject) => {
  const r = indexedDB.open(db, 1);
  r.onerror = () => reject(r.error);
  r.onsuccess = () => { const t = r.result.transaction(store, 'readonly'), q = t.objectStore(store).get(key); t.oncomplete = () => { r.result.close(); resolve(q.result ? (q.result.blob as Blob).size : null); }; };
}), {db, store, key});
const wipeMedia = (page: Page) => page.evaluate(() => Promise.all(['zigoals-task-attachments-v1', 'zigoals-journal-media-v1', 'zigoals-notes-photos-v1'].map(name => new Promise<void>((resolve, reject) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = () => resolve(); r.onerror = () => reject(r.error); }))));

const TASKS = {version: 1, tasks: [{id: 'task_a', title: 'Call the plumber', priority: 'normal', createdAt: AT}]};
const JOURNAL = {version: 1, shareWithAi: false, followUps: true, entries: [{id: 'j-walk01', date: '2026-11-19', text: 'A fictional walk by the sea.', createdAt: AT, photos: ['m-photo0001'], audio: [{id: 'm-audio0001', seconds: 3}]}]};
const NOTES = {version: 1, voice: false, notes: [{id: 'n_1', kind: 'topic', title: 'Garden', body: 'A fictional plan.', photoId: 'np_garden01', createdAt: AT}]};
const FILES: Put[] = [
  {db: 'zigoals-task-attachments-v1', store: 'items', key: `local:${TASK_PHOTO}`, value: {taskId: 'task_a', kind: 'photo', type: 'image/jpeg', bytes: jpeg().length, at: AT}, bytes: jpeg(), type: 'image/jpeg'},
  {db: 'zigoals-task-attachments-v1', store: 'items', key: `local:${TASK_VOICE}`, value: {taskId: 'task_a', kind: 'voice', type: 'audio/webm', bytes: webm().length, seconds: 7, at: AT}, bytes: webm(), type: 'audio/webm'},
  {db: 'zigoals-journal-media-v1', store: 'media', key: 'local:m-photo0001', value: {kind: 'photo', type: 'image/webp', bytes: webp().length, at: AT}, bytes: webp(), type: 'image/webp'},
  {db: 'zigoals-journal-media-v1', store: 'media', key: 'local:m-audio0001', value: {kind: 'audio', type: 'audio/webm', bytes: webm().length, seconds: 3, at: AT}, bytes: webm(), type: 'audio/webm'},
  {db: 'zigoals-notes-photos-v1', store: 'photos', key: 'local:np_garden01', value: {type: 'image/jpeg', bytes: jpeg(80, 60).length, at: AT}, bytes: jpeg(80, 60), type: 'image/jpeg'},
];

async function seedAndExport(page: Page): Promise<Buffer> {
  await page.goto('/app/settings'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    [TASKS_KEY]: JSON.stringify(TASKS), [JOURNAL_KEY]: JSON.stringify(JOURNAL), [NOTES_KEY]: JSON.stringify(NOTES),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
  });
  await putMedia(page, FILES);
  await openSettings(page);
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const file = await waiting, chunks: Buffer[] = [];
  for await (const chunk of await file.createReadStream()) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
/** The loss: the three records and every file gone from this browser. */
async function erase(page: Page) {
  await page.evaluate(keys => { for (const k of keys) localStorage.removeItem(k); }, [TASKS_KEY, JOURNAL_KEY, NOTES_KEY]);
  await wipeMedia(page);
}
const restoreRegion = (page: Page) => page.getByRole('region', {name: 'Restore from a backup'});
const restoreStatus = (region: Locator) => region.locator('.restore-backup').getByRole('status');
async function openZip(page: Page, zip: Buffer): Promise<Locator> {
  await page.goto('/app/settings/data');
  await restoreRegion(page).getByLabel('Export everything ZIP').setInputFiles({name: `zigoals-export-${DAY}.zip`, mimeType: 'application/zip', buffer: zip});
  const preview = restoreRegion(page).getByLabel('What this backup holds');
  await expect(preview).toContainText('Exported Nov 20, 2026');
  return preview;
}

test('Export everything → erase → restore brings back the task, journal and note photos and voice notes; Undo removes exactly those', async ({page}) => {
  const zip = await seedAndExport(page);
  await erase(page);
  const preview = await openZip(page, zip);
  const photos = preview.getByRole('group', {name: 'Photos'});
  const choice = photos.getByRole('checkbox', {name: 'Add the missing photos, voice notes and documents (5 in the file: 2 on tasks, 2 in the journal, 1 on notes)'});
  await expect(choice).toBeVisible();
  await expect(photos).toContainText('Each one comes back under the id its record keeps, once that record is on this device');
  await expect(preview.locator('.rb-media-left')).toHaveCount(0);
  await expect(preview.locator('.rb-not-restored')).toHaveCount(0);
  for (const name of ['Tasks', 'Journal', 'Notes']) await preview.getByRole('combobox', {name: `${name}: what to do`}).selectOption('replace');
  await choice.check();
  await preview.getByLabel(/I checked my choices/).check();
  await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
  const region = restoreRegion(page);
  await expect(restoreStatus(region)).toContainText('Restored: Journal, Tasks, Notes.');
  await expect(region.locator('.rb-media-result')).toHaveText('Photos, voice notes and documents put back: 5.');
  expect(await keysOf(page, 'zigoals-task-attachments-v1', 'items')).toEqual([`local:${TASK_PHOTO}`, `local:${TASK_VOICE}`]);
  expect(await keysOf(page, 'zigoals-journal-media-v1', 'media')).toEqual(['local:m-audio0001', 'local:m-photo0001']);
  expect(await keysOf(page, 'zigoals-notes-photos-v1', 'photos')).toEqual(['local:np_garden01']);
  expect(await sizeOf(page, 'zigoals-notes-photos-v1', 'photos', 'local:np_garden01')).toBe(jpeg(80, 60).length);

  // The task's photo shows again in its editor.
  await page.goto('/app/tasks?task=task_a'); await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  const editor = page.getByRole('form', {name: 'Edit “Call the plumber”'});
  await expect(editor.getByRole('list', {name: 'Photos and voice notes on “Call the plumber”'}).getByRole('listitem')).toHaveCount(2);
  await expect(editor.getByRole('link', {name: /^Open photo 1 of “Call the plumber”/})).toBeVisible();

  // Undo, after a reload: the records and exactly the five files go again.
  await page.goto('/app/settings/data');
  await restoreRegion(page).getByRole('button', {name: 'Undo this restore'}).click();
  await expect(restoreStatus(restoreRegion(page))).toContainText('The restore is undone');
  expect(await keysOf(page, 'zigoals-task-attachments-v1', 'items')).toEqual([]);
  expect(await keysOf(page, 'zigoals-journal-media-v1', 'media')).toEqual([]);
  expect(await keysOf(page, 'zigoals-notes-photos-v1', 'photos')).toEqual([]);
});

test('a file already here is never overwritten, one whose record is not on this device stays in the ZIP, and Undo leaves what it did not add', async ({page}) => {
  const zip = await seedAndExport(page);
  await erase(page);
  // Already here: a different journal photo under the backup's id (larger), and a note photo the backup does not hold.
  const mine = webp().concat([0, 0, 0, 0]);
  await putMedia(page, [
    {db: 'zigoals-journal-media-v1', store: 'media', key: 'local:m-photo0001', value: {kind: 'photo', type: 'image/webp', bytes: mine.length, at: AT}, bytes: mine, type: 'image/webp'},
    {db: 'zigoals-notes-photos-v1', store: 'photos', key: 'local:np_mine0001', value: {type: 'image/jpeg', bytes: jpeg().length, at: AT}, bytes: jpeg(), type: 'image/jpeg'},
  ]);
  const preview = await openZip(page, zip);
  // Notes are left as they are, so the note's photo has no record on this device.
  for (const name of ['Tasks', 'Journal']) await preview.getByRole('combobox', {name: `${name}: what to do`}).selectOption('replace');
  await preview.getByRole('group', {name: 'Photos'}).getByRole('checkbox', {name: /Add the missing photos, voice notes and documents/}).check();
  await preview.getByLabel(/I checked my choices/).check();
  await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
  const region = restoreRegion(page);
  await expect(region.locator('.rb-media-result')).toHaveText('Photos, voice notes and documents put back: 3. Not added: 1 already here; 1 that no record on this device names (restore its part, then restore again).');
  expect(await sizeOf(page, 'zigoals-journal-media-v1', 'media', 'local:m-photo0001')).toBe(mine.length);
  expect(await keysOf(page, 'zigoals-notes-photos-v1', 'photos')).toEqual(['local:np_mine0001']);
  await region.getByRole('button', {name: 'Undo this restore'}).click();
  await expect(restoreStatus(region)).toContainText('The restore is undone');
  expect(await keysOf(page, 'zigoals-journal-media-v1', 'media')).toEqual(['local:m-photo0001']);
  expect(await sizeOf(page, 'zigoals-journal-media-v1', 'media', 'local:m-photo0001')).toBe(mine.length);
  expect(await keysOf(page, 'zigoals-notes-photos-v1', 'photos')).toEqual(['local:np_mine0001']);
  expect(await keysOf(page, 'zigoals-task-attachments-v1', 'items')).toEqual([]);
});
