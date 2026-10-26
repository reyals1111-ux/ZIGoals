import {expect, test, type Locator, type Page} from '@playwright/test';
import {ME, SIGNER_CALLS, V1, V2, ZIG, fakeChain, fakeKeplr, openStaking, relay} from './staking-chain';

/**
 * Session AF (ADR-028 H4, H46, H60, H61, H63; `TIER 3 (wallet/signing)`): native staking on the PRACTICE network, end to
 * end, with an injected Keplr double (every method it is asked is recorded), the testnet RPC answered from recorded
 * fixtures and ZIGoals' relay answered from fixtures — no real wallet, no real node, no broadcast leaves the test.
 * Delegate, undelegate, redelegate and claim all go through the review screen; no signer is asked for before the Sign
 * press, exactly one signature follows each press, and each confirmed action reads the positions again at its block.
 */
async function connect(page: Page, panel: Locator) {
  await panel.getByRole('button', {name: 'Connect Keplr for PRACTICE', exact: true}).click();
  await expect(panel.getByText(`${ME.slice(0, 10)}…${ME.slice(-6)}`, {exact: true})).toBeVisible();
}
/** Presses Sign on the open review; `since` is the call count when this action's Review was pressed. */
async function sign(page: Page, calls: string[], since = 0) {
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toBeVisible();
  // Nothing has asked Keplr for a signer since this action began (its form, its Review press, its quote).
  expect(calls.slice(since).filter(c => SIGNER_CALLS.test(c)), 'no signer before the Sign press').toEqual([]);
  const before = calls.length;
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  const after = calls.slice(before);
  expect(after.filter(c => c === 'keplr.getOfflineSignerAuto'), 'one signer request').toHaveLength(1);
  expect(after.filter(c => c === 'signer.signDirect'), 'exactly one signature').toHaveLength(1);
  return sheet;
}
/** The scripts a page requests, from the start (recorded by the test, not the page). */
const scriptsOf = new WeakMap<Page, Set<string>>();
function recordScripts(page: Page) { const set = new Set<string>(); scriptsOf.set(page, set); page.on('request', r => { if (r.resourceType() === 'script') set.add(r.url()); }); }
/** Whether any script this page has requested holds CosmJS's transaction service (the signing client's chunk: simulation, signing, broadcast). */
async function signingClientLoaded(page: Page) {
  for (const url of scriptsOf.get(page) ?? []) if ((await (await page.request.get(url)).text()).includes('"cosmos.tx.v1beta1.Service"')) return true;
  return false;
}
async function done(page: Page) {
  const progress = page.getByRole('region', {name: 'Confirmed on the network.'});
  await expect(progress).toContainText(/Positions refreshed at block \d+\./);
  await progress.getByRole('button', {name: 'Done', exact: true}).click();
  await expect(progress).toBeHidden();
}

