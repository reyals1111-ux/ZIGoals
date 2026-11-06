import {expect, type Page} from '@playwright/test';

/**
 * Session AL lane L3 (Habits, Today, Journey, first run): shared steps for the grok53 reproduction specs. Each spec runs in
 * a fresh, empty profile (a new browser context) at the bot's width and theme, with every /api request answered 503 and
 * every local-model port refused, so nothing leaves the browser. Fictional data only.
 */
export const hydrated = (page: Page) => page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
export async function offline(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
  await page.route(/127\.0\.0\.1:(11434|1234|9931|8642)|localhost:(11434|1234|9931|8642)/, route => route.abort('connectionrefused'));
}
/** An empty device. `welcomeSeen` marks the first-run welcome as answered ("Not now"), as a returning visit has it. */
export async function emptyDevice(page: Page, {theme, welcomeSeen = true}: {theme?: 'light' | 'dark' | 'nebula'; welcomeSeen?: boolean} = {}) {
  await offline(page);
  await page.goto('/app/settings');
  await page.evaluate(({theme, welcomeSeen}) => {
    localStorage.clear(); sessionStorage.clear();
    if (welcomeSeen) localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true}));
    if (theme) localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme}));
  }, {theme, welcomeSeen});
}
export async function open(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
  await expect(page.locator('main h1').first()).toBeAttached();
}
/** The app's one toast (components/ui/undo-toast.tsx). */
export const toast = (page: Page) => page.locator('.aa-toast').last();
/** Logs water on Health's own form ("Water entry"), in mL. */
export async function logWaterOnHealth(page: Page, ml: number) {
  await open(page, '/app/health');
  const form = page.getByRole('form', {name: 'Water entry'});
  await form.getByLabel('Water amount', {exact: true}).fill(String(ml));
  await form.getByRole('button', {name: 'Log water'}).click();
  await expect(page.getByText('Water recorded.').first()).toBeVisible();
}
/** Creates a habit from the Habits page's "+ New habit" form with just a title (a daily yes/no habit). */
export async function createHabit(page: Page, title: string) {
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
  return page.getByRole('article', {name: title, exact: true});
}
