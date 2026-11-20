import {expect, type Page} from '@playwright/test';
import {at, chooseTheme, hydrated, offlineApis, type JourneyTheme} from '../journeys/journey-helpers';
import {typeGoalName} from '../goal-name';

/**
 * Session AU (ADR-044, the friends dress rehearsal): the steps the persona specs share. Each persona is a fresh profile on
 * a simulated first week (Mon 23 Nov → Tue 24 Nov → Sun 29 Nov 2026, Europe/Amsterdam), on the phone (the `mobile`
 * project; its webkit-au-* files also run in CI's WebKit job) and at 1440 on the desktop project, in Nebula or the
 * persona's second theme. Fictional records; every /api call answers 503 unless the spec routes it.
 */
export const ZONE = 'Europe/Amsterdam';
export const DAY1 = '2026-11-23', DAY2 = '2026-11-24', DAY7 = '2026-11-29';
export {at, hydrated};
export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1440) < 901;

/** A brand-new device at `when`, in `theme`. */
export async function freshWeek(page: Page, theme: JourneyTheme, when: Date) {
  await chooseTheme(page.context(), theme);
  await page.clock.install({time: when});
  await offlineApis(page);
}
/** Today's welcome → the setup, picking `areas` (the area tiles' names) and, when given, a starter goal; then Finish. */
export async function setup(page: Page, areas: RegExp[], goal?: {kind: string; name: string; amount: string}) {
  await page.goto('/app'); await hydrated(page);
  await page.getByRole('region', {name: 'Set up your first goal and habit in about a minute.'}).getByRole('link', {name: 'Start setup', exact: true}).click();
  await page.waitForURL('**/app/welcome');
  const flow = page.locator('main');
  const step = (title: string) => expect(flow.getByRole('heading', {level: 1, name: title})).toBeFocused();
  await flow.getByRole('button', {name: 'Let’s begin', exact: true}).click();
  await step('What do you want to improve?');
  for (const area of areas) await flow.getByRole('checkbox', {name: area}).check();
  await flow.getByRole('button', {name: 'Continue', exact: true}).click();
  await step('Two or three things to focus on.');
  await flow.getByRole('button', {name: 'Skip this step', exact: true}).click();
  await step('A few things to start with.');
  if (goal) {
    await flow.getByRole('radio', {name: goal.kind, exact: true}).check();
    await typeGoalName(flow, goal.name);
    await flow.getByLabel('Target amount').fill(goal.amount);
    await flow.getByRole('radio', {name: 'EUR', exact: true}).check();
  }
  for (let i = 0; i < 6; i++) {
    const finish = flow.getByRole('button', {name: 'Finish setup', exact: true});
    if (await finish.isVisible()) { await finish.click(); break; }
    await flow.getByRole('button', {name: /^(Continue|Skip the tour|Skip this step)$/}).first().click();
  }
  await page.waitForURL(/\/app$/); await hydrated(page);
}
export const firstFive = (page: Page) => page.getByRole('region', {name: 'Five small steps, about two minutes.'});
/** Moves the simulated clock and opens `path` as a person opening the app then. */
export async function openAt(page: Page, when: Date, path = '/app') {
  await page.clock.setSystemTime(when);
  await page.goto(path); await hydrated(page);
}
