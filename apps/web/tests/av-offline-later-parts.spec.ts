import {expect, test} from '@playwright/test';

/**
 * Session AV (PK-3, [TIER 3] (PWA), ADR-045; the KL-checklist-offline reproduction): a friend opens only Today while online,
 * then opens the Checklist offline. The Checklist draws its path from parts it loads after its first paint, which used to
 * be kept only once the Checklist had been opened online: offline it showed "This page could not be shown". The worker now
 * keeps those later parts once the page asks it to (public/sw.js warmLazy), and the Checklist opens offline with its path.
 * Fictional data; every /api call answers 503 (then fails offline); nothing leaves 127.0.0.1.
 */
test.use({serviceWorkers: 'allow'});

test('only Today opened online, then the Checklist offline: it opens with its path, no crash', async ({page, context}) => {
  test.setTimeout(120_000);
  await context.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:onboarding:v1')) localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await page.goto('/app');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), {timeout: 20_000}).toBe(true);
  // The page asks once it has settled; the worker records that this version's later parts are kept.
  await expect.poll(() => page.evaluate(async () => {
    for (const key of await caches.keys()) if (key.startsWith('zigoals-lazy-') && await (await caches.open(key)).match('/__zigoals-warm-done')) return true;
    return false;
  }), {timeout: 60_000, intervals: [1000]}).toBe(true);
  const kept = await page.evaluate(async () => { const key = (await caches.keys()).find(k => k.startsWith('zigoals-lazy-'))!; return (await (await caches.open(key)).keys()).length; });
  expect(kept).toBeGreaterThan(1);
  await context.setOffline(true);
  try {
    await page.goto('/app/checklist');
    await expect(page.getByRole('heading', {name: 'This page could not be shown.'})).toHaveCount(0);
    await expect(page.getByText(/planets? today|No planets counted today/).first()).toBeVisible({timeout: 15_000});
    await expect(page.getByText('Loading your path…')).toHaveCount(0);
  } finally { await context.setOffline(false); }
});
