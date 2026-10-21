import {expect, test, type Page} from '@playwright/test';
import {VOTING_ID, VOTING_TITLE, governanceRelay, openGovernance, proposalsWire} from './governance-chain';
import {ME, SIGNER_CALLS, V1, ZIG, fakeChain, fakeKeplr} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 H4, H46, H61; P6.6, D6): a vote from /app/governance, signed only through the
 * staking review screen. The injected Keplr double records every method asked of it; the testnet RPC answers from the
 * recorded fixtures (tests/staking-chain.ts); nothing is broadcast anywhere. Before the Sign press: no signer is asked
 * for, and the review says the vote is public and tied to the address forever. After it: exactly one signature, one gov
 * v1beta1 MsgVote, the device's vote journal. Refusals: no stake, no choice, a script's submit.
 */
const VOTE_URL = '/cosmos.gov.v1beta1.MsgVote';
async function connect(page: Page, network: 'PRACTICE' | 'REAL' = 'PRACTICE') {
  const view = page.locator('.governance-page');
  await view.getByRole('button', {name: `Connect Keplr for ${network}`, exact: true}).click();
  await expect(view.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
  return view;
}

test('practice: connect, see the stake that makes the vote count, choose Yes, review (public forever), sign once', async ({page}) => {
  const calls = await fakeKeplr(page), chain = await fakeChain(page, 'practice');
  const asked = await governanceRelay(page, 'practice');
  await openGovernance(page);
  const view = await connect(page);
  await expect(view.getByRole('status').filter({hasText: 'staked with'})).toHaveText('You have 50 ZIG staked with 1 active validator on this network: your vote counts with it.');
  const card = view.locator(`article[data-proposal="${VOTING_ID}"]`);
  const form = card.getByRole('form', {name: `Your vote on proposal ${VOTING_ID}`});
  await expect(form).toContainText('You have not voted on this proposal yet (read at block 8290600).');
  // The vote read went through ZIGoals' relay with the address, for the open proposal only.
  expect(asked.filter(u => u.pathname === '/api/chain/vote').map(u => u.searchParams.toString())).toEqual([`network=zig-test-2&proposal=${VOTING_ID}&voter=${ME}`]);
  // Nothing is chosen for the person: Review waits for a choice.
  const reviewButton = form.getByRole('button', {name: 'Review my vote'});
  await expect(reviewButton).toBeDisabled();
  await expect(form.getByRole('radio')).toHaveCount(4);
  for (const name of [/^Yes /, /^No You/, /^Abstain /, /^No with veto /]) await expect(form.getByRole('radio', {name})).not.toBeChecked();
  await form.getByRole('radio', {name: /^Yes/}).check();
  const mark = calls.length;
  await reviewButton.click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText('ActionVote');
  await expect(sheet).toContainText(`Proposal#${VOTING_ID} · ${VOTING_TITLE}`);
  await expect(sheet).toContainText('Your voteYes · You support this change.');
  await expect(sheet).toContainText('Your vote is public and tied to your address forever: anyone can see how this address voted on this proposal. It is recorded on ZIGChain Testnet.');
  await expect(sheet).toContainText('You will sign this in your wallet. ZIGoals never sees your keys and cannot sign for you.');
  await expect(sheet.locator('.staking-network-line').first()).toHaveText('PRACTICE · zig-test-2 · no real value');
  await sheet.getByText('Raw message', {exact: true}).click();
  await expect(sheet.locator('pre')).toContainText(`"typeUrl": "${VOTE_URL}"`);
  await expect(sheet.locator('pre')).toContainText(`"proposalId": "${VOTING_ID}"`);
  await expect(sheet.locator('pre')).toContainText('"option": 1');
  expect(calls.slice(mark).filter(c => SIGNER_CALLS.test(c)), 'no signer before the Sign press').toEqual([]);
  const before = calls.length;
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  expect(calls.slice(before).filter(c => c === 'keplr.getOfflineSignerAuto')).toHaveLength(1);
  expect(calls.slice(before).filter(c => c === 'signer.signDirect')).toHaveLength(1);
  expect(chain.broadcasts).toHaveLength(1);
  // The journal keeps the vote (the chain removes votes at the tally).
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-journal:v1') ?? 'null') as {entries: {action: string; state: string; proposalId: string; option: string; hash: string; chainId: string}[]});
  expect(journal.entries.map(e => [e.action, e.state, e.proposalId, e.option, e.chainId])).toEqual([['vote', 'CONFIRMED', VOTING_ID, '1', 'zig-test-2']]);
  expect(journal.entries[0]!.hash).toBe(chain.broadcasts[0]!.hash);
  await expect(card).toContainText('You voted Yes from this device on');
  await expect(card.getByRole('link', {name: 'Check it on ZIGScan ↗'})).toHaveAttribute('href', `https://testnet.zigscan.org/tx/${chain.broadcasts[0]!.hash}`);
  await expect(view.getByRole('region', {name: 'Your votes from this device'})).toContainText(`Proposal #${VOTING_ID}: Yes · confirmed`);
});

test('the chain\'s own record of a vote shows; voting again replaces it', async ({page}) => {
  await fakeKeplr(page); await fakeChain(page, 'practice');
  await governanceRelay(page, 'practice', {vote: () => ({option: 'no_with_veto'})});
  await openGovernance(page);
  const view = await connect(page);
  await expect(view.locator(`article[data-proposal="${VOTING_ID}"]`)).toContainText('The chain has your vote: No with veto (block 8290600). Voting again replaces it.');
});

test('refusals: no stake means no vote form; a script cannot sign; nothing is asked of the wallet', async ({page}) => {
  const calls = await fakeKeplr(page), chain = await fakeChain(page, 'practice');
  // The relay reads this object at each request: a zero stake first, then 5 ZIG after the person stakes elsewhere.
  const staked: Record<string, string> = {[V1]: '0'};
  await governanceRelay(page, 'practice', {staked});
  await openGovernance(page);
  const view = await connect(page);
  await expect(view.getByRole('status').filter({hasText: 'no stake'})).toContainText('You have no stake with an active validator on this network, so a vote would not count.');
  const card = view.locator(`article[data-proposal="${VOTING_ID}"]`);
  await expect(card).toContainText('so a vote from this address would not count');
  await expect(card.getByRole('button', {name: 'Review my vote'})).toHaveCount(0);
  await expect(card.getByRole('link', {name: 'Staking'})).toHaveAttribute('href', '/app/staking');
  // With stake, a review opens; a script's submit of it is refused by the sign gate.
  staked[V1] = ZIG(5);
  await view.getByRole('button', {name: 'Refresh', exact: true}).click();
  await expect(view.getByRole('status').filter({hasText: 'staked with'})).toContainText('You have 5 ZIG staked');
  await card.getByRole('radio', {name: /^Abstain/}).check();
  await card.getByRole('button', {name: 'Review my vote'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toContainText('Your voteAbstain');
  await sheet.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit(form.querySelector('button[type="submit"]') as HTMLButtonElement));
  await expect(sheet.getByRole('alert')).toHaveText('Press "Sign in Keplr" on the review screen to sign. Nothing was signed.');
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).evaluate(button => (button as HTMLButtonElement).click());
  await expect(sheet.getByRole('alert')).toHaveText('Press "Sign in Keplr" on the review screen to sign. Nothing was signed.');
  await sheet.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(sheet).toBeHidden();
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
  expect(chain.broadcasts).toEqual([]);
});

test('the real network: the first-real confirm before connecting, and the review says REAL', async ({page}) => {
  const calls = await fakeKeplr(page); await fakeChain(page, 'real');
  // A fictional open proposal on the real network too, so a real vote can be reviewed (none was open on 2026-10-19).
  await governanceRelay(page, 'real', {proposals: network => proposalsWire(network === 'zigchain-1' ? 'real' : 'practice', {voting: true})});
  const view = await openGovernance(page);
  await view.getByRole('button', {name: /Real network \(real ZIG\)/}).click();
  const confirm = page.getByRole('dialog', {name: 'This is real money'});
  await confirm.getByLabel('I understand').check();
  await confirm.getByRole('button', {name: 'Continue on the real network'}).click();
  await connect(page, 'REAL');
  const card = view.locator(`article[data-proposal="${VOTING_ID}"]`);
  await card.getByRole('radio', {name: /^No You/}).check();
  await card.getByRole('button', {name: 'Review my vote'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet.locator('.staking-network-line').first()).toHaveText('REAL · zigchain-1 · real ZIG');
  await expect(sheet).toContainText('Your voteNo · You do not support this change.');
  await expect(sheet).toContainText('It is recorded on ZIGChain mainnet.');
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
});
