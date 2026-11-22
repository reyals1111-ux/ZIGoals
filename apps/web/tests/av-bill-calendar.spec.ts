import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {openWealthSection, seedDevice, TODAY} from './ap/ap-money-fixtures';
import {BILLS_KEY} from '../lib/bills/schema';
import {showcaseBills} from '../lib/bills/showcase';

/**
 * Session AV, owner follow-up 1 (F-BILL-CALENDAR; Rocket Money, Undebt.it): Wealth → Upcoming bills → "On a calendar":
 * the next 31 days by week, today ringed, the days a bill falls due lit and named — at 390 and 1440, three themes,
 * axe-clean, no sideways scroll at 320. Fictional bills; the API offline.
 */
for (const theme of THEMES) test(`${theme}: the next 31 days, today ringed, due days lit and named`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[BILLS_KEY]: showcaseBills(TODAY)});
  const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
  await bills.getByText('On a calendar', {exact: true}).click();
  const grid = bills.getByRole('table', {name: /^Bills due in the next 31 days/});
  await expect(grid).toBeVisible();
  await expect(grid.locator('td.is-today')).toHaveCount(1);
  await expect(grid.locator('td.is-due').first()).toBeVisible();
  const label = await grid.locator('td.is-due').first().getAttribute('aria-label');
  expect(label).toMatch(/^\w{3}, \w{3} \d{1,2}(, \d{4})?: .+ €?[\d.,]+/);
  await expect(bills.locator('.bills-calendar')).toContainText(/due dates? in the next 31 days/);
  // Session AV (fresh-agent check q2, rank 10): 14 px copy; at 1440 each due day shows its amount; on a phone a dot,
  // and the due days listed under the grid with name and amount.
  for (const sel of ['th', '.bills-calendar-day']) expect(parseFloat(await grid.locator(sel).first().evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  const list = bills.locator('.bills-calendar-list');
  if (isMobile) {
    await expect(grid.locator('td.is-due .bills-calendar-dot').first()).toBeVisible();
    await expect(list.getByRole('listitem').first()).toHaveText(/^\w{3}, \w{3} \d{1,2}(, \d{4})? .+ €[\d.,]+$/);
  } else {
    await expect(grid.locator('td.is-due .bills-calendar-amount').first()).toHaveText(/€[\d.,]+/);
    expect(parseFloat(await grid.locator('td.is-due small').first().evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
    await expect(list).toBeHidden();
  }
  // A month you page with ‹ ›, from this month to a year ahead; focus stays on the button at either end.
  await bills.getByRole('radio', {name: 'By month'}).check(); // the chip's own radio, as a tap on the chip reaches it
  const thisMonth = new Date(`${TODAY}T12:00:00Z`).toLocaleString('en-US', {month: 'short', year: 'numeric', timeZone: 'UTC'});
  await expect(bills.getByRole('table', {name: new RegExp(`^Bills due in ${thisMonth}`)})).toBeVisible();
  const earlier = bills.getByRole('button', {name: /^Earlier month/});
  await earlier.focus(); await page.keyboard.press('Enter');
  await expect(earlier).toBeFocused();
  await expect(bills.getByRole('table', {name: new RegExp(`^Bills due in ${thisMonth}`)})).toBeVisible();
  await bills.getByRole('button', {name: /^Later month/}).click();
  await expect(bills.getByRole('table', {name: new RegExp(`^Bills due in ${thisMonth}`)})).toHaveCount(0);
  await expect(bills.locator('.bills-calendar-grid td.is-due').first()).toBeVisible();
  const findings = await axe(page, bills.locator('.bills-calendar'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
