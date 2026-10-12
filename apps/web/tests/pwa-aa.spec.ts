import {expect, test} from '@playwright/test';

/** Session AA-Cloud Part 7: the Home Screen shortcuts and the share target, as the app answers their addresses. */
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
});

test('the shortcuts: Quick add opens; water is ready to tap, never logged by itself; the address is cleaned', async ({page}) => {
  await page.goto('/app?shortcut=quick-add');
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  await expect(dialog).toBeVisible();
  await expect(page).toHaveURL(/\/app$/);
  await page.keyboard.press('Escape');
  await page.goto('/app?shortcut=water');
  const water = page.getByRole('button', {name: /of water$/});
  await expect(water).toBeFocused();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole('article', {name: 'Focus: water today'})).toContainText('0 entries today');
  const manifest = await (await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.shortcuts.map((s: {url: string}) => s.url)).toEqual(['/app?shortcut=quick-add', '/app?shortcut=water', '/app/habits', '/app?shortcut=ask']);
});

test('the share target: what another app shared waits on its own page, nothing saved until a choice', async ({page}) => {
  await page.goto('/app');
  expect((await (await page.request.get('/manifest.webmanifest')).json()).share_target).toEqual({action: '/app/share', method: 'GET', params: {title: 'title', text: 'text', url: 'url'}});
  const before = await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()));
  await page.goto(`/app/share?${new URLSearchParams({title: 'Weekend in Lisbon', text: 'Flights from 89 EUR', url: 'https://example.com/lisbon'})}`);
  await expect(page).toHaveTitle(/Shared with ZIGoals/);
  const card = page.getByRole('region', {name: 'What would you like to do with it?'});
  await expect(card).toContainText('Weekend in Lisbon');
  await expect(card.getByRole('link', {name: 'https://example.com/lisbon'})).toHaveAttribute('rel', /noopener/);
  expect(await page.evaluate(() => JSON.stringify(Object.entries(localStorage).sort()))).toBe(before);
  // Gate C: the share arrives as a fresh page, before ZIGi's launcher; the button follows it once it shows.
  await expect(page.getByRole('button', {name: /Open ZIGi/})).toBeVisible();
  await expect(card.getByRole('button', {name: 'Ask ZIGi about it'})).toBeEnabled();
  await card.getByRole('link', {name: 'Make it a goal'}).click();
  await expect(page).toHaveURL(/\/app\/goals\/new\?from=share/);
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('Weekend in Lisbon');
  // A link that is not http(s) is shown as nothing, and an empty share says so.
  await page.goto('/app/share?url=javascript%3Aalert(1)');
  await expect(page.getByRole('heading', {name: 'Nothing was shared.'})).toBeVisible();
  // Search opens with the shared words.
  await page.goto('/app/share?text=Emergency');
  await page.getByRole('button', {name: 'Search ZIGoals for it'}).click();
  await expect(page.getByRole('dialog', {name: 'Search'}).getByRole('combobox')).toHaveValue('Emergency');
});

// Gate C (security read): a crafted address with a repeated parameter opens the page with the first value, never an error;
// once shown, the shared words leave the address bar.
test('a repeated name opens the wizard with the first; the share page clears its address once shown', async ({page}) => {
  await page.goto('/app/goals/new?from=share&name=First%20idea&name=Second');
  await expect(page.getByLabel('Goal name', {exact: true})).toHaveValue('First idea');
  await page.goto('/app/goals/average/new?template=sleep-7h&template=steps-8000');
  await expect(page.getByRole('heading', {level: 1})).toHaveText('Keep an average');
  await expect(page.getByLabel('Name')).toHaveValue('Sleep 7 hours a night');
  await page.goto(`/app/share?${new URLSearchParams({title: 'Private plan', text: 'Only for me'})}`);
  await expect(page.getByRole('region', {name: 'What would you like to do with it?'})).toContainText('Private plan');
  await expect(page).toHaveURL(/\/app\/share$/);
});
