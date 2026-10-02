import {expect, test, type Page} from '@playwright/test';
import {createVault} from '../lib/vault/crypto';

// The encrypted-sync offer in Settings (Session L). Account requests are answered by fixtures, as in
// run10-account-access.spec.ts; scripts/run11/stage8-rehearsal/sync-offer-browser.test.mjs drives the same card
// against the real private-sync Worker.
const account = '10000000-0000-4000-8000-000000000001';
const OFFER = 'Keep your devices in sync automatically', DEVICE = 'Bring this device up to date';
const TURN_ON = 'Turn on encrypted sync (recommended)', HEALTH = 'Also sync my Health records (optional)';
const CONSENT = 'Sync my Health records with this account. Turning this off stops Health transfers on this tab; it does not delete existing encrypted cloud copies.';

async function fixtureAccount(page: Page, manifest: unknown = null) {
  let signedIn = false;
  await page.route('**/api/private-account*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET') {
      if (url.searchParams.get('action') === 'status') return route.fulfill({json: signedIn ? {signedIn: true, accountId: account} : {signedIn: false}});
      if (url.searchParams.get('action') === 'sessions') return route.fulfill({json: {sessions: []}});
      return route.fulfill({json: {protocol: 1, revision: manifest ? 1 : 0, manifest, records: [], cursor: null}});
    }
    const body = request.postDataJSON();
    if (body.action === 'verify') { signedIn = true; return route.fulfill({json: {signedIn: true, accountId: account}}); }
    if (body.action === 'signout') { signedIn = false; return route.fulfill({json: {signedOut: true, remoteRevocationConfirmed: true}}); }
    return route.fulfill({json: {message: 'Fixture code requested; no email sent.'}});
  });
}
async function signIn(page: Page) {
  await page.getByLabel('Email address', {exact: true}).fill('fixture@example.com');
  await page.getByRole('button', {name: 'Send email code', exact: true}).click();
  await page.getByLabel('Email code', {exact: true}).fill('123456');
  await page.getByRole('button', {name: 'Verify email code', exact: true}).click();
}
const card = (page: Page, name = OFFER) => page.getByRole('region', {name, exact: true});
const consent = (page: Page) => page.getByRole('region', {name: 'Encrypted account sync', exact: true}).getByRole('checkbox', {name: CONSENT, exact: true});
const localKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).sort());

test('no offer before sign-in, and none where accounts are not configured (today\'s Alpha)', async ({page}) => {
  await page.route('**/api/private-account*', route => route.fulfill({status: 503, json: {error: 'HOSTED_CONFIGURATION_REQUIRED'}}));
  await page.goto('/app/settings');
  await expect(page.getByRole('region', {name: 'Email account access'})).toContainText('not configured');
  await expect(page.getByRole('button', {name: TURN_ON})).toHaveCount(0);
  await expect(card(page)).toHaveCount(0);
  await page.unrouteAll();await fixtureAccount(page);await page.reload();
  await expect(page.getByRole('button', {name: 'Send email code', exact: true})).toBeEnabled();
  await expect(card(page)).toHaveCount(0);
});

test('after sign-in the offer explains sync, keeps Health as its own unticked choice, moves no focus and writes nothing', async ({page}) => {
  await fixtureAccount(page);await page.goto('/app/settings');
  await expect(page.getByRole('button', {name: 'Send email code', exact: true})).toBeEnabled();
  const before = await localKeys(page);
  await signIn(page);
  const offer = card(page);
  await expect(offer).toBeVisible();
  await expect(offer).toContainText('end-to-end encrypted on this device before it leaves; nobody else can read it.');
  await expect(offer).toContainText('No backups or transfers by hand.');
  await expect(offer).toContainText('a password manager is ideal');
  await expect(offer).toContainText('only the recovery secret unlocks your data');
  await expect(offer.getByRole('button', {name: TURN_ON, exact: true})).toBeVisible();
  await expect(offer.getByRole('button', {name: 'Not now', exact: true})).toBeVisible();
  const health = offer.getByRole('checkbox', {name: HEALTH, exact: true});
  await expect(health).not.toBeChecked();await expect(health).toHaveAccessibleDescription('Health stays on this device unless you tick this.');
  // The existing controls are unchanged, and sign-in focus still lands on the existing consent, not in the card.
  await expect(page.getByRole('button', {name: 'Create encrypted account vault', exact: true})).toBeVisible();
  await expect(consent(page)).toBeFocused();
  expect(await offer.evaluate(el => el.contains(document.activeElement))).toBe(false);
  // One consent, shown twice: ticking either ticks both; nothing is pre-ticked.
  await expect(consent(page)).not.toBeChecked();
  await health.check();await expect(consent(page)).toBeChecked();
  await consent(page).uncheck();await expect(health).not.toBeChecked();
  expect(await localKeys(page)).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:sync-offer:v1'))).toBeNull();
});

