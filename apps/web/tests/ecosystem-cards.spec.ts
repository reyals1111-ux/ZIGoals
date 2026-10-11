import {expect, test} from '@playwright/test';

// Session I, Part 6: Ecosystem cards open in place to show the registry's own record, worded as the registry words it.
test.beforeEach(async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
/** The cards are server-rendered; a key pressed before the page is interactive would reach a button with no handler yet. */
async function ready(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => !document.querySelector('.workspace[aria-busy="true"]'));
}

test('the eyebrow reads "ZIG Chain ecosystem"; every card header is a button that opens its record in place', async ({page}) => {
  await page.goto('/app/ecosystem');
  await expect(page.locator('.ecosystem-intro .eyebrow')).toHaveText('ZIG Chain ecosystem');
  await expect(page.getByText('The Goal Layer for ZIGChain')).toHaveCount(0);
  const cards = page.locator('.ecosystem-project');
  const count = await cards.count();
  expect(count).toBeGreaterThan(10);
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i), toggle = card.locator('.ecosystem-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    const controls = (await toggle.getAttribute('aria-controls'))!;
    await expect(card.locator(`#${controls}`)).toBeHidden();
    // The record is in the page already (server-rendered), just hidden: opening it makes no request.
    await expect(card.locator(`#${controls}`)).toContainText('In ZIGoals today: research only — no connection to your money.');
  }
});

test('keyboard: Enter and Space open and close a card, focus stays on its button, and several cards stay open', async ({page}) => {
  await page.goto('/app/ecosystem');
  await ready(page);
  const requests: string[] = [];
  page.on('request', request => requests.push(request.url()));
  const first = page.locator('.ecosystem-project').nth(0), second = page.locator('.ecosystem-project').nth(1);
  const button = first.locator('.ecosystem-toggle');
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(button).toHaveAttribute('aria-expanded', 'true');
  await expect(button).toBeFocused();
  const details = first.getByRole('region');
  await expect(details).toBeVisible();
  for (const heading of ['About', 'Evidence & access', 'Verification and audits', 'Eligibility and access', 'What the sources say']) await expect(details.getByRole('heading', {name: heading, exact: true})).toBeVisible();
  await expect(details).toContainText(/identity verification \(KYC\)/i);
  await expect(details).toContainText(/Record reviewed \d{4}-\d{2}-\d{2}/);
  await second.locator('.ecosystem-toggle').click();
  await expect(first.locator('.ecosystem-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(second.locator('.ecosystem-toggle')).toHaveAttribute('aria-expanded', 'true');
  await button.focus();
  await page.keyboard.press('Space');
  await expect(button).toHaveAttribute('aria-expanded', 'false');
  await expect(details).toBeHidden();
  await expect(button).toBeFocused();
  // Opening a record fetches no data: nothing from /api/ and nothing off this origin (link prefetches and the page's own
  // lazily loaded logos are not the card's).
  const origin = new URL(page.url()).origin;
  expect(requests.filter(url => !url.startsWith('data:') && (new URL(url).origin !== origin || new URL(url).pathname.startsWith('/api/')))).toEqual([]);
});

test('the open record never shows contract addresses, promises or partnership words, and every link is safe', async ({page}) => {
  await page.goto('/app/ecosystem');
  await ready(page);
  for (const toggle of await page.locator('.ecosystem-toggle').all()) await toggle.click();
  const text = await page.locator('.ecosystem-projects').innerText();
  expect(text).not.toMatch(/\b(?:0x[0-9a-f]{20,}|zig1[0-9a-z]{20,})\b/i);
  expect(text).not.toMatch(/\bpartnered\b|\bintegrated\b|\bour partners?\b|\bZIGoals partner\b/i);
  expect(text).not.toMatch(/\bearn\b|\bAPR\b|\bAPY\b|\bTVL\b/);
  const hrefs = await page.locator('.ecosystem-details a').evaluateAll(links => links.map(link => (link as HTMLAnchorElement).href));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) { const url = new URL(href); expect(url.protocol, href).toBe('https:'); expect(url.username + url.password + url.port, href).toBe(''); }
  for (const link of await page.locator('.ecosystem-details a').all()) await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
});

test('a #project link opens its card and brings it into view; under reduced motion it opens without animation', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/app/ecosystem#project-valdora');
  const card = page.locator('#project-valdora');
  await expect(card.locator('.ecosystem-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(card.getByRole('region')).toBeVisible();
  await expect(card.getByRole('region')).toHaveCSS('animation-name', 'none');
  expect(await card.evaluate(el => { const r = el.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
});

test('with motion, opening plays one short reveal that ends, never a loop', async ({page}) => {
  await page.goto('/app/ecosystem');
  await ready(page);
  const card = page.locator('.ecosystem-project').first();
  await card.locator('.ecosystem-toggle').click();
  const region = card.getByRole('region');
  await expect(region).toHaveCSS('animation-name', 'ecosystem-open');
  await expect(region).toHaveCSS('animation-iteration-count', '1');
  await expect.poll(() => region.evaluate(el => el.getAnimations().filter(a => a.playState === 'running').length)).toBe(0);
});
