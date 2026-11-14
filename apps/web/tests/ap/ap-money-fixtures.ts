import {expect, type Page} from '@playwright/test';
import {isPhone} from '../phone-nav';
import {hydrated, offlineApi} from '../ah-helpers';
import {openDeskFold} from '../ao/folds';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../lib/dashboard-settings';
import {MONEY_LOG_KEY, type MoneyEntry} from '../../lib/money-log/schema';

/**
 * Session AP (Wealth money features, draft specs): a fixed clock (Saturday 14 November 2026, 10:00 UTC), the API offline,
 * an empty device that has seen the welcome, and records written straight into this device's storage before the page loads.
 */
export const TODAY = '2026-11-14';
export async function seedDevice(page: Page, records: Record<string, unknown> = {}) {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await offlineApi(page);
  await page.goto('/manifest.webmanifest');
  const values: Record<string, string> = {[DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})};
  for (const [k, v] of Object.entries(records)) values[k] = JSON.stringify(v);
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
}
let n = 0;
export const entry = (date: string, amount: string, category = 'Groceries', kind: 'expense' | 'income' = 'expense', note?: string, currency = 'EUR', id = `ap-money-${n++}`): MoneyEntry =>
  ({id, kind, amount, currency, category, date, createdAt: `${date}T10:00:00.000Z`, source: 'form', ...(note ? {note} : {})});
export const moneyLog = (entries: MoneyEntry[]) => ({version: 1, entries, weekStartsOn: 'monday'});
export const spending = (page: Page) => page.locator('#spending');
export const readRecord = async <T>(page: Page, key: string) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), key)) ?? 'null') as T;
/** Wealth → Spending, then one view of "Your money over time". */
export async function openInsight(page: Page, view: 'Month by month' | 'Categories over a year' | 'Top payees' | 'Your usual pace' | 'Age of money' | 'Tags') {
  await page.goto('/app/wealth'); await hydrated(page);
  // On a phone the section is one row first (CI 1726, pillar-phone-length): a tap opens it, as a person does.
  const row = spending(page).getByRole('button', {name: 'Your money over time'});
  if (await isPhone(page)) await row.click();
  await expect(spending(page).getByRole('heading', {name: 'Your money over time'})).toBeVisible();
  const button = spending(page).getByRole('group', {name: 'Show'}).getByRole('button', {name: view, exact: true});
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed', 'true');
  return spending(page).locator('.money-insights-panel');
}
/** A Wealth section that folds to a row (Budgets by category, Upcoming bills), opened. */
export async function openWealthSection(page: Page, anchor: 'budgets' | 'bills', label: 'Budgets by category' | 'Upcoming bills') {
  await page.goto(`/app/wealth#${anchor}`); await hydrated(page);
  if (!(await page.locator(`#${anchor}`).isVisible())) await openDeskFold(page, label);
  await expect(page.locator(`#${anchor}`)).toBeVisible();
  return page.locator(`#${anchor}`);
}
export const noSideScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
export {MONEY_LOG_KEY};
