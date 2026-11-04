import type {Page} from '@playwright/test';
import {emptyPlatform, PLATFORM_KEY, privateGoalSchema, type GoalLifecycle, type Platform, type PrivateGoal} from '../../../lib/positions';
import {freshDevice, hydrated, offlineApi} from '../../ah-helpers';

/** Session AL (lane L4): goals for the Grok #53 Goals specs, written into a fresh device's store. */
export const AT = '2026-11-04T09:00:00.000Z';
export function goal(id: string, extra: Partial<PrivateGoal> & Record<string, unknown> = {}): PrivateGoal {
  return privateGoalSchema.parse({id, name: `Fictional goal ${id}`, type: 'VALUE', status: 'active', asset: 'USD', denom: 'USD', decimals: 2, target: '50000', notes: '', createdAt: AT, milestones: [], ...extra});
}
export const books = (id = '71', extra: Record<string, unknown> = {}) => goal(id, {name: 'Read 20 books', type: 'QUANTITY', asset: 'BOOKS', denom: 'manual:BOOKS', decimals: 18, target: (20n * 10n ** 18n).toString(), ...extra});
export const project = (id = '72', steps = ['Plan', 'Build', 'Ship', 'Celebrate'], done = 0, extra: Record<string, unknown> = {}) => goal(id, {name: 'Fictional read project', type: 'PROJECT', decimals: 0, target: '1', milestones: steps.map((title, i) => ({id: String(i + 1), title, done: i < done})), ...extra});
export const life = (kind: GoalLifecycle['kind'], cycle: number, at: string): GoalLifecycle => ({id: `life-${kind}-${cycle}-${at}`, kind, cycle, at, target: '1', asset: 'USD', decimals: 0});

/** A fresh device with these goals (and nothing else), the API offline, then `path` opened and hydrated. */
export async function seedGoals(page: Page, goals: PrivateGoal[], path: string, more: Partial<Platform> = {}) {
  await offlineApi(page);
  await freshDevice(page);
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [PLATFORM_KEY, JSON.stringify({...emptyPlatform(), ...more, goals})]);
  await page.goto(path);
  await hydrated(page);
}
export const stored = (page: Page): Promise<Platform> => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), PLATFORM_KEY);
/** Opens a goal page's folded module by its id. */
export async function openModule(page: Page, id: string) {
  const panel = page.locator(`#${id}`);
  if (!await panel.evaluate(el => el instanceof HTMLDetailsElement ? el.open : true)) await panel.locator('summary').first().click();
  return panel;
}