test('practice: delegate, undelegate, redelegate and claim all, each through the review screen; no signer before the press; one signature each', async ({page}) => {
  const calls = await fakeKeplr(page), chain = await fakeChain(page, 'practice'), asked = await relay(page, 'practice');
  recordScripts(page);
  const panel = await openStaking(page);
  // Practice is the default and says so in big plain words.
  await expect(panel.getByRole('button', {name: /Practice network \(no real value\)/})).toHaveAttribute('aria-pressed', 'true');
  await expect(panel).toContainText('Practice network (no real value) · ZIGChain Testnet (zig-test-2)');
  expect(calls, 'opening the page asks Keplr for nothing').toEqual([]);
  await connect(page, panel);
  expect(calls).toEqual(['keplr.enable', 'keplr.getKey']);
  expect(chain.methods.slice(0, 2).sort()).toEqual(['GET /abci_info', 'GET /status']);

  // The signing client (CosmJS: simulation, signing, broadcast) is not loaded yet: not with the page, not on connect.
  expect(await signingClientLoaded(page), 'the signing client loads on the first Review press, not before').toBe(false);
  // 1. Delegate 25 ZIG to Fictional Alpha: no default amount, the amount typed by the person.
  await expect(panel.getByLabel('Amount of ZIG')).toHaveValue('');
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('25');
  await expect(panel.locator('#staking-amount-network')).toHaveText('PRACTICE · zig-test-2 · no real value');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  let sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toContainText('Stake (delegate)');
  await expect(sheet).toContainText('Fictional Alpha');
  await expect(sheet).toContainText('25 ZIG');
  await expect(sheet).toContainText('(25000000000000000000 azig)');
  await expect(sheet).toContainText(/about 0\.00061\sZIG \(187,701 gas simulated × 1\.3 × 2\.5 Gazig per gas; your wallet may let you raise it\)/);
  await expect(sheet).toContainText('Getting this ZIG back takes 21 days after you unstake; it earns nothing and cannot move meanwhile.');
  await expect(sheet).toContainText('You will sign this in your wallet. ZIGoals never sees your keys and cannot sign for you.');
  await expect(sheet).toContainText('Your address, the validator and the amount are recorded on ZIGChain Testnet for anyone to see, forever.');
  await expect(sheet.locator('.staking-network-line').first()).toHaveText('PRACTICE · zig-test-2 · no real value');
  expect(await signingClientLoaded(page), 'the Review press loaded the signing client').toBe(true);
  await sheet.getByText('Raw message', {exact: true}).click();
  await expect(sheet.locator('pre')).toContainText('"typeUrl": "/cosmos.staking.v1beta1.MsgDelegate"');
  expect(chain.methods).toContain('abci_query /cosmos.tx.v1beta1.Service/Simulate');
  sheet = await sign(page, calls);
  expect(chain.broadcasts).toHaveLength(1);
  const first = chain.broadcasts[0]!;
  const link = page.getByRole('link', {name: 'Check it on ZIGScan ↗'});
  await expect(link).toHaveAttribute('href', `https://testnet.zigscan.org/tx/${first.hash}`);
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.getByRole('region', {name: 'Confirmed on the network.'})).toContainText(`Included at block ${first.height}.`);
  // The positions are read again through the relay at the confirmed block (the tracker's path).
  await expect.poll(() => asked.map(u => u.searchParams.get('minHeight'))).toContain(String(first.height));
  await done(page);

  // 2. Undelegate 10 ZIG from Fictional Alpha: what unstaking means, in plain words.
  let mark = calls.length;
  await panel.getByRole('tab', {name: 'Unstake', exact: true}).click();
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('10');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Review before you sign'})).toContainText('This ZIG comes back to your wallet after 21 days (checked against the chain just now). Meanwhile it earns nothing and cannot move.');
  await sign(page, calls, mark); await done(page);

  // 3. Redelegate 5 ZIG from Fictional Alpha to Fictional Beta.
  mark = calls.length;
  await panel.getByRole('tab', {name: 'Move stake', exact: true}).click();
  await panel.getByRole('group', {name: 'Move stake from'}).getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByRole('group', {name: 'Move it to'}).getByRole('radio', {name: /Fictional Beta/}).check();
  await panel.getByLabel('Amount of ZIG').fill('5');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const moving = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(moving).toContainText('Move stake (redelegate)');
  await expect(moving).toContainText('The same ZIG cannot be moved again for 21 days.');
  await sign(page, calls, mark); await done(page);

  // 4. Claim all: one signature, two withdrawals, every validator listed with what is waiting.
  mark = calls.length;
  await panel.getByRole('tab', {name: 'Claim rewards', exact: true}).click();
  await expect(panel.getByRole('radio', {name: /Claim all/})).toBeChecked();
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const claiming = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(claiming).toContainText('Claim rewards · one signature, 2 withdrawals');
  await expect(claiming).toContainText('Fictional Alpha');
  await expect(claiming).toContainText('Fictional Beta');
  await sign(page, calls, mark); await done(page);

  // Four presses, four signatures, four broadcasts — never a second one for the same press.
  expect(calls.filter(c => c === 'signer.signDirect')).toHaveLength(4);
  expect(chain.broadcasts).toHaveLength(4);
  expect(new Set(chain.broadcasts.map(b => b.hash)).size).toBe(4);
  expect(chain.methods.filter(m => m === 'broadcast_tx_sync')).toHaveLength(4);
  // The journal keeps every action, confirmed, with its hash.
  const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:staking-journal:v1') ?? 'null') as {entries: {action: string; state: string; hash: string; validators?: string[]}[]});
  expect(journal.entries.map(e => [e.action, e.state])).toEqual([['delegate', 'CONFIRMED'], ['undelegate', 'CONFIRMED'], ['redelegate', 'CONFIRMED'], ['claim', 'CONFIRMED']]);
  expect(journal.entries.map(e => e.hash)).toEqual(chain.broadcasts.map(b => b.hash));
  expect(journal.entries[3]!.validators).toEqual([V1, V2]);
});

