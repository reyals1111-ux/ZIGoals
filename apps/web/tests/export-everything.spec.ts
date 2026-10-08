import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {HABITS_KEY} from '../lib/habits';
import {CSV_FILES} from '../lib/export/everything';
import {readStoredZip} from '../lib/export/zip-reader';
import {SYNC_WRITES} from '../lib/vault/sync-writes';

// T4 (Session P): "Export everything (optional)": one readable ZIP, made on the device, nothing written, nothing sent.
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const zigoalsKeys = (page: Page) => page.evaluate(() => JSON.stringify(Object.entries(localStorage).filter(([k]) => k.includes('zigoals')).sort()));
async function download(page: Page) {
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await expect(section).toBeVisible();
  const button = section.getByRole('button', {name: 'Export everything', exact: true});
  await expect(button).toBeDisabled();
  const agree = section.getByLabel('I understand this file is readable and holds my personal records, including Health.');
  await agree.check();
  await expect(button).toBeEnabled();
  const waiting = page.waitForEvent('download');
  await button.click();
  const file = await waiting;
  await expect(section.getByRole('status')).toContainText('Your export is ready and downloading. Keep it private.');
  const stream = await file.createReadStream(); const chunks: Buffer[] = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  return {name: file.suggestedFilename(), bytes: new Uint8Array(Buffer.concat(chunks)), section};
}

test('one ZIP with everything.json and nine CSVs; nothing written on view or by the export; no request', async ({page}) => {
  const {records} = buildShowcase('2026-09-20');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true})});
  await page.reload();
  const before = await zigoalsKeys(page);
  await expect(page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true})).toBeVisible();
  // Nothing is uploaded: during the export every request stays on this origin and none carries a body.
  const requests: {url: string; method: string; body: string | null}[] = [];
  page.on('request', request => requests.push({url: request.url(), method: request.method(), body: request.postData()}));
  const {name, bytes, section} = await download(page);
  expect(name).toBe('zigoals-export-2026-09-15.zip');
  const entries = readStoredZip(bytes);
  expect(entries.map(e => e.name)).toEqual(['everything.json', ...CSV_FILES]);
  const json = JSON.parse(new TextDecoder().decode(entries[0]!.data));
  expect(json.format).toBe('zigoals-everything');
  expect(json.modules.habits).toEqual(JSON.parse((await page.evaluate(key => localStorage.getItem(key), HABITS_KEY))!));
  // Session U Part 9: with the sync writes on, the Showcase's fast is in Health; switched off, in its device key.
  expect((SYNC_WRITES ? json.modules.health.fasting : json.device.fasting).sessions[0].id).toBe('fast_showcase-1');
  expect(json.unreadable).toEqual([]);
  const firstLines = Object.fromEntries(entries.slice(1).map(e => [e.name, new TextDecoder().decode(e.data).split('\r\n')[0]]));
  expect(firstLines['goals.csv']).toMatch(/^"source","id","name"/);
  expect(firstLines['check-ins.csv']).toMatch(/^"habit_id","habit_title","date"/);
  expect(firstLines['health-diary.csv']).toMatch(/^"record_id","date","kind"/);
  expect(firstLines['wealth-positions.csv']).toMatch(/^"id","name","asset"/);
  expect(await zigoalsKeys(page)).toBe(before);
  for (const r of requests) expect(new URL(r.url).hostname).toBe('127.0.0.1');
  expect(requests.filter(r => r.method !== 'GET' || r.body)).toEqual([]);
  await expect(section).toContainText('Made on this device. Nothing is uploaded. This is not a restore format.');
  if (await page.getByRole('link', {name: /^Export everything/}).count()) {
    const row = page.getByRole('link', {name: /^Export everything/}).first();
    expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect((await section.getByLabel(/^I understand this file/).boundingBox())!.height).toBeGreaterThanOrEqual(16);
  expect((await section.getByRole('button', {name: 'Export everything', exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

// Session X Part 7: the consent checkbox sits beside its sentence (it sat above it, centred: ADR-015 S141's open finding).
test('the consent checkbox sits beside its sentence, top-aligned, 22 px, with a 44 px row', async ({page}) => {
  await page.goto('/app/settings');
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  const row = section.locator('.export-everything-agree'), box = row.locator('input[type=checkbox]'), text = row.locator('span');
  await row.scrollIntoViewIfNeeded();
  const [r, b, t] = await Promise.all([row.boundingBox(), box.boundingBox(), text.boundingBox()]);
  expect(b!.x + b!.width).toBeLessThanOrEqual(t!.x);
  expect(Math.abs(b!.y - t!.y)).toBeLessThanOrEqual(6);
  expect(Math.round(b!.width)).toBe(22); expect(Math.round(b!.height)).toBe(22);
  expect(r!.height).toBeGreaterThanOrEqual(44);
  expect(t!.x + t!.width).toBeLessThanOrEqual(r!.x + r!.width + 0.5);
});
test('Showcase: the file name says showcase-demo', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/settings');
  const {name, bytes} = await download(page);
  expect(name).toBe('zigoals-showcase-demo-export-2026-09-15.zip');
  expect(readStoredZip(bytes).map(e => e.name)).toEqual(['everything.json', ...CSV_FILES]);
});
