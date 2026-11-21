import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openWealthSection, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {BILLS_KEY} from '../lib/bills/schema';

/**
 * Session AV, owner follow-up 1 (F-BILLS-MONTH; Copilot's "paid this month", Rocket Money's "until payday"): on 14
 * November, Upcoming bills → "This month" says the rent is in the money log, the gym's date passed without it and the
 * phone is still to come, with the totals; the salary of 25 September and 25 October puts the next payday about 25
 * November, with the phone due before it. At 390 and 1440, three themes, axe-clean, no sideways scroll at 320.
 */
const bill = (id: string, title: string, amount: string, nextDue: string) => ({id, title, amount, currency: 'EUR', cadence: 'monthly', nextDue, origin: 'manual', createdAt: '2026-09-01T10:00:00.000Z'});
for (const theme of THEMES) test(`${theme}: rent seen, gym passed, phone to come; payday about 25 November`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [BILLS_KEY]: {version: 1, bills: [bill('r', 'Fictional rent', '900.00', '2026-10-01'), bill('g', 'Fictional gym', '30.00', '2026-10-10'), bill('p', 'Fictional phone', '20.00', '2026-10-20')], dismissed: []},
    [MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '900.00', 'Housing', 'expense', 'Fictional rent'), entry('2026-09-25', '2500.00', 'Salary', 'income', 'Fictional employer'), entry('2026-10-25', '2500.00', 'Salary', 'income', 'Fictional employer')])});
  const bills = await openWealthSection(page, 'bills', 'Upcoming bills');
  const month = bills.getByRole('region', {name: 'Bills this month'});
  await expect(month.locator('.bills-month-total')).toHaveText('€900.00 seen in your money log (1 bill) · €50.00 still to pay or not seen (2)');
  await expect(month.getByRole('listitem')).toHaveText([/^Fictional rent .*· €900\.00 · in your money log$/, /^Fictional gym .*· €30\.00 · date passed, not in your money log$/, /^Fictional phone .*· €20\.00 · still to come$/]);
  await expect(month.locator('.bills-month-payday')).toHaveText(/^Next payday about \w{3}, Nov 25, from your money log \(Fictional employer\)\. Due before it: €20\.00 \(1 bill\)\.$/);
  const findings = await axe(page, month);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
