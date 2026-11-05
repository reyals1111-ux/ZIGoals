import {expect, test, type Page} from '@playwright/test';
import {createHabit, emptyHabitData, HABITS_KEY, logHabitValue, saveHabitTimezone, type HabitData} from '../../../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {GAME_KEY} from '../../../lib/aa-device-keys';
import {offline} from '../l3-helpers';

/**
 * Session AL fourth pass (lane L3, GROK53_REPLAY_L3_1 "exact steps" 4 and 24): a level reached away from the page that
 * shows it (DV-118, M-140, G-031, T-039) is a quiet card on arrival, never a full-screen block that takes the focus; the
 * Journey path is not a long scroll of levels far ahead (DV-045e). 1280×800, game layer on, Brussels, fictional habits.
 */
test.use({viewport: {width: 1280, height: 800}, locale: 'en-GB', timezoneId: 'Europe/Brussels'});
const TODAY = '2026-10-07', ID = '11111111-1111-4111-8111-111111111111';
function habits(days: number): HabitData {
  let d = saveHabitTimezone(emptyHabitData(), 'Europe/Brussels');
  d = createHabit(d, {title: 'Fictional stretch', category: 'Wellbeing', description: '', notes: '', type: 'build', measurement: {kind: 'boolean'}, schedule: {kind: 'daily'}, target: 1, targetPeriod: 'day', timeOfDay: 'morning', endCondition: {kind: 'none'}}, new Date('2026-09-01T06:00:00Z'), ID);
  for (let i = 0; i < days; i++) { const day = new Date(Date.parse('2026-09-17T12:00:00Z') + i * 86_400_000).toISOString().slice(0, 10); d = logHabitValue(d, ID, day, 1, {mode: 'set'}, new Date(`${day}T07:00:00Z`)); }
  return d;
}
async function seed(page: Page, days: number) {
  await page.clock.install({time: new Date(`${TODAY}T03:30:00.000Z`)});
  await offline(page);
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {[HABITS_KEY]: JSON.stringify(habits(days)), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [GAME_KEY]: JSON.stringify({version: 1, enabled: true, badges: false, levelSeen: 1})});
}

test('DV-118/M-140/G-031: a level reached earlier shows on arrival as a quiet card; the page stays readable and the focus stays put', async ({page}) => {
  await seed(page, 20); // 20 days in a row: 200 XP, level 2, while level 1 was the last seen
  await page.goto('/app/activity');
  const card = page.getByRole('dialog', {name: 'Level 2 · Ember'});
  await expect(card).toBeVisible();
  await expect(card).toHaveAttribute('aria-modal', 'false');
  await expect(page.locator('.celebration-backdrop')).toHaveCount(0);
  await expect(card.getByRole('button', {name: 'Lovely', exact: true})).not.toBeFocused();
  // Nothing covers the page: its heading takes a click.
  await page.locator('main h1').first().click();
  await expect(card.getByText('Every check-in and log you made brought you here.')).toBeVisible();
  await card.getByRole('button', {name: 'Lovely', exact: true}).click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('dialog', {name: 'Level 2 · Ember'})).toHaveCount(0); // celebrated once
});

test('DV-045e: a long Journey has an "On this page" row, and the path shows the levels reached and the next two', async ({page}) => {
  await seed(page, 5); // 50 XP: level 1; the path runs to level 6 (lib/game/badges.ts journeyPath)
  await page.goto('/app/journey');
  const jump = page.getByRole('navigation', {name: 'On this page'});
  await expect(jump.getByRole('link')).toHaveText(['My universe', 'Level', 'Quests', 'Badges', 'Path', 'Freezes', 'Rewards']);
  await jump.getByRole('link', {name: 'Path', exact: true}).click();
  await expect(page.getByRole('heading', {name: 'Milestones'})).toBeInViewport();
  const path = page.locator('#journey-path-list > li');
  await expect(path).toHaveCount(3); // level 1 (you are here), then levels 2 and 3
  const more = page.getByRole('button', {name: 'Show the whole path (6 levels)'});
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await more.click();
  await expect(path).toHaveCount(6);
  await expect(page.getByRole('button', {name: 'Show fewer levels'})).toHaveAttribute('aria-expanded', 'true');
});
