import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

/**
 * Session AL (owner decision O4, lane L10a): on a computer the sidebar has a compact, foldable "Apps" group below the main
 * pages with NOVA, Tasks, Notes, the Journal and the Agenda (those switched on). The fold is remembered on this device
 * only (`zigoals:apps:v1` `sidebarFolded`); a button with aria-expanded; Up/Down and Tab reach it in order. The main pages
 * keep their order, and Help still ends inside a 900 px window. Journey, Life review, Stories and ZIGi stay out.
 * Closes DV-163, DV-189, DV-245 and PR "Tasks isn't in the nav". Fictional data only; /api answers 503.
 */
test.beforeEach(async ({page, isMobile}) => { test.skip(isMobile, 'The desktop sidebar'); await offlineApi(page); });
const group = (page: Page) => page.getByTestId('sidebar-apps-group');
const APPS = ['NOVA', 'Tasks', 'Notes', 'Journal', 'Agenda'];

test('O4: the Apps group under the main pages, foldable, remembered, keyboard reachable (1440 × 900, Showcase)', async ({page}) => {
  await page.setViewportSize({width: 1440, height: 900});
  await loadShowcase(page);
  await page.goto('/app'); await hydrated(page);
  const nav = page.getByRole('navigation', {name: 'Main navigation'});
  await expect(group(page)).toBeVisible();
  await expect(group(page)).toHaveAttribute('aria-label', 'Apps');
  await expect.poll(() => group(page).getByRole('link').allTextContents()).toEqual(APPS);
  // The main list keeps the main pages, the Checklist, Settings and Help; the apps are not in it twice.
  await expect.poll(() => nav.getByRole('link').allTextContents()).toEqual(['Today', 'Goals', 'Habits', 'Health', 'Wealth', 'Earn', 'Markets', 'Staking', 'Portfolio', 'Ecosystem', 'Chess', 'Activity', 'Checklist', 'Settings', 'Help']);
  for (const out of ['Journey', 'Life review', 'Stories', 'ZIGi']) await expect(group(page).getByRole('link', {name: out, exact: true})).toHaveCount(0);
  // Below the main pages; Help still ends inside the window with room to spare (the protected fit).
  await page.locator('.app-sidebar').evaluate(s => { s.scrollTop = 0; });
  const help = (await nav.getByRole('link', {name: 'Help', exact: true}).boundingBox())!, top = (await group(page).boundingBox())!;
  expect(top.y).toBeGreaterThanOrEqual(help.y + help.height);
  expect(help.y + help.height).toBeLessThanOrEqual(900 - 24);
  for (const name of APPS) expect((await group(page).getByRole('link', {name, exact: true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(await page.locator('.app-sidebar').evaluate(s => s.scrollWidth - s.clientWidth)).toBe(0);
  // A real destination with aria-current.
  await group(page).getByRole('link', {name: 'Tasks', exact: true}).click(); await page.waitForURL('**/app/tasks');
  await expect(group(page).getByRole('link', {name: 'Tasks', exact: true})).toHaveAttribute('aria-current', 'page');
  // The keyboard: Tab from Help reaches the group's button, then its links in order; Up and Down move within it.
  // Session AP (D-028, deliberate; ADR-040): the group is ONE Tab stop (a roving tabindex), so Tab from Help lands on the
  // item used last (Tasks, just chosen) and Home, End, Up and Down reach the button and every link, in the same order.
  const toggle = group(page).getByRole('button', {name: 'Apps'});
  await nav.getByRole('link', {name: 'Help', exact: true}).focus();
  await page.keyboard.press('Tab'); await expect(group(page).getByRole('link', {name: 'Tasks', exact: true})).toBeFocused();
  await page.keyboard.press('Home'); await expect(toggle).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(group(page).getByRole('link', {name: 'NOVA', exact: true})).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(group(page).getByRole('link', {name: 'Tasks', exact: true})).toBeFocused();
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('ArrowUp'); await expect(toggle).toBeFocused();
  // One stop: Tab from inside the group leaves it.
  await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('[data-testid="sidebar-apps-group"]'))).toBe(false);
  await toggle.focus();
  // Fold: aria-expanded, the links leave, the choice stays on this device across a reload.
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(group(page).getByRole('link')).toHaveCount(0);
  await page.reload(); await hydrated(page);
  await expect(group(page).getByRole('button', {name: 'Apps'})).toHaveAttribute('aria-expanded', 'false');
  await group(page).getByRole('button', {name: 'Apps'}).click();
  await expect.poll(() => group(page).getByRole('link').allTextContents()).toEqual(APPS);
});

test('O4: a switched-off app leaves the group; below 901 px the group is not shown (fresh profile)', async ({page}) => {
  await page.setViewportSize({width: 1280, height: 900});
  await openSettings(page);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  await openSettings(page); await hydrated(page);
  await expect.poll(() => group(page).getByRole('link').allTextContents()).toEqual(APPS);
  await page.locator('#your-pages').getByRole('group', {name: 'Apps'}).getByRole('switch', {name: 'Journal'}).uncheck();
  await expect.poll(() => group(page).getByRole('link').allTextContents()).toEqual(['NOVA', 'Tasks', 'Notes', 'Agenda']);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:apps:v1')!))).toEqual({version: 1, hidden: ['journal']});
  await page.setViewportSize({width: 900, height: 900});
  await expect(group(page)).toBeHidden();
  await expect(page.getByTestId('apps-extras-button')).toBeVisible();
});
