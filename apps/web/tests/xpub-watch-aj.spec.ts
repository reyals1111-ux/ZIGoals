import {expect, test} from '@playwright/test';

// Session AJ (item 36; D2b, amendment A5): a Bitcoin wallet watched by its public key. The key is the published BIP-84
// test vector (no funds); mempool.space is MOCKED here. The key never leaves the browser: only its derived addresses go
// to mempool.space, one per request; reads stop at the gap limit; a refresh waits 5 minutes; Remove deletes the key.
const ZPUB = 'zpub6rFR7y4Q2AijBEqTUquhVz398htDFrtymD9xYYfG1m4wAcvPhXNfE3EfH1r1ADqtfSdVCToUG868RvUUkgDKf31mGDtKsAYz2oz2AGutZYs';
const FIRST = 'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu';

test('watch a Bitcoin wallet by its zpub: addresses read from mempool.space only, at the gap limit, and Remove forgets it', async ({page}) => {
  const asked: string[] = [], elsewhere: string[] = [];
  await page.route('https://mempool.space/api/address/*', route => {
    const address = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!); asked.push(address);
    const used = address === FIRST;
    return route.fulfill({json: {address, chain_stats: {funded_txo_count: used ? 1 : 0, funded_txo_sum: used ? 150000 : 0, spent_txo_count: used ? 1 : 0, spent_txo_sum: used ? 50000 : 0, tx_count: used ? 2 : 0}, mempool_stats: {tx_count: 0}}, headers: {'access-control-allow-origin': '*'}});
  });
  await page.route('**/api/market-*', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  page.on('request', r => { if (!r.url().startsWith('https://mempool.space/') && (r.postData() ?? '').includes('pub6')) elsewhere.push(r.url()); if (r.url().includes('zpub')) elsewhere.push(r.url()); });
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });

  await page.goto('/app/wealth#xpub');
  const panel = page.getByRole('region', {name: 'A whole Bitcoin wallet, by its public key'});
  const form = panel.getByRole('form', {name: 'Watch a Bitcoin wallet by its public key'});
  // A private key is refused before anything is read.
  await form.getByLabel('Extended public key (xpub, ypub or zpub)').fill('xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi');
  await form.getByRole('button', {name: 'Watch'}).click();
  await expect(form.getByRole('alert')).toContainText('That is a private key.');
  expect(asked).toEqual([]);

  await form.getByLabel('Name').fill('Savings wallet');
  await form.getByLabel('Extended public key (xpub, ypub or zpub)').fill(ZPUB);
  await form.getByRole('button', {name: 'Watch'}).click();
  await expect(panel.getByRole('listitem')).toContainText('0.001 BTC');
  await expect(panel.getByRole('listitem')).toContainText('1 address used');
  await expect(panel.getByRole('status')).toContainText('Savings wallet: read 41 addresses, 1 used.');
  // Receive: index 0 used, then 20 unused (indexes 0–20: seven batches of 3); change: 20 unused (the batch of 18–20 reads
  // one past the gap). Each address once.
  expect(asked).toHaveLength(21 + 21);
  expect(new Set(asked).size).toBe(asked.length);
  expect(asked[0]).toBe(FIRST);
  expect(elsewhere).toEqual([]);
  await expect(panel.getByRole('button', {name: 'Refresh'})).toBeDisabled();
  await expect(panel).toContainText('Again in 5 min');

  // Reopening within 5 minutes reads nothing again.
  asked.length = 0;
  await page.goto('/app/wealth');
  await expect(page.getByRole('region', {name: 'A whole Bitcoin wallet, by its public key'}).getByRole('listitem')).toContainText('0.001 BTC');
  expect(asked).toEqual([]);
  // Nothing about the key is in the device's other records.
  const leaked = await page.evaluate(() => Object.keys(localStorage).filter(k => (localStorage.getItem(k) ?? '').includes('zpub')));
  expect(leaked).toEqual([]);

  await page.getByRole('button', {name: 'Remove Savings wallet'}).click();
  await expect(page.getByText('Savings wallet removed from this device.')).toBeVisible();
  const left = await page.evaluate(() => new Promise<number>(resolve => { const r = indexedDB.open('zigoals-xpub-v1'); r.onsuccess = () => { const db = r.result; const all = db.transaction('keys', 'readonly').objectStore('keys').getAll(); all.onsuccess = () => { resolve(all.result.length); db.close(); }; }; }));
  expect(left).toBe(0);
});
