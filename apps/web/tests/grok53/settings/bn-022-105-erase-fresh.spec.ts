import {expect, test} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

// Session AL (lane L6): Berlin BN-022 / BN-023 / BN-105 (P-BN-31) — after "Erase everything" the old page stayed, the
// armed button looked disabled, and the copy left out areas. Desktop 1280, a fresh profile with a few choices made.
test.use({viewport: {width: 1280, height: 900}});
test.beforeEach(async ({page}) => { await offlineApi(page); await freshDevice(page); });

test('BN-022/BN-023/BN-105: Erase says what it holds, arms as a warning, and opens ZIGoals fresh with first-run choices', async ({page}) => {
  await page.evaluate(() => { localStorage.setItem('zigoals:earn-prefs:v1', JSON.stringify({version: 1, pageShown: true, governanceShown: true})); localStorage.setItem('zigoals:al-probe', '1'); });
  await page.goto('/app/settings#erase-everything'); await hydrated(page);
  const erase = page.locator('#erase-everything');
  for (const area of ['Chess usernames', 'the Checklist, Tasks, Notes and the Journal', 'NOVA', 'offline copy']) await expect(erase).toContainText(area);
  await erase.getByRole('button', {name: 'Erase everything…', exact: true}).click();
  await expect(erase).toContainText(/This browser holds \d+ ZIGoals records?/);
  const button = erase.getByRole('button', {name: 'Erase everything', exact: true});
  await expect(button).toBeDisabled();
  await erase.getByLabel('Type ERASE to confirm').fill('ERASE');
  await expect(button).toBeEnabled();
  // P14-A (run 2): read on the first frame after arming, the colour was mid-way through the buttons' own background
  // transition (rgba(150, 31, 52, .706)). The armed warning colour is the requirement (BN-023), so wait for it to settle.
  await expect.poll(() => button.evaluate(e => getComputedStyle(e).backgroundColor), {timeout: 3_000}).toBe('rgb(179, 38, 63)');
  expect(await button.evaluate(e => getComputedStyle(e).opacity)).toBe('1');
  await button.click();
  await expect(erase.getByRole('status')).toContainText(/^Erased \d+ records and \d+ stores from this browser\./, {timeout: 20_000});
  await erase.getByRole('button', {name: 'Open ZIGoals fresh'}).click();
  await page.waitForURL('**/app'); await hydrated(page);
  expect(await page.evaluate(() => [localStorage.getItem('zigoals:earn-prefs:v1'), localStorage.getItem('zigoals:al-probe')])).toEqual([null, null]);
  // First-run defaults, as on a new device: the money and chain pages are off until chosen.
  await expect(page.getByRole('link', {name: 'Governance'})).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'Earn', exact: true})).toHaveCount(0);
});
