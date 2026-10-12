import {expect, test, type Page} from '@playwright/test';

/** Session AA-Cloud Part 4: one search over this device's records and the app, from every page. */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});
async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}
const palette = (page: Page) => page.getByRole('dialog', {name: 'Search'});
const field = (page: Page) => palette(page).getByRole('combobox');

test('the header button and "/" open search on every page; ⌘K is not taken; Escape returns focus', async ({page, isMobile}) => {
  for (const path of ['/app', '/app/goals', '/app/wealth', '/app/settings', '/app/help']) {
    await page.goto(path);
    await expect(page.getByRole('heading', {level: 1}).first()).toBeVisible();
    const button = page.getByRole('button', {name: 'Search'}).filter({visible: true}).first();
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
  await page.locator('body').press('/');
  await expect(palette(page)).toBeVisible();
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(palette(page)).toHaveCount(0);
  // Typing "/" in a field types it.
  await page.goto('/app/goals/new');
  const name = page.getByLabel('Goal name', {exact: true});
  await name.fill('A/B');
  await expect(name).toHaveValue('A/B');
  await expect(palette(page)).toHaveCount(0);
  if (!isMobile) {
    const button = page.getByRole('button', {name: 'Search'}).filter({visible: true}).first();
    await button.click();
    await expect(field(page)).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(button).toBeFocused();
  }
});

test('finds goals, habits, foods, assets, templates, settings and Help answers; arrows and Enter open one', async ({page}) => {
  await showcase(page);
  await page.getByRole('button', {name: 'Search'}).filter({visible: true}).first().click();
  await field(page).fill('emergency');
  const results = palette(page).getByRole('listbox');
  await expect(results.getByRole('group', {name: 'Goals'}).getByRole('option', {name: /Emergency fund/})).toBeVisible();
  await expect(results.getByRole('group', {name: 'Goal templates'})).toBeVisible();
  await field(page).fill('backup');
  await expect(results.getByRole('group', {name: /Settings|Help answers/}).first()).toBeVisible();
  await field(page).fill('read');
  await expect(results.getByRole('group', {name: 'Habits'}).getByRole('option').first()).toBeVisible();
  await field(page).fill('calculator');
  const first = results.getByRole('option').first();
  await expect(first).toHaveAttribute('aria-selected', 'true');
  await expect(field(page)).toHaveAttribute('aria-activedescendant', (await first.getAttribute('id'))!);
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/wealth\/calculator$/);
  await expect(palette(page)).toHaveCount(0);
  // An answer opens in place.
  await page.locator('body').press('/');
  await field(page).fill('export everything');
  await results.getByRole('group', {name: 'Help answers'}).getByRole('option', {name: /Can I get all my data out\?/}).click();
  await expect(page).toHaveURL(/\/app\/help#help-export-everything$/);
  await expect(page.locator('#help-export-everything')).toHaveAttribute('open', '');
});

test('recent searches stay on this device and clear; nothing matching says so; the last row asks ZIGi', async ({page}) => {
  await page.goto('/app');
  await page.locator('body').press('/');
  await field(page).fill('settings');
  await page.keyboard.press('Enter');
  await page.waitForURL('**/app/settings');
  await page.locator('body').press('/');
  const recent = palette(page).getByRole('listbox', {name: 'Recent searches'});
  await expect(recent.getByRole('option', {name: /settings/})).toBeVisible();
  await field(page).fill('zzzz qqqq');
  await expect(palette(page)).toContainText('Nothing on this device matches');
  const ask = palette(page).getByRole('option', {name: /Ask ZIGi: “zzzz qqqq”/});
  await expect(ask).toBeVisible();
  await page.keyboard.press('ArrowDown');
  await expect(ask).toHaveAttribute('aria-selected', 'true');
  await field(page).fill('');
  await palette(page).getByRole('button', {name: 'Clear recent searches'}).click();
  await expect(recent.getByRole('option')).toHaveCount(0);
});

test('on a phone, search is a full-screen sheet from the top bar', async ({page, isMobile}) => {
  test.skip(!isMobile, 'the phone sheet');
  await page.goto('/app');
  await page.locator('.phone-top-bar, .phone-topbar, header').getByRole('button', {name: 'Search'}).first().click();
  const box = (await palette(page).boundingBox())!, viewport = page.viewportSize()!;
  expect(box.width).toBeGreaterThanOrEqual(viewport.width - 1);
  expect(box.height).toBeGreaterThanOrEqual(viewport.height - 1);
  expect(parseFloat(await field(page).evaluate(e => getComputedStyle(e).fontSize))).toBeGreaterThanOrEqual(16);
});

// Gate C (persona round): ZIGi steps aside while the palette is open, so the row reads the launcher as the palette opens
// and hands the words over once ZIGi is back; nothing is sent.
test('"Ask ZIGi" in search works while ZIGi shows: the words wait in ZIGi\'s message box, unsent', async ({page}) => {
  await page.goto('/app');
  await expect(page.getByRole('button', {name: /Open ZIGi/})).toBeVisible();
  await page.locator('body').press('/');
  await field(page).fill('how is my sleep');
  const ask = palette(page).getByRole('option', {name: /Ask ZIGi: “how is my sleep”/});
  await expect(ask).not.toHaveAttribute('aria-disabled', 'true');
  await expect(ask).toContainText('nothing is sent until you send it');
  await ask.click();
  await expect(palette(page)).toHaveCount(0);
  await expect(page.locator('dialog.ai-chat[open] textarea')).toHaveValue('how is my sleep');
  await expect(page.locator('dialog.ai-chat[open] .ai-turn-user')).toHaveCount(0);
});
