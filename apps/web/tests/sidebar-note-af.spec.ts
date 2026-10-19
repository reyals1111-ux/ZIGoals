import {expect, test} from '@playwright/test';

/**
 * Session AF (L5a, Part 10.7, ADR-028 H31): the sidebar's three theme buttons have no "Saved on this device" line under
 * them any more; the bar is the sidebar's last thing and its reserved slot is exactly the bar's height. The fact itself
 * keeps its homes: Settings → Appearance, Settings → Your data and Help.
 */
test('the sidebar’s theme bar has no line under it; the fact stays in Settings, Your data and Help', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'The sidebar is the computer’s');
  await page.goto('/app');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  const sidebar = page.locator('aside.app-sidebar');
  await expect(sidebar.getByRole('radiogroup', {name: 'Theme'})).toBeVisible();
  await expect(sidebar).not.toContainText('Saved on this device');
  await expect(sidebar.locator('.theme-switch-note')).toHaveCount(0);
  const bar = await sidebar.evaluate(s => { const slot = s.lastElementChild as HTMLElement, wrap = slot.querySelector('.theme-switch-wrap') as HTMLElement, group = slot.querySelector('.theme-switch') as HTMLElement; return {slotIsLast: slot.classList.contains('theme-switch-slot'), slot: slot.getBoundingClientRect().height, wrap: wrap.getBoundingClientRect().bottom - slot.getBoundingClientRect().top, group: group.getBoundingClientRect().bottom, wrapBottom: wrap.getBoundingClientRect().bottom}; });
  expect(bar.slotIsLast).toBe(true);
  expect(Math.abs(bar.group - bar.wrapBottom)).toBeLessThanOrEqual(0.5); // nothing under the three buttons
  expect(Math.abs(bar.slot - bar.wrap)).toBeLessThanOrEqual(0.5); // the reserved slot is the bar's own height
  // The fact's homes.
  await page.goto('/app/settings');
  await expect(page.locator('#appearance')).toContainText('Your choice stays here and is never synced.');
  await page.goto('/app/settings/data');
  await expect(page.locator('main')).toContainText('How pages look on this device');
  await page.goto('/app/help#help-ad-themes');
  await expect(page.locator('#help-ad-themes')).toContainText('it stays here, is never synced');
});
