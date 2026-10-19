import {expect, test, type Locator, type Page} from '@playwright/test';
import {VOTING_ID, governanceRelay, openGovernance} from './governance-chain';
import {ME, SIGNER_CALLS, fakeChain, fakeKeplr} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H87; P6.5, P6.6): /app/governance on a phone in WebKit (iPhone 15, 390 × 844):
 * long proposer text and network words wrap, never scroll sideways; the vote choices are 44 px targets; the review sheet
 * keeps Sign in reach; without Keplr, "Open ZIGoals in Keplr" opens this page in Keplr Mobile's browser. Doubles only.
 * Evidence label: WebKit, never "Safari on an iPhone".
 */
test.use({viewport: {width: 390, height: 844}});
test.beforeEach(({browserName}, info) => {
  test.skip(browserName !== 'webkit', 'The WebKit job\'s phone set; the Chrome suite runs the governance specs on its phone project.');
  test.skip(info.project.name !== 'mobile', 'A phone set: the iPhone project only.');
});
const settled = (page: Page) => page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
const noSideways = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
async function at44(controls: Locator) {
  for (const control of await controls.all()) {
    if (!await control.isVisible()) continue;
    expect(Math.round((await control.boundingBox())!.height), `${(await control.textContent())?.trim()} is at least 44 px tall`).toBeGreaterThanOrEqual(44);
  }
}

test('a phone without Keplr: the proposals read in plain words, nothing sideways, and "Open ZIGoals in Keplr" opens Governance', async ({page}) => {
  await governanceRelay(page, 'practice');
  const view = await openGovernance(page);
  await settled(page);
  await expect(view.locator('article.governance-proposal').first()).toHaveAttribute('data-proposal', VOTING_ID);
  const open = view.getByRole('link', {name: 'Open ZIGoals in Keplr', exact: true});
  await expect(open).toBeVisible();
  const origin = new URL(page.url()).origin;
  await expect(open).toHaveAttribute('href', `keplrwallet://web-browser?url=${encodeURIComponent(`${origin}/app/governance`)}`);
  expect(Math.round((await open.boundingBox())!.height)).toBeGreaterThanOrEqual(44);
  await view.locator('article[data-proposal="121"] details.governance-summary summary').click();
  expect(await noSideways(page)).toBeLessThanOrEqual(0);
  for (const card of await view.locator('article.governance-proposal').all()) expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test('a phone in Keplr\'s browser: 44 px choices, the review sheet fits, Sign in reach, one signature', async ({page}) => {
  const calls = await fakeKeplr(page); await fakeChain(page, 'practice');
  await governanceRelay(page, 'practice');
  const view = await openGovernance(page);
  await settled(page);
  await view.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(view.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  const card = view.locator(`article[data-proposal="${VOTING_ID}"]`);
  await at44(card.locator('.governance-choice'));
  await card.getByRole('radio', {name: /^Yes/}).check();
  await card.getByRole('button', {name: 'Review my vote'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('Your vote is public and tied to your address forever');
  const box = (await sheet.boundingBox())!;
  expect(Math.round(box.width)).toBeGreaterThanOrEqual(388);
  await at44(sheet.getByRole('button'));
  const sign = sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true});
  await sign.scrollIntoViewIfNeeded();
  const signBox = (await sign.boundingBox())!;
  expect(signBox.y + signBox.height).toBeLessThanOrEqual(844);
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
  await sign.click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  expect(calls.filter(c => c === 'signer.signDirect')).toHaveLength(1);
  expect(await noSideways(page)).toBeLessThanOrEqual(0);
});
