import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, openInsight, seedDevice} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';

/**
 * Session AV, owner follow-up 1 (F-INCOME-FLOW; Monarch's Sankey): Wealth → Spending → "Where income went": this month's
 * income, each category by size and what is left, drawn and as a table — at 390 and 1440, three themes, axe-clean, no
 * sideways page scroll at 320. Fictional records; the API offline.
 */
for (const theme of THEMES) test(`${theme}: €2,000 in, €1,100 out, €900 left`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '2000.00', 'Salary', 'income'), entry('2026-11-02', '800.00', 'Home'), entry('2026-11-03', '250.00'), entry('2026-11-04', '50.00', 'Fun'), entry('2026-10-04', '70.00', 'Fun')])});
  const panel = await openInsight(page, 'Where income went');
  await expect(panel).toContainText('€2,000.00 came in (Salary €2,000.00); €1,100.00 went out. €900.00 is left, as your log shows it.');
  const rows = panel.getByRole('table').locator('tbody tr');
  await expect(rows).toHaveText([/^Home\s*€800\.00\s*40%$/, /^Groceries\s*€250\.00\s*13%$/, /^Fun\s*€50\.00\s*3%$/, /^Left\s*€900\.00\s*45%$/]);
  await expect(panel.locator('svg.money-flow path')).toHaveCount(4);
  // Session AV (fresh-agent check q2, rank 14; Monarch): every node is named with its amount (14 px), each income source
  // on the left, and a share that rounds to nothing reads "<1%".
  await expect(panel.locator('.money-flow-labels.is-right li')).toHaveText([/^Home\s*40%\s*€800\.00$/, /^Groceries\s*13%\s*€250\.00$/, /^Fun\s*3%\s*€50\.00$/, /^Left\s*45%\s*€900\.00$/]);
  await expect(panel.locator('.money-flow-labels.is-left li')).toHaveText([/^Salary\s*€2,000\.00$/]);
  expect(parseFloat(await panel.locator('.money-flow-labels li').first().evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(14);
  const tops = await panel.locator('.money-flow-labels.is-right li').evaluateAll(list => list.map(li => li.getBoundingClientRect()));
  for (let i = 1; i < tops.length; i++) expect(tops[i]!.top).toBeGreaterThanOrEqual(tops[i - 1]!.bottom - 1); // labels never overlap
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

// Session AV (fresh-agent check q2, rank 14): two income sources are two nodes; €9.99 of €2,500 is "<1%", never "0%".
test('two sources on the left; a tiny share reads <1%', async ({page}) => {
  await seedDevice(page, {[MONEY_LOG_KEY]: moneyLog([entry('2026-11-01', '2400.00', 'Salary', 'income'), entry('2026-11-02', '100.00', 'Freelance', 'income'), entry('2026-11-03', '9.99', 'Subscriptions'), entry('2026-11-04', '500.00', 'Home')])});
  const panel = await openInsight(page, 'Where income went');
  await expect(panel.locator('.money-flow-labels.is-left li')).toHaveText([/^Salary\s*€2,400\.00$/, /^Freelance\s*€100\.00$/]);
  await expect(panel.locator('svg.money-flow rect.money-flow-source')).toHaveCount(2);
  await expect(panel.getByRole('table').locator('tbody tr').filter({hasText: 'Subscriptions'})).toHaveText(/^Subscriptions\s*€9\.99\s*<1%$/);
});
