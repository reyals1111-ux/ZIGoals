import {expect, test} from '@playwright/test';
import {freshHealth, storedHealth} from './al-health-helpers';
import {hydrated} from '../../ah-helpers';

// Session AL lane L2 (P-NB-44 / P-PR-10 / P-MO-45): Nairobi NB-139/NB-196, Professor PR-064, Moscow MO-021/MO-023/
// MO-113, BUG-023/BUG-079. Opened before 07:00, the untouched "Log a night" form (23:00 → 07:00) ended in the future and
// Save failed with "A night cannot end in the future.". Brussels time, desktop width, a fresh empty profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const form = (page: import('@playwright/test').Page) => page.getByRole('form', {name: 'Log a night or a nap'});

for (const [label, instant, clock] of [['03:10', '2026-11-04T02:10:00.000Z', '03:10'], ['06:59', '2026-11-04T05:59:00.000Z', '06:59']] as const) {
  test(`NB-139/P-PR-10: at ${label} Brussels the untouched sleep form saves a night that ends now`, async ({page}) => {
    await page.clock.install({time: new Date(instant)});
    await freshHealth(page);
    await page.goto('/app/health?view=sleep'); await hydrated(page);
    const f = form(page);
    await expect(f.getByLabel('Woke up (time)')).toHaveValue(clock);
    await expect(f.getByLabel('Woke up (date)')).toHaveValue('2026-11-04');
    await expect(f.getByLabel('Went to bed (time)')).toHaveValue('23:00');
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    await expect(page.locator('.sleep-note')).toHaveText('Night saved.');
    await expect(f.locator('.field-error')).toHaveCount(0);
    await expect.poll(async () => (await storedHealth(page) as {sleep?: {nights: {end: string}[]}} | null)?.sleep?.nights.length ?? 0).toBe(1);
  });
}

test('MO-113/NB-196: a wake time in the future is said under "Woke up (time)", which takes the focus', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T02:10:00.000Z')});
  await freshHealth(page);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const f = form(page), wake = f.getByLabel('Woke up (time)');
  await wake.fill('07:00');
  await f.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(wake).toHaveAttribute('aria-invalid', 'true');
  await expect(wake).toBeFocused();
  await expect(f.locator('.field-error')).toHaveText('The night cannot end later than now (03:10).');
  await expect(f).not.toContainText('Check the times');
  expect((await storedHealth(page) as {sleep?: {nights: unknown[]}} | null)?.sleep?.nights.length ?? 0).toBe(0);
});

test('BUG-023/MO-023: a nap reads "Nap started / Nap ended"; switching back clears the message', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T13:00:00.000Z')});
  await freshHealth(page);
  await page.goto('/app/health?view=sleep'); await hydrated(page);
  const f = form(page);
  await f.getByLabel('Woke up (time)').fill('');
  await f.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(f.locator('.field-error')).toHaveText('Enter the time you woke up.');
  await f.getByText('A nap', {exact: true}).click();
  await expect(f.locator('.field-error')).toHaveCount(0);
  await expect(f.getByLabel('Nap started (time)')).toBeVisible();
  await expect(f.getByLabel('Nap ended (time)')).toBeVisible();
  await expect(f.getByLabel('Went to bed (time)')).toHaveCount(0);
});
