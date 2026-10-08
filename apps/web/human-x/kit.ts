import {expect, test, type Page, type TestInfo} from '@playwright/test';
import {mkdirSync} from 'node:fs';

// Session X Part 14: the journey harness (docs/verification/x-cloud/HUMAN_TEST.md). A journey runs once per data state it
// lists, on the viewports (projects D, T, P) it lists, and ends with the checks every journey shares: no uncaught page
// error, no sideways scroll. Market requests are answered "unavailable" unless a journey asks for them, so pass 2 on the
// live Alpha spends none of the shared CoinGecko budget by accident.
export type View = 'D' | 'T' | 'P';
export type Data = 'E' | 'L' | 'S';
export const LIVE = process.env.HUMAN_LIVE === '1';
export type Journey = {page: Page; view: View; data: Data; info: TestInfo; phone: boolean};
type Options = {views: View[] | 'all'; data: Data[]; live?: boolean; markets?: boolean; sideways?: boolean};
const SCREENS = process.env.HUMAN_SCREENS ?? '/tmp/zigoals-human/screens';

export function journey(id: string, title: string, options: Options, run: (j: Journey) => Promise<void>) {
  const views: View[] = options.views === 'all' ? ['D', 'T', 'P'] : options.views;
  for (const data of options.data) {
    test(`${id} [${data}] ${title}${options.live ? ' @live' : ''}`, async ({page}, info) => {
      const view = info.project.name as View;
      test.skip(!views.includes(view), `${id} runs on ${views.join(', ')}`);
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      if (!options.markets) await page.route('**/api/market-**', route => route.fulfill({status: 503, json: {error: 'journey: market data not requested'}}));
      if (data === 'S') await showcase(page);
      await run({page, view, data, info, phone: view === 'P'});
      if (options.sideways !== false) await noSideways(page);
      expect(errors, `${id}: uncaught page errors`).toEqual([]);
    });
  }
}

/** Settings → Load Showcase Demo, as a person does it. */
export async function showcase(page: Page) {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await ready(page);
}
/** A page is ready when its title is shown and the workspace is no longer busy. */
export async function ready(page: Page) {
  await expect(page.locator('main h1').first()).toBeVisible();
  await expect(page.locator('.workspace')).not.toHaveAttribute('aria-busy', 'true');
}
export async function open(page: Page, path: string) { await page.goto(path); await ready(page); }
export async function noSideways(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), {message: 'no sideways scroll'}).toBeLessThanOrEqual(0);
}
/** A screenshot for the gallery (review/session-x-screens), named by journey, viewport, data state and step. */
export async function snap(j: Journey, id: string, step: string) {
  mkdirSync(SCREENS, {recursive: true});
  await j.page.screenshot({path: `${SCREENS}/${id}-${j.view}-${j.data}-${step}.png`, fullPage: false});
}
/** Reads this device's ZIGoals keys (to prove what a journey wrote, and that Showcase wrote nothing personal). */
export const localKeys = (page: Page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('zigoals:')).sort());
/** The main navigation: the sidebar on computers; on phones the tab bar, the top bar's shortcuts, then More. */
export async function go(j: Journey, name: string) {
  const {page, phone} = j;
  const nav = page.getByRole('navigation', {name: 'Main navigation'});
  if (!phone) { await nav.getByRole('link', {name, exact: true}).click(); await ready(page); return; }
  const direct = nav.getByRole('link', {name, exact: true}), top = page.locator('.phone-topbar').getByRole('link', {name, exact: true});
  if (await direct.count()) await direct.click();
  else if (await top.count()) await top.click();
  else { await nav.getByRole('button', {name: 'More', exact: true}).click(); await page.getByRole('dialog', {name: 'More'}).getByRole('link', {name, exact: true}).click(); }
  await ready(page);
}
