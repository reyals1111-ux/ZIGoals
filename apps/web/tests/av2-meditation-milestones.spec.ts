import {expect, test} from '@playwright/test';
import {TODAY, back, health, healthRecord, openHealth} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #186, Insight Timer's milestones): Health → Meditation → Your practice lists
 * the calm milestones in days — seven days in a row reached, 50 and 100 days still on the way — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional sessions.
 */
const sessions = Array.from({length: 8}, (_, i) => { const day = back(i + 1); return {id: `health_med-av2-${String(i).padStart(4, '0')}`, startedAt: `${day}T08:00:00.000Z`, seconds: 600, kind: 'timer', timeZone: 'UTC', source: 'timer', createdAt: `${day}T08:10:00.000Z`, updatedAt: `${day}T08:10:00.000Z`}; });
for (const theme of THEMES) test(`${theme}: meditation milestones in days`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health({meditation: {version: 1, sessions}} as never)), '/app/health?view=meditation');
  const list = page.getByRole('list', {name: 'Milestones'});
  await expect(list.getByRole('listitem')).toHaveCount(3);
  await expect(list.getByRole('listitem').nth(0)).toHaveText(/Seven days in a row · reached$/);
  await expect(list.getByRole('listitem').nth(1)).toHaveText(/Fifty days · 8 of 50 days$/);
  await expect(page.locator('.meditation-milestones')).not.toContainText(/minutes|score/);
  const findings = await axe(page, page.locator('.meditation-milestones'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
  expect(TODAY).toBe('2026-11-14');
});
