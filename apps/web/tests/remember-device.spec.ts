import {expect, test, type Page} from '@playwright/test';
import {createVault} from '../lib/vault/crypto';

// Session M, Part B2 (ADR-008, owner decision M1): "Remember on this device" in Settings → Account & sync. Account
// requests are answered by fixtures, as in sync-offer-card.spec.ts; the Stage 8 rehearsal
// scripts/run11/stage8-rehearsal/remember-device-browser.test.mjs drives the same flows against the real private-sync
// Worker. A real browser keeps the remembered record in IndexedDB.
const account = '10000000-0000-4000-8000-000000000001', session = '20000000-0000-4000-8000-000000000002';
const REMEMBER = 'Remember on this device — don’t use on shared computers';
const panel = (page: Page) => page.getByRole('region', {name: 'Encrypted account sync', exact: true});

type Vault = Awaited<ReturnType<typeof createVault>>;
/** Answers this page's account requests for one fictional vault; a second tab of the same browser passes the same vault. */
async function fixtureAccount(page: Page, existing?: Vault) {
  const vault = existing ?? await createVault();
  await page.route('**/api/private-account*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET') {
      if (url.searchParams.get('action') === 'status') return route.fulfill({json: {signedIn: true, accountId: account}});
      if (url.searchParams.get('action') === 'sessions') return route.fulfill({json: {sessions: [{id: session, label: 'Fixture browser', createdAt: '2026-10-02T10:00:00.000Z', current: true}]}});
      return route.fulfill({json: {protocol: 1, revision: 1, manifest: vault.manifest, records: [], cursor: null}});
    }
    return route.fulfill({status: 503, json: {error: 'FIXTURE_ONLY'}});
  });
  return vault;
}
async function unlock(page: Page, secret: string, remember?: boolean) {
  await panel(page).getByLabel('Vault recovery secret', {exact: true}).fill(secret);
  if (remember !== undefined) await panel(page).getByRole('checkbox', {name: REMEMBER, exact: true}).setChecked(remember);
  await panel(page).getByRole('button', {name: 'Unlock account vault', exact: true}).click();
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
}
const deviceDatabase = (page: Page) => page.evaluate(async () => (await indexedDB.databases()).some(db => db.name === 'zigoals-device-unlock-v1'));

test('in a browser tab the choice is unticked, always shown with its warning, and an unticked unlock remembers nothing', async ({page}) => {
  const vault = await fixtureAccount(page);
  await page.goto('/app/settings');
  const box = panel(page).getByRole('checkbox', {name: REMEMBER, exact: true});
  await expect(box).not.toBeChecked();
  await expect(box).toHaveAccessibleDescription(/anyone who can use this browser on this device can open them too\. Forget this device in Settings at any time; locking also forgets it\./);
  await unlock(page, vault.recovery);
  expect(await deviceDatabase(page)).toBe(false);
  await expect(panel(page)).not.toContainText('This device is remembered');
  await page.reload();
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toBeVisible();
});

test('in the installed app (display-mode standalone) the choice is ticked by default, with the same warning', async ({page}) => {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = query => query === '(display-mode: standalone)' ? {matches: true, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false} : real(query);
  });
  await fixtureAccount(page);
  await page.goto('/app/settings');
  const box = panel(page).getByRole('checkbox', {name: REMEMBER, exact: true});
  await expect(box).toBeChecked();
  await expect(box).toHaveAccessibleDescription(/locking also forgets it/);
});

test('a remembered device opens again without the secret after a reload and in a new tab, until it is locked or forgotten', async ({page, context}) => {
  const vault = await fixtureAccount(page);
  await page.goto('/app/settings');
  await unlock(page, vault.recovery, true);
  await expect(panel(page)).toContainText('This device is remembered: ZIGoals opens your account records here without the recovery secret. Locking also forgets this device.');
  await expect(panel(page)).toContainText('On this remembered device the vault stays open until you lock it');
  // A reload asks for nothing.
  await page.reload();
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toHaveCount(0);
  // Neither does a new tab on another page; Settings there shows the vault open.
  const second = await context.newPage();
  await fixtureAccount(second, vault);
  await second.goto('/app');
  await second.goto('/app/settings');
  await expect(panel(second).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
  await second.close();
  // Settings in a new tab still locks the other tabs, as before (account-browser L72-L74). A remembered tab opens again
  // without the secret as soon as it is used again.
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toHaveCount(0);
  // Forget this device: this tab stays open; the next open asks for the secret.
  await panel(page).getByRole('button', {name: 'Forget this device', exact: true}).click();
  await expect(panel(page)).toContainText('This device is no longer remembered. Unlocking again needs the recovery secret.');
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
  await page.reload();
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toBeVisible();
  // Remember again, then Lock now: it locks and forgets.
  await unlock(page, vault.recovery, true);
  await panel(page).getByRole('button', {name: 'Lock account vault', exact: true}).click();
  await expect(page.getByRole('region', {name: 'Email account access', exact: true}).getByText('Account records locked.', {exact: true})).toBeVisible();
  await expect.poll(() => page.evaluate(async () => !(await indexedDB.databases()).some(db => db.name === 'zigoals-device-unlock-v1') || new Promise(resolve => { const r = indexedDB.open('zigoals-device-unlock-v1'); r.onsuccess = () => { const c = r.result.transaction('devices').objectStore('devices').count(); c.onsuccess = () => { r.result.close(); resolve(c.result === 0); }; }; }))).toBe(true);
  await page.reload();
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toBeVisible();
});

// Session U Part 5 (B1, FINDINGS Q-SYNC-01) in a real browser: a new remember stores version 2, the root key itself, which
// script can use but not export; a version 1 record written by an earlier build (rebuilt here in the page with WebCrypto,
// exactly as lib/vault/crypto.ts sealed it) still opens once, is migrated to version 2, and its unwrap-capable key is gone.
const readRecord = (page: Page) => page.evaluate(async () => new Promise<Record<string, unknown> | null>((resolve, reject) => {
  const open = indexedDB.open('zigoals-device-unlock-v1');
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const db = open.result, all = db.transaction('devices').objectStore('devices').getAll();
    all.onsuccess = () => { db.close(); resolve((all.result[0] as Record<string, unknown>) ?? null); };
  };
}));
const describeRecord = (page: Page) => page.evaluate(async () => {
  const record = await new Promise<Record<string, unknown> | null>(resolve => {
    const open = indexedDB.open('zigoals-device-unlock-v1');
    open.onsuccess = () => { const all = open.result.transaction('devices').objectStore('devices').getAll(); all.onsuccess = () => { open.result.close(); resolve((all.result[0] as Record<string, unknown>) ?? null); }; };
  });
  if (!record) return null;
  const root = record.root as CryptoKey | undefined, exported = root ? await crypto.subtle.exportKey('raw', root).then(() => 'exported', error => (error as Error).name) : 'no root';
  return {version: record.version, keys: Object.keys(record).sort(), root: root ? {type: root.type, extractable: root.extractable, algorithm: root.algorithm.name, usages: [...root.usages]} : null, exported, migratedFrom: typeof record.migratedFrom === 'string'};
});

