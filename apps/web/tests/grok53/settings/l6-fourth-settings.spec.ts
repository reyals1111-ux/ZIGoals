import {expect, test, type Page} from '@playwright/test';
import {freshDevice, hydrated, loadShowcase, offlineApi} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

// Session AL (lane L6, fourth pass): the L6 replay's open Settings, Help and Search rows in the bots' conditions (Lisbon
// 1280, Berlin 1280/1440/1920 Nebula, Denver 636/445 px, Nairobi's Showcase), a fresh profile unless the row used the
// Showcase; Europe/Brussels, en-GB. Each test fails on c521574f and passes on the branch.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
const palette = (page: Page) => page.getByRole('dialog', {name: 'Search'});

test('LS-H47/LS-014: one Escape closes Search, with words typed', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app'); await hydrated(page);
  for (const words of ['L1', 'plumber', 'time zone']) {
    await page.keyboard.press('/');
    await expect(palette(page)).toBeVisible();
    await palette(page).getByRole('combobox').fill(words);
    await page.keyboard.press('Escape');
    await expect(palette(page)).toBeHidden();
  }
});

test('D-159: "Back to Settings" shows only when Help was opened from Settings', async ({page}) => {
  for (const [width, height] of [[636, 900], [445, 900]] as const) {
    await page.setViewportSize({width, height});
    await offlineApi(page); await freshDevice(page);
    await page.goto('/app'); await hydrated(page);
    await page.goto('/app/help'); await hydrated(page);
    await expect(page.locator('main').getByRole('link', {name: '← Back to Settings'})).toHaveCount(0);
  }
  await page.setViewportSize({width: 1280, height: 900});
  await openSettings(page); await hydrated(page);
  await page.locator('.settings-page .page-heading').getByRole('link', {name: 'Help & feedback →'}).click();
  await expect(page).toHaveURL(/\/app\/help$/);
  await expect(page.locator('main').getByRole('link', {name: '← Back to Settings'})).toBeVisible();
  await page.locator('main').getByRole('link', {name: '← Back to Settings'}).click();
  await expect(page).toHaveURL(/\/app\/settings$/);
});

test('BN-165/B-193/BN-024/D-091: Help’s recovery steps say "with an account only" on an installation without accounts', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await offlineApi(page); await freshDevice(page);
  await page.goto('/app/help#recovery-secret'); await hydrated(page);
  const topic = page.locator('#recovery-secret');
  await expect(topic.locator('li').filter({hasText: 'Lost a device?'})).toContainText('Lost a device? With an account only: revoke it under Settings → Devices and sessions');
  await expect(topic.locator('li').filter({hasText: 'Lost a device?'})).toContainText('Without an account there is nothing to revoke');
  await expect(topic.locator('li').filter({hasText: 'Lost the secret, but a device'})).toContainText('With an account only:');
});

test('B-109/B-202: Help’s "fewer cards" answer matches the Showcase Today (one Daily Habits card)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);
  // Session AL (CI10, spec mistake): Help's questions carry the id "help-<id>" (components/help/help-question.tsx, as
  // What's new links them), so the answer is #help-ac-today.
  await page.goto('/app/help#help-ac-today'); await hydrated(page);
  const answer = page.locator('#help-ac-today');
  await expect(answer).toContainText('today’s habits show in one card named Daily Habits, your habits widget, and the second, built-in copy of that list stands aside');
  await expect(answer).not.toContainText('Daily Habits and “Your next goal action” stand aside');
});

test('D-236/D-062: no Title Case "Import Goal Data" heading among Settings’ sentence-case headings', async ({page}) => {
  await page.setViewportSize({width: 1920, height: 1080});
  await page.addInitScript(() => { try { if (!localStorage.getItem('zigoals:earn-prefs:v1')) localStorage.setItem('zigoals:earn-prefs:v1', JSON.stringify({version: 1, pageShown: true})); } catch { /* none */ } });
  await offlineApi(page); await freshDevice(page);
  await openSettings(page); await hydrated(page);
  await expect(page.getByRole('heading', {name: 'Import goal data', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Import Goal Data', exact: true})).toHaveCount(0);
});

test('N-NB-15: the Showcase card says a person’s own app starts with fewer pages, before and inside the demo', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page); await freshDevice(page);
  await openSettings(page); await hydrated(page);
  const tryIt = page.getByRole('group', {name: 'Try it'});
  await expect(tryIt).toContainText('Your own ZIGoals starts with fewer pages, and shows only the ones you switch on under Your pages & buttons.');
  await loadShowcase(page);
  await openSettings(page); await hydrated(page);
  await expect(page.locator('#settings-app')).toContainText('The Showcase shows every page. Your own ZIGoals keeps the pages you chose');
});

test('C-BN-25: a page switch in Settings offers Undo, which puts the switch back', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await offlineApi(page); await freshDevice(page);
  await openSettings(page); await hydrated(page);
  const pages = page.getByRole('region', {name: 'Your pages & buttons'});
  const goals = pages.getByRole('switch', {name: 'Goals', exact: true});
  await expect(goals).toBeChecked();
  await goals.click();
  await expect(goals).not.toBeChecked();
  await expect(pages.getByRole('status')).toHaveText('Goals is hidden. You can show it again here at any time.');
  await pages.getByRole('button', {name: 'Undo', exact: true}).click();
  await expect(goals).toBeChecked();
  await expect(pages.getByRole('status')).toHaveText('Goals shows again.');
  await expect(pages.getByRole('button', {name: 'Undo', exact: true})).toHaveCount(0); // an Undo is not undone again
});
