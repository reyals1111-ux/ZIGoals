import {expect, test} from '@playwright/test';
import {freshHealth} from './al-health-helpers';
import {hydrated} from '../../ah-helpers';
import {addWater} from '../../../lib/health-daily';
import {createEmptyHealth} from '../../../lib/health';

// Session AL lane L2 (P-NB-10 coach part, P-NB-42): Nairobi NB-244 (a fresh profile with nothing logged got "Your coach"
// on Today) and NB-254 (Today's "Log a weight →" opened the Diary, not the Weight view). Desktop, fresh profile.
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});

test('NB-244: nothing logged yet, so Today shows no coach', async ({page}) => {
  await freshHealth(page);
  await page.goto('/app'); await hydrated(page);
  await expect(page.getByText('Your coach', {exact: true})).toHaveCount(0);
});

// Session AW (p5-fixes, FR-S-14; deliberate, as strict): water alone (Health in use, no weight interest) no longer brings the
// coach to Today; a goal weight with no weigh-in yet does, and its "Log a weight →" is checked exactly as before.
test('FR-S-14: water logged but no weight and no goal weight, so Today shows no coach', async ({page}) => {
  const today = new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Brussels'}).format(new Date());
  await freshHealth(page, addWater(createEmptyHealth(), {id: 'health_00000000-0000-4000-8000-000000000254', date: today, amountMilli: 250_000, unit: 'ml'}, new Date().toISOString()));
  await page.goto('/app'); await hydrated(page);
  await expect(page.locator('.today-focus')).toBeVisible();
  await expect(page.getByText('Your coach', {exact: true})).toHaveCount(0);
});

test('NB-254: with a goal weight but no weigh-in yet, "Log a weight →" opens the Weight view with its field focused', async ({page}) => {
  const empty = createEmptyHealth();
  await freshHealth(page, {...empty, targets: {...empty.targets, weightGrams: 70_000}});
  await page.goto('/app'); await hydrated(page);
  const coach = page.getByRole('region', {name: 'Your coach'});
  await coach.getByRole('link', {name: 'Log a weight →'}).click();
  await expect(page).toHaveURL(/\/app\/health\?(.*&)?view=weight\b/);
  await expect(page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name: 'Weight', exact: true})).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('form', {name: 'Weight entry'}).getByLabel(/^Weight \((kg|lb)\)$/)).toBeFocused();
});
