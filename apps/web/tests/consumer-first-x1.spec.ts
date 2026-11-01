import {expect, test, type Page} from '@playwright/test';
import {chooseChain} from './chain-choice';
import {ALPHA_LABEL, ALPHA_LABEL_CHOSEN, alphaNotice} from './ab-shell';
import {isPhone, mainNav, openMore} from './phone-nav';
import {typeGoalName} from './goal-name';

/**
 * Session AK X1 (RELEASE_REVIEW R2–R5, R8, R14, R22; the owner's non-negotiable "consumer first, chain invisible: crypto
 * wording only in the modules people chose"). A brand-new device that never chose the chain meets no ZIG, Keplr, Testnet,
 * Contract, simulated balance or money tools in the navigation, on Today (below the protected hero), in Settings or in
 * Create a goal. Choosing it, as a person does (Settings → Your pages & buttons, or tests/chain-choice.ts), brings every
 * one of them back as it was. Fictional data only; every /api request answers 503.
 */
const MONEY_TOOLS = ['Earn', 'Markets', 'Staking', 'Portfolio', 'Ecosystem'];
const CHAIN_WORDS = /\bZIG\b|Keplr|Testnet|Contract|[Ss]imulated|Demo records|Staked|Staking|ZIGChain/;
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

async function ready(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('main h1').first()).toBeVisible();
}
/** Every destination of the main navigation: the sidebar on a computer; on a phone the tabs and More's rows. */
async function navNames(page: Page): Promise<string[]> {
  if (await isPhone(page)) await openMore(page);
  const names = (await mainNav(page).getByRole('link').allTextContents()).map(name => name.trim());
  if (await isPhone(page)) await page.keyboard.press('Escape');
  return names;
}

test('a new device: no money tools in the navigation, no wallet buttons, the neutral Alpha line; Today is the welcome and one card per area', async ({page}) => {
  await ready(page, '/app');
  const welcome = page.getByRole('link', {name: 'Start setup', exact: true});
  await expect(welcome).toBeVisible();
  const names = await navNames(page);
  for (const tool of MONEY_TOOLS) expect(names, tool).not.toContain(tool);
  for (const area of ['Today', 'Goals', 'Habits', 'Health', 'Wealth', 'Activity', 'Settings', 'Help']) expect(names, area).toContain(area);
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL);
  await expect(page.getByRole('button', {name: /Connect Keplr|Demo records|On this device|More wallets/})).toHaveCount(0);
  // Below the protected hero (its words are the owner's), Today speaks consumer words only (R2, R14).
  const below = await page.locator('.today-page').evaluate(el => { const copy = el.cloneNode(true) as HTMLElement; copy.querySelector('.today-hero')?.remove(); return copy.textContent ?? ''; });
  expect(below).not.toMatch(CHAIN_WORDS);
  await expect(page.locator('.account-panel, .local-label, .progress-summary')).toHaveCount(0);
  // R14: the welcome leads, then one empty card for Goals, Habits and Health; the rest waits for a first record.
  const modules = await page.locator('.dashboard-layout-grid .placed-module').evaluateAll(els => els.map(el => (el as HTMLElement).dataset.module ?? ''));
  for (const id of modules) expect(['goals', 'habits', 'health']).toContain(id);
  await expect(page.locator('.today-rail')).toHaveCount(0);
  const welcomeTop = (await page.locator('.onboarding-welcome').boundingBox())!.y, gridTop = (await page.locator('.dashboard-widget-area').boundingBox())!.y;
  expect(welcomeTop).toBeLessThan(gridTop);
  // R22: Wealth links to Portfolio and Earn only while they show.
  await ready(page, '/app/wealth');
  await expect(page.getByRole('link', {name: 'Open Portfolio →'})).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'Ways to earn on ZIGChain →'})).toHaveCount(0);
});

