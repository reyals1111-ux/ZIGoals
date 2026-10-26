import {expect, test, type Page} from '@playwright/test';
import {loadShowcase, showcaseState} from './ah-helpers';

// Session AH Part 3 (DS4/A4, BUG-061, D-087, B-081, M-141, D-031): resetting the Showcase asks first, in place, and can be
// undone right after with what was added to it; the chip's "Load again" asks the same way.
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}})); });
const reset = (page: Page) => page.getByRole('alertdialog', {name: 'Reset the Showcase?'});

test('Settings: Reset asks next to the button; Keep changes nothing; Reset then Undo brings back what was added', async ({page}) => {
  await loadShowcase(page);
  // Something added to this tab's Showcase.
  await page.evaluate(() => { const m = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!); const k = `zigoals:showcase:v1:${m.generation}:zigoals:platform:v1`; const p = JSON.parse(sessionStorage.getItem(k)!); p.watchlist = p.watchlist.slice(0, 1); sessionStorage.setItem(k, JSON.stringify(p)); });
  await page.goto('/app/settings');
  const button = page.getByRole('button', {name: 'Reset Showcase Demo', exact: true});
  await button.click();
  await expect(reset(page)).toBeVisible();
  await expect(reset(page)).toContainText('Your own records are not touched');
  await expect(reset(page).getByRole('button', {name: 'Keep this Showcase'})).toBeFocused();
  // The question sits right under the button (VA6), not far away.
  const [b, d] = [await button.boundingBox(), await reset(page).boundingBox()];
  expect(Math.abs(d!.y - (b!.y + b!.height))).toBeLessThan(300);
  await page.keyboard.press('Escape');
  await expect(reset(page)).toHaveCount(0);
  await expect(button).toBeFocused();
  expect((await showcaseState(page)).watchlist).toHaveLength(1);
  await button.click();
  await reset(page).getByRole('button', {name: 'Reset Showcase', exact: true}).click();
  await page.waitForURL('**/app');
  expect((await showcaseState(page)).watchlist).toHaveLength(7);
  const toast = page.locator('.aa-toast');
  await expect(toast).toContainText('Showcase reset to fresh examples.');
  await toast.getByRole('button', {name: /Undo/}).click();
  await expect.poll(async () => (await showcaseState(page)).watchlist.length).toBe(1);
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toBeVisible();
  // Offered once: a reload shows no second Undo.
  await page.reload();
  await expect(page.locator('.aa-toast')).toHaveCount(0);
});

test('the Showcase chip: "Load again" asks first; Cancel keeps the Showcase', async ({page}) => {
  await loadShowcase(page);
  const before = await showcaseState(page);
  const chip = page.getByRole('complementary', {name: 'Showcase data'});
  await chip.getByRole('button', {name: 'Showcase'}).click();
  await chip.getByRole('button', {name: 'Load again', exact: true}).click();
  await expect(reset(page)).toBeVisible();
  await reset(page).getByRole('button', {name: 'Keep this Showcase'}).click();
  await expect(reset(page)).toHaveCount(0);
  expect(await showcaseState(page)).toEqual(before);
});
