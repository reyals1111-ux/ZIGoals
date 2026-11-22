import {expect, test} from '@playwright/test';
import {openAllSettingsGroups, openSettings} from './settings-open';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #69 and QUALITY "Not fixed" — Bearable's hide triggering data): the same
 * device switch as Health's, offered in Settings → Data & privacy ("Calories and weight on screen"), and a line in
 * Export everything while it is on (the file stays complete) — at 390 and 1440, in Nebula, Light and Dark, axe-clean,
 * no sideways scroll at 320. Nothing is stored but the switch.
 */
for (const theme of THEMES) test(`${theme}: hide calories and weight from Settings`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openSettings(page);
  await openAllSettingsGroups(page);
  const panel = page.getByRole('region', {name: 'Calories and weight on screen'});
  const toggle = panel.getByRole('button', {name: 'Hide calories and weight'});
  await toggle.click();
  const shown = panel.getByRole('button', {name: 'Show calories and weight'});
  await expect(shown).toHaveAttribute('aria-pressed', 'true');
  await expect(shown).toBeFocused();
  await expect(page.locator('html')).toHaveAttribute('data-hide-figures', 'on');
  expect(await page.evaluate(() => localStorage.getItem('zigoals:hide-body-figures'))).toBe('on');
  await expect(page.getByTestId('export-figures-hidden')).toHaveText('Calorie and weight figures are hidden on screen on this device. This file still holds them, so it stays a complete copy.');
  const findings = await axe(page, panel);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await shown.click();
  await expect(panel.getByRole('button', {name: 'Hide calories and weight'})).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('export-figures-hidden')).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
