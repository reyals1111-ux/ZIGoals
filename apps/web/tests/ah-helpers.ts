import {expect, type Page} from '@playwright/test';
import type {Platform} from '../lib/positions';

/** Session AH: shared steps for this session's specs. */
export const hydrated = (page: Page) => page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 20_000});
/** Loads the Showcase from Settings and waits for Today. */
export async function loadShowcase(page: Page) {
  await page.goto('/app/settings');
  await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toBeVisible();
  await hydrated(page);
}
/** The Showcase's platform record in this tab. */
export function showcaseState(page: Page): Promise<Platform> {
  return page.evaluate(() => { const marker = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1')!); return JSON.parse(sessionStorage.getItem(`zigoals:showcase:v1:${marker.generation}:zigoals:platform:v1`)!); });
}
/** A fresh device: no records, the welcome seen. */
export async function freshDevice(page: Page) {
  await page.goto('/app/settings');
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
}
export const offlineApi = (page: Page) => page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'LOCAL_FIXTURE_ONLY'}}));
