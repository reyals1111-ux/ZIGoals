import {expect, test} from '@playwright/test';

/**
 * Session X-Local Phase 2 (P2.8, X-Cloud's H6): Settings → ZIGi reserves its body's height until the body mounts, so a
 * jump to a section below it lands where it will stay. Two checks: the reserve stays honest (within 15 % of the loaded
 * body on a new device, both projects), and a jump to "Help & diagnostics" made before the body loaded does not move by
 * more than that margin once it has.
 */
const RESERVE_MARGIN = 0.15;
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
async function newDevice(page: import('@playwright/test').Page) {
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}
const loaded = (page: import('@playwright/test').Page) => expect.poll(() => page.locator('section#your-ai').evaluate(el => el.children.length > 3 && !el.querySelector('.ai-settings-reserve')), {timeout: 30_000}).toBe(true);

test('the reserved height matches the loaded body on a new device', async ({page}) => {
  await newDevice(page);
  await page.goto('/app/settings');
  const section = page.locator('section#your-ai');
  const reserve = await section.evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--ai-settings-reserve')));
  expect(reserve).toBeGreaterThan(600);
  await loaded(page);
  await page.waitForTimeout(1000);
  const body = await section.evaluate(el => el.getBoundingClientRect().height - Array.from(el.children).slice(0, 3).reduce((h, c) => h + c.getBoundingClientRect().height, 0));
  expect(Math.abs(body - reserve) / body, `body ${Math.round(body)} px, reserve ${reserve} px`).toBeLessThanOrEqual(RESERVE_MARGIN);
});

test('a jump to Help & diagnostics before the body loaded stays put once it has', async ({page}) => {
  // The body's chunk is held at the network until the jump has been made, so the check is the same on a dev server and a
  // production build (the chunk is known by a label only the body renders, never by its name).
  let release!: () => void; const held = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/_next/static/chunks/**', async route => {
    const response = await route.fetch(); const text = await response.text();
    if (text.includes('Show the ZIGi button')) await held;
    const headers = Object.fromEntries(Object.entries(response.headers()).filter(([k]) => !['content-encoding', 'content-length'].includes(k.toLowerCase())));
    await route.fulfill({status: response.status(), headers, body: text});
  });
  await newDevice(page);
  await page.goto('/app/settings');
  // The rest of the page settles first (other sections grow within the first quarter second of a new device's first
  // paint, X-Cloud's lane); the jump then isolates this section.
  await expect(page.locator('section#your-ai')).toBeVisible();
  // Settled means the target has not moved for half a second (WebKit lays the page out more slowly than Chrome).
  await expect.poll(async () => { const a = await page.evaluate(() => document.getElementById('settings-help')!.getBoundingClientRect().top); await page.waitForTimeout(500); const b = await page.evaluate(() => document.getElementById('settings-help')!.getBoundingClientRect().top); return Math.abs(a - b) < 1; }, {timeout: 15_000}).toBe(true);
  await expect(page.locator('section#your-ai .ai-settings-reserve')).toHaveCount(1);
  // The jump as a link to the section's address makes it (the sections nav on a computer, the phone's own row): the hash.
  await page.evaluate(() => { location.hash = '#settings-help'; });
  const before = await page.evaluate(() => document.getElementById('settings-help')!.getBoundingClientRect().top);
  await page.waitForTimeout(300);
  release();
  await loaded(page);
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => document.getElementById('settings-help')!.getBoundingClientRect().top);
  const reserve = await page.locator('section#your-ai').evaluate(el => parseFloat(getComputedStyle(el).getPropertyValue('--ai-settings-reserve')));
  console.log(`settings-reserve: jump target top ${Math.round(before)} → ${Math.round(after)} px`);
  expect(Math.abs(after - before)).toBeLessThanOrEqual(reserve * RESERVE_MARGIN);
});
