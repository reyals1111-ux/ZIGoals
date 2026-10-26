import {expect, test} from '@playwright/test';
import {VOTING_ID, VOTING_TITLE, governanceRelay, openGovernance, proposalsWire} from './governance-chain';
import {CHAIN} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H16, H46; P6.5): /app/governance reads proposals in plain words with no wallet at
 * all — what each would change (from its messages), the deadline, the tally as shares beside the chain's own quorum,
 * threshold and veto, the deposit and voting period, and the proposer's own words apart and labelled. Practice first;
 * the real network asks the first-real confirm. The browser reads only ZIGoals' own /api/chain/proposals (never a chain
 * host) and asks no wallet anything. Answers are built from the LCD reads recorded on 2026-10-19 (tests/governance-chain.ts).
 */
const hosts = (urls: string[]) => [...new Set(urls.map(u => new URL(u).host))];

test('without a wallet: practice proposals in plain words, the open one first, its live tally beside the chain\'s rules', async ({page}) => {
  const requests: string[] = [];
  page.on('request', r => requests.push(r.url()));
  const asked = await governanceRelay(page, 'practice');
  const view = await openGovernance(page);
  await expect(view.getByRole('heading', {name: 'Why voting matters'})).toBeVisible();
  await expect(view).toContainText('ZIGChain changes by vote');
  await expect(view).toContainText('Practice first: the practice network (ZIGChain Testnet, no real value) votes the same way, with 10 minutes of voting and 100 ZIG of deposit to start a proposal (read from the chain).');
  await expect(view.getByRole('button', {name: /Practice network \(no real value\)/})).toHaveAttribute('aria-pressed', 'true');
  // Session AF Gate C (design critique, money pages 11): the chosen tile carries a checked ring and the other an empty one;
  // the line under them is a small note of the choice, no larger than a tile's own label.
  const ring = (name: RegExp) => view.getByRole('button', {name}).locator('.staking-network-check').evaluate(e => ({fill: getComputedStyle(e).backgroundColor, mark: getComputedStyle(e, '::after').content}));
  expect(await ring(/Practice network \(no real value\)/)).toMatchObject({mark: '""'});
  expect((await ring(/Practice network \(no real value\)/)).fill).not.toBe('rgba(0, 0, 0, 0)');
  expect(await ring(/Real network \(real ZIG\)/)).toEqual({fill: 'rgba(0, 0, 0, 0)', mark: 'none'});
  const note = view.locator('.staking-network-banner');
  await expect(note).toHaveText('Chosen network: Practice network (no real value) · ZIGChain Testnet (zig-test-2)');
  const size = (e: Element) => parseFloat(getComputedStyle(e).fontSize);
  expect(await note.evaluate(size)).toBeLessThanOrEqual(await view.locator('.staking-network-label').first().evaluate(size));
  await expect(view.getByRole('heading', {name: 'Proposals on ZIGChain Testnet'})).toBeVisible();
  await expect(view).toContainText('Read from https://testnet-api.zigchain.com at block 8290599');
  await expect(view).toContainText('1 open for voting now.');
  const cards = view.locator('article.governance-proposal');
  await expect(cards).toHaveCount(6);
  // The open proposal comes first, with its deadline, what it would change (from its message), and the live verdict.
  const open = cards.first();
  await expect(open).toHaveAttribute('data-proposal', VOTING_ID);
  await expect(open.getByRole('heading', {level: 3})).toHaveText(VOTING_TITLE);
  await expect(open).toContainText('Voting now · Proposal #122');
  await expect(open).toContainText(/Voting ends in [5-8] minutes/);
  await expect(open.getByRole('region', {name: 'What it would change'})).toContainText('Changes the staking rules, such as how many validators are active or how long unstaking takes.');
  const tally = open.getByRole('region', {name: 'Votes so far'});
  await expect(tally.getByRole('img')).toHaveAttribute('aria-label', 'Yes 83.33%, No 13.88%, Abstain 2.77%, No with veto 0%');
  await expect(tally).toContainText('To pass, at least 33.4% of all staked ZIG must vote (the quorum), Yes must be more than 51% of the votes that are not Abstain, and No with veto must stay at or below 33.4% of all votes (above it, the deposit is burned). These are the chain’s own numbers.');
  await expect(tally).toContainText('If voting ended now it would pass: Yes is above 51% of the votes that are not Abstain. Turnout so far: 36% of staked ZIG.');
  await expect(open).toContainText('Voting period10 minutes for this proposal'); // Session AH (ST7): its own voting period
  // An ended proposal: its final votes and its own state; a text proposal says nothing changes by itself.
  const ended = view.locator('article[data-proposal="119"]');
  await expect(ended).toContainText('Rejected · Proposal #119');
  await expect(ended).toContainText('A text proposal: it asks a question or signals an intent. Nothing on the chain changes by itself if it passes.');
  await expect(ended).toContainText('The chain’s own reasonproposal did not get enough votes to pass');
  // Session AH (ST7, L-043): Rejected with 100 % Yes is explained in words before the chain's own reason.
  await expect(ended).toContainText('Why Rejected with mostly YesA proposal also needs enough of all staked ZIG to vote (the quorum, above).');
  await expect(view.locator('article[data-proposal="121"]')).toContainText('Repairs an expired connection to another chain (IBC).');
  await expect(view.locator('article[data-proposal="118"]')).toContainText('Upgrades ZIGChain’s software: every validator switches to a new version at a set block.');
  // The proposer's words are apart, closed, and labelled as theirs.
  const words = view.locator('article[data-proposal="121"] details.governance-summary');
  await expect(words).not.toHaveAttribute('open', '');
  await words.locator('summary').click();
  await expect(words).toContainText('The proposer wrote this; ZIGoals has not checked it.');
  await expect(words).toContainText('Client 07-tendermint-83 tracking the Cosmos provider testnet expired');
  // Without a wallet: no vote form, only the way to connect.
  await expect(view.locator('form.governance-vote')).toHaveCount(0);
  await expect(view.getByRole('link', {name: test.info().project.name === 'mobile' ? 'Open ZIGoals in Keplr' : 'Get Keplr ↗'})).toBeVisible();
  // Only ZIGoals' own route was asked, address-free; no chain host, no Keplr.
  expect(asked.map(u => `${u.pathname}?${u.searchParams}`)).toEqual([`/api/chain/proposals?network=${CHAIN.practice}`]);
  expect(hosts(requests).filter(h => /zigchain|polkachu|keplr/.test(h))).toEqual([]);
});

