import {expect, test} from '@playwright/test';
import {createEmptyHealth, healthSchema} from '../../../lib/health';
import {saveMeasurement} from '../../../lib/body-measurements';
import {freshHealth, healthView, openHealth} from './al-health-helpers';

// Session AL lane L2 (P-MO-72): Moscow MO-140. A waist read in cm, then one in inches: the chart plotted the inch value as
// centimetres ("35.4 cm · −56.1 since Oct 30") and the axis plunged. Desktop 1280, a fresh profile with the two readings
// (Moscow typed them in the Guest window), a kg journal.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const AT = '2026-11-04T10:00:00.000Z';
function seeded() {
  let data = healthSchema.parse(createEmptyHealth());
  data = saveMeasurement(data, {id: 'health_waist-al000001', kind: 'waist', unit: 'cm', quantityMilli: 91_500, observedAt: '2026-10-30T08:00:00.000Z', timezone: 'Europe/Brussels', sourceLabel: 'Manual measurement'}, AT);
  return saveMeasurement(data, {id: 'health_waist-al000002', kind: 'waist', unit: 'in', quantityMilli: 35_400, observedAt: '2026-11-04T08:00:00.000Z', timezone: 'Europe/Brussels', sourceLabel: 'Manual measurement'}, AT);
}

test('MO-140: the Waist chart shows the inch reading in cm (89.9 cm, −1.6 cm since Oct 30), never 35.4 cm', async ({page}) => {
  await page.clock.install({time: new Date(AT)});
  await freshHealth(page, seeded());
  await openHealth(page);
  await healthView(page, 'Measurements').click();
  const charts = page.getByRole('region', {name: 'Measurement charts'});
  const waist = charts.locator('.health-measure-chart').filter({has: page.getByRole('heading', {name: /^Waist/})});
  await expect(waist.getByRole('heading')).toContainText('89.9 cm · −1.6 cm since Oct 30, 2026');
  await expect(charts).not.toContainText('35.4 cm');
  // The heading's name and value are apart (it read "Waist98.2 cm").
  await expect(waist.getByRole('heading')).toHaveText(/^Waist \d/);
  await waist.getByText('Show as a table').click();
  await expect(waist.getByRole('table')).toContainText('91.5 cm');
  await expect(waist.getByRole('table')).toContainText('89.9 cm');
});

test('PR-021: the history card names the kind it shows; it never says "Add two observations" beside charts with data', async ({page}) => {
  await page.clock.install({time: new Date(AT)});
  await freshHealth(page, seeded());
  await openHealth(page);
  await healthView(page, 'Measurements').click();
  await expect(page.getByText('Add two actual observations to show a change.')).toHaveCount(0);
  await expect(page.getByText('No weight readings here yet: add two to show a change.')).toBeVisible();
});