test('B1: a new remember stores the root key itself, which this browser cannot export', async ({page}) => {
  const vault = await fixtureAccount(page);
  await page.goto('/app/settings');
  await unlock(page, vault.recovery, true);
  await expect(panel(page)).toContainText('This device is remembered');
  expect(await describeRecord(page)).toEqual({version: 2, keys: ['account', 'commitment', 'createdAt', 'epoch', 'health', 'id', 'manifest', 'root', 'session', 'vault', 'version'], root: {type: 'secret', extractable: false, algorithm: 'HKDF', usages: ['deriveKey']}, exported: 'InvalidAccessError', migratedFrom: false});
  await page.reload();
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toHaveCount(0);
});

test('B1: a version 1 record from an earlier build opens once more, then is version 2 and nothing can unwrap the root', async ({page}) => {
  const vault = await fixtureAccount(page);
  await page.goto('/app/settings');
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toBeVisible();
  // Write the record an earlier build wrote, and show the finding on it: its key unwraps the root as an extractable key.
  const finding = await page.evaluate(async ({manifest, recovery, account, session}) => {
    const decode = (text: string) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const utf8 = (text: string) => new TextEncoder().encode(text);
    const digest = encode(new Uint8Array(await crypto.subtle.digest('SHA-256', utf8(JSON.stringify([manifest.version, manifest.vault, manifest.epoch, manifest.wrapped.version, manifest.wrapped.nonce, manifest.wrapped.ciphertext])))));
    const wrapping = await crypto.subtle.importKey('raw', decode(recovery), {name: 'AES-GCM'}, false, ['decrypt']);
    const raw = new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: decode(manifest.wrapped.nonce), additionalData: utf8(`zigoals:root:v1:${manifest.vault}:epoch${manifest.epoch}`), tagLength: 128}, wrapping, decode(manifest.wrapped.ciphertext)));
    const key = await crypto.subtle.generateKey({name: 'AES-GCM', length: 256}, false, ['encrypt', 'unwrapKey']), iv = crypto.getRandomValues(new Uint8Array(12)), aad = utf8(JSON.stringify(['zigoals-device-root', 1, account, digest]));
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv, additionalData: aad, tagLength: 128}, key, raw));raw.fill(0);
    const record = {version: 1, account, vault: manifest.vault, epoch: manifest.epoch, manifest: digest, session, health: false, createdAt: '2026-10-02T10:00:00.000Z', sealed: {iv: encode(iv), ciphertext: encode(ciphertext)}, key};
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('zigoals-device-unlock-v1', 1);
      open.onupgradeneeded = () => { for (const name of ['devices', 'state']) open.result.createObjectStore(name); };
      open.onerror = () => reject(open.error);
      open.onsuccess = () => { const t = open.result.transaction('devices', 'readwrite'); t.objectStore('devices').put(record, account); t.oncomplete = () => { open.result.close(); resolve(); }; t.onerror = () => reject(t.error); };
    });
    const extractable = await crypto.subtle.unwrapKey('raw', ciphertext, key, {name: 'AES-GCM', iv, additionalData: aad, tagLength: 128}, {name: 'AES-GCM'}, true, ['encrypt']);
    return new Uint8Array(await crypto.subtle.exportKey('raw', extractable)).byteLength;
  }, {manifest: vault.manifest, recovery: vault.recovery, account, session});
  expect(finding).toBe(32);
  expect((await readRecord(page))?.version).toBe(1);
  // The next open: no secret, and the record is version 2 now, migrated from that seal, with no unwrap-capable key left.
  await page.reload();
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
  await expect(panel(page).getByLabel('Vault recovery secret', {exact: true})).toHaveCount(0);
  await expect.poll(async () => (await describeRecord(page))?.version).toBe(2);
  expect(await describeRecord(page)).toEqual({version: 2, keys: ['account', 'commitment', 'createdAt', 'epoch', 'health', 'id', 'manifest', 'migratedFrom', 'root', 'session', 'vault', 'version'], root: {type: 'secret', extractable: false, algorithm: 'HKDF', usages: ['deriveKey']}, exported: 'InvalidAccessError', migratedFrom: true});
  // And it keeps opening.
  await page.reload();
  await expect(panel(page).getByRole('button', {name: 'Lock account vault', exact: true})).toBeVisible();
});
