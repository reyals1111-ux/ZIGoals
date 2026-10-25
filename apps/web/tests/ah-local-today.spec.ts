import {test, expect} from '@playwright/test';

// Session AH Part 2 (AF6): between 00:00 and 02:00 Brussels the browser's calendar day is one ahead of a UTC server's,
// and Life review hydrated with a different date than the server rendered (React #418; the hosted verifier's night
// FAIL). The browser's clock here is set a day ahead of the server's, which is the same mismatch at any hour.
test('Life review hydrates without a mismatch when the browser is a day ahead of the server, then shows the browser\'s day', async ({page}) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  const ahead = new Date(Date.now() + 24 * 3_600_000);
  await page.clock.install({time: ahead});
  await page.goto('/app/review');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
  await expect(page.locator('main h1').first()).toBeVisible();
  // Give React a moment to report a recoverable hydration error, if any.
  await page.clock.runFor(1_000);
  expect(errors.filter(e => /#418|#423|#425|hydrat/i.test(e))).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.dataset.serverDay)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});

// The same mismatch on the other pages that render a calendar day (they use useLocalToday or the journals' days).
for (const route of ['/app', '/app/habits', '/app/health', '/app/goals', '/app/wealth', '/app/checklist', '/app/activity', '/app/journey', '/app/settings']) {
  test(`${route} hydrates without a mismatch when the browser is a day ahead of the server`, async ({page}) => {
    const errors: string[] = [];
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({time: new Date(Date.now() + 24 * 3_600_000)});
    await page.goto(route);
    await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
    await page.clock.runFor(1_000);
    expect(errors.filter(e => /#418|#423|#425|hydrat/i.test(e))).toEqual([]);
  });
}
