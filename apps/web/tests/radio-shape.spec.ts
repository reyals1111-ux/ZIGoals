import {expect, test, type Page} from '@playwright/test';

/**
 * Session Y Part 9 (ADR-018 Y32): radios are drawn in the app's style, so a container's input rule (".form-grid input"
 * gives 48 px, ".ai-settings input" padding and a 12 px corner) must never stretch one: every visible radio stays a
 * circle of 20 px (22 px on phones, where a tile's own rule does not pin 20 px), checked or not, on the pages that have
 * them. Both projects.
 */
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
async function radios(page: Page) {
  return page.evaluate(() => [...document.querySelectorAll<HTMLInputElement>('input[type=radio]')].filter(r => r.getClientRects().length && getComputedStyle(r).visibility !== 'hidden' && getComputedStyle(r).opacity !== '0')
    .map(r => { const box = r.getBoundingClientRect(), style = getComputedStyle(r); return {name: r.name, width: Math.round(box.width), height: Math.round(box.height), radius: style.borderTopLeftRadius}; }));
}
test('every visible radio is a circle of 20 to 22 px in the Goal wizard, Settings and Health', async ({page, isMobile}) => {
  await page.goto('/app/goals/new');
  // Session AK X1 (RELEASE_REVIEW R5): a money goal's choice reads "Save an amount" until the chain is chosen (it read "Value").
  await page.getByRole('radio', {name: 'Save an amount', exact: true}).check();
  const seen: {name: string; width: number; height: number; radius: string}[] = [];
  seen.push(...await radios(page));
  for (const path of ['/app/settings', '/app/health']) { await page.goto(path); await expect(page.locator('main h1').first()).toBeVisible(); seen.push(...await radios(page)); }
  expect(seen.map(r => r.name)).toEqual(expect.arrayContaining(['goal-type', 'goal-currency']));
  for (const r of seen) { expect(r.width, r.name).toBe(r.height); expect(r.radius, r.name).toBe('50%'); expect(r.width, r.name).toBeGreaterThanOrEqual(20); expect(r.width, r.name).toBeLessThanOrEqual(isMobile ? 22 : 20); }
  // Session AK X1 (RELEASE_REVIEW R5): a new device offers three kinds of goal (Reward waits until the chain is chosen).
  if (isMobile) expect(seen.filter(r => r.name === 'goal-type').map(r => r.width)).toEqual([22, 22, 22]);
});
