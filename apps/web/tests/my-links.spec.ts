import {expect, test, type Page} from '@playwright/test';

// Session W Part 19: My links. Settings → My links adds, edits, moves and removes the person's own links (settings v3
// `links`); Today shows them as buttons that open in a new tab with no opener and no referrer, exactly as typed. Every
// example address is answered by a local fixture page, so nothing leaves the test.
const SETTINGS = 'zigoals:settings:v1';
async function start(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.context().route(/^https:\/\/([a-z0-9-]+\.)*example\.(com|org|net)\//, route => route.fulfill({status: 200, contentType: 'text/html', body: '<!doctype html><title>Fixture</title><p>Fixture page</p>'}));
}
const card = (page: Page) => page.getByRole('region', {name: 'My links'}).first();
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), SETTINGS);

test('add, edit, move and remove links in Settings; https only; the icon follows the address until chosen', async ({page}) => {
  await start(page);
  await page.goto('/app/settings');
  const links = card(page);
  await links.getByRole('button', {name: 'Add a link'}).click();
  let form = links.getByRole('form', {name: 'Add a link'});
  await form.getByLabel('Name').fill('Run club');
  await form.getByLabel('Address (https://)').fill('http://www.strava.com/clubs/1');
  await form.getByRole('button', {name: 'Add link'}).click();
  await expect(form.getByRole('alert')).toHaveText('Only https:// addresses can be added.');
  await form.getByLabel('Address (https://)').fill('https://www.strava.com/clubs/1');
  await expect(form.getByLabel('Icon')).toHaveValue('strava');
  await form.getByRole('button', {name: 'Add link'}).click();
  await expect(links.getByRole('status')).toHaveText('Run club added.');
  await links.getByRole('button', {name: 'Add a link'}).click();
  form = links.getByRole('form', {name: 'Add a link'});
  await form.getByLabel('Name').fill('Code');
  await form.getByLabel('Address (https://)').fill('https://github.com/fixture');
  await form.getByLabel('Icon').selectOption('monogram');
  await form.getByRole('button', {name: 'Add link'}).click();
  await expect(links.getByRole('list', {name: 'Your links'}).getByRole('listitem')).toHaveCount(2);
  let saved = await stored(page);
  expect(saved.schemaVersion).toBe(3);
  expect(saved.links.items.map((i: {label: string; url: string; icon: string; order: number}) => [i.label, i.url, i.icon, i.order])).toEqual([['Run club', 'https://www.strava.com/clubs/1', 'strava', 0], ['Code', 'https://github.com/fixture', 'monogram', 1]]);
  await links.getByRole('button', {name: 'Move Code up'}).click();
  await expect(links.getByRole('list', {name: 'Your links'}).locator('strong')).toHaveText(['Code', 'Run club']);
  await links.getByRole('button', {name: 'Edit Code'}).click();
  const edit = links.getByRole('form', {name: 'Edit Code'});
  await edit.getByLabel('Name').fill('My code');
  await edit.getByRole('button', {name: 'Save link'}).click();
  await expect(links.getByRole('status')).toHaveText('Link saved.');
  await links.getByRole('button', {name: 'Remove Run club'}).click();
  await links.getByRole('alertdialog', {name: 'Remove Run club'}).getByRole('button', {name: 'Keep it'}).click();
  await expect(links.getByRole('list', {name: 'Your links'}).getByRole('listitem')).toHaveCount(2);
  await links.getByRole('button', {name: 'Remove Run club'}).click();
  await links.getByRole('alertdialog', {name: 'Remove Run club'}).getByRole('button', {name: 'Remove link'}).click();
  await expect(links.getByRole('list', {name: 'Your links'}).locator('strong')).toHaveText(['My code']);
  saved = await stored(page);
  expect(saved.links.items.map((i: {label: string}) => i.label)).toEqual(['My code']);
});

test('Today: one button per link, in order, opening in a new tab with no opener and no referrer, exactly as typed', async ({page, isMobile}) => {
  await start(page);
  await page.goto('/app/settings');
  for (const [name, url] of [['Club', 'https://www.example.com/club?utm_source=me'], ['Photos', 'https://photos.example.net/me']] as const) {
    await card(page).getByRole('button', {name: 'Add a link'}).click();
    const form = card(page).getByRole('form', {name: 'Add a link'});
    await form.getByLabel('Name').fill(name);await form.getByLabel('Address (https://)').fill(url);
    await form.getByRole('button', {name: 'Add link'}).click();
    await expect(card(page).getByRole('status')).toHaveText(`${name} added.`);
  }
  await page.goto('/app');
  if (isMobile) await page.getByRole('button', {name: /^My links/}).click();
  const today = page.getByRole('region', {name: 'My links'});
  const buttons = today.getByRole('link', {name: /opens in a new tab/});
  await expect(buttons).toHaveText(['Club (opens in a new tab)', 'Photos (opens in a new tab)']);
  await expect(buttons.first()).toHaveAttribute('href', 'https://www.example.com/club?utm_source=me');
  for (const link of await buttons.all()) { await expect(link).toHaveAttribute('target', '_blank'); await expect(link).toHaveAttribute('rel', 'noopener noreferrer'); await expect(link).toHaveAttribute('referrerpolicy', 'no-referrer'); }
  const [popup] = await Promise.all([page.waitForEvent('popup'), buttons.first().click()]);
  await popup.waitForLoadState();
  expect(popup.url()).toBe('https://www.example.com/club?utm_source=me');
  expect(await popup.evaluate(() => [window.opener === null, document.referrer])).toEqual([true, '']);
  await popup.close();
});

test('hidden under Your pages & buttons, the Today card leaves; the links stay in Settings', async ({page}) => {
  await start(page);
  await page.goto('/app/settings');
  await card(page).getByRole('button', {name: 'Add a link'}).click();
  const form = card(page).getByRole('form', {name: 'Add a link'});
  await form.getByLabel('Name').fill('Club');await form.getByLabel('Address (https://)').fill('https://www.example.com/club');
  await form.getByRole('button', {name: 'Add link'}).click();
  await page.getByRole('region', {name: 'Your pages & buttons'}).getByRole('switch', {name: 'My links', exact: true}).click();
  await page.goto('/app');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('region', {name: 'My links'})).toHaveCount(0);
  await page.goto('/app/settings');
  await expect(card(page).getByRole('list', {name: 'Your links'}).locator('strong')).toHaveText(['Club']);
});

test('Showcase: four fictional links to example addresses on Settings and Today', async ({page, isMobile}) => {
  await start(page);
  await page.goto('/app/settings');await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();await page.waitForURL('**/app');
  if (isMobile) await page.getByRole('button', {name: /^My links/}).click();
  const links = page.getByRole('region', {name: 'My links'}).getByRole('link', {name: /opens in a new tab/});
  await expect(links).toHaveText(['Running club (opens in a new tab)', 'Book club chat (opens in a new tab)', 'My photos (opens in a new tab)', 'Chess games (opens in a new tab)']);
  for (const link of await links.all()) expect(new URL((await link.getAttribute('href'))!).hostname).toMatch(/(^|\.)example\.(com|org|net)$/);
});
