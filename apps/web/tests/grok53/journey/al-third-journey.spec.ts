import {expect, test, type Page} from '@playwright/test';
import {emptyDevice, offline, open} from '../l3-helpers';
import {openDeskFold} from '../../ao/folds';

/** Session AL third pass (lane L3): Journey and game-layer rows. Every /api request answered 503. */
async function showcase(page: Page) {
  await offline(page);
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}

// Session AL (deliberate, owner decision O4): "Journey, Life review, Stories and ZIGi states stay out of the sidebar".
// The registrar now reads the Showcase's switch (the rail test below proves the entry registers); on a computer the
// entry is compact, so the desktop sidebar does not show it.
test('registrar: the Showcase (game layer on in its own tab storage) keeps Journey out of the desktop sidebar (O4)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await showcase(page);
  await expect(page.locator('.app-sidebar a[href="/app/journey"]')).toBeAttached(); // registered (the rail and search use it)
  await expect(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Journey', exact: true})).toHaveCount(0);
});

test('registrar: and in the tablet rail at 820 px', async ({page}) => {
  await page.setViewportSize({width: 820, height: 1180});
  await showcase(page);
  await expect(page.getByRole('navigation', {name: 'Main navigation'}).getByRole('link', {name: 'Journey', exact: true})).toBeAttached();
});

test('MO-161 (P-MO-49): a shelf price of 0 or below is refused in words under the field', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await emptyDevice(page);
  await page.evaluate(() => {
    localStorage.setItem('zigoals:game:v1', JSON.stringify({version: 1, enabled: true, levelSeen: 1}));
    localStorage.setItem('zigoals:rewards-shelf:v1', JSON.stringify({version: 1, on: true}));
  });
  await open(page, '/app/journey');
  await openDeskFold(page, 'Rewards shelf'); // Session AO (DV-045e, deliberate): a folded row on Journey now; opened first
  const shelf = page.locator('#rewards-shelf');
  await shelf.getByLabel('A treat').fill('Fictional film night');
  for (const price of ['0', '-5']) {
    await shelf.getByLabel('Points').fill(price);
    await shelf.getByRole('button', {name: 'Add to the shelf', exact: true}).click();
    await expect(shelf.locator('#rewards-price-error')).toHaveText('Enter a price of 1 point or more.');
    await expect(shelf.getByLabel('Points')).toBeFocused();
  }
  await expect(shelf.getByText('Fictional film night')).toHaveCount(0);
  await shelf.getByLabel('Points').fill('200');
  await shelf.getByRole('button', {name: 'Add to the shelf', exact: true}).click();
  await expect(shelf.locator('#rewards-price-error')).toHaveCount(0);
  await expect(shelf.getByText('Fictional film night', {exact: true})).toBeVisible();
});

test('AL-LAYOUT-375-011 (DV-223, DV-247): no unlabeled rocket on a phone; the switch stays in Settings', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await emptyDevice(page);
  await open(page, '/app/habits');
  await expect(page.locator('.gamify')).toHaveCount(0);
  await open(page, '/app/journey');
  await expect(page.getByRole('switch', {name: 'Game layer'})).toBeVisible();
});

test('DV-275 (P-DV-111): the Game layer switch sits on its label\'s line in Settings at 768 px', async ({page}) => {
  await page.setViewportSize({width: 768, height: 1024});
  await emptyDevice(page);
  await open(page, '/app/settings');
  const box = page.getByRole('switch', {name: 'Game layer'});
  await box.scrollIntoViewIfNeeded();
  const b = (await box.boundingBox())!, label = (await page.locator('.game-setting-row strong', {hasText: 'Game layer'}).boundingBox())!;
  expect(Math.abs(b.y - label.y)).toBeLessThan(24);
  expect(b.x).toBeLessThan(label.x);
});
