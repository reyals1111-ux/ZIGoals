import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {openAllSettingsGroups} from './settings-open';
import {health, healthRecord, openHealth} from './ap/ap-health-fixtures';

/**
 * Session AV lane 2 (habits pillar; LEDGER #180, Daylio's reminders to log): Settings → Notifications → "Mood
 * check-in" (off by default) with its time and an optional second one, kept on the device; and the notification's link,
 * /app/health?mood=ask, opens the mood question with the focus on its first mood — at 390 and 1440, in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
for (const theme of THEMES) test(`${theme}: the Mood check-in switch, its times, kept on the device`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  await offline(page);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.goto('/app/settings#notifications'); await settle(page); await openAllSettingsGroups(page);
  const card = page.locator('#notifications');
  const mood = card.getByRole('group', {name: 'What to be told about'}).getByRole('switch', {name: /^Mood check-in/});
  await expect(mood).toHaveAttribute('aria-checked', 'false');
  await expect(card.getByLabel('Mood check-in at', {exact: true})).toHaveCount(0);
  await mood.click();
  await expect(mood).toHaveAttribute('aria-checked', 'true');
  await card.getByLabel('Mood check-in at', {exact: true}).fill('09:15');
  await card.getByRole('checkbox', {name: 'A second mood check-in'}).check();
  await card.getByLabel('Second mood check-in at', {exact: true}).fill('21:00');
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:notify:v1') ?? '{}').mood)).toEqual({time: '09:15', second: '21:00'});
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('the notification link opens the mood question, the focus on its first mood', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await openHealth(page, healthRecord(health()), '/app/health?mood=ask');
  const chips = page.locator('.health-mood').first().getByRole('group', {name: 'Mood'});
  await expect(chips).toBeVisible();
  await expect(chips.getByRole('button').first()).toBeFocused();
});