test('after a confirmed delegation the Staking totals and the tracker\'s record (what Today, Wealth and Portfolio read) hold the refreshed positions', async ({page}) => {
  const calls = await fakeKeplr(page);
  await fakeChain(page, 'practice');
  let staked = ZIG(50);
  await relay(page, 'practice', () => ({staked: {[V1]: staked}}));
  const panel = await openStaking(page);
  await connect(page, panel);
  await expect(page.locator('.position-metrics .stake-hero')).toContainText('50 ZIG');
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('25');
  staked = ZIG(75);
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  await sign(page, calls);
  await expect(page.locator('.position-metrics .stake-hero')).toContainText('75 ZIG');
  // The refreshed reading is the tracker's own record (watchScope + the native-zig positions), the one Today's staking
  // card, Wealth and Portfolio read: the connected wallet on the practice network, the new stake, at the confirmed block.
  const platform = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:platform:v1') ?? 'null') as {watchScope?: {network: string; account: string}; positions: {sourceType: string; network: string; account: string; quantity: string; provenance: string}[]});
  expect(platform.watchScope).toEqual({network: 'zig-test-2', account: ME});
  const stake = platform.positions.filter(p => p.sourceType === 'NATIVE_STAKING' && p.network === 'zig-test-2' && p.account === ME);
  expect(stake.map(p => p.quantity)).toEqual([ZIG(75)]);
  expect(stake[0]!.provenance).toMatch(/^https:\/\/testnet-api\.zigchain\.com · block 829060\d$/);
});

test('Max for unstaking is the whole stake with that validator; a typed amount above it is refused before any review', async ({page}) => {
  const calls = await fakeKeplr(page);
  const chain = await fakeChain(page, 'practice');
  await relay(page, 'practice');
  const panel = await openStaking(page);
  await connect(page, panel);
  await panel.getByRole('tab', {name: 'Unstake', exact: true}).click();
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByRole('button', {name: 'Max', exact: true}).click();
  await expect(panel.getByLabel('Amount of ZIG')).toHaveValue('50');
  await panel.getByLabel('Amount of ZIG').fill('51');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  await expect(panel.getByRole('alert')).toHaveText('That is more than you have staked with this validator (50 ZIG).');
  await expect(page.getByRole('dialog', {name: 'Review before you sign'})).toHaveCount(0);
  expect(chain.methods.filter(m => m.includes('Simulate'))).toEqual([]);
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
});

test('a script cannot sign: an untrusted submit of the review form asks Keplr for nothing', async ({page}) => {
  const calls = await fakeKeplr(page);
  const chain = await fakeChain(page, 'practice');
  await relay(page, 'practice');
  const panel = await openStaking(page);
  await connect(page, panel);
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('1');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet).toBeVisible();
  // form.requestSubmit() makes the browser fire a TRUSTED submit, with or without naming the Sign button; a script's
  // button.click() and a dispatched submit are untrusted. None of them is the person's press: the gate refuses each.
  const refused = 'Press "Sign in Keplr" on the review screen to sign. Nothing was signed.';
  await sheet.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit());
  await expect(sheet.getByRole('alert')).toHaveText(refused);
  await sheet.locator('form').evaluate(form => (form as HTMLFormElement).requestSubmit(form.querySelector('button[type="submit"]') as HTMLButtonElement));
  await expect(sheet.getByRole('alert')).toHaveText(refused);
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).evaluate(button => (button as HTMLButtonElement).click());
  await expect(sheet.getByRole('alert')).toHaveText(refused);
  await sheet.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
  await page.waitForTimeout(300);
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
  expect(chain.broadcasts).toEqual([]);
  // The person's own press still works on the same review, once.
  await sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Confirmed on the network.'})).toBeVisible({timeout: 20_000});
  expect(calls.filter(c => c === 'signer.signDirect')).toHaveLength(1);
  expect(chain.broadcasts).toHaveLength(1);
});

test('Back closes the review with nothing asked of the wallet and nothing sent', async ({page}) => {
  const calls = await fakeKeplr(page);
  const chain = await fakeChain(page, 'practice');
  await relay(page, 'practice');
  const panel = await openStaking(page);
  await connect(page, panel);
  await panel.getByRole('radio', {name: /Fictional Alpha/}).check();
  await panel.getByLabel('Amount of ZIG').fill('1');
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: 'Review before you sign'});
  await expect(sheet.getByRole('button', {name: 'Sign in Keplr →', exact: true})).toBeVisible();
  await sheet.getByRole('button', {name: 'Back', exact: true}).click();
  await expect(sheet).toBeHidden();
  // Escape is Back too.
  await panel.getByRole('button', {name: 'Review', exact: true}).click();
  await expect(sheet).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  expect(calls.filter(c => SIGNER_CALLS.test(c))).toEqual([]);
  expect(chain.broadcasts).toEqual([]);
});
