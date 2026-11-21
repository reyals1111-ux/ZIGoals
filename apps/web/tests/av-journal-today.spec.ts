import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV, owner follow-up 1 (F-JOURNAL-TODAY; Day One's Today tab): Today's journal card says in one line how many
 * entries were written today and that "On this day" has a memory, opening the Journal — and shows no journal text on
 * Today. At 390 and 1440, three themes, axe-clean, no sideways scroll at 320. Fictional entries; the API offline.
 */
const entry = (id: string, date: string, text: string) => ({id, date, text, createdAt: `${date}T09:00:00.000Z`, updatedAt: `${date}T09:00:00.000Z`});
for (const theme of THEMES) test(`${theme}: "Written today: 1 entry · On this day: an entry a year ago"`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[JOURNAL_KEY]: {version: 1, entries: [entry('journal_fictional-today-001', '2026-11-14', 'A fictional private thought'), entry('journal_fictional-lastyear-01', '2025-11-14', 'A fictional memory')]}});
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const card = page.locator('.today-journal-card');
  await expect(card.getByRole('heading', {name: 'How was today?'})).toBeVisible();
  const line = card.locator('.today-journal-line');
  await expect(line).toHaveText(/^Written today: 1 entry · On this day: an entry .+ →$/);
  await expect(line.getByRole('link')).toHaveAttribute('href', '/app/journal');
  await expect(card).not.toContainText('A fictional private thought');
  await expect(card).not.toContainText('A fictional memory');
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
