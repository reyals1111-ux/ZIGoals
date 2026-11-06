import {expect, test, type Page} from '@playwright/test';
import {toBech32} from '@cosmjs/encoding';
import {earnRoutes} from '../../earn-fixtures';
import {chooseChain} from '../../chain-choice';
import {freshDevice, hydrated, loadShowcase} from '../../ah-helpers';
import {governanceRelay, openGovernance, VOTING_ID} from '../../governance-chain';

// Session AL (lane L6, fourth pass): the L6 replay's STILL OPEN / CHANGED chain rows and the competitor rows built in this
// pass, in Berlin's conditions (desktop 1920 Nebula unless the row names another width; a fresh profile with the chain
// chosen as Settings → Earn records it; Europe/Brussels, en-GB). The relays are the recorded doubles; nothing is signed and
// no wallet is connected. Each test fails on c521574f and passes on the branch.
test.use({viewport: {width: 1920, height: 1080}, timezoneId: 'Europe/Brussels', locale: 'en-GB'});
test.beforeEach(async ({page}) => { await chooseChain(page); });

async function fresh(page: Page) { await freshDevice(page); await earnRoutes(page); }

test('BN-004/B-005/B-022: with Practice chosen and no wallet, the live staking rate says it is mainnet only', async ({page}) => {
  await fresh(page);
  await page.goto('/app/staking'); await hydrated(page);
  const preview = page.locator('[data-earn-preview]');
  await expect(preview).toContainText('Native staking on the real network (mainnet only)');
  await expect(preview.getByRole('note')).toHaveText('Mainnet only: these figures are the real ZIGChain network’s, read only. Staking below is set to the practice network, which has no real value and its own rate.');
});

test('D-149/N-BN-06/BN-030/D-060/D-099: the Earn guide ends with practice; the real-ZIG steps are optional, never "next", and the end never says "complete" at 0 of 6', async ({page}) => {
  await fresh(page);
  await page.goto('/app/earn#start-here'); await hydrated(page);
  const section = page.locator('#start-here');
  await expect(section.locator('.path-chest.path-finale')).toContainText('End of the guide');
  await expect(section.locator('.path-chest.path-finale')).not.toContainText('complete');
  await expect(section.locator('.earn-start-progress')).toHaveText('Six steps · none done yet · next: Get a wallet');
  await expect(section.locator('.orbit-banner h2')).toHaveText(['Get ready', 'Only if you choose real ZIG', 'The real network, if you choose']);
  await expect(section.getByText('Ready to stake?')).toHaveCount(0);
  // Mark the two practice steps done: nothing points on to Add money; the line says the rest is optional.
  for (const label of ['Get a wallet', 'Practice first']) {
    await section.locator(`.path-dot[aria-label^="${label}:"]`).click();
    await section.getByRole('button', {name: 'Mark as done'}).click();
  }
  await expect(section.locator('.earn-start-progress')).toContainText('2 of 6 steps done · practice done: that is enough to know staking; the real-ZIG steps are optional, only if you choose');
  await expect(section.locator('[data-next]')).toHaveCount(0);
  await section.locator('.path-dot[aria-label^="Add money:"]').click();
  const add = section.locator('[data-start-panel="add-money"]');
  await expect(add.locator('p').first()).toHaveText(/^Optional\. Only if you decide to use real ZIG/);
  await expect(add.locator('a.primary')).toHaveCount(0);
});

