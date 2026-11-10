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
  // Session AK G2 (RELEASE_REVIEW_2 R2-10): Tasks, Notes and the Journal are 'compact' navigation entries — the phone's More
  // sheet and the tablet rail, not the desktop sidebar (its PROTECTED fit); Music is no entry (its player and search open it).
  const phone = await isPhone(page);
  for (const extra of ['Tasks', 'Notes', 'Journal']) if (phone) expect(names, extra).toContain(extra); else expect(names, extra).not.toContain(extra);
  expect(names).not.toContain('Music');
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL);
  await expect(page.getByRole('button', {name: /Connect Keplr|Demo records|On this device|More wallets/})).toHaveCount(0);
  // Below the protected hero (its words are the owner's), Today speaks consumer words only (R2, R14).
  const below = await page.locator('.today-page').evaluate(el => { const copy = el.cloneNode(true) as HTMLElement; copy.querySelector('.today-hero')?.remove(); return copy.textContent ?? ''; });
  expect(below).not.toMatch(CHAIN_WORDS);
  await expect(page.locator('.account-panel, .local-label, .progress-summary')).toHaveCount(0);
  // R14: the welcome leads, then one empty card for Goals, Habits and Health; the rest waits for a first record.
  const modules = await page.locator('.dashboard-layout-grid .placed-module').evaluateAll(els => els.map(el => (el as HTMLElement).dataset.module ?? ''));
  // Session AK RB (RELEASE_REVIEW_2 R2-11, deliberate): Habits and Wealth get their empty card too, as R14 intended — the
  // habits widget that stands in for the hidden Daily Habits, and the first wealth widget (Balanced's preset ids).
  for (const id of modules) expect(['goals', 'habits', 'health', 'preset-balanced-1', 'preset-balanced-3']).toContain(id);
  expect(modules.some(id => id === 'habits' || id === 'preset-balanced-1'), 'a Habits card').toBe(true);
  expect(modules).toContain('preset-balanced-3');
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
  // Session AL (COPY_AUDIT, deliberate): DV-261, the line is true once sync exists (it said "Everything … stays on this device").
  await expect(page.locator('.page-heading .page-lede')).toHaveText('Your records live on this device unless you turn on sync.');
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
  await expect(page.getByRole('region', {name: 'Goal preview'})).toContainText('Save an amount · USD · At your own pace'); // Session AL fifth pass (N-071): no "Custom" when no category was chosen
  await expect(page.getByRole('region', {name: 'Goal preview'})).not.toContainText('Custom');
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

// Session AK (CI fix, R5 follow-up): a project saved on a new device. Its record needs an asset; it was empty before the
// chain is chosen, so step 2 said "This can't be empty." and no project could be created (integration CI, six scripts).
test('a new device: a project goal is created through every step, and its page names no chain coin', async ({page}) => {
  await ready(page, '/app/goals/new');
  await typeGoalName(page, 'Fictional garden project');
  await page.getByRole('radio', {name: 'Finish a project', exact: true}).check();
  await page.getByLabel('Milestones, one per line').fill('Plan the beds\nPlant');
  for (let i = 0; i < 3; i++) await page.getByRole('button', {name: 'Continue →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Fictional garden project', level: 2})).toBeVisible();
  await page.getByRole('button', {name: 'Create goal', exact: true}).click();
  await expect(page.getByTestId('tracked-progress')).toBeVisible();
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/\d+$/);
  expect(await page.locator('main').textContent()).not.toMatch(/\bZIG\b/);
});

test('once the chain is chosen, Create a goal lists Quantity first and offers Reward, with none preselected', async ({page}) => {
  await chooseChain(page);
  await ready(page, '/app/goals/new');
  // Session AL fifth pass (DV-120, deliberate): no kind is preselected once the chain is chosen (name + Create made an
  // asset-quantity goal); Quantity is still the first choice, and choosing it is as it was.
  const kinds = page.getByRole('group', {name: 'What kind of progress matters?'}).getByRole('radio');
  expect(await kinds.evaluateAll(els => els.map(el => el.getAttribute('aria-label')))).toEqual(['Quantity', 'Value', 'Reward', 'Project']);
  for (const kind of await kinds.all()) await expect(kind).not.toBeChecked();
  await page.getByRole('radio', {name: 'Quantity', exact: true}).check();
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
  // Session AL (P-BN-34 / BN-016, deliberate; bbd2738e): a switch that changes more than itself says so beside the switches.
  await expect(pages.getByRole('status')).toHaveText('Markets shows again. The money pages that start off (Earn, Markets, Staking, Portfolio and Ecosystem) show now too; each keeps its own switch here.');
  await expect(markets).toBeChecked();
  // One money tool switched on is choosing the chain: the others show by default too, each with its own switch.
  for (const tool of ['Staking', 'Portfolio', 'Ecosystem', 'Earn']) await expect(pages.getByRole('switch', {name: tool, exact: true}), tool).toBeChecked();
  await ready(page, '/app');
  const names = await navNames(page);
  for (const tool of MONEY_TOOLS) expect(names, tool).toContain(tool);
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL_CHOSEN);
  if (!isMobile) await expect(page.locator('.status-row .status-wallet').getByRole('button', {name: 'Connect Keplr', exact: true})).toBeVisible();
});

