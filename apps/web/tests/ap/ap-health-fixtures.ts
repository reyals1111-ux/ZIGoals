import type {Page} from '@playwright/test';
import {HEALTH_STORAGE_KEY, createEmptyHealth, healthSchema, logHealthItem, saveFood, type HealthData} from '../../lib/health';
import {addLocalDays} from '../../lib/local-date';
import {freshDevice, hydrated, offlineApi} from '../ah-helpers';

/** Session AP (Health features 1–7): shared steps for the ap-health-* drafts. Fictional records; Saturday 14 Nov 2026. */
export const TODAY = '2026-11-14';
export const AT = '2026-11-01T07:00:00.000Z';
export const back = (i: number) => addLocalDays(TODAY, -i);
export const health = (patch: Partial<HealthData> = {}): HealthData => healthSchema.parse({...createEmptyHealth(), schemaVersion: 4, ...patch});
/** A food library with one food and the given diary entries. */
export function withDiary(entries: {date: string; meal: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks'}[], base = health()): HealthData {
  let h = saveFood(base, {id: 'health_food-ap-oats', name: 'Fictional oats', brand: '', servingGrams: 100, nutrients: {kcal: 380, proteinMg: 1000, carbsMg: 2000, fatMg: 500}, createdAt: AT, updatedAt: AT});
  entries.forEach((e, i) => { h = logHealthItem(h, {id: `health_diary-ap-${String(i).padStart(4, '0')}`, sourceId: 'health_food-ap-oats', sourceKind: 'food', date: e.date, meal: e.meal, quantityMilli: 1000}, AT); });
  return h;
}
/** The clock at 10:00 local on TODAY, a new device holding `records`, then /app/health (or `path`). */
export async function openHealth(page: Page, records: Record<string, unknown>, path = '/app/health') {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00`)});
  await offlineApi(page); await freshDevice(page);
  await page.evaluate(entries => { for (const [k, v] of entries) localStorage.setItem(k, v); }, Object.entries(records).map(([k, v]) => [k, JSON.stringify(v)] as [string, string]));
  await page.goto(path); await hydrated(page);
}
export const healthRecord = (h: HealthData) => ({[HEALTH_STORAGE_KEY]: h});
export const stored = <T,>(page: Page, key: string) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), key) as Promise<T>;
export async function openTab(page: Page, name: string) { await page.getByRole('tab', {name, exact: true}).click(); }
