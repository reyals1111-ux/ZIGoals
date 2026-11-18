import {expect, test} from '@playwright/test';
import {freshHealth, openHealth, storedHealth} from '../grok53/health/al-health-helpers';

// Session AT (ADR-043 D6; AO D17 / AP D22 "CSV Value/Unit as their own fields"): the preview shows each reading's value and
// unit as their own columns; a header maps the columns in any order; the unit for a bare number is the person's choice.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('D6: Value and Unit are their own columns; a header in another order and the chosen unit are read right', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T10:00:00.000Z')});
  await freshHealth(page);
  await openHealth(page, '?view=weight');
  await page.locator('summary', {hasText: 'Import weights from a file'}).click();
  await page.getByLabel('Unit when a line has none').selectOption('lb');
  await page.getByLabel('Or paste the lines').fill('Unit;Weight;Date\nkg;72,5;2026-11-02\n;160;2026-11-03\n');
  const preview = page.getByRole('region', {name: 'Weight import preview'});
  const table = preview.getByRole('table');
  await expect(table.getByRole('columnheader')).toHaveText(['Date', 'Value', 'Unit', 'Saved as']);
  await expect(table.getByRole('caption')).toHaveText('Columns read from the header row.');
  await expect(table.getByRole('row').nth(1).getByRole('cell')).toHaveText([/Nov 2, 2026|2 Nov 2026/, '72.5', 'kg', /72\.5 kg/]);
  await expect(table.getByRole('row').nth(2).getByRole('cell')).toHaveText([/Nov 3, 2026|3 Nov 2026/, '160', 'lb (your choice)', /72\.6 kg/]);
  await preview.getByRole('button', {name: 'Import 2 readings'}).click();
  await expect.poll(async () => (await storedHealth(page))!.weights.map(w => w.grams).sort()).toEqual([72_500, 72_575]);
});
