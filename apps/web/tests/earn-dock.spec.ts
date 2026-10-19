import {expect, test, type Page} from '@playwright/test';
import {earnRoutes, seedShowcase} from './earn-fixtures';

/**
 * Session AF chunk 2 (Part 5: P5.1–P5.5; ADR-028 H12, H65, H68): the Earn dock. On a computer it is ZIGi's launcher's
 * twin on top of the right-edge stack; pressing it fans out round buttons for the live ecosystem apps (once per opening,
 * still under reduced motion), each opening its section of the Earn page, with the person's own position as a badge
 * where it can be read; it tucks into the edge and comes back; Settings switches it off on this device. On a phone there
 * is no floating dock: the apps are a strip at the top of the Earn page.
 */
const read = (page: Page, sel: string) => page.locator(sel).evaluate(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius, background: s.backgroundImage, shadow: s.boxShadow}; });

test.describe('on a computer', () => {
  test.beforeEach(async ({page}, info) => { test.skip(info.project.name !== 'desktop', 'Phones get no floating dock (H68)'); await seedShowcase(page); });

  test('ZIGi’s twin on top of the stack; the fan opens each app’s section; Escape closes it; it tucks away and comes back', async ({page}) => {
    await earnRoutes(page);
    await page.goto('/app');
    const dock = page.getByRole('button', {name: 'Open the Earn dock: ways to earn'});
    await expect(dock).toBeVisible();
    const zigi = page.locator('.ai-launcher-button');
    await expect(zigi).toBeVisible();
    expect(await read(page, '.earn-dock-button')).toEqual(await read(page, '.ai-launcher-button'));
    const db = (await dock.boundingBox())!, zb = (await zigi.boundingBox())!;
    expect(Math.abs((db.x + db.width / 2) - (zb.x + zb.width / 2))).toBeLessThan(1.5);
    expect(db.y + db.height).toBeLessThan(zb.y);
    // Every other launcher on the page sits below the dock.
    for (const other of await page.locator('.music-launcher, .checklist-launcher').all()) expect((await other.boundingBox())!.y).toBeGreaterThan(db.y + db.height - 1);
    await dock.click();
    const fan = page.getByRole('group', {name: 'Ways to earn'});
    await expect(fan.getByRole('link')).toHaveCount(5);
    expect(await fan.getByRole('link').evaluateAll(els => els.map(a => a.getAttribute('href')))).toEqual(['/app/earn#start-here', '/app/earn#native-staking', '/app/earn#valdora', '/app/earn#oroswap', '/app/earn#nawa']);
    await expect(page.getByRole('button', {name: 'Close the Earn dock'})).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(fan).toHaveCount(0);
    await expect(page.getByRole('button', {name: 'Open the Earn dock: ways to earn'})).toBeFocused();
    // An app button opens its section of the Earn page.
    await dock.click();
    await fan.getByRole('link', {name: /^Valdora/}).click();
    await page.waitForURL('**/app/earn#valdora');
    await expect(page.locator('#valdora')).toBeInViewport();
    // Tucked into the edge, then back; the choice is kept on this device.
    await page.getByRole('button', {name: 'Tuck the Earn dock away'}).click();
    await expect(page.getByRole('button', {name: 'Show the Earn dock'})).toBeVisible();
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:earn-prefs:v1')))!)).toMatchObject({version: 1, dockFolded: true});
    await page.getByRole('button', {name: 'Show the Earn dock'}).click();
    await expect(page.getByRole('button', {name: 'Open the Earn dock: ways to earn'})).toBeVisible();
  });

  test('a badge shows the person’s own real stake; reduced motion keeps the fan still; off in Settings, no dock', async ({page}) => {
    const address = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx';
    await page.evaluate(a => localStorage.setItem('zigoals:linked-wallets:v1', JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'keplr', label: 'My Keplr', address: a, addedAt: '2026-10-18T08:00:00.000Z'}]})), address);
    await earnRoutes(page);
    const base = {network: 'zigchain-1', account: address, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-19T00:00:00.000Z', provenance: 'https://api.zigchain.com · block 13048320', notes: '', risk: '', executionAuthority: 'NONE', providerId: 'native-zig'};
    await page.route(url => url.pathname === '/api/positions', route => route.fulfill({json: {positions: [{...base, id: `zigchain-1:${address}:stake:a`, sourceType: 'NATIVE_STAKING', quantity: '120000000000000000000', principal: '120000000000000000000', liquidity: 'BONDED'}]}}));
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/app');
    await page.getByRole('button', {name: 'Open the Earn dock: ways to earn'}).click();
    const staking = page.getByRole('group', {name: 'Ways to earn'}).getByRole('link', {name: /^ZIGChain staking/});
    await expect(staking).toHaveAccessibleName('ZIGChain staking: you hold 120 ZIG. Opens its part of the Earn page');
    await expect(staking.locator('.earn-dock-badge')).toHaveText('120 ZIG');
    expect(await staking.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
    await page.evaluate(() => localStorage.setItem('zigoals:earn-prefs:v1', JSON.stringify({version: 1, dockShown: false})));
    await page.reload();
    await expect(page.locator('.ai-launcher-button')).toBeVisible();
    await expect(page.locator('.earn-dock-button, .earn-dock-edge')).toHaveCount(0);
  });
});

test('on a phone: no floating dock; the Earn page shows the apps as a strip', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'A phone check');
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.earn-dock-button, .earn-dock-edge')).toHaveCount(0);
  await page.goto('/app/earn');
  const strip = page.getByRole('navigation', {name: 'Ecosystem apps', exact: true});
  await expect(strip).toBeVisible();
  expect(await strip.getByRole('link').evaluateAll(els => els.map(a => a.getAttribute('href')))).toEqual(['#start-here', '#native-staking', '#valdora', '#oroswap', '#nawa']);
  for (const link of await strip.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
