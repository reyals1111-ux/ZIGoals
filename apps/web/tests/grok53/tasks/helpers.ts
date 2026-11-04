import type {Page} from '@playwright/test';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {TASKS_KEY, type Tasks} from '../../../lib/tasks/schema';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';

/**
 * Session AL (lane L5, Part 8): a fresh, empty profile (no Showcase) at a fixed instant, the app's /api offline, and the
 * Tasks record written before the page reads it. Fictional data only.
 */
export const DAY = '2026-11-04'; // a Wednesday
export async function freshTasks(page: Page, {at = `${DAY}T09:00:00.000Z`, tasks, extra = {}}: {at?: string; tasks?: Tasks; extra?: Record<string, string>} = {}) {
  await page.clock.install({time: new Date(at)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    ...(tasks ? {[TASKS_KEY]: JSON.stringify(tasks)} : {}),
    ...extra,
  });
}
export const storedTasks = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), TASKS_KEY) as Promise<Tasks | null>;
export const task = (id: string, title: string, extra: Record<string, unknown> = {}) => ({id, title, priority: 'normal', createdAt: `${DAY}T08:00:00.000Z`, ...extra});
export const record = (tasks: object[], extra: object = {}) => ({version: 1, tasks, ...extra}) as unknown as Tasks;
/** The app's one toast. */
export const toast = (page: Page) => page.locator('.aa-toast');