test('a new device: Settings groups no wallet, network or contract rows; its notices sit behind Licences', async ({page, isMobile}) => {
  await ready(page, '/app/settings');
  await expect(page.locator('.page-heading .page-lede')).toHaveText('Everything you add stays on this device.');
  await expect(page.locator('#wallet-network, #account, #network, #contract')).toHaveCount(0);
  await expect(page.getByText('Wallet & network (advanced)')).toHaveCount(0);
  await expect(page.getByText('Earn dock — on this device')).toHaveCount(0);
  await expect(page.getByText('Validator alerts on Staking — on this device')).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'Explore market references →'})).toHaveCount(0);
  await expect(page.locator('#about-this-alpha')).not.toContainText('Selected environment');
  const licences = page.locator('.about-alpha-licences');
  await expect(licences.locator('summary')).toHaveText('Licences');
  await expect(page.getByText(/Reown, Inc\./)).toBeHidden();
  await licences.locator('summary').click();
  await expect(page.getByText(/Reown, Inc\./)).toBeVisible();
  const box = (await licences.locator('summary').boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(44);
  // Once chosen, the advanced group is back with every panel in it.
  await chooseChain(page);
  await ready(page, '/app/settings');
  await expect(page.getByRole('heading', {name: 'Wallet & network (advanced)'})).toBeVisible();
  await expect(page.locator('#wallet-network #network')).toBeVisible();
  if (isMobile) await expect(page.getByRole('navigation', {name: 'Settings sections'}).getByRole('link', {name: 'Wallet & network (advanced)', exact: true})).toHaveAttribute('href', '#wallet-network');
  await expect(page.locator('.page-heading .page-lede')).toHaveText('Goal plans stay on this device. Your wallet controls onchain funds.');
});

test('a new device: Create a goal starts with money in its currency, in plain words; the chain\'s choices wait', async ({page}) => {
  await ready(page, '/app/goals/new');
  const kinds = page.getByRole('group', {name: 'What kind of progress matters?'}).getByRole('radio');
  await expect(kinds).toHaveCount(3);
  expect(await kinds.evaluateAll(els => els.map(el => el.getAttribute('aria-label')))).toEqual(['Save an amount', 'Reach a number of something', 'Finish a project']);
  await expect(page.getByRole('radio', {name: 'Save an amount', exact: true})).toBeChecked();
  await expect(page.getByRole('radio', {name: 'USD · US dollar'})).toBeChecked();
  await expect(page.getByRole('region', {name: 'Goal preview'})).toContainText('Save an amount · USD · Custom · At your own pace');
  // Counting something: the asset field's example is not the chain's coin.
  await page.getByRole('radio', {name: 'Reach a number of something', exact: true}).check();
  await expect(page.getByLabel('Goal asset', {exact: true})).toHaveAccessibleDescription(/^Use a symbol such as BTC or GOLD\./);
  await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
  expect(await page.locator('main').textContent()).not.toMatch(/\bZIG\b|Keplr|Testnet|Contract/);
  await typeGoalName(page, 'Fictional rainy-day fund');
  await page.getByLabel('Target amount', {exact: true}).fill('1200');
  await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'What counts toward this Goal?'})).toBeVisible();
  await expect(page.getByLabel('ZIGoals funding / Local simulation')).toHaveCount(0);
  await expect(page.getByRole('group', {name: 'Wealth scope'})).toHaveCount(0);
  expect(await page.locator('main').textContent()).not.toMatch(/\bZIG\b|Keplr|Testnet|Mainnet|Contract|Goal Manager/);
  // A contribution plan is in the goal's own currency.
  await page.getByLabel('Add a contribution plan').check();
  await expect(page.getByLabel('Contribution asset', {exact: true})).toHaveValue('USD');
});

test('once the chain is chosen, Create a goal is as it was: Quantity first, and Reward offered', async ({page}) => {
  await chooseChain(page);
  await ready(page, '/app/goals/new');
  await expect(page.getByRole('radio', {name: 'Quantity', exact: true})).toBeChecked();
  await expect(page.getByRole('radio', {name: 'Reward', exact: true})).toHaveCount(1);
  await expect(page.getByLabel('Goal asset', {exact: true})).toHaveAccessibleDescription(/^Use a symbol such as BTC or ZIG\./);
});

test('choosing a money tool in Settings brings the chain back: the money tools, the wallet buttons and the public-safety label', async ({page, isMobile}) => {
  await ready(page, '/app/settings');
  const pages = page.getByRole('region', {name: 'Your pages & buttons'});
  const markets = pages.getByRole('switch', {name: 'Markets', exact: true});
  await expect(markets).not.toBeChecked();
  // A controlled switch: it shows the saved choice once the save is done, so a click, then the saved state.
  await markets.click();
  await expect(pages.getByRole('status')).toHaveText('Markets shows again.');
  await expect(markets).toBeChecked();
  // One money tool switched on is choosing the chain: the others show by default too, each with its own switch.
  for (const tool of ['Staking', 'Portfolio', 'Ecosystem', 'Earn']) await expect(pages.getByRole('switch', {name: tool, exact: true}), tool).toBeChecked();
  await ready(page, '/app');
  const names = await navNames(page);
  for (const tool of MONEY_TOOLS) expect(names, tool).toContain(tool);
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL_CHOSEN);
  if (!isMobile) await expect(page.locator('.status-row .status-wallet').getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
});
