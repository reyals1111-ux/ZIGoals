import {expect, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY, healthSchema, type HealthData} from '../../../lib/health';
import {hydrated} from '../../ah-helpers';

/**
 * Session AL lane L2 (Health): a fresh, empty profile that has been through Today's first-run choice (Health shown),
 * every server request answered offline, and optionally a Health record seeded as the person would have typed it.
 */
export async function freshHealth(page: Page, health?: HealthData) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  const records: Record<string, string> = {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true})};
  if (health) records[HEALTH_STORAGE_KEY] = JSON.stringify(healthSchema.parse(health));
  await page.evaluate(entries => { localStorage.clear(); sessionStorage.clear(); for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value); }, records);
}
export const storedHealth = (page: Page) => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), HEALTH_STORAGE_KEY) as Promise<HealthData | null>;
export async function openHealth(page: Page, query = '') {
  await page.goto(`/app/health${query}`); await hydrated(page);
  await expect(page.locator('main h1').first()).toBeVisible();
}
export const healthView = (page: Page, name: string) => page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name, exact: true});
