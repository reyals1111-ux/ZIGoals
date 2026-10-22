import type {Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, type HabitInput} from '../lib/habits';
import {CHECKLIST_KEY} from '../lib/af-checklist-keys';
import {addCustom, addFavourite} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/**
 * Session AF (L3): fictional records for the Checklist's browser specs — three habits and a path of four dots (a habit, a
 * glass of water, a count habit, a custom item). Nothing personal; written to this browser's storage before the page
 * loads its records.
 */
export const ID = {stretch: 'aaaaaaaa-0000-4000-8000-000000000001', push: 'aaaaaaaa-0000-4000-8000-000000000002', piano: 'aaaaaaaa-0000-4000-8000-000000000003'};
export const TITLE = {stretch: 'Fictional stretch', push: 'Fictional push-ups', piano: 'Fictional piano', custom: 'Fictional sketch ten minutes'};
const CREATED = new Date(Date.now() - 40 * 86_400_000);
const input = (title: string, extra: Partial<HabitInput> = {}): HabitInput => ({title, category: 'Fictional', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}, ...extra});
export function fixtureHabits() {
  let d = emptyHabitData();
  d = createHabit(d, input(TITLE.stretch), CREATED, ID.stretch);
  d = createHabit(d, input(TITLE.push, {measurement: {kind: 'count', unit: 'times'}, target: 20, timeOfDay: 'afternoon'}), CREATED, ID.push);
  d = createHabit(d, input(TITLE.piano, {measurement: {kind: 'duration', unit: 'minutes'}, target: 15, timeOfDay: 'evening'}), CREATED, ID.piano);
  return d;
}
export function fixturePath(options: {piano?: boolean} = {}): Checklist {
  let r = emptyChecklist(), n = 0; const o = (section: string, extra: object = {}) => ({id: `ck_fixture-${++n}`, at: new Date(CREATED.getTime() + n), section, ...extra});
  r = addFavourite(r, {kind: 'habit', habitId: ID.stretch}, o('morning'));
  r = addFavourite(r, {kind: 'health', input: 'water'}, o('morning', {defaultValue: 250, unit: 'ml'}));
  r = addFavourite(r, {kind: 'habit', habitId: ID.push}, o('afternoon'));
  if (options.piano) r = addFavourite(r, {kind: 'habit', habitId: ID.piano}, o('evening'));
  r = addCustom(r, {label: TITLE.custom, colour: 'gold', section: 'evening'}, {id: `ck_fixture-${++n}`, at: new Date(CREATED.getTime() + n)});
  return r;
}
export const settled = (page: Page) => page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
/** Writes the fixture (and anything extra) before the app reads it; the app's own /api routes answer offline. */
export async function seedChecklist(page: Page, {path = fixturePath(), extra = {}}: {path?: Checklist | null; extra?: Record<string, string>} = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  // Session AG Polish (ADR-030 J21): the storage is written on a same-origin page that runs no app code (it was Settings),
  // so no app request is still in flight when the test navigates on. WebKit reports each one cancelled as a page error
  // ("… due to access control checks": the shell's music, push and account status reads, CI on 961f32de and 4322f55c).
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [HABITS_KEY]: JSON.stringify(fixtureHabits()),
    ...(path ? {[CHECKLIST_KEY]: JSON.stringify(path)} : {}),
    ...extra,
  });
  await settled(page);
}
/** A record from this browser's storage, parsed. */
export const stored = <T>(page: Page, key: string) => page.evaluate(k => { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : null; }, key) as Promise<T | null>;
/** Today in the browser's own zone (the app's day when no journal zone is chosen). */
export const browserToday = (page: Page) => page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
