import {expect, test} from '@playwright/test';
import {freshHealth, openHealth, storedHealth} from './al-health-helpers';

// Session AL lane L2, third pass: GAP-071 (C-MO-42) Sleep Cycle import and GAP-072 (C-MO-43) an Oura sleep CSV in the
// layout the bot tried (any file name), on Sleep → "Import nights from a file". Desktop, fresh profile, Brussels.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const CYCLE = 'Start;End;Sleep Quality;Time in bed (seconds);Time asleep (seconds);Time before sleep (seconds)\n2026-11-02 23:10:00;2026-11-03 06:55:00;84%;27900;25200;900\n';
const OURA = 'day,bedtime_start,bedtime_end,type,total_sleep_duration,latency\n2026-11-04,2026-11-03T23:30:00+01:00,2026-11-04T07:00:00+01:00,long_sleep,24600,600\n';
const nights = async (page: import('@playwright/test').Page) => ((await storedHealth(page)) as unknown as {sleep?: {nights: unknown[]}} | null)?.sleep?.nights.length ?? 0;

test('GAP-071/GAP-072: Sleep Cycle and Oura files preview, import, and Undo takes exactly those nights out', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '?view=sleep');
  await page.locator('summary', {hasText: 'Import nights from a file'}).click();
  await page.getByLabel('Sleep file (CSV)').setInputFiles({name: 'sleepdata.csv', mimeType: 'text/csv', buffer: Buffer.from(CYCLE)});
  const preview = page.getByRole('region', {name: 'Sleep import preview'});
  await expect(preview).toContainText('This looks like Sleep Cycle’s CSV export');
  await expect(preview).toContainText('1 night to add');
  await expect(preview).toContainText('7 h 00 min asleep');
  await preview.getByRole('button', {name: 'Import 1 night'}).click();
  await expect.poll(() => nights(page)).toBe(1);
  await page.getByLabel('Sleep file (CSV)').setInputFiles({name: 'oura-sleep.csv', mimeType: 'text/csv', buffer: Buffer.from(OURA)});
  await expect(preview).toContainText('Oura’s sleep rows');
  await preview.getByRole('button', {name: 'Import 1 night'}).click();
  await expect.poll(() => nights(page)).toBe(2);
  await page.locator('.aa-toast').getByRole('button', {name: /Undo/}).click();
  await expect.poll(() => nights(page)).toBe(1);
});