test('BN-008/D-014/L-043/D-154/C-BN-13: test proposals fold into one closed group; the chain reason is a sentence; turnout is a bar with the quorum', async ({page}) => {
  await governanceRelay(page, 'practice');
  const view = await openGovernance(page);
  const group = view.locator('details.governance-tests');
  await expect(group).toHaveCount(1);
  await expect(group).not.toHaveAttribute('open', '');
  await expect(group.locator('> summary')).toHaveText(/ended proposals? that looks? like (a )?tests? or templates?/);
  // #119 "Test Proposal" sits in the group, not among the real ones.
  await expect(group.locator('article[data-proposal="119"]')).toHaveCount(1);
  await expect(view.locator('section.governance-proposals > article[data-proposal="119"]')).toHaveCount(0);
  await group.locator('> summary').click();
  const ended = group.locator('article[data-proposal="119"]');
  await expect(ended).not.toContainText('proposal did not get enough votes to pass');
  await expect(ended).toContainText('Why it ended this wayIt did not get enough votes to pass: too few of all staked ZIG voted (the quorum), or Yes did not reach the share it needed.');
  await expect(ended.locator('.governance-turnout-bar')).toHaveAttribute('aria-label', /^Estimated turnout [\d.]+% of staked ZIG; the quorum is 33\.4%, (not )?reached$/);
  await expect(ended).toContainText('an estimate: the chain does not keep the staked total from when voting ended');
  // The open proposal's bar is the live turnout (no estimate wording).
  const open = view.locator(`article[data-proposal="${VOTING_ID}"]`);
  await expect(open.locator('.governance-turnout-bar')).toHaveAttribute('aria-label', /^Turnout so far 36% of staked ZIG; the quorum is 33\.4%, reached$/);
  // A search for the test proposal opens the group.
  await view.getByLabel('Search proposals').fill('119');
  await expect(view.locator('details.governance-tests')).toHaveAttribute('open', '');
});

test('C-BN-11/C-BN-12: on an open proposal, a reminder a day before it ends and a validator’s vote are one tap away', async ({page}) => {
  await governanceRelay(page, 'practice');
  const validator = toBech32('zigvaloper', new Uint8Array(20).fill(2)), account = toBech32('zig', new Uint8Array(20).fill(2));
  const asked: string[] = [];
  await page.route('**/api/chain/vote?**', route => {
    const url = new URL(route.request().url()); asked.push(url.searchParams.get('voter')!);
    return route.fulfill({json: {version: 1, status: 'ok', network: 'zig-test-2', source: 'https://testnet-api.zigchain.com', height: '8290600', observedAt: '2026-10-19T00:16:00.000Z', proposalId: url.searchParams.get('proposal'), vote: {options: [{option: 'yes', weight: '1.000000000000000000'}]}}});
  });
  const view = await openGovernance(page);
  const open = view.locator(`article[data-proposal="${VOTING_ID}"]`);
  const remind = open.getByRole('checkbox', {name: 'Remind me a day before voting ends (on this device)'});
  await remind.check();
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('zigoals:gov-reminders:v1')!).reminders))).toEqual([`zig-test-2:${VOTING_ID}`]);
  await open.locator('details.governance-validator-vote > summary').click();
  const field = open.getByLabel(/A validator’s address/);
  await field.fill('cosmos1notazig');
  await open.getByRole('button', {name: 'Read its vote'}).click();
  await expect(field).toHaveAttribute('aria-invalid', 'true');
  await field.fill(validator);
  await open.getByRole('button', {name: 'Read its vote'}).click();
  await expect(open.locator('.governance-validator-vote [role="status"]')).toContainText('This validator voted Yes (read at block 8290600).');
  expect(asked).toEqual([account]);
});

test('BN-003: at 375 px Dark the real-network dialog keeps short buttons and the box beside “I understand”', async ({page}) => {
  await page.setViewportSize({width: 375, height: 812});
  await page.emulateMedia({colorScheme: 'dark'});
  await governanceRelay(page, 'practice');
  const view = await openGovernance(page);
  await view.getByRole('button', {name: /Real network \(real ZIG\)/}).click();
  const dialog = page.getByRole('dialog', {name: 'This is real money'});
  for (const name of ['Not now', 'Continue on the real network']) {
    const box = (await dialog.getByRole('button', {name}).boundingBox())!;
    expect(box.height, name).toBeGreaterThanOrEqual(44);
    expect(box.height, name).toBeLessThanOrEqual(80);
  }
  const check = (await dialog.getByRole('checkbox', {name: 'I understand'}).boundingBox())!, words = (await dialog.getByText('I understand', {exact: true}).boundingBox())!;
  expect(Math.abs((check.y + check.height / 2) - (words.y + words.height / 2))).toBeLessThan(12); // on one line
  expect(check.x).toBeLessThan(words.x + 1); // the box first
});

