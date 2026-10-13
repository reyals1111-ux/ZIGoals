import {expect, test, type Page} from '@playwright/test';
import {audit} from './a11y-audit';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/**
 * Session AA-Local Gate B: the accessibility audit (`tests/a11y-audit.ts`: names, labels, ids, aria-hidden focus, nested
 * controls, tabindex, image alt, required aria, radio groups, aria-prohibited-attr) over every surface this session added
 * or changed, on the Showcase with the game layer on, desktop and phone: Habits (sections, cards, routines, the year
 * view), Health (the highlight row, the Planner, Insights, Targets, Measurements and Import views), the Journey page, the
 * reminders plan page and the welcome's focuses step. Every finding names its rule and element; the expectation is none.
 */
const DAY = '2026-09-20';
async function seed(page: Page) {
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, seen: WHATS_NEW_RELEASE}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
}
async function clean(page: Page, label: string) {
  const main = page.locator('main');
  await expect(main).toBeVisible();
  expect(await audit(main), label).toEqual([]);
}
test('Habits: sections, cards, routines and the year view', async ({page}) => {
  await seed(page);
  await page.goto('/app/habits'); await page.getByRole('region', {name: 'Today habits'}).waitFor(); await expect(page.locator('#habits-title')).toHaveCount(1); /* WebKit shows the hero twice for a moment at hydration (the phone and the desktop hero, until the layout is known); the audit waits for the one that stays */ await clean(page, 'Habits');
  await page.goto('/app/habits#year'); await page.getByRole('img', {name: /^Year view/}).first().waitFor({timeout: 15_000}).catch(() => undefined); await clean(page, 'Habits year view');
  await page.goto('/app/habits#routines'); await clean(page, 'Habits routines');
});
test('Health: the highlight row and the Planner, Insights, Targets, Measurements and Import views', async ({page}) => {
  await seed(page);
  await page.goto('/app/health'); await page.getByRole('heading', {name: /Weight trend/}).first().waitFor({timeout: 15_000}).catch(() => undefined); await clean(page, 'Health');
  for (const view of ['planner', 'insights', 'targets', 'measurements', 'import']) { await page.goto(`/app/health#${view}`); await page.waitForTimeout(800); await clean(page, `Health ${view}`); }
});
test('Journey, the reminders plan and the welcome', async ({page}) => {
  await seed(page);
  await page.goto('/app/journey'); await page.getByRole('heading', {name: /Journey|Level/}).first().waitFor({timeout: 15_000}).catch(() => undefined); await clean(page, 'Journey');
  await page.goto('/app/settings/reminders'); await clean(page, 'Reminders');
  await page.evaluate(() => localStorage.removeItem('zigoals:onboarding:v1')); await page.goto('/app/welcome'); await page.waitForTimeout(800); await clean(page, 'Welcome');
});
