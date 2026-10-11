import {expect, test, type Browser, type Page, type TestInfo} from '@playwright/test';
import {navLink} from './phone-nav';

/**
 * Session Y Part 2 (owner edit 1, ADR-018): no page may render one thing on the server and another in the browser when
 * the two are on different calendar days. The Alpha renders in a Worker on UTC; a person in Brussels between midnight
 * and 02:00, or anyone far east or west, is already on another day. Every app page is opened with the browser in a zone
 * on each side of the date line: Kiritimati (UTC+14) and Pago Pago (UTC−11) are always on different days from each
 * other, so at least one of them is on a different day from the server, whatever its zone and time. A third case puts the
 * browser at 00:30 in Brussels on the day after the server's (the clock moved forward, as a phone whose clock is ahead
 * would be). Any React hydration error (#418 and its relatives) or page error fails the test, empty and with the Showcase.
 */
const PAGES = ['/app', '/app/goals', '/app/goals/new', '/app/habits', '/app/health', '/app/health?view=sleep', '/app/health?view=meditation', '/app/health?view=devices',
  '/app/wealth', '/app/portfolio', '/app/markets', '/app/staking', '/app/ecosystem', '/app/activity', '/app/chess', '/app/settings', '/app/help', '/app/welcome', '/app/zigi', '/app/music'];
const HYDRATION = /hydrat|did not match|Minified React error/i;

async function visit(browser: Browser, info: TestInfo, timezoneId: string, showcase: boolean, clockAt?: Date) {
  const context = await browser.newContext({...info.project.use, timezoneId});
  const page = await context.newPage();
  if (clockAt) await page.clock.install({time: clockAt});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const errors: string[] = [];
  page.on('console', message => { if (HYDRATION.test(message.text())) errors.push(`${page.url()}: ${message.text().slice(0, 300)}`); });
  page.on('pageerror', error => errors.push(`${page.url()}: ${error.message.slice(0, 300)}`));
  if (showcase) await loadShowcase(page);
  const day = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', {year: 'numeric', month: '2-digit', day: '2-digit'}).format(new Date()));
  for (const path of PAGES) {
    await page.goto(path);
    await expect(page.locator('main h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle', {timeout: 8_000}).catch(() => undefined);
  }
  // The step where #32's live run once saw #418: Wealth, then Portfolio as a person goes there, through the main
  // navigation (the sidebar on a computer, More on a phone), so the move is the app's own client navigation.
  await page.goto('/app/wealth');
  await expect(page.locator('main h1').first()).toBeVisible();
  const portfolio = await navLink(page, 'Portfolio');
  await expect(portfolio, 'the main navigation offers Portfolio').toBeVisible();
  await portfolio.click(); await page.waitForURL('**/app/portfolio'); await expect(page.locator('main h1').first()).toBeVisible();
  await context.close();
  return {errors, day};
}
async function loadShowcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
}

for (const showcase of [false, true]) {
  test(`${showcase ? 'Showcase' : 'a new device'}: every page hydrates without an error on either side of the date line`, async ({browser}, info) => {
    test.setTimeout(240_000);
    const east = await visit(browser, info, 'Pacific/Kiritimati', showcase), west = await visit(browser, info, 'Pacific/Pago_Pago', showcase);
    expect(east.day, 'the two zones are on different days').not.toBe(west.day);
    expect([...east.errors, ...west.errors]).toEqual([]);
  });
}

test('the browser at 00:30 in Brussels on the day after the server: every page hydrates cleanly', async ({browser}, info) => {
  test.setTimeout(240_000);
  const now = Date.now(), brussels = (at: number) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit'}).format(at);
  // The next 00:30 in Brussels at least a day ahead of the server's own date (summer or winter time alike).
  let at = Date.parse(`${brussels(now + 86_400_000)}T00:30:00+02:00`);
  if (new Intl.DateTimeFormat('en', {timeZone: 'Europe/Brussels', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).format(at) !== '00:30') at += 3_600_000;
  const {errors, day} = await visit(browser, info, 'Europe/Brussels', true, new Date(at));
  expect(day).toBe(brussels(at));
  expect(errors).toEqual([]);
});