test('"Turn on" starts the existing vault creation: the secret box appears unconfirmed and focus moves to the next step', async ({page}) => {
  await fixtureAccount(page);await page.goto('/app/settings');await signIn(page);
  await card(page).getByRole('button', {name: TURN_ON, exact: true}).click();
  await expect(page.getByLabel('New vault recovery secret', {exact: true})).not.toHaveValue('');
  await expect(page.getByLabel('I saved this vault recovery secret separately.')).not.toBeChecked();
  await expect(page.getByRole('button', {name: 'Confirm and create vault', exact: true})).toBeDisabled();
  const next = card(page, 'Save your recovery secret');
  await expect(next).toBeVisible();
  await expect(next.getByText(/^Your recovery secret is ready below\./)).toBeFocused();
  await expect(page.getByRole('button', {name: TURN_ON})).toHaveCount(0);
  // The existing Cancel brings the offer back.
  await page.getByRole('button', {name: 'Cancel', exact: true}).click();
  await expect(card(page).getByRole('button', {name: TURN_ON, exact: true})).toBeVisible();
});

test('"Not now" leaves one calm reminder that survives a reload, with an exact device flag', async ({page}) => {
  await fixtureAccount(page);await page.goto('/app/settings');await signIn(page);
  await card(page).getByRole('button', {name: 'Not now', exact: true}).click();
  const reminder = page.getByRole('region', {name: 'Encrypted sync is off for this account on this device.', exact: true});
  await expect(reminder).toBeVisible();
  // Focus continues at the reminder's own sentence (a focusable paragraph), not at <body>.
  await expect(reminder.locator('p', {hasText: 'Encrypted sync is off for this account on this device.'})).toBeFocused();
  await expect(card(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('zigoals:sync-offer:v1'))).toBe('{"version":1,"later":true}');
  await page.reload();
  await expect(reminder).toBeVisible();await expect(card(page)).toHaveCount(0);
  await reminder.getByRole('button', {name: 'Turn on encrypted sync', exact: true}).click();
  await expect(page.getByLabel('New vault recovery secret', {exact: true})).not.toHaveValue('');
});

test('on a device new to an existing vault, "Turn on" moves to the recovery secret field; a returning device sees no offer', async ({page}) => {
  const {manifest} = await createVault();
  await fixtureAccount(page, manifest);await page.goto('/app/settings');await signIn(page);
  const offer = card(page, DEVICE);
  await expect(offer).toContainText('Your account already has encrypted sync.');
  await expect(offer).toContainText('Your password manager can fill in the recovery secret.');
  await offer.getByRole('button', {name: TURN_ON, exact: true}).click();
  await expect(page.getByLabel('Vault recovery secret', {exact: true})).toBeFocused();
  // A browser that already holds this account's records keeps only the usual unlock form.
  await page.evaluate(id => localStorage.setItem(`zigoals:account:v1:${id}:zigoals:settings:v1`, '{}'), account);
  await page.reload();
  await expect(page.getByLabel('Vault recovery secret', {exact: true})).toBeVisible();
  await expect(card(page, DEVICE)).toHaveCount(0);
  await expect(page.getByRole('button', {name: TURN_ON})).toHaveCount(0);
});

test('the offer works by keyboard alone', async ({page}) => {
  await fixtureAccount(page);await page.goto('/app/settings');await signIn(page);
  const offer = card(page), health = offer.getByRole('checkbox', {name: HEALTH, exact: true});
  await health.focus();await page.keyboard.press('Space');await expect(health).toBeChecked();await page.keyboard.press('Space');await expect(health).not.toBeChecked();
  await page.keyboard.press('Tab');await expect(offer.getByRole('button', {name: TURN_ON, exact: true})).toBeFocused();
  await page.keyboard.press('Tab');await expect(offer.getByRole('button', {name: 'Not now', exact: true})).toBeFocused();
  await page.keyboard.press('Enter');
  const reminder = page.getByRole('region', {name: 'Encrypted sync is off for this account on this device.', exact: true});
  await expect(reminder.locator('p', {hasText: 'Encrypted sync is off for this account on this device.'})).toBeFocused();
});

test('one fade on arrival, and none under reduced motion or Motion Off', async ({page}) => {
  const animation = () => card(page).evaluate(el => getComputedStyle(el).animationName);
  await fixtureAccount(page);await page.goto('/app/settings');await signIn(page);
  expect(await animation()).toBe('sync-offer-in');
  expect(await card(page).evaluate(el => getComputedStyle(el).animationIterationCount)).toBe('1');
  await page.emulateMedia({reducedMotion: 'reduce'});
  expect(await animation()).toBe('none');
  await page.emulateMedia({reducedMotion: 'no-preference'});
  await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off'));await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-app-motion', 'off');
  // Still signed in after the reload (the fixture session): the offer returns without a new code.
  await expect(card(page)).toBeVisible();
  expect(await animation()).toBe('none');
});

for (const width of [320, 390]) test(`the offer fits a ${width} px phone with full-width 44 px choices`, async ({page}) => {
  await page.setViewportSize({width, height: 844});
  await fixtureAccount(page);await page.goto('/app/settings');await signIn(page);
  const offer = card(page);await expect(offer).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  for (const name of [TURN_ON, 'Not now']) {
    const box = (await offer.getByRole('button', {name, exact: true}).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThan(width - 120);
  }
});
