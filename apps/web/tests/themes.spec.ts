import {expect, test, type Page} from '@playwright/test';

/**
 * Session AD (the owner's brief Part 3, ADR-026 F4/F5/F13): the theme bar is real. Nebula (today's look) is the default for
 * everyone and loads nothing; Light and Dark are previews with their own stylesheet. The choice is this device's, applied
 * before the first paint on every later page, the same in the Showcase; the early script carries the page's CSP nonce.
 */
const KEY = 'zigoals:ui-prefs:v1';
async function firstPaintTheme(page: Page) {
  // Recorded when <body> is created, before any app script has run.
  await page.addInitScript(() => {
    new MutationObserver((records, observer) => { for (const r of records) for (const n of r.addedNodes) if (n instanceof HTMLBodyElement) { Reflect.set(window, '__themeAtBody', document.documentElement.getAttribute('data-theme')); observer.disconnect(); } }).observe(document, {childList: true, subtree: true});
  });
}
const violations = (page: Page) => page.addInitScript(() => { const v: string[] = []; Reflect.set(window, '__csp', v); document.addEventListener('securitypolicyviolation', e => v.push(`${e.violatedDirective} ${e.blockedURI}`), true); });
const bar = (page: Page) => page.getByRole('radiogroup', {name: 'Theme'}).filter({visible: true}).first();

test('Nebula is the default: no theme attribute, no theme sheet, the middle choice checked', async ({page}) => {
  await page.goto('/app/settings');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  await expect(page.locator('#zigoals-theme-sheet')).toHaveCount(0);
  const group = page.locator('#appearance').getByRole('radiogroup', {name: 'Theme'});
  await expect(group.getByRole('radio')).toHaveText([/Light/, /Nebula/, /Dark/]);
  await expect(group.getByRole('radio', {name: 'Nebula theme'})).toHaveAttribute('aria-checked', 'true');
  await expect(group.getByRole('radio', {name: 'Nebula theme'})).toHaveAttribute('title', /Customize — coming later/);
  await expect(page.locator('#appearance')).toContainText('Customize — coming later');
  for (const name of ['Light theme (preview)', 'Dark theme (preview)']) await expect(group.getByRole('radio', {name})).toContainText('Preview');
});

for (const theme of ['light', 'dark'] as const) {
  test(`${theme}: chosen at once, kept on this device, on the first paint of the next page, without a CSP violation`, async ({page}) => {
    await violations(page); await firstPaintTheme(page);
    await page.goto('/app/settings');
    await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
    await page.locator('#appearance').getByRole('radio', {name: `${theme === 'light' ? 'Light' : 'Dark'} theme (preview)`}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(page.locator('#zigoals-theme-sheet')).toHaveAttribute('href', new RegExp(`^/themes/${theme}\\.css\\?v=[0-9a-f]{12}$`));
    expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), KEY))!)).toMatchObject({version: 1, theme});
    // The next page: the theme is on <html> before <body> exists, and the page shows once its sheet has loaded.
    const response = await page.goto('/app/habits');
    expect(await page.evaluate(() => Reflect.get(window, '__themeAtBody'))).toBe(theme);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme-loading', /.*/);
    // The page ground: a pale sky by day, near black for Dark (Nebula's is a deep navy, rgb(6, 11, 25)).
    const [r, g, b] = (await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).match(/\d+/g)!.map(Number);
    if (theme === 'light') expect(Math.min(r!, g!, b!)).toBeGreaterThan(225); else expect(Math.max(r!, g!, b!)).toBeLessThan(10);
    // The early script is the server's own same-origin file, in <head>, with this response's nonce, and not async.
    const csp = response!.headers()['content-security-policy']!, nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    const head = (await response!.text()).split('</head>')[0]!, tag = /<script[^>]*src="\/theme-boot\.js\?v=[0-9a-f]{12}"[^>]*>/.exec(head)?.[0];
    expect(tag).toBeTruthy();
    expect(tag).toContain(`nonce="${nonce}"`);
    expect(tag).not.toMatch(/\b(async|defer)\b/);
    expect(await page.evaluate(() => Reflect.get(window, '__csp'))).toEqual([]);
    // The theme bar says the same on the next page (the sidebar's; on a phone it is in More and Settings, checked above).
    if ((page.viewportSize()?.width ?? 0) > 900) await expect(bar(page).getByRole('radio', {name: `${theme === 'light' ? 'Light' : 'Dark'} theme (preview)`})).toHaveAttribute('aria-checked', 'true');
  });
}

test('the Showcase reads the same device theme, and going back to Nebula removes the sheet', async ({page}) => {
  await page.goto('/app/settings');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, theme: 'light', heroCollapsed: false})), KEY);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.goto('/app/settings');
  await page.locator('#appearance').getByRole('radio', {name: 'Nebula theme'}).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);
  await expect(page.locator('#zigoals-theme-sheet')).toHaveCount(0);
  // Only the theme field changed in the device's record.
  expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), KEY))!)).toEqual({version: 1, heroCollapsed: false});
});

test('Light keeps the cosmic sections dark: the Today hero and the footer banner keep their light words', async ({page}) => {
  await page.goto('/app');
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, theme: 'light'})), KEY);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const heroText = await page.locator('.today-hero h1').first().evaluate(e => getComputedStyle(e).color);
  const [r, g, b] = heroText.match(/\d+/g)!.map(Number);
  expect(0.2126 * r! + 0.7152 * g! + 0.0722 * b!).toBeGreaterThan(180);
  await page.locator('footer.site-footer').scrollIntoViewIfNeeded();
  expect(await page.locator('footer.site-footer').evaluate(f => getComputedStyle(f).backgroundColor)).toBe('rgb(2, 9, 24)');
});
