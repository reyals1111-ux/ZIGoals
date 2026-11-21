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
  const findings = await axe(page, bills.locator('.bills-calendar'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
