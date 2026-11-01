import {expect, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {MONEY_LOG_KEY, type MoneyEntry} from '../lib/money-log/schema';
import {addLocalDays} from '../lib/local-date';

/**
 * Session AK, lane G1b (BUILD list 2 #6 #7 #9 #10 #11 #17 #18 #19): shared steps. A fixed clock (Sunday 1 November 2026,
 * UTC), the API offline (nothing here needs a server), an empty device that has seen the welcome, and records written
 * straight into this device's storage before the page loads.
 */
export const TODAY = '2026-11-01';
export async function freshDevice(page: Page, records: Record<string, unknown> = {}) {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/manifest.webmanifest');
  const values: Record<string, string> = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})};
  for (const [k, v] of Object.entries(records)) values[k] = JSON.stringify(v);
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
export const entry = (id: string, offset: number, amount: string, category: string, kind: 'expense' | 'income' = 'expense', note?: string, currency = 'EUR'): MoneyEntry => {
  const date = addLocalDays(TODAY, offset);
  return {id, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, source: 'form', ...(note ? {note} : {})};
};
export const moneyLog = (entries: MoneyEntry[]) => ({version: 1, entries, weekStartsOn: 'monday'});
export const readRecord = async <T>(page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null') as T;
export const spending = (page: Page) => page.locator('#spending');
export const moneyTools = (page: Page) => page.getByRole('group', {name: 'Money tools'});
export async function openWealth(page: Page) {
  await page.goto('/app/wealth');
  await expect(spending(page).getByRole('heading', {name: 'Room to spend'})).toBeVisible();
  // Session AK RB (RELEASE_REVIEW_2 R2-8, deliberate): the entry form opens from its "Log spending" button.
  await spending(page).getByRole('button', {name: 'Log spending', exact: true}).click();
  await expect(spending(page).getByRole('button', {name: 'Save', exact: true})).toBeVisible();
}
/** Session AK RB (R2-8): the weekly budget opens from its button ("Set a weekly budget", or "Change …" once set). */
export async function openWeeklyBudget(page: Page) {
  await spending(page).getByRole('button', {name: /^(Set a|Change) weekly budget$/}).click();
  return spending(page).getByRole('form', {name: 'Weekly budget'});
}
/** Session AK RB (R2-8): Budgets by category folds to a row on a phone (its #budgets address opens it) and its form opens
 *  from "+ Set a monthly budget". */
export async function openMonthlyBudget(page: Page) {
  await page.goto('/app/wealth#budgets');
  await page.locator('#budgets').getByRole('button', {name: '+ Set a monthly budget', exact: true}).click();
  return page.getByRole('form', {name: 'Set a monthly budget'});
}
export {MONEY_LOG_KEY};
