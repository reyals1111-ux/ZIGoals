import {expect, type Page} from '@playwright/test';
import {hydrated} from './journeys/journey-helpers';
import {openSettings} from './settings-open';

/** Session AK Q1 (WIRING_AUDIT): shared steps of the tests/wiring-*.spec.ts files. */
/** Loads the Showcase from Settings, as a person does, and waits for Today. */
export async function loadShowcase(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await openSettings(page); await hydrated(page);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.getByRole('complementary', {name: 'Showcase data'})).toBeVisible();
  await hydrated(page);
}
/** A record of the Showcase in this tab (the Showcase keeps its records in this tab's storage), parsed; null when absent. */
export function showcaseRecord<T = any>(page: Page, key: string): Promise<T | null> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return page.evaluate(k => { const marker = JSON.parse(sessionStorage.getItem('zigoals:showcase:active:v1') ?? 'null') as {generation: string} | null; if (!marker) return null; const raw = sessionStorage.getItem(`zigoals:showcase:v1:${marker.generation}:${k}`); return raw === null ? null : JSON.parse(raw); }, key);
}
/** Opens one of Health's views from its own navigation. */
export const healthView = (page: Page, name: string) => page.getByRole('tablist', {name: 'Health views'}).getByRole('tab', {name, exact: true}).click();
/** A small real PNG (16 × 16, two colours), so the photo is decoded and shrunk on the device like a camera photo. */
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAIAAACQkWg2AAAAGklEQVR4nGM4EaCBFWkEnMCKGEY1jGoYvhoAH8ZAEBWzD74AAAAASUVORK5CYII=', 'base64');