// Session AK G2 (RELEASE_REVIEW_2 R2-6, re-opening part of R3): choosing goals and money in the welcome is not choosing the
// chain. "Goals & money" shows Goals and Wealth (money log, budgets, bills); the chain is its own clearly named extra,
// "Crypto & ZIGChain", left unticked here. R2-12: the habit the focus creates keeps the Habits page shown.
test('the welcome\'s "Goals & money" with "Save for something": Goals and Wealth, no money tools, no wallet and no chain words', async ({page}) => {
  await ready(page, '/app/welcome');
  const flow = page.locator('main');
  const step = (title: string) => expect(flow.getByRole('heading', {level: 1, name: title})).toBeVisible();
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await step('What do you want to improve?');
  const extras = flow.getByRole('group', {name: 'Extras', exact: true});
  for (const extra of [/^Chess/, /^Music/, /^Crypto & ZIGChain/]) await expect(extras.getByRole('checkbox', {name: extra})).not.toBeChecked();
  await flow.getByRole('checkbox', {name: /^Goals & money/}).check();
  await expect(flow.locator('.onboarding-shown')).toHaveText('You’ll see: Today, Goals, Wealth, Activity, Settings.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Two or three things to focus on.');
  await flow.getByRole('checkbox', {name: /^Save for something/}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('A few things to start with.');
  // The focus suggests the "Put money aside" habit (ticked; it read "Contribute" until Session AK P4, FR-8) and an
  // Emergency fund goal, which needs a target.
  await expect(flow.getByRole('checkbox', {name: /^Put money aside/})).toBeChecked();
  await expect(flow.getByLabel('Goal name')).toHaveValue('Emergency fund');
  await flow.getByLabel('Target amount').fill('1500');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('A quick look around.');
  await flow.getByRole('button', {name: 'Skip the tour', exact: true}).click();
  await step('Keep ZIGoals on your Home Screen.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Meet ZIGi.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Your data, your control.');
  await expect(flow.getByRole('region', {name: 'When you finish'})).toContainText('Your pages: Today, Goals, Habits, Wealth, Activity, Settings.');
  expect(await flow.textContent()).not.toMatch(CHAIN_WORDS);
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app$/);
  await expect(page.locator('html')).toHaveAttribute('data-app-hydrated', '');
  await expect(page.locator('main h1').first()).toBeVisible();
  // No crypto page was switched on: the stored choice holds no chain page at all.
  const items = await page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:settings:v1') ?? '{}') as {pages?: {items?: Record<string, {v: string}>}}).pages?.items ?? {});
  for (const id of ['markets', 'staking', 'portfolio', 'ecosystem']) expect(items[id], id).toBeUndefined();
  const names = await navNames(page);
  for (const tool of MONEY_TOOLS) expect(names, tool).not.toContain(tool);
  for (const area of ['Today', 'Goals', 'Habits', 'Wealth']) expect(names, area).toContain(area);
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL);
  await expect(page.getByRole('button', {name: /Connect Keplr|Demo records|On this device|More wallets/})).toHaveCount(0);
  await expect(page.getByText('Your wallet', {exact: true})).toHaveCount(0);
  // What a person reads below the protected hero (rendered text: the What's new card's folded "Earlier updates" history
  // still names past chain features; the lead's report carries that as its own proposal).
  const below = await page.locator('.today-page').evaluate(el => { const hero = el.querySelector<HTMLElement>('.today-hero'); if (hero) hero.style.display = 'none'; const text = (el as HTMLElement).innerText; if (hero) hero.style.display = ''; return text; });
  expect(below).not.toMatch(CHAIN_WORDS);
  // Wealth is the person's money, in plain words.
  await ready(page, '/app/wealth');
  await expect(page.getByRole('link', {name: 'Ways to earn on ZIGChain →'})).toHaveCount(0);
});

test('the welcome\'s "Crypto & ZIGChain" extra is the explicit chain choice: the money tools come back', async ({page}) => {
  await ready(page, '/app/welcome');
  const flow = page.locator('main');
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await expect(flow.getByRole('heading', {level: 1, name: 'What do you want to improve?'})).toBeVisible();
  await flow.getByRole('group', {name: 'Extras', exact: true}).getByRole('checkbox', {name: /^Crypto & ZIGChain/}).check();
  await expect(flow.locator('.onboarding-shown')).toHaveText('You’ll see: Today, Wealth, Markets, Staking, Portfolio, Ecosystem, Activity, Settings.');
  const step = (title: string) => expect(flow.getByRole('heading', {level: 1, name: title})).toBeVisible();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Two or three things to focus on.');
  // Session AL (COPY_AUDIT, deliberate; N-NB-01): a step with nothing picked says "Skip this step", as the tour says "Skip the tour" (was "Continue without choosing").
  await flow.getByRole('button', {name: 'Skip this step', exact: true}).click();
  await step('A few things to start with.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('A quick look around.');
  await flow.getByRole('button', {name: 'Skip the tour', exact: true}).click();
  await step('Keep ZIGoals on your Home Screen.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Meet ZIGi.');
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Your data, your control.');
  await flow.getByRole('button', {name: 'Finish setup', exact: true}).click();
  await page.waitForURL(/\/app$/);
  await expect(page.locator('main h1').first()).toBeVisible();
  const names = await navNames(page);
  for (const tool of MONEY_TOOLS) expect(names, tool).toContain(tool);
  await expect(alphaNotice(page).locator('strong')).toHaveText(ALPHA_LABEL_CHOSEN);
});
