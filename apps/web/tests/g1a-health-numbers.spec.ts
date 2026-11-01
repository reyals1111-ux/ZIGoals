import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from './ah-helpers';
import {HEALTH_NUMBERS_KEY} from '../lib/health-numbers/store';

/**
 * Session AK (BUILD list 2 #4, lane G1a): Health → Measurements → "Your numbers". Fresh start: the empty states teach;
 * a blood pressure reading and two lab values (one with a copied range) are saved; the only verdict is against the
 * copied range, none without; a removal has Undo. The Showcase shows its labelled fictional example (once the lead
 * writes `showcaseHealthNumbers` into the Showcase). Offline, fixed date, UTC.
 */
const TODAY = '2026-11-04';
test.use({timezoneId: 'UTC'});
type Stored = {entries: {kind: string; systolic?: number; diastolic?: number; name?: string; value?: number; unit?: string; refLow?: number; refHigh?: number}[]};
const read = async (page: Page) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), HEALTH_NUMBERS_KEY)) ?? 'null') as Stored | null;
async function openFold(page: Page) {
  await page.goto('/app/health?tab=measurements');
  await hydrated(page);
  await page.getByText('Your numbers: blood pressure and lab values', {exact: true}).click();
  await expect(page.getByText('Your readings. Not a diagnosis.', {exact: false})).toBeVisible();
}

test('fresh start: teach, save a reading and lab values, verdict only against the copied range, Undo', async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await offlineApi(page);
  await freshDevice(page);
  await openFold(page);
  await expect(page.getByText(/No readings yet\./)).toBeVisible();
  await expect(page.getByText(/No lab values yet\./)).toBeVisible();

  const bp = page.getByRole('form', {name: 'Add a blood pressure reading'});
  await bp.getByLabel('Upper (systolic)').fill('80');
  await bp.getByLabel('Lower (diastolic)').fill('120');
  await bp.getByRole('button', {name: 'Save reading'}).click();
  await expect(bp.getByRole('alert')).toContainText('The upper number (systolic) is the larger one.');
  await bp.getByLabel('Upper (systolic)').fill('124');
  await bp.getByLabel('Lower (diastolic)').fill('80');
  await bp.getByLabel('Pulse (optional)').fill('66');
  await bp.getByRole('button', {name: 'Save reading'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Saved: 124/80 mmHg'})).toBeVisible();
  await expect.poll(async () => (await read(page))?.entries).toMatchObject([{kind: 'bp', systolic: 124, diastolic: 80}]);

  const lab = page.getByRole('form', {name: 'Add lab values'});
  await lab.getByLabel('Name', {exact: true}).fill('Glucose');
  await lab.getByLabel('Value', {exact: true}).fill('5,4');
  await lab.getByLabel('Unit, as on the sheet').fill('mmol/L');
  await lab.getByLabel('Range low (optional)').fill('3.9');
  await lab.getByLabel('Range high (optional)').fill('5.6');
  await lab.getByRole('button', {name: 'Another value'}).click();
  await lab.getByLabel('Name', {exact: true}).nth(1).fill('Ferritin');
  await lab.getByLabel('Value', {exact: true}).nth(1).fill('48');
  await lab.getByLabel('Unit, as on the sheet').nth(1).fill('µg/L');
  await lab.getByRole('button', {name: 'Save 2 values'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Saved 2 values'})).toBeVisible();
  await expect.poll(async () => (await read(page))?.entries.filter(e => e.kind === 'lab')).toMatchObject([{name: 'Glucose', value: 5.4, unit: 'mmol/L', refLow: 3.9, refHigh: 5.6}, {name: 'Ferritin', value: 48, unit: 'µg/L'}]);
  const glucose = page.locator('.your-numbers-marker').filter({hasText: 'Glucose'});
  await expect(glucose).toContainText('Inside the range you copied');
  const ferritin = page.locator('.your-numbers-marker').filter({hasText: 'Ferritin'});
  await expect(ferritin).toContainText('No range copied, so no check');
  await expect(page.locator('.your-numbers')).not.toContainText(/\bnormal\b/i);

  await page.getByRole('button', {name: /^Remove 124\/80 mmHg on /}).click();
  await expect.poll(async () => (await read(page))?.entries.some(e => e.kind === 'bp')).toBe(false);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await read(page))?.entries.some(e => e.kind === 'bp')).toBe(true);
  // With no AI connected, the photo fold says so and offers Settings; nothing is sent.
  await page.getByText('Read my lab sheet from a photo (optional)').click();
  await expect(page.getByText(/No AI is connected, so the photo cannot be read\./)).toBeVisible();
});

test('the Showcase shows its labelled fictional example', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await openFold(page);
  await expect(page.getByText('Showcase: fictional example readings, not a real person’s.')).toBeVisible();
  await expect(page.locator('.your-numbers-marker').filter({hasText: 'Total cholesterol'})).toContainText('Outside the range you copied (above it)');
});

test('the report for a visit can include Your numbers', async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T09:00:00.000Z`)});
  await offlineApi(page);
  await freshDevice(page);
  await page.evaluate(([k, v]) => localStorage.setItem(k!, v!), [HEALTH_NUMBERS_KEY, JSON.stringify({version: 1, entries: [{id: 'l1', date: '2026-11-01', kind: 'lab', name: 'Fictional marker', value: 7, unit: 'u/L', refHigh: 5}]})]);
  await page.goto('/app/settings/data');
  await hydrated(page);
  await page.getByRole('button', {name: 'Make a report'}).click();
  await page.getByLabel(/^Your numbers \(blood pressure and lab values\)/).check();
  await page.getByRole('button', {name: 'Show the report'}).click();
  const report = page.getByRole('article', {name: 'Report'});
  await expect(report.getByRole('heading', {name: 'Your numbers'})).toBeVisible();
  await expect(report).toContainText('Outside the range you copied (above it)');
});
