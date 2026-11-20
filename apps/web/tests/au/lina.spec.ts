import {expect, test} from '@playwright/test';
import {at, DAY1, DAY2, freshWeek, openAt, setup, ZONE} from './au-helpers';
import {openZigi, sendToZigi, zigiPanel} from '../zigi-open';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Lina at 1440 in Nebula. In the rehearsal ZIGi answered "Did any bill go
 * up in price?" with the bills due soon (R-6), although her phone bill had gone from €15.00 to €17.50. Now it answers from
 * Bills' own price changes, in the money log's own amounts.
 */
test.skip(({isMobile}) => isMobile, 'the desktop part of Lina\'s week (her phone part is tests/au/webkit-au-lina.spec.ts)');
test.use({timezoneId: ZONE, viewport: {width: 1440, height: 900}, actionTimeout: 15_000});

const entry = (id: string, date: string, amount: string, note: string, category: string) => ({id, kind: 'expense', amount, currency: 'EUR', category, note, date, createdAt: `${date}T10:00:00.000Z`});
const LOG = {version: 1, entries: [
  entry('au-l1', '2026-08-04', '15.00', 'Fictional Phone', 'Bills'), entry('au-l2', '2026-09-04', '15.00', 'Fictional Phone', 'Bills'),
  entry('au-l3', '2026-10-04', '17.50', 'Fictional Phone', 'Bills'), entry('au-l4', '2026-11-04', '17.50', 'Fictional Phone', 'Bills'),
  entry('au-l5', '2026-11-16', '55.10', 'Fictional Grocer', 'Groceries'),
]};

test('Lina at 1440: ZIGi says which bill went up in price, from her own payments', async ({page}) => {
  test.setTimeout(120_000);
  await freshWeek(page, 'nebula', at(DAY1, '08:30'));
  await setup(page, [/^Goals & money/]);
  await page.evaluate(log => localStorage.setItem('zigoals:money-log:v1', JSON.stringify(log)), LOG);
  await openAt(page, at(DAY2, '19:00'), '/app/wealth');
  await openZigi(page);
  await sendToZigi(page, 'Did any bill go up in price?');
  const reply = zigiPanel(page).locator('.ai-turn-local').last();
  await expect(reply).toContainText('Fictional Phone went up from €15.00 to €17.50', {timeout: 20_000});
  await expect(reply).not.toContainText('falls due in the next 30 days');
});
