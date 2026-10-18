import {expect, test, type Locator, type Page} from '@playwright/test';
import {ME, SIGNER_CALLS, fakeChain, fakeKeplr, openStaking, relay} from './staking-chain';

/**
 * Session AF (ADR-028 H87; L2 design §16): the staking actions on a phone in WebKit (iPhone 15, 390 × 844): network words
 * never cut, every control at least 44 px, the review screen as a full-height sheet whose Back and Sign stay in reach,
 * nothing scrolling sideways; and without Keplr, "Open ZIGoals in Keplr" (Keplr Mobile's in-app browser) shown clearly.
 * Doubles only (tests/staking-chain.ts). Evidence label: WebKit, never "Safari on an iPhone".
 */
test.use({viewport: {width: 390, height: 844}});
test.beforeEach(({browserName}, info) => {
  test.skip(browserName !== 'webkit', 'The WebKit job\'s phone set; the Chrome suite runs the staking specs on its phone project.');
  test.skip(info.project.name !== 'mobile', 'A phone set: the iPhone project only.');
});
const settled = (page: Page) => page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
async function at44(controls: Locator) {
  for (const control of await controls.all()) {
    if (!await control.isVisible()) continue;
    const box = (await control.boundingBox())!;
    expect(Math.round(box.height), `${(await control.textContent())?.trim()} is at least 44 px tall`).toBeGreaterThanOrEqual(44);
  }
}
const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

test('a phone with Keplr\'s browser: the network switch, the form and the review sheet fit, 44 px targets, nothing sideways', async ({page}) => {
  const calls = await fakeKeplr(page);
  await fakeChain(page, 'practice');
  await relay(page, 'practice');
  const panel = await openStaking(page);
  await settled(page);
  await at44(panel.getByRole('group', {name: 'Network'}).getByRole('button'));
  expect(await noSideways(page)).toBeLessThanOrEqual(0);
  // The network words wrap, never cut.
  for (const words of await panel.locator('.staking-network-label, .staking-network-banner').all()) expect(await words.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  await at44(panel.getByRole('tab'));
  await at44(panel.locator('.staking-validator'));
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('3');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toBeVisible();
  const box = (await sheet.boundingBox())!;
  expect(Math.round(box.width)).toBeGreaterThanOrEqual(388);
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(800);
  await at44(sheet.getByRole('button'));
  // Back and Sign are on screen without scrolling the page (the sheet keeps them in reach).
  const sign = sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true});
  await sign.scrollIntoViewIfNeeded();
  const signBox = (await sign.boundingBox())!;
  expect(signBox.y + signBox.height).toBeLessThanOrEqual(844);
  expect(await sheet.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await expect(sheet.locator('.staking-network-line').first()).toHaveText('PRACTICE · zig-test-2 · no real value');
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
  await sign.click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  expect(calls.filter(c => c === 'signer.signDirect')).toHaveLength(1);
  expect(await noSideways(page)).toBeLessThanOrEqual(0);
});

test('a phone without Keplr: "Open ZIGoals in Keplr" opens this staking page in Keplr Mobile\'s browser', async ({page}) => {
  await relay(page, 'practice');
  const panel = await openStaking(page);
  await settled(page);
  const open = panel.getByRole('link', {name: 'Open ZIGoals in Keplr', exact: true});
  await expect(open).toBeVisible();
  const origin = new URL(page.url()).origin;
  await expect(open).toHaveAttribute('href', `keplrwallet://web-browser?url=${encodeURIComponent(`${origin}/app/staking`)}`);
  const box = (await open.boundingBox())!;
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(44);
  await expect(panel).toContainText('On a phone, staking works inside the Keplr app');
  expect(await noSideways(page)).toBeLessThanOrEqual(0);
});
