import {expect, test} from '@playwright/test';
import {createHabit, emptyHabitData, logHabitValue, HABITS_KEY} from '../lib/habits';
import {JOURNAL_KEY} from '../lib/journal/schema';
import {MONEY_LOG_KEY} from '../lib/money-log/schema';
import {hydrated} from './ah-helpers';
import {axe, THEMES, applyTheme, offline} from './p6-helpers';

/**
 * Session AV, owner follow-up 1 (F-JOURNAL-DAY; Day One's metadata): under a journal entry, "That day" opens that day's
 * own records as links — the walk checked in, the money spent — never copied into the entry, the journal itself left
 * out. At 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; every /api 503.
 */
test.use({timezoneId: 'Europe/Amsterdam'});
const START = new Date('2026-11-01T08:00:00+01:00'), NOW = new Date('2026-11-23T20:00:00+01:00'), ID = 'aaaaaaaa-0000-4000-8000-000000000001';
for (const theme of THEMES) test(`${theme}: the walk and the money of the day an entry was written`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOW});
  let habits = createHabit(emptyHabitData(), {title: 'Fictional walk', category: 'Health', description: '', notes: '', schedule: {kind: 'daily'}, measurement: {kind: 'boolean'}, target: 1}, START, ID);
  habits = logHabitValue(habits, ID, '2026-11-20', 1, {}, NOW);
  const journal = {version: 1, entries: [{id: 'journal_fictional-0001', date: '2026-11-20', text: 'A fictional quiet Friday.', createdAt: '2026-11-20T20:00:00.000Z'}]};
  const money = {version: 1, weekStartsOn: 'monday', entries: [{id: 'money_fictional-0001', kind: 'expense', amount: '23.40', currency: 'EUR', category: 'Groceries', date: '2026-11-20', createdAt: '2026-11-20T11:00:00.000Z'}]};
  await page.goto('/app/settings'); await hydrated(page);
  await page.evaluate(([h, hv, j, jv, m, mv]) => { localStorage.setItem(h, hv); localStorage.setItem(j, jv); localStorage.setItem(m, mv); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); }, [HABITS_KEY, JSON.stringify(habits), JOURNAL_KEY, JSON.stringify(journal), MONEY_LOG_KEY, JSON.stringify(money)] as const);
  await page.goto('/app/journal'); await hydrated(page);
  const row = page.locator('ol.journal-entries > li').filter({hasText: 'A fictional quiet Friday.'});
  await row.locator('summary', {hasText: 'That day'}).click();
  const strip = row.locator('.note-this-day');
  await expect(strip.getByRole('link').filter({hasText: 'Fictional walk'})).toBeVisible();
  await expect(strip.getByRole('link', {name: 'Money log 1 spending entry · Money'})).toHaveAttribute('href', '/app/wealth#spending');
  await expect(strip).not.toContainText('A fictional quiet Friday.');
  const findings = await axe(page, row);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
