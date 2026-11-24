import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (journal; LEDGER #35 Day One's rich entries, #42 its audio recorder): Write → "Photos and a voice
 * note" adds a photo and records a voice note in the browser (MediaRecorder; a test tone stands in for the microphone),
 * both kept on this device when the entry is saved, shown under the entry with plain names and taken off with Undo;
 * "Link another day" puts a [[day]] link in the words, which opens that day's entries, with "Linked from" there. At 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
// A 1×1 PNG, the person's "photo".
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
type Stored = {entries: {id: string; text: string; photos?: string[]; audio?: {id: string; seconds: number}[]}[]};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: a photo, a voice note and a link to another day`, async ({page, isMobile, browserName}) => {
  test.skip(browserName !== 'chromium', 'the stand-in microphone needs Chromium’s MediaRecorder');
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => {
    if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [{id: 'e1', date: '2026-11-03', text: 'A fictional walk by the sea.', createdAt: '2026-11-03T20:00:00.000Z'}]}));
    // A test tone stands in for the microphone (no device, nothing leaves the page).
    if (navigator.mediaDevices) navigator.mediaDevices.getUserMedia = async () => { const ctx = new AudioContext(), osc = ctx.createOscillator(), dest = ctx.createMediaStreamDestination(); osc.connect(dest); osc.start(); return dest.stream; };
  }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const write = page.getByRole('form', {name: 'Write in your journal'});
  await write.locator('details.journal-media-fold > summary').click();
  const media = write.locator('.journal-compose-media');
  await media.locator('input[type="file"]').setInputFiles({name: 'fictional.png', mimeType: 'image/png', buffer: PNG});
  await expect(media.getByRole('img', {name: 'Photo 1 for this entry'})).toBeVisible();
  await media.getByRole('button', {name: 'Record a voice note'}).click();
  const stop = media.getByRole('button', {name: /^Stop recording/});
  await expect(stop).toBeVisible();
  await page.waitForTimeout(1600);
  await stop.click();
  await expect(media.getByLabel(/^Your voice note, 0:0\d$/)).toBeVisible();
  await expect(media.getByRole('button', {name: 'Record a voice note'})).toHaveCount(0);
  const findings = await axe(page, write);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // A link to the walk's day, then Save.
  await write.getByLabel('Today’s entry').fill('A fictional evening, thinking of the sea again.');
  await write.locator('details.journal-link-fold > summary').click();
  await write.getByLabel('Day to link').fill('2026-11-03');
  await write.getByRole('button', {name: 'Add the link'}).click();
  await expect(write.getByLabel('Today’s entry')).toHaveValue('A fictional evening, thinking of the sea again. [[2026-11-03]]');
  await write.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(async () => { const e = (await read(page)).entries.at(-1)!; return [e.photos?.length, e.audio?.length]; }).toEqual([1, 1]);
  const row = page.locator('ol.journal-entries > li').first();
  await expect(row.getByRole('img', {name: /^Your photo with the entry of/})).toBeVisible();
  await expect(row.getByLabel(/^Voice note of .*, 0:0\d$/)).toBeAttached();
  // The [[link]] opens the walk's day, and that day says where it is linked from.
  await row.getByRole('link', {name: /Nov 3, 2026/}).click();
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(1);
  await expect(page.locator('ol.journal-entries > li').first()).toContainText('walk by the sea');
  await expect(page.locator('.journal-linked-from')).toContainText('Linked from');
  await page.goto('/app/journal'); await hydrated(page);
  // Take the photo off the entry, then Undo.
  const saved = page.locator('ol.journal-entries > li').first();
  await saved.getByRole('button', {name: /^Take photo 1 off the entry of/}).click();
  await expect.poll(async () => (await read(page)).entries.at(-1)!.photos).toBeUndefined();
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await read(page)).entries.at(-1)!.photos?.length).toBe(1);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
