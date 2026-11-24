import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, openInsight, seedDevice, TODAY} from './ap/ap-money-fixtures';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitCount, type HabitData} from '../lib/habits';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AV lane 2, round 3 (money; PocketGuard's Financial Wellness, LEDGER #296): Wealth → Spending → Your money over
 * time → "Beside your habits": a done habit set beside what was spent that day or the next, under Compare's own rules
 * (the counts first, a finding only with 14 days a side, one thing that could explain it, never a cause), with no
 * Health records needed — at 390 and 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional
 * records; the clock is Saturday 14 November 2026.
 */
const HABIT = '92000000-0000-4000-8000-000000000801', start = addLocalDays(TODAY, -40);
function records() {
  let habits: HabitData = createHabit(emptyHabitData(), {title: 'Walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, target: 1}, new Date(`${addLocalDays(start, -1)}T08:00:00Z`), HABIT);
  const entries = [];
  for (let i = 0; i < 40; i++) {
    const day = addLocalDays(start, i), even = i % 2 === 0;
    if (even) habits = logHabitCount(habits, HABIT, day, 1, '', new Date(`${day}T20:00:00Z`));
    entries.push(entry(day, even ? '10.00' : '30.00', even ? 'Groceries' : 'Fun', 'expense', undefined, 'EUR', `av2r3-beside-${i}`));
  }
  return {[HABITS_KEY]: habits, [MONEY_LOG_KEY]: moneyLog(entries)};
}
for (const theme of THEMES) test(`${theme}: spending beside a done habit`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, records());
  const panel = await openInsight(page, 'Beside your habits');
  await expect(panel.getByRole('heading', {name: 'Beside your habits'})).toBeVisible();
  await expect(panel.getByLabel('On days with…')).toHaveValue(`habit:${HABIT}`);
  await expect(panel.getByLabel('…what was')).toHaveValue('spend:EUR');
  const card = panel.locator('.compare-card');
  await expect(card.locator('.compare-counts')).toHaveText('20 days with · 20 without');
  await expect(card.locator('.compare-sentence')).toHaveText('On days you completed “Walk”, you spent €10.00 that day on average; on other days, €30.00.');
  await expect(card.locator('.compare-confounder')).toContainText('Something else could explain it');
  // One category, and the next day.
  await panel.getByLabel('…what was').selectOption('spend:EUR:Fun');
  await expect(card).toContainText('With: €0.00 · Without: €30.00');
  await panel.getByRole('button', {name: 'The next day'}).click();
  await expect(panel.getByRole('button', {name: 'The next day'})).toHaveAttribute('aria-pressed', 'true');
  await expect(card).toContainText('With: €30.00 · Without: €0.00');
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