test('C-BN-01/C-BN-05: Staking lists the validators with sorts and filters; Earn compares up to three side by side', async ({page}) => {
  await fresh(page);
  await page.goto('/app/staking'); await hydrated(page);
  const read = page.locator('details.staking-validators-read');
  await read.locator('> summary').click();
  const table = read.getByRole('region', {name: 'Validators', exact: true});
  await expect(table.locator('tbody tr').first()).toBeVisible();
  await read.getByLabel('Sort by').selectOption('commission');
  const rates = await table.locator('td[data-label="Commission"]').evaluateAll(els => els.map(e => parseFloat(e.textContent!.replace(',', '.'))));
  expect(rates).toEqual([...rates].sort((a, b) => a - b));
  // Compare: three at most, side by side on facts only.
  const boxes = read.getByRole('checkbox', {name: /^Compare/});
  for (const i of [0, 1, 2]) await boxes.nth(i).check();
  await expect(boxes.nth(3)).toBeDisabled();
  const side = read.getByRole('region', {name: 'Validators side by side'});
  await expect(side.locator('thead th')).toHaveCount(4);
  await expect(side.locator('tbody th')).toHaveText(['Commission now', 'Highest it may set', 'Voting power', 'Uptime', 'Self-bond', 'Status']);
});

test('BN-182/D-228/C-BN-24: Chess plays a game against the computer on this device, with take back and resign', async ({page}) => {
  await freshDevice(page);
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/chess#play'); await hydrated(page);
  const game = page.locator('section.chess-computer');
  await expect(game).toBeVisible();
  await game.getByRole('button', {name: 'Start the game'}).click();
  await game.getByLabel('Type a move (e2e4 or Nf3)').fill('e4');
  await game.getByRole('button', {name: 'Play move'}).click();
  // The computer answers with a black move; the list shows both.
  await expect(game.locator('.chess-moves li').first().locator('span')).toHaveCount(2, {timeout: 10_000});
  await expect(game.getByRole('status')).toContainText('Your move (White)');
  await game.getByRole('button', {name: 'Take back my move'}).click();
  await expect(game.getByText('No moves yet.')).toBeVisible();
  await game.getByRole('button', {name: 'Resign'}).click();
  await expect(game.getByRole('status')).toHaveText('Resigned. The computer won.');
  // Nothing about the game is stored or sent.
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => /chess-computer|computer-game/.test(k)))).toEqual([]);
});

test('PR-108/PR-009/BUG-037/D-085: the Showcase chess before 07:00 shows no time later than now, and every rating is grouped', async ({page}) => {
  await page.clock.install({time: new Date('2026-11-04T04:20:00Z')}); // 05:20 in Brussels
  await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);
  await page.goto('/app/chess'); await hydrated(page);
  const main = page.locator('main');
  await expect(main).toContainText('Ratings over time');
  const text = await main.innerText();
  const times = [...text.matchAll(/4 Nov 2026, (\d{2}):(\d{2})/g)].map(m => Number(m[1]) * 60 + Number(m[2]));
  expect(times.length).toBeGreaterThan(0);
  for (const t of times) expect(t).toBeLessThanOrEqual(5 * 60 + 21);
  // The chart's summary and table group thousands as the cards do ("1,503", never "1503").
  const summary = await page.locator('.chess-chart .sr-only').first().textContent();
  expect(summary).toMatch(/\(1,\d{3}\)/);
  expect(summary).not.toMatch(/\(1\d{3}\)/);
});
