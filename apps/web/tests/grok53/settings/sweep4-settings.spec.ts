import {expect, test} from '@playwright/test';
import {freshDevice, hydrated} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

// Session AL sweep 4 (lane SW4): the L6 fourth pass's requests 3 and 4 in the replay's conditions (Lisbon 1280; Denver
// 388 Light/Dark; Berlin 375 Dark), a fresh profile; Europe/Brussels, en-GB.
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});

test('DV-273/NB-029/N-002: "Load Showcase Demo" is a secondary button, not the page\'s main action (1280)', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await freshDevice(page);
  await openSettings(page); await hydrated(page);
  const load = page.getByRole('button', {name: 'Load Showcase Demo', exact: true});
  await expect(load).toHaveClass(/\bsecondary\b/);
  await expect(load).not.toHaveClass(/\bprimary\b/);
});

test('D-218: the mini-bar choice waits for the Music player, and says where to turn it on (1280)', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await freshDevice(page);
  await page.goto('/app/settings#music'); await hydrated(page);
  const music = page.locator('#music');
  const mini = music.getByRole('checkbox', {name: /mini-bar instead of the round button/});
  // The Music player starts hidden on a new device (lib/pages/visibility.ts DEFAULT_HIDDEN).
  await expect(mini).toBeDisabled();
  await expect(mini).toHaveAccessibleDescription('Turn the Music player on under Your pages & buttons to choose this.');
  await music.getByRole('button', {name: 'Show the music player'}).click();
  await expect(mini).toBeEnabled();
  await expect(music).not.toContainText('Turn the Music player on under Your pages & buttons to choose this.');
});

test('N-DV-12/DV-256: the theme lines never assume a returning visitor (388, Dark)', async ({page}) => {
  await page.setViewportSize({width: 388, height: 844});
  await freshDevice(page);
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('button', {name: 'More', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'More'});
  await sheet.getByRole('radio', {name: 'Dark theme'}).click();
  await expect(sheet).toContainText('Light is the day look; Nebula the starry one.');
  await sheet.getByRole('radio', {name: 'Nebula theme'}).click();
  await expect(sheet).toContainText('Nebula is ZIGoals’ own night-sky look.');
  await expect(sheet).not.toContainText(/the (look|one) you know/);
  // DV-256: no decorative "Your Financial Orbit" banner at the sheet's foot.
  await expect(sheet).not.toContainText(/Your Financial Orbit/i);
});

test('BN-001: More says where the pages that start off are, and takes you there (375, Dark)', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await freshDevice(page);
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('button', {name: 'More', exact: true}).click();
  const row = page.getByRole('dialog', {name: 'More'}).getByRole('link', {name: 'More pages', exact: true});
  await expect(row).toHaveAttribute('href', '/app/settings#your-pages');
  expect((await row.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await row.click();
  await expect(page).toHaveURL(/\/app\/settings#your-pages$/);
  await expect(page.locator('#your-pages')).toBeInViewport();
});

test('DV-262/DV-266: the phone\'s Settings list ends with "Try it"; Chess sits with Music and Links in "Extras" (388)', async ({page}) => {
  await page.setViewportSize({width: 388, height: 844});
  await freshDevice(page);
  await openSettings(page); await hydrated(page);
  const list = page.getByRole('navigation', {name: 'Settings sections'});
  // Session AO (owner decision 13 Nov, deliberate): Appearance is the first group (theme, motion, display; #appearance moved
  // out of Your app unchanged).
  await expect(list.getByRole('heading', {level: 2})).toHaveText(['Appearance', 'Data & privacy', 'Your app', 'Your areas', 'Extras', 'Account & devices', 'Your assistant', 'Help & diagnostics', 'Try it']);
  const group = (name: string) => list.getByRole('region', {name, exact: true});
  await expect(group('Try it').getByRole('link')).toHaveText([/^Showcase tour\s*Fictional examples, in this tab only/]);
  await expect(group('Data & privacy')).not.toContainText('Showcase');
  await expect(group('Extras').getByRole('link')).toHaveText([/^Music & focus sounds/, /^Links on Today/, /^Chess usernames/]);
  await expect(group('Your areas')).toContainText('Health targetsCalories, water, steps and units');
  await expect(group('Your areas')).not.toContainText('Chess');
});

test('D-159: on a phone, Help\'s top bar steps back to Settings only when Settings opened it (388)', async ({page}) => {
  await page.setViewportSize({width: 388, height: 844});
  await freshDevice(page);
  await page.goto('/app/help'); await hydrated(page);
  const bar = page.locator('.phone-topbar');
  await expect(bar.getByRole('link', {name: 'Back to Settings', exact: true})).toHaveCount(0);
  await expect(bar.getByRole('link', {name: 'ZIGoals home', exact: true})).toBeVisible();
  await openSettings(page); await hydrated(page);
  await page.getByRole('link', {name: 'Help & feedback →', exact: true}).click();
  await expect(page).toHaveURL(/\/app\/help$/);
  await expect(bar.getByRole('link', {name: 'Back to Settings', exact: true})).toBeVisible();
});
