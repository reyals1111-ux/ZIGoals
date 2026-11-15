import type {Page} from '@playwright/test';
import {freshDevice, hydrated, offlineApi} from '../ah-helpers';

/**
 * Session AP (owner-approved feature list): shared steps for the ap-*.spec.ts drafts. The clock is set with Playwright
 * (Saturday 14 November 2026, 10:00 in Brussels), every /api request is answered 503, and the device starts empty with
 * the welcome seen; records are fictional and written straight into this device's storage before the page opens.
 */
export const TODAY = '2026-11-14', TOMORROW = '2026-11-15';
export const NOW = new Date('2026-11-14T09:00:00Z'); // 10:00 in Brussels
export const AT = '2026-11-10T09:00:00.000Z';
export type SeedTask = {id: string; title: string; priority?: 'high' | 'normal' | 'low'; level?: number; due?: string; time?: string};
export const tasksRecord = (tasks: SeedTask[]) => ({version: 1, tasks: tasks.map(t => ({priority: 'normal', createdAt: AT, ...t}))});

export async function seeded(page: Page, records: Record<string, unknown>, path: string, now = NOW) {
  await page.clock.install({time: now});
  await offlineApi(page);
  await freshDevice(page);
  await page.evaluate(entries => { for (const [k, v] of Object.entries(entries)) localStorage.setItem(k, JSON.stringify(v)); }, records);
  await page.goto(path);
  await hydrated(page);
}
export const stored = <T,>(page: Page, key: string): Promise<T | null> => page.evaluate(k => { const raw = localStorage.getItem(k); return raw === null ? null : JSON.parse(raw); }, key) as Promise<T | null>;
export const toast = (page: Page) => page.locator('.aa-toast').last();
