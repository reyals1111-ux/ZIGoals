import {expect, test} from '@playwright/test';
import {freshDevice, hydrated} from '../../ah-helpers';

// Session AL third pass (lane L6, P-BN-36; also P-PR-67, P-LS-35, P-MO-85; TIER 3 API): Berlin BN-019. On an installation
// without accounts or push (the Alpha, and this production build), every Settings load printed two red 503s:
// GET /api/push and GET /api/private-account?action=status. They now answer 200 {configured:false}, and the page says the
// same honest words. The real routes answer here (no /api stub). Desktop 1280, fresh profile. Fails on main, passes on the branch.
test.use({viewport: {width: 1280, height: 900}});

test('BN-019: opening Settings makes no 503 and no console error from the push and account reads', async ({page}) => {
  await freshDevice(page);
  const failed: string[] = [], errors: string[] = [];
  page.on('response', res => { const url = new URL(res.url()); if ((url.pathname === '/api/push' || url.pathname === '/api/private-account') && res.status() >= 500) failed.push(`${res.status()} ${url.pathname}${url.search}`); });
  page.on('console', m => { if (m.type() === 'error' && /api\/(push|private-account)|503/.test(m.text() + (m.location().url ?? ''))) errors.push(m.text()); });
  const status = page.waitForResponse(res => new URL(res.url()).pathname === '/api/private-account' && new URL(res.url()).searchParams.get('action') === 'status');
  const push = page.waitForResponse(res => new URL(res.url()).pathname === '/api/push' && res.request().method() === 'GET');
  await page.goto('/app/settings'); await hydrated(page);
  const [s, p] = await Promise.all([status, push]);
  expect(s.status()).toBe(200);
  expect(await s.json()).toMatchObject({configured: false, signedIn: false});
  expect(p.status()).toBe(200);
  expect(await p.json()).toMatchObject({configured: false});
  await expect(page.getByText('Email access and encrypted sync are not configured on this installation.', {exact: false}).first()).toBeVisible();
  expect(failed).toEqual([]);
  expect(errors).toEqual([]);
});
