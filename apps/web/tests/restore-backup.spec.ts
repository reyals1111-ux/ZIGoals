import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HABITS_KEY} from '../lib/habits';
import {GOAL_EXTRAS_KEY} from '../lib/goal-extras/store';
import {PROGRESS_PHOTOS_KEY} from '../lib/aa-device-keys';

/**
 * Session AB-Cloud Part 5 (ADR-023 C22): Settings → Your data → Restore from a backup. A full round trip: Export
 * everything, lose records, restore them from the ZIP, compare, undo; a progress photo comes back to this device; a file
 * that is not an export is refused and nothing changes. Fictional data; the clock is fixed; no request leaves the page.
 */
test.use({timezoneId: 'Europe/Brussels'});
const DAY = '2026-10-14';
const PHOTO = {id: 'photo_restore-0001', date: '2026-10-01', pose: 'front', bytes: 46, type: 'image/webp', at: '2026-10-01T08:00:00.000Z'};
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${DAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const stored = (page: Page, key: string) => page.evaluate(k => localStorage.getItem(k), key);
const zigoalsKeys = (page: Page) => page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => k.includes('zigoals')).sort()));
/** A tiny WebP (VP8X header, 10 × 10) for the photo store; the restore reads its size from the header and never decodes it. */
const webp = () => [...'RIFF'].map(c => c.charCodeAt(0)).concat([38, 0, 0, 0], [...'WEBPVP8X'].map(c => c.charCodeAt(0)), [10, 0, 0, 0, 0, 0, 0, 0, 9, 0, 0, 9, 0, 0], new Array(16).fill(0));
const photoDb = (page: Page, action: 'put' | 'get' | 'clear', bytes?: number[]) => page.evaluate(({action, bytes, id}) => new Promise<number | null>((resolve, reject) => {
  const req = indexedDB.open('zigoals-progress-photos', 1);
  req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('blobs')) req.result.createObjectStore('blobs'); };
  req.onerror = () => reject(req.error);
  req.onsuccess = () => {
    const db = req.result, t = db.transaction('blobs', action === 'get' ? 'readonly' : 'readwrite'), s = t.objectStore('blobs');
    const r = action === 'put' ? s.put(new Blob([new Uint8Array(bytes!)], {type: 'image/webp'}), `local:${id}`) : action === 'get' ? s.get(`local:${id}`) : s.clear();
    r.onsuccess = () => resolve(action === 'get' ? (r.result ? (r.result as Blob).size : null) : 0);
    t.oncomplete = () => db.close();
  };
}), {action, bytes, id: PHOTO.id});

