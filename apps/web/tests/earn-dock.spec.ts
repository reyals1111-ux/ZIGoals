import {expect, test, type Page} from '@playwright/test';
import {earnRoutes, seedShowcase} from './earn-fixtures';
import {chooseChain} from './chain-choice';
import {openSettings} from './settings-open';
// Session AK X1 (RELEASE_REVIEW R2–R5): this spec tests the Earn dock.
// A person chooses that module, so the spec chooses the chain first, as a person does (tests/chain-choice.ts).
test.beforeEach(async ({page}) => { await chooseChain(page); });

/**
 * Session AF chunk 2 (Part 5: P5.1–P5.5; ADR-028 H12, H65, H68): the Earn dock. On a computer it is ZIGi's launcher's
 * twin on top of the right-edge stack; pressing it fans out round buttons for the live ecosystem apps (once per opening,
 * still under reduced motion), each opening its section of the Earn page, with the person's own position as a badge
 * where it can be read; it tucks into the edge and comes back; Settings switches it off on this device. On a phone there
 * is no floating dock: the apps are a strip at the top of the Earn page. Session AG Polish 3 (owner Part 7, TIER 3): the
 * dock is off unless the person turns it on in Settings — the Showcase and anyone who never chose see none; the tests
 * below turn it on first.
 */
const read = (page: Page, sel: string) => page.locator(sel).evaluate(el => { const s = getComputedStyle(el), r = el.getBoundingClientRect(); return {w: Math.round(r.width), h: Math.round(r.height), radius: s.borderRadius, background: s.backgroundImage, shadow: s.boxShadow}; });

test.describe('on a computer', () => {
  test.beforeEach(async ({page}, info) => { test.skip(info.project.name !== 'desktop', 'Phones get no floating dock (H68)'); await seedShowcase(page); });

  test('off by default (the Showcase, never chosen); Settings → Earn turns it on, kept on this device', async ({page}) => {
    await earnRoutes(page);
    await page.goto('/app');
    await expect(page.locator('.ai-launcher-button')).toBeVisible();
    await expect(page.locator('.earn-dock-button, .earn-dock-edge')).toHaveCount(0);
    await openSettings(page);
    const on = page.getByRole('switch', {name: /^Earn dock — on this device/});
    await expect(on).not.toBeChecked();
    await on.check();
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:earn-prefs:v1')))!)).toMatchObject({version: 1, dockShown: true});
    await page.goto('/app');
    await expect(page.getByRole('button', {name: 'Open the Earn dock: ways to earn'})).toBeVisible();
  });

  test('ZIGi’s twin on top of the stack; the fan opens each app’s section; Escape closes it; it tucks away and comes back', async ({page}) => {
    await page.evaluate(() => localStorage.setItem('zigoals:earn-prefs:v1', JSON.stringify({version: 1, dockShown: true})));
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
    expect(JSON.parse((await page.evaluate(() => localStorage.getItem('zigoals:earn-prefs:v1')))!)).toMatchObject({version: 1, dockShown: true, dockFolded: true});
    await page.getByRole('button', {name: 'Show the Earn dock'}).click();
    await expect(page.getByRole('button', {name: 'Open the Earn dock: ways to earn'})).toBeVisible();
  });

  test('a badge shows the person’s own real stake; reduced motion keeps the fan still; off in Settings, no dock', async ({page}) => {
    const address = 'zig18vykgjgcmp2z4xzkt6mh74glrpd7qda8u8ntzx';
    await page.evaluate(a => localStorage.setItem('zigoals:linked-wallets:v1', JSON.stringify({version: 1, wallets: [{id: 'w1', kind: 'cosmos', wallet: 'keplr', label: 'My Keplr', address: a, addedAt: '2026-10-18T08:00:00.000Z'}]})), address);
    await page.evaluate(() => localStorage.setItem('zigoals:earn-prefs:v1', JSON.stringify({version: 1, dockShown: true})));
    await earnRoutes(page);
    const base = {network: 'zigchain-1', account: address, asset: 'ZIG', denom: 'azig', decimals: 18, verification: 'VERIFIED_READ_ONLY', sync: 'CURRENT', observedAt: '2026-10-19T00:00:00.000Z', provenance: 'https://api.zigchain.com · block 13048320', notes: '', risk: '', executionAuthority: 'NONE', providerId: 'native-zig'};
    await page.route(url => url.pathname === '/api/positions', route => route.fulfill({json: {positions: [{...base, id: `zigchain-1:${address}:stake:a`, sourceType: 'NATIVE_STAKING', quantity: '120000000000000000000', principal: '120000000000000000000', liquidity: 'BONDED'}]}}));
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto('/app');
    // Session AP (CI 1726): pressed once the page is live (a press before hydration is lost, as in earn-guide-zigi).
    await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
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

// Session AL (P-BN-48; BN-074, BN-126, N-BN-05, D-123; deliberate, O3): the phone's round app strip repeated five of the
// chip index's targets on the first screen, and at 500 px it sat under the bottom bar. O3 moved the Earn dock's role below
// 901 px into Apps & extras, so the strip is gone and the one index leads. Same strength: the five apps' sections are
// still reachable from the first screen, from the index, with 44 px targets, and nothing scrolls sideways.
test('on a phone: no floating dock; the Earn page has one topic strip, on the first screen, with the five apps', async ({page}, info) => {
  test.skip(info.project.name !== 'mobile', 'A phone check');
  await seedShowcase(page);
  await earnRoutes(page);
  await page.goto('/app');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('.earn-dock-button, .earn-dock-edge')).toHaveCount(0);
  await page.goto('/app/earn');
  await expect(page.getByRole('navigation', {name: 'Ecosystem apps', exact: true})).toHaveCount(0);
  const index = page.getByRole('navigation', {name: 'On this page', exact: true});
  await expect(index).toBeVisible();
  await expect(index).toBeInViewport();
  const hrefs = await index.getByRole('link').evaluateAll(els => els.map(a => a.getAttribute('href')));
  for (const href of ['#start-here', '#native-staking', '#valdora', '#oroswap', '#nawa']) expect(hrefs, href).toContain(href);
  for (const link of await index.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
});
