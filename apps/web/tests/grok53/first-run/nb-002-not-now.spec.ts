import {expect, test} from '@playwright/test';
import {emptyDevice, hydrated, open} from '../l3-helpers';

/**
 * NB-002/NB-033 (P-NB-08): after "Not now" (or a welcome another visit dismissed), an empty Today still offers ONE way into
 * the setup, until the first record or the setup exists. Bot: shared profile with the card dismissed; clean Incognito 1280×800.
 */
test.use({viewport: {width: 1280, height: 800}});
test('NB-002: an empty device that said "Not now" still lands on a setup entry, not a bare Today', async ({page}) => {
  await emptyDevice(page, {welcomeSeen: false});
  await open(page, '/app');
  await expect(page.getByRole('heading', {name: 'Set up your first goal and habit in about a minute.'})).toBeVisible();
  await page.getByRole('button', {name: 'Not now', exact: true}).click();
  await page.reload(); await hydrated(page);
  const entry = page.getByRole('region', {name: 'Set up ZIGoals in about a minute.'});
  await expect(entry).toBeVisible();
  await expect(entry.getByRole('link', {name: 'Start setup'})).toHaveAttribute('href', '/app/welcome');
  // One first action while it shows: the "Make Today yours" chooser waits.
  await expect(page.getByRole('heading', {name: 'Make Today yours.'})).toHaveCount(0);
});
