import {test, type Page} from '@playwright/test';
import {openAllSettingsGroups} from '../settings-open';
import {expect, hydrated, seedRecords} from '../journeys/journey-helpers';

/**
 * Session AT (ADR-043 D12, trust pass 2(a)/(b)/(c)): friends will put real data in. On a fresh profile, every kind of
 * record added since Session AL (net-worth history, the day goal, "My day ends at", This evening/Someday, countdowns,
 * money tags, mood tags, symptoms, the Today orbits switch, NOVA's chosen place) → Export everything (a ZIP that opens:
 * its everything.json parses and names each record) → Erase everything (no ZIGoals key or database left) → Restore from
 * the ZIP → every record back, value for value. Fictional data. (Journey 6 covers the older records the same way.)
 */
test.use({actionTimeout: 20_000, timezoneId: 'Europe/Brussels'});
const ENTRY = 'f6f6f6f6-0000-4000-8000-0000000000a1';
const RECORDS: Record<string, unknown> = {
  'zigoals:money-log:v1': {version: 1, entries: [{id: ENTRY, kind: 'expense', amount: '12.50', currency: 'EUR', category: 'Food & drink', note: 'Fictional lunch', date: '2026-11-10', createdAt: '2026-11-10T12:00:00.000Z'}]},
  'zigoals:networth-history:v1': {version: 1, days: [{day: '2026-11-10', at: '2026-11-10T20:00:00.000Z', sources: [{source: 'wealth', currency: 'EUR', value: '1250.5', asOf: '2026-11-10'}]}, {day: '2026-11-11', at: '2026-11-11T20:00:00.000Z', sources: [{source: 'wealth', currency: 'EUR', value: null, asOf: null, missing: ['Fictional painting']}]}]},
  'zigoals:day-goal:v1': {version: 1, changes: [{from: '2026-11-01', need: 3}]},
  'zigoals:day-ends:v1': {version: 1, endsAt: 120, change: {at: '2026-11-01T09:00:00.000Z', from: 0}},
  'zigoals:countdowns:v1': {version: 1, items: [{id: 'cd-trip', title: 'Fictional trip', date: '2026-12-20', note: 'Pack light', createdAt: '2026-11-01T09:00:00.000Z'}]},
  'zigoals:money-tags:v1': {version: 1, tags: {[ENTRY]: ['work', 'fictional']}},
  'zigoals:mood-tags:v1': {version: 1, entries: {'2026-11-10': ['calm', 'walk']}},
  'zigoals:symptoms:v1': {version: 1, items: [{id: 'headache', name: 'Fictional headache', kind: 'symptom', createdAt: '2026-11-01T09:00:00.000Z'}], days: {'2026-11-10': {headache: 1}}},
  'zigoals:today-orbits:v1': {version: 1, shown: true},
  'zigoals:nova-world:v1': {version: 1, place: {name: 'Brussels', lat: 50.85, lon: 4.35}},
};
const value = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
const zigoalsLeft = (page: Page) => page.evaluate(async () => ({
  keys: Object.keys(localStorage).filter(k => k.startsWith('zigoals')).length + Object.keys(sessionStorage).filter(k => k.startsWith('zigoals')).length,
  databases: (await indexedDB.databases()).map(d => d.name ?? '').filter(n => n.startsWith('zigoals')),
}));

test('D12: every record kind since AL survives Export everything → Erase everything → Restore, value for value', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'The same records and screens on a phone; journey 6 runs both projects');
  test.setTimeout(180_000);
  await page.clock.setFixedTime(new Date('2026-11-18T10:00:00.000Z'));
  await page.context().route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await seedRecords(page, RECORDS);
  await page.goto('/app'); await hydrated(page);
  await page.goto('/app/settings'); await hydrated(page); await openAllSettingsGroups(page);
  // The records as the app keeps them (it may tidy a seeded shape on load): these must all come back.
  const kept: Record<string, unknown> = {};
  for (const key of Object.keys(RECORDS)) kept[key] = await value(page, key);
  for (const [key, v] of Object.entries(kept)) expect(v, `${key} read by the app`).not.toBeNull();

  // Export everything: a ZIP whose everything.json parses and holds each record.
  const section = page.getByRole('region', {name: 'Everything you’ve saved, in one file.', exact: true});
  await section.getByLabel('I understand this file is readable and holds my personal records, including Health.').check();
  const waiting = page.waitForEvent('download');
  await section.getByRole('button', {name: 'Export everything', exact: true}).click();
  const chunks: Buffer[] = [];
  for await (const chunk of await (await waiting).createReadStream()) chunks.push(Buffer.from(chunk));
  const zip = Buffer.concat(chunks);
  expect(zip.subarray(0, 2).toString('latin1'), 'a ZIP file').toBe('PK');
  expect(zip.includes(Buffer.from('everything.json')), 'it holds everything.json').toBe(true);

  // Erase everything: nothing of ZIGoals is left in this browser.
  await page.goto('/app/settings#erase-everything'); await hydrated(page); await openAllSettingsGroups(page);
  const erase = page.locator('#erase-everything');
  await erase.getByRole('button', {name: 'Erase everything…', exact: true}).click();
  await erase.getByLabel('Type ERASE to confirm').fill('ERASE');
  await erase.getByRole('button', {name: 'Erase everything', exact: true}).click();
  await expect(erase.getByRole('status')).toContainText(/^Erased \d+ records and \d+ stores from this browser\./, {timeout: 20_000});
  expect(await zigoalsLeft(page)).toEqual({keys: 0, databases: []});

  // Restore from the ZIP, every part replaced.
  await page.goto('/app/settings/data'); await hydrated(page); await openAllSettingsGroups(page);
  const restore = page.getByRole('region', {name: 'Restore from a backup'});
  await restore.getByLabel('Export everything ZIP').setInputFiles({name: 'zigoals-export.zip', mimeType: 'application/zip', buffer: zip});
  const preview = restore.getByLabel('What this backup holds');
  await expect(preview.getByRole('combobox').first()).toBeVisible();
  for (const select of await preview.getByRole('combobox').all()) {
    const options = await select.locator('option').evaluateAll(o => o.map(x => (x as HTMLOptionElement).value));
    await select.selectOption(options.includes('replace') ? 'replace' : options.includes('merge') ? 'merge' : 'leave');
  }
  await preview.getByLabel(/I checked my choices/).check();
  await preview.getByRole('button', {name: 'Restore the chosen parts'}).click();
  await expect(restore.getByRole('status').filter({hasText: 'Restored:'})).toBeVisible({timeout: 20_000});
  for (const [key, expected] of Object.entries(kept)) expect(await value(page, key), key).toEqual(expected);
});
