import {expect, test, type Page} from '@playwright/test';
import {TxBody, TxRaw} from 'cosmjs-types/cosmos/tx/v1beta1/tx';
import {ME, SIGNER_CALLS, fakeChain, fakeKeplr, openStaking, relay} from './staking-chain';

/**
 * Session AF chunk 3 (lane L2a; ADR-028 D4, H48): practice badges — opt-in, off by default, ZIGChain Testnet only. A 1 azig
 * send from the address to itself whose memo is only a salted code of the person's note (or a random badge number): the
 * note never reaches the chain or the review's memo; the review says what is public forever before the Sign press; one
 * signature; read back through /api/chain/attestations. The real network shows no badge at all. Doubles only.
 */
const short = (a: string) => `${a.slice(0, 10)}…${a.slice(-6)}`;
const NOTE = 'Fictional: thirty days of walking';
async function setup(page: Page) {
  const calls = await fakeKeplr(page), chain = await fakeChain(page, 'practice');
  await relay(page, 'practice');
  const asked: URL[] = [];
  await page.route('**/api/chain/grants?**', route => route.fulfill({json: {version: 1, status: 'ok', network: 'zig-test-2', source: 'https://testnet-api.zigchain.com', height: '8290600', observedAt: '2026-10-19T00:16:00.000Z', grants: [], allowances: []}}));
  await page.route('**/api/chain/attestations?**', route => {
    const url = new URL(route.request().url()); asked.push(url);
    const sent = chain.broadcasts.map(b => ({hash: b.hash, height: String(b.height), at: '2026-10-19T00:20:00.000Z', memo: TxBody.decode(TxRaw.decode(b.tx).bodyBytes).memo}));
    return route.fulfill({json: {version: 1, status: 'ok', network: 'zig-test-2', source: 'https://zigchain-testnet-api.polkachu.com', observedAt: '2026-10-19T00:21:00.000Z', items: sent}});
  });
  const panel = await openStaking(page);
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByText(short(ME), {exact: true})).toBeVisible();
  return {calls, chain, asked, panel, card: panel.getByRole('region', {name: 'Practice badges on-chain'})};
}

