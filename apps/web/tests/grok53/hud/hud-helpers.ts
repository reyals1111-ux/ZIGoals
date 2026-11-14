import {expect, type Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema} from '../../../lib/health';
import {dailyData, saveHealthPreferences} from '../../../lib/health-daily';
import {NOVA_HUD_KEY, presetWidgets, type HudPreset} from '../../../lib/nova/layout';
import {hydrated} from '../../ah-helpers';

/**
 * Session AL Part 11 (lane L8): NOVA's holographic HUD on a fresh, empty profile (Health and Habits shown on Today's
 * first-run choice, every server request answered offline), with NOVA's opening seen and, where a spec asks, a preset's
 * widgets, a water target of 2,000 mL, a motion choice or a theme. Fictional records only.
 */
export const NOVA_KEY = 'zigoals:nova:v1';
export const NOON = new Date('2026-11-04T11:00:10.000Z');
export type NovaSeed = {preset?: HudPreset; widgets?: {id: string; size: 'S' | 'M' | 'L'}[]; layout?: string; waterTarget?: boolean; motion?: 'off' | 'calm'; theme?: 'light' | 'dark'; look?: 'holo' | 'classic'};
export function seedRecords({preset, widgets, layout, waterTarget, motion, theme, look}: NovaSeed = {}): Record<string, string> {
  const list = widgets ? widgets.map((w, slot) => ({...w, slot})) : preset ? presetWidgets(preset) : undefined;
  const records: Record<string, string> = {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}),
    [NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true, ...(list ? {widgets: list} : {}), ...(layout ? {layout} : {})}),
  };
  if (waterTarget) { const h = createEmptyHealth(); records[HEALTH_STORAGE_KEY] = JSON.stringify(healthSchema.parse(saveHealthPreferences(h, {...dailyData(h).preferences, waterTargetMl: 2000}))); }
  if (motion) records['zigoals:motion:v1'] = motion;
  if (theme) records['zigoals:ui-prefs:v1'] = JSON.stringify({version: 1, theme});
  if (look) records[NOVA_HUD_KEY] = JSON.stringify({version: 1, look});
  return records;
}
export async function freshNova(page: Page, seed: NovaSeed = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(entries => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, v); }, seedRecords(seed));
  await openNova(page);
}
export async function openNova(page: Page) {
  await page.goto('/app/nova'); await hydrated(page);
  await expect(page.locator('.nova-frame[data-look]')).toBeVisible();
}
export const frame = (page: Page) => page.locator('.nova-frame');
export const panel = (page: Page, name: string) => page.getByRole('article', {name, exact: true});
/** Animations running inside NOVA (paused and finished ones do not count). */
export const runningInNova = (page: Page) => page.evaluate(() => document.getAnimations().filter(a => {
  const target = (a.effect as KeyframeEffect | null)?.target;
  return a.playState === 'running' && target instanceof Element && !!target.closest('.nova-root');
}).map(a => `${(a as CSSAnimation).animationName ?? 'animation'} on ${((a.effect as KeyframeEffect).target as Element).className}`));
/** Frames NOVA's sky canvas drew (it carries the HUD's motes): unchanged while nothing moves. */
export const skyFrames = (page: Page) => page.evaluate(() => (window as Window & {__zgHudFrames?: number}).__zgHudFrames ?? 0);
export const storedJson = (page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key);
