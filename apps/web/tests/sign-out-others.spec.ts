import {expect, test, type Page} from '@playwright/test';

// Session W Part 18 (W3): "Sign out all other devices" is its own explained action under Settings → Devices and sessions,
// with a confirmation and no session list needed first. It sends the existing revoke-others request (the relay also
// signs them out at the email provider); per-session Revoke is unchanged. A page.route account fixture; nothing leaves.
const ACCOUNT = '10000000-0000-4000-8000-000000000001', PHONE = '20000000-0000-4000-8000-000000000002';
async function account(page: Page) {
  const posts: {body: unknown; account: string | undefined}[] = [];
  await page.route('**/api/private-account*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (request.method() === 'GET') {
      if (url.searchParams.get('action') === 'status') return route.fulfill({json: {signedIn: true, accountId: ACCOUNT}});
      if (url.searchParams.get('action') === 'sessions') return route.fulfill({json: {sessions: [{id: '20000000-0000-4000-8000-000000000001', label: 'This browser', createdAt: '2026-10-01T10:00:00.000Z', current: true}, {id: PHONE, label: 'Phone', createdAt: '2026-10-02T10:00:00.000Z', current: false}]}});
      return route.fulfill({json: {protocol: 1, revision: 0, manifest: null, records: [], cursor: null}});
    }
    const body = request.postDataJSON() as {action: string; operation?: {action: string}};
    posts.push({body, account: request.headers()['x-zigoals-account']});
    if (body.action === 'session') return route.fulfill({json: {revoked: body.operation?.action === 'revoke' ? 1 : 2, currentRevoked: false, providerSignedOut: true}});
    return route.fulfill({status: 400, json: {error: 'UNEXPECTED_FIXTURE_REQUEST'}});
  });
  await page.route('**/api/push*', route => route.fulfill({status: 503, json: {error: 'fixture'}}));
  return posts;
}

test('sign out all other devices: explained, confirmed, no list needed first; cancelling sends nothing', async ({page}) => {
  const posts = await account(page);
  await page.goto('/app/settings');
  const panel = page.getByRole('region', {name: 'Account sessions'});
  const group = panel.getByRole('group', {name: 'Sign out all other devices'});
  await expect(group).toContainText('they can no longer read or write your vault, and they are signed out at the email provider too. This device stays signed in.');
  await group.getByRole('button', {name: 'Sign out all other devices…'}).click();
  const confirm = group.getByRole('alertdialog');
  await expect(confirm).toContainText('Sign out all other devices now?');
  await confirm.getByRole('button', {name: 'Keep them signed in'}).click();
  await expect(group.getByRole('alertdialog')).toHaveCount(0);
  expect(posts).toEqual([]);
  await group.getByRole('button', {name: 'Sign out all other devices…'}).click();
  await group.getByRole('alertdialog').getByRole('button', {name: 'Sign out all other devices', exact: true}).click();
  await expect(panel.getByRole('status')).toHaveText('Signed out all other devices: 2 session(s) revoked. They were also signed out at the email provider. This device stays signed in.');
  expect(posts).toEqual([{body: {action: 'session', operation: {action: 'revoke-others'}}, account: ACCOUNT}]);
});

test('the session list keeps per-session Revoke and no longer repeats the sign-out-others button', async ({page}) => {
  const posts = await account(page);
  await page.goto('/app/settings');
  const panel = page.getByRole('region', {name: 'Account sessions'});
  await panel.getByRole('button', {name: 'Refresh sessions'}).click();
  await expect(panel.getByRole('listitem')).toHaveCount(2);
  await expect(panel.getByRole('button', {name: /Revoke other sessions/})).toHaveCount(0);
  await expect(panel.getByRole('button', {name: /^Sign out all other devices/})).toHaveCount(1);
  await panel.getByRole('button', {name: 'Revoke Phone'}).click();
  await panel.getByRole('button', {name: 'Confirm session revocation'}).click();
  await expect(panel.getByRole('status')).toHaveText('1 session(s) revoked. They were also signed out at the email provider. Refresh to inspect remaining access.');
  expect(posts.map(p => p.body)).toEqual([{action: 'session', operation: {action: 'revoke', id: PHONE}}]);
});