test('off by default; turned on, a commitment: only its salted code is sent, public forever said first, one signature, read back', async ({page}) => {
  const {calls, chain, asked, card} = await setup(page);
  await expect(card).toContainText('Practice network only (ZIGChain Testnet, no real value). Off unless you turn it on.');
  await expect(card.getByRole('form', {name: 'New practice badge'})).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-prefs:v1') ?? '{}').attestations)).toBeUndefined();
  await card.getByRole('button', {name: 'Turn on practice badges'}).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-prefs:v1')!).attestations)).toBe('on');
  const form = card.getByRole('form', {name: 'New practice badge'});
  await expect(form.getByRole('radio', {name: /^A commitment/})).toBeChecked();
  await form.getByLabel('Your note (stays on this device, never sent)').fill(NOTE);
  const mark = calls.length;
  await form.getByRole('button', {name: 'Review badge'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toContainText('ActionPractice badge (1 azig to yourself)');
  await expect(sheet).toContainText('ToYour own address');
  await expect(sheet).toContainText('Amount1 azig (0.000000000000000001 ZIG, the smallest amount the chain accepts)');
  const memo = (await sheet.locator('.staking-memo').textContent())!;
  expect(memo).toMatch(/^zigoals:att:v1:c:[0-9a-f]{64}$/);
  // Gate C security review S6: the review also says the memo marks the address as a ZIGoals user, and that with Keplr
  // the practice address is the real-network one (stricter: the whole sentence, plus the two new facts).
  await expect(sheet).toContainText('Your address, the time and this memo are public on ZIGChain Testnet forever. The memo holds only a code (your note never leaves this device), but it starts with “zigoals”, so it shows anyone that this address uses ZIGoals — and with Keplr this address is the same as your address on the real network.');
  await expect(sheet.locator('.staking-network-line').first()).toHaveText('PRACTICE · zig-test-2 · no real value');
  await expect(sheet).not.toContainText('thirty days');
  await sheet.getByText('Raw message', {exact: true}).click();
  await expect(sheet.locator('pre')).toContainText('"typeUrl": "/cosmos.bank.v1beta1.MsgSend"');
  await expect(sheet.locator('pre')).toContainText(`"fromAddress": "${ME}"`);
  await expect(sheet.locator('pre')).toContainText(`"toAddress": "${ME}"`);
  await expect(sheet.locator('pre')).toContainText(`"memo": "${memo}"`);
  expect(calls.slice(mark).filter(c => SIGNER_CALLS.test(c)), 'no signer before the Sign press').toEqual([]);
  const before = calls.length;
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  expect(calls.slice(before).filter(c => c === 'signer.signDirect')).toHaveLength(1);
  expect(chain.broadcasts).toHaveLength(1);
  // What reached the (fake) chain: the code only, never the note.
  const body = TxBody.decode(TxRaw.decode(chain.broadcasts[0]!.tx).bodyBytes);
  expect(body.memo).toBe(memo);
  expect(Buffer.from(chain.broadcasts[0]!.tx).toString('latin1')).not.toContain('thirty days');
  // This device keeps the note and its salt (the proof), in the journal.
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-journal:v1')!).entries[0]);
  expect(entry).toMatchObject({action: 'attest', state: 'CONFIRMED', amount: '1', memo, attestation: {kind: 'commitment', note: NOTE}});
  expect(entry.attestation.salt).toMatch(/^[0-9a-f]{64}$/);
  const list = card.getByRole('list', {name: 'Your practice badges'});
  await expect(list).toContainText(`${NOTE} · commitment · confirmed`);
  await expect(list).toContainText('Your note and its salt on this device match this code.');
  expect(asked).toEqual([]);
  await card.getByRole('button', {name: 'Check them on the chain'}).click();
  await expect(list).toContainText(`Found on the chain at block ${chain.broadcasts[0]!.height}.`);
  expect(asked.map(u => u.searchParams.toString())).toEqual([`network=zig-test-2&address=${ME}`]);
});

test('a badge sends a random badge number; turning badges off hides the form again', async ({page}) => {
  const {card} = await setup(page);
  await card.getByRole('button', {name: 'Turn on practice badges'}).click();
  const form = card.getByRole('form', {name: 'New practice badge'});
  await form.getByRole('radio', {name: /^A badge/}).check();
  await form.getByLabel('Your note (stays on this device, never sent)').fill('Fictional: first practice stake');
  await form.getByRole('button', {name: 'Review badge'}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  expect((await sheet.locator('.staking-memo').textContent())!).toMatch(/^zigoals:att:v1:b:[0-9a-f]{32}$/);
  await expect(sheet).toContainText('A random badge number: what it stands for stays on this device.');
  await sheet.getByRole('button', {name: 'Back', exact: true}).click();
  await card.getByRole('button', {name: 'Turn practice badges off'}).click();
  await expect(card.getByRole('form', {name: 'New practice badge'})).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-prefs:v1')!).attestations)).toBeUndefined();
});

test('the real network has no practice badges', async ({page}) => {
  await fakeKeplr(page); await fakeChain(page, 'real');
  await relay(page, 'real');
  await page.route('**/api/chain/grants?**', route => route.fulfill({json: {version: 1, status: 'ok', network: 'zigchain-1', source: 'https://api.zigchain.com', height: '13050000', observedAt: '2026-10-19T00:16:00.000Z', grants: [], allowances: []}}));
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:staking-prefs:v1')) localStorage.setItem('zigoals:staking-prefs:v1', JSON.stringify({version: 1, network: 'real', realConfirmedAt: '2026-10-18T21:00:00.000Z', attestations: 'on'})); });
  const panel = await openStaking(page);
  await panel.getByRole('button', {name: 'Connect Keplr for REAL', exact: true}).click();
  await expect(panel.getByText(short(ME), {exact: true})).toBeVisible();
  await expect(panel.getByRole('region', {name: 'Permissions you have given'})).toBeVisible();
  await expect(panel.getByRole('region', {name: 'Practice badges on-chain'})).toHaveCount(0);
});
