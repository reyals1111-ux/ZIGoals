import {expect, test, type Page} from '@playwright/test';
import {hydrated} from '../ah-helpers';
import {seedChecklist} from '../checklist-fixtures';
import {quietPage} from '../quiet-page';
import {DAY_GOAL_KEY} from '../../lib/checklist/day-goal';

/**
 * Session AP (owner decision 14 Nov, backlog #3; ADR-040): "A day counts as done at N" in Settings → Your app → Checklist.
 * Off by default (every dot); a choice applies from the day it is made and never re-counts a past day: the flame on the
 * Checklist page counts each day by the rule in force on that day. Brussels and Tokyo, the clock set with Playwright.
 */
const ZONES = [{zone: 'Europe/Brussels', offset: 1}, {zone: 'Asia/Tokyo', offset: 9}];
const utc = (localIso: string, offset: number) => new Date(Date.parse(`${localIso}Z`) - offset * 3_600_000);
// The 9th and 10th were full; the 11th–13th had four of six lit; today (the 14th) has nothing lit yet.
const DAYS = {version: 1, days: {'2026-11-09': {total: 6, done: 6}, '2026-11-10': {total: 6, done: 6}, '2026-11-11': {total: 6, done: 4}, '2026-11-12': {total: 6, done: 4}, '2026-11-13': {total: 6, done: 4}}};
const flame = (page: Page) => page.locator('.checklist-streak');

async function choose(page: Page, label: string) {
  await page.goto('/app/settings#day-goal'); await hydrated(page);
  const field = page.locator('#day-goal').getByRole('combobox', {name: /^A day counts as done at/});
  await expect(field).toBeVisible();
  await expect(page.locator('#day-goal')).toContainText('It applies from today on: past days keep the rule they had');
  await field.selectOption({label});
  await expect(page.locator('#day-goal').getByRole('status')).not.toBeEmpty();
  await quietPage(page);
}

for (const {zone, offset} of ZONES) test.describe(`in ${zone}`, () => {
  test.use({timezoneId: zone});
  test('off: every dot; at 4 from the 14th the past four-of-six days stay uncounted; at 4 from the 11th they count', async ({page}, info) => {
    test.skip(info.project.name !== 'desktop', 'one project is enough for the clock walk (the setting is the same on a phone)');
    await page.clock.install({time: utc('2026-11-14T10:00:00', offset)});
    await seedChecklist(page, {extra: {'zigoals:checklist-days:v1': JSON.stringify(DAYS)}});
    // Off (the default): the 13th (4 of 6) broke the run, so the flame reads 0.
    await page.goto('/app/checklist'); await hydrated(page);
    await expect(flame(page)).toHaveAttribute('aria-label', /^0-day streak: the days every planet was lit$/);
    expect(await page.evaluate(k => localStorage.getItem(k), DAY_GOAL_KEY)).toBeNull();
    // Chosen on the 14th: the past days keep "every dot" — still 0, nothing re-counted.
    await choose(page, '4 dots');
    expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), DAY_GOAL_KEY))!)).toEqual({version: 1, changes: [{from: '2026-11-14', need: 4}]});
    await page.goto('/app/checklist'); await hydrated(page);
    await expect(flame(page)).toHaveAttribute('aria-label', /^0-day streak: the days that counted as done \(4 planets, or all on a shorter day\)$/);
    // A record whose rule began on the 11th (as if chosen then): the 11th–13th count at 4, and the 9th–10th by every dot.
    await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, changes: [{from: '2026-11-11', need: 4}]})), DAY_GOAL_KEY);
    await page.reload(); await hydrated(page);
    await expect(flame(page)).toHaveAttribute('aria-label', /^5-day streak: /);
    // Back to every dot from today: days from the 11th keep their rule (4), so the flame stays 5.
    await choose(page, 'Every dot (default)');
    expect(JSON.parse((await page.evaluate(k => localStorage.getItem(k), DAY_GOAL_KEY))!)).toEqual({version: 1, changes: [{from: '2026-11-11', need: 4}, {from: '2026-11-14', need: null}]});
    await page.goto('/app/checklist'); await hydrated(page);
    await expect(flame(page)).toHaveAttribute('aria-label', /^5-day streak: the days every planet was lit$/);
  });
});