async function exportZip(page: Page): Promise<Buffer> {
  await page.goto('/app/settings');
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const file = await waiting, chunks: Buffer[] = [];
  for await (const chunk of await file.createReadStream()) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
const restoreRegion = (page: Page) => page.getByRole('region', {name: 'Restore from a backup'});

test('Export everything → lose records → restore from the ZIP gives them back byte for byte; Undo puts the loss back; a photo returns to this device', async ({page}) => {
  const {records} = buildShowcase(DAY, 'Europe/Brussels', {aa: true});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [PROGRESS_PHOTOS_KEY]: JSON.stringify({version: 1, photos: [PHOTO]}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
  await photoDb(page, 'put', webp());
  const habits = await stored(page, HABITS_KEY), extras = await stored(page, GOAL_EXTRAS_KEY);
  expect(habits).not.toBeNull(); expect(extras).not.toBeNull();
  const zip = await exportZip(page);

  // The loss: Habits and the goal plans gone, the photo and its index gone.
  await page.evaluate(([h, g, p]) => { localStorage.removeItem(h!); localStorage.removeItem(g!); localStorage.removeItem(p!); }, [HABITS_KEY, GOAL_EXTRAS_KEY, PROGRESS_PHOTOS_KEY]);
  await photoDb(page, 'clear');
  await page.goto('/app/settings/data');
  const region = restoreRegion(page), before = await zigoalsKeys(page);
  await region.getByLabel('Export everything ZIP').setInputFiles({name: `zigoals-export-${DAY}.zip`, mimeType: 'application/zip', buffer: zip});
  const preview = region.getByLabel('What this backup holds');
  await expect(preview).toContainText(`Exported ${DAY}`);
  // The Showcase's examples are recognised and said.
  await expect(preview.getByText('This file holds the Showcase’s fictional examples.', {exact: false})).toBeVisible();
  await expect(preview.getByRole('group', {name: 'Habits'})).toContainText('This device: Nothing here yet');
  await expect(preview.getByRole('group', {name: 'Health'})).toContainText('never turns on Health sync');
  // Nothing changed by the preview; the button waits for a choice and the confirmation.
  expect(await zigoalsKeys(page)).toBe(before);
  const go = preview.getByRole('button', {name: 'Restore the chosen parts'});
  await expect(go).toBeDisabled();
  await preview.getByRole('combobox', {name: 'Habits: what to do'}).selectOption('replace');
  await preview.getByRole('combobox', {name: 'Goal plans, areas and visions: what to do'}).selectOption('merge');
  await preview.getByLabel(/Add the missing progress photos/).check();
  await expect(go).toBeDisabled();
  await preview.getByLabel(/I checked my choices/).check();
  await go.click();
  await expect(region.getByRole('status')).toContainText('Restored: Habits, Goal plans, areas and visions. Photos added: 1.');
  expect(JSON.parse((await stored(page, HABITS_KEY))!)).toEqual(JSON.parse(habits!));
  // Goal extras: the export leaves the device-only `dormant` out, so the merge brings back the rest exactly.
  const {dormant: _dormant, ...exportedExtras} = JSON.parse(extras!);
  void _dormant;
  expect(JSON.parse((await stored(page, GOAL_EXTRAS_KEY))!)).toEqual(exportedExtras);
  expect(JSON.parse((await stored(page, PROGRESS_PHOTOS_KEY))!)).toEqual({version: 1, photos: [PHOTO]});
  expect(await photoDb(page, 'get')).toBe(webp().length);
  // The restored Habits show on their page (an in-app navigation: the undo lives in this tab's memory).
  await page.getByRole('navigation').getByRole('link', {name: 'Habits', exact: true}).first().click();
  await expect(page.getByRole('main')).toContainText(JSON.parse(habits!).habits[0].title);
  // Undo, from the same session after leaving the page.
  await page.goBack();
  await restoreRegion(page).getByRole('button', {name: 'Undo this restore'}).click();
  await expect(restoreRegion(page).getByRole('status')).toContainText('The restore is undone');
  expect(await stored(page, HABITS_KEY)).toBeNull(); expect(await stored(page, GOAL_EXTRAS_KEY)).toBeNull(); expect(await stored(page, PROGRESS_PHOTOS_KEY)).toBeNull();
  expect(await photoDb(page, 'get')).toBeNull();
});

test('a file that is not an export is refused with a plain sentence and nothing changes; the Showcase cannot restore', async ({page}) => {
  await page.goto('/app/settings');
  await page.evaluate(settings => { localStorage.clear(); localStorage.setItem('zigoals:dashboard-settings:v1', settings); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify({...presetSettings('balanced'), onboarded: true}));
  await page.goto('/app/settings/data');
  const region = restoreRegion(page), before = await zigoalsKeys(page);
  await region.getByLabel('Export everything ZIP').setInputFiles({name: 'notes.zip', mimeType: 'application/zip', buffer: Buffer.from('These are notes, not a ZIP archive at all.')});
  await expect(region.getByRole('alert')).toHaveText('This file is not a ZIP archive. Choose the export file as you downloaded it.');
  await expect(region.getByLabel('What this backup holds')).toHaveCount(0);
  expect(await zigoalsKeys(page)).toBe(before);
  // The Showcase: no file input, a plain notice.
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app');
  await page.goto('/app/settings/data');
  await expect(restoreRegion(page)).toContainText('You are in the Showcase. Return to your own data to restore a backup.');
  await expect(restoreRegion(page).getByLabel('Export everything ZIP')).toHaveCount(0);
});

test('a photo already on this device is never overwritten; Undo survives a reload and, once used, is gone', async ({page}) => {
  // Gate C test audit (ADR-023 C22): the restore adds missing photos only. Session AD item 11 (ADR-026, a deliberate
  // change): its Undo no longer ends with the tab; it is kept with the restore's undo record until it is used.
  const {records} = buildShowcase(DAY, 'Europe/Brussels', {aa: true});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [PROGRESS_PHOTOS_KEY]: JSON.stringify({version: 1, photos: [PHOTO]}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
  await photoDb(page, 'put', webp());
  const habits = await stored(page, HABITS_KEY);
  const zip = await exportZip(page);
  // This device now holds a different picture under the same id (four more bytes), and Habits are lost.
  const mine = webp().concat([0, 0, 0, 0]);
  await photoDb(page, 'put', mine);
  await page.evaluate(h => localStorage.removeItem(h), HABITS_KEY);
  await page.goto('/app/settings/data');
  const region = restoreRegion(page);
  await region.getByLabel('Export everything ZIP').setInputFiles({name: `zigoals-export-${DAY}.zip`, mimeType: 'application/zip', buffer: zip});
  const preview = region.getByLabel('What this backup holds');
  await preview.getByRole('combobox', {name: 'Habits: what to do'}).selectOption('replace');
  await preview.getByLabel(/Add the missing progress photos/).check();
  await preview.getByLabel(/I checked my choices/).check();
  await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
  // A photo this device already holds is passed over without a word (it is not "left out": it is here).
  await expect(region.getByRole('status')).toHaveText('Restored: Habits.');
  expect(await photoDb(page, 'get')).toBe(mine.length);
  expect(JSON.parse((await stored(page, PROGRESS_PHOTOS_KEY))!)).toEqual({version: 1, photos: [PHOTO]});
  expect(JSON.parse((await stored(page, HABITS_KEY))!)).toEqual(JSON.parse(habits!));
  await expect(region.getByRole('button', {name: 'Undo this restore'})).toBeVisible();
  await expect(region).toContainText('You can undo this restore here for 7 days, also after a reload');
  // A reload keeps the Undo, with when it ran and until when; the restored records stay until it is used.
  await page.reload();
  const again = restoreRegion(page);
  await expect(again.getByLabel('Export everything ZIP')).toBeVisible();
  await expect(again).toContainText(`A restore from ${DAY} can still be undone here until 2026-10-21, unless you change those records first.`);
  expect(JSON.parse((await stored(page, HABITS_KEY))!)).toEqual(JSON.parse(habits!));
  await again.getByRole('button', {name: 'Undo this restore'}).click();
  await expect(again.getByRole('status')).toHaveText('The restore is undone: this device holds exactly what it held before.');
  expect(await stored(page, HABITS_KEY)).toBeNull();
  expect(await photoDb(page, 'get')).toBe(mine.length);
  // Used once, the Undo is gone, also after another reload.
  await page.reload();
  await expect(restoreRegion(page).getByLabel('Export everything ZIP')).toBeVisible();
  await expect(restoreRegion(page).getByRole('button', {name: 'Undo this restore'})).toHaveCount(0);
  expect(await stored(page, HABITS_KEY)).toBeNull();
});

test('“Keep the restore” ends the Undo, also after a reload; a part changed later ends it too; the restored records stay', async ({page}) => {
  // Session AD item 11 (ADR-026).
  const {records} = buildShowcase(DAY, 'Europe/Brussels', {aa: true});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
  const habits = await stored(page, HABITS_KEY);
  const zip = await exportZip(page);
  const restoreHabits = async () => {
    await page.evaluate(h => localStorage.removeItem(h), HABITS_KEY);
    await page.goto('/app/settings/data');
    const region = restoreRegion(page);
    await region.getByLabel('Export everything ZIP').setInputFiles({name: `zigoals-export-${DAY}.zip`, mimeType: 'application/zip', buffer: zip});
    const preview = region.getByLabel('What this backup holds');
    await preview.getByRole('combobox', {name: 'Habits: what to do'}).selectOption('replace');
    await preview.getByLabel(/I checked my choices/).check();
    await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
    await expect(region.getByRole('status')).toHaveText('Restored: Habits.');
    return region;
  };
  const region = await restoreHabits();
  await region.getByRole('button', {name: 'Keep the restore'}).click();
  await expect(region.getByRole('status')).toHaveText('The restore is kept. Undo is no longer offered for it.');
  await expect(region.getByRole('button', {name: 'Undo this restore'})).toHaveCount(0);
  await page.reload();
  await expect(restoreRegion(page).getByLabel('Export everything ZIP')).toBeVisible();
  await expect(restoreRegion(page).getByRole('button', {name: 'Undo this restore'})).toHaveCount(0);
  expect(JSON.parse((await stored(page, HABITS_KEY))!)).toEqual(JSON.parse(habits!));
  // Again, then Habits change before the reload: nothing is as restored any more, so no Undo is offered.
  await restoreHabits();
  await page.evaluate(h => { const v = JSON.parse(localStorage.getItem(h)!); localStorage.setItem(h, JSON.stringify({...v, habits: v.habits.slice(1)})); }, HABITS_KEY);
  await page.reload();
  await expect(restoreRegion(page).getByLabel('Export everything ZIP')).toBeVisible();
  await expect(restoreRegion(page).getByRole('button', {name: 'Undo this restore'})).toHaveCount(0);
});

test('other ZIGoals files picked by mistake, and a ZIP cut short, are refused with their own sentence; nothing changes', async ({page}) => {
  // Session AD item 11 (ADR-026): foreign and incomplete files.
  await page.goto('/app/settings');
  await page.evaluate(settings => { localStorage.clear(); localStorage.setItem('zigoals:dashboard-settings:v1', settings); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, JSON.stringify({...presetSettings('balanced'), onboarded: true}));
  await page.goto('/app/settings/data');
  const region = restoreRegion(page), before = await zigoalsKeys(page);
  const pick = (name: string, text: string | Buffer) => region.getByLabel('Export everything ZIP').setInputFiles({name, mimeType: 'application/octet-stream', buffer: typeof text === 'string' ? Buffer.from(text) : text});
  await pick('zigoals-encrypted-backup.json', JSON.stringify({format: 'zigoals-encrypted-backup', version: 1}));
  await expect(region.getByRole('alert')).toHaveText('This is an encrypted backup, not an “Export everything” ZIP. Restore it under Settings → Keep a protected copy. Nothing was changed.');
  await pick('habits.json', JSON.stringify({schemaVersion: 2, kind: 'zigoals-habits', habits: []}));
  await expect(region.getByRole('alert')).toHaveText('This is a single Habits backup, not an “Export everything” ZIP. Restore it in Settings under “Habits backup”. Nothing was changed.');
  await pick('everything.json', JSON.stringify({format: 'zigoals-everything', version: 1}));
  await expect(region.getByRole('alert')).toHaveText('This is the everything.json from inside an export. Choose the zigoals-export ZIP itself, as you downloaded it. Nothing was changed.');
  await pick('cut.zip', Buffer.from([0x50, 0x4b, 3, 4, ...new Array(64).fill(0)]));
  await expect(region.getByRole('alert')).toHaveText('This ZIP stops part-way, as when a download or copy did not finish, so nothing was read or changed. Export everything again, then restore that file.');
  await expect(region.getByLabel('What this backup holds')).toHaveCount(0);
  expect(await zigoalsKeys(page)).toBe(before);
});
