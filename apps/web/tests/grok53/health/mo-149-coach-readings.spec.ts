import {expect, test} from '@playwright/test';
import {createEmptyHealth, saveWeight, type HealthData} from '../../../lib/health';
import {saveHealthPreferences} from '../../../lib/health-daily';
import {addLocalDays} from '../../../lib/local-date';
import {freshHealth, healthView, openHealth} from './al-health-helpers';

// Session AL lane L2 (P-MO-70 / P-PR-23): Moscow MO-149 (with Professor X3-16, PR-020, PR-097). With six or seven daily
// readings the coach said "Not enough readings yet… two in the last week will do", and the Energy card read "27 of 14
// logged days". Desktop, a pound journal, a fresh profile with Moscow's daily readings.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const NOW = new Date('2026-11-04T11:00:00.000Z'), TODAY = '2026-11-04';
function daily(days: number): HealthData {
  let d: HealthData = saveHealthPreferences(createEmptyHealth(), {timezone: 'Europe/Brussels', waterUnit: 'ml', weightUnit: 'lb', waterTargetMl: null});
  for (let i = 0; i < days; i++) d = saveWeight(d, {id: `health_weight-al${String(i).padStart(4, '0')}`, date: addLocalDays(TODAY, -i), grams: 81_000 - i * 150}, NOW.toISOString());
  return d;
}

test('MO-149/X3-16: six daily readings: the coach says when the weekly rate can show, not "two in the last week will do"', async ({page}) => {
  await page.clock.install({time: NOW});
  await freshHealth(page, daily(6));
  await openHealth(page, '?view=weight');
  const coach = page.getByRole('region', {name: 'Your coach'});
  await expect(coach).toContainText('6 days with a weight since Oct 30. A weekly rate needs readings at least seven days apart. A reading on Nov 6 or later gives the rate.');
  await expect(coach).not.toContainText('two in the last week');
  // PR-020/PR-097: one count for the estimate's progress, never "27 of 14".
  await expect(page.getByRole('region', {name: 'Maintenance estimate'})).toContainText('6 of 10 weigh-ins');
  await expect(page.locator('main')).not.toContainText(/\b(1[5-9]|[2-9]\d) of 14\b/);
  await expect(healthView(page, 'Weight')).toHaveAttribute('aria-pressed', 'true');
});