test('the real network asks the first-real confirm, then reads zigchain-1: the recorded mainnet proposals, none open', async ({page}) => {
  const asked = await governanceRelay(page, 'real');
  const view = await openGovernance(page);
  await expect(view.locator('article.governance-proposal').first()).toBeVisible();
  await view.getByRole('button', {name: /Real network \(real ZIG\)/}).click();
  const confirm = page.getByRole('dialog', {name: 'This is real money'});
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', {name: 'Not now'}).click();
  await expect(view.getByRole('button', {name: /Practice network/})).toHaveAttribute('aria-pressed', 'true');
  await view.getByRole('button', {name: /Real network \(real ZIG\)/}).click();
  await confirm.getByLabel('I understand').check();
  await confirm.getByRole('button', {name: 'Continue on the real network'}).click();
  await expect(view.getByRole('heading', {name: 'Proposals on ZIGChain mainnet'})).toBeVisible();
  await expect(view).toContainText('Read from https://api.zigchain.com at block 13050000');
  await expect(view).toContainText('None is open for voting right now.');
  const latest = view.locator('article[data-proposal="43"]');
  await expect(latest).toContainText('Passed · Proposal #43');
  await expect(latest).toContainText('Memesdotfun Whitelist address for Wasm uploads');
  await expect(latest).toContainText('Adds addresses to the list allowed to upload smart contracts.');
  await expect(latest.getByRole('region', {name: 'Final votes'}).getByRole('img')).toHaveAttribute('aria-label', 'Yes 100%, No 0%, Abstain 0%, No with veto 0%');
  await expect(latest).toContainText('Deposit10,000 ZIG');
  await expect(latest).toContainText('Voting period4 days for this proposal'); // Session AH (ST7): its own voting period
  await expect(view.locator('article[data-proposal="39"]')).toContainText('Spends ZIG from the community pool.');
  expect(asked.map(u => u.searchParams.get('network'))).toEqual(['zig-test-2', 'zigchain-1']);
  // The choice is kept on this device: a reload opens the real network again, with no second confirm.
  await page.reload();
  await expect(view.getByRole('heading', {name: 'Proposals on ZIGChain mainnet'})).toBeVisible();
  await expect(page.getByRole('dialog', {name: 'This is real money'})).toHaveCount(0);
});

test('unavailable says why and shows no proposals; a proposer\'s markup stays text', async ({page}) => {
  let down = true;
  await governanceRelay(page, 'practice', {proposals: network => down
    ? {version: 1, status: 'unavailable', reason: 'The chain did not answer just now, so proposals are unavailable. Try again in a minute.', network, source: 'https://testnet-api.zigchain.com', proposals: []}
    : proposalsWire('practice', {summary: 'Read this <img src="x" onerror="window.__owned=1"> and <a href="https://evil.example">this</a>'})});
  const view = await openGovernance(page);
  await expect(view).toContainText('Proposals are unavailable: The chain did not answer just now, so proposals are unavailable. Try again in a minute.');
  await expect(view.locator('article.governance-proposal')).toHaveCount(0);
  await expect(view).not.toContainText('No votes');
  down = false;
  await view.getByRole('button', {name: 'Read again'}).click();
  const open = view.locator(`article[data-proposal="${VOTING_ID}"]`);
  await open.locator('details.governance-summary summary').click();
  await expect(open.locator('.governance-summary-text')).toHaveText('Read this <img src="x" onerror="window.__owned=1"> and <a href="https://evil.example">this</a>');
  await expect(open.locator('.governance-summary img, .governance-summary a')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as {__owned?: number}).__owned)).toBeUndefined();
});
