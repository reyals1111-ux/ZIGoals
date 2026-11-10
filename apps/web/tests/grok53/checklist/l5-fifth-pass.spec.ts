import {expect, test, type Page} from '@playwright/test';
import {ID, TITLE, fixtureHabits, fixturePath, stored} from '../../checklist-fixtures';
import {CHECKLIST_DAYS_KEY, CHECKLIST_KEY} from '../../../lib/af-checklist-keys';
import {HABITS_KEY, type HabitData} from '../../../lib/habits';
import {UI_PREFS_KEY} from '../../../lib/ab-design-keys';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../../../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../../../lib/whats-new';
import {orderedItems, sectionOfItem} from '../../../lib/checklist/store';
import type {Checklist, ChecklistDays} from '../../../lib/checklist/schema';

/**
 * Session AL fifth pass (lane L5), Checklist rows in the bots' conditions (Brussels time, en-GB, the live /api; the path
 * is written before the page loads and everything after is done through the screens):
 * - LS-032 / C-LS-35: a square of the last 7 days in the history (or its day button) opens that day's own items; a habit
 *   and an own item are filled in, with Undo; older squares do not open.
 * - LS-H23: a List row is dragged by its name with the mouse, onto a row of another orbit; Move up / down stay.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB'});
test.skip(({isMobile}) => isMobile, 'A computer: the history stands open beside the path, and a mouse drags.');
const AT = new Date('2026-11-04T09:30:00+01:00');
async function open(page: Page, {list = false}: {list?: boolean} = {}) {
  await page.setViewportSize({width: 1280, height: 900});
  await page.clock.install({time: AT});
  await page.goto('/robots.txt');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}),
    [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]}),
    [HABITS_KEY]: JSON.stringify(fixtureHabits()),
    [CHECKLIST_KEY]: JSON.stringify(fixturePath()),
    ...(list ? {[UI_PREFS_KEY]: JSON.stringify({version: 1, checklist: {view: 'list'}})} : {}),
  });
  await page.goto('/app/checklist');
  await page.locator('html[data-app-hydrated]').waitFor({state: 'attached'});
}
const toast = (page: Page) => page.locator('.aa-toast');

test('LS-032 / C-LS-35: a past square opens that day; a habit and an own item are filled in, with Undo; an older square stays a picture', async ({page}) => {
  await open(page);
  const history = page.locator('.checklist-history');
  await expect(history.locator('.checklist-heat-cell[data-date="2026-11-03"]')).toHaveAttribute('data-fill', '');
  // Today is ticked on the path itself; a day older than 7 days stays as it was sealed.
  await expect(history.locator('.checklist-heat-cell[data-date="2026-11-04"]')).not.toHaveAttribute('data-fill', '');
  await expect(history.locator('.checklist-heat-cell[data-date="2026-10-27"]')).not.toHaveAttribute('data-fill', '');
  await expect(history.getByRole('group', {name: 'Fill in a missed day'}).getByRole('button')).toHaveCount(7);
  await page.waitForTimeout(500); // the day's record is sealed on arrival; read it after that
  // A tap on Monday's square.
  await history.locator('.checklist-heat-cell[data-date="2026-11-02"]').click();
  // (The long date in the browser's own words: "Monday, 2 November 2026" in en-GB.)
  const day = page.getByRole('region', {name: /^Monday,? 2 November 2026$/});
  await expect(day).toBeVisible();
  const when = (await day.getByRole('heading').textContent())!;
  await expect(day.getByRole('heading', {name: when, exact: true})).toBeFocused();
  await expect(day).toContainText('The last 7 days can be filled in');
  await day.getByRole('button', {name: `${TITLE.stretch}: done on ${when}`}).click();
  await expect(toast(page)).toContainText(`${TITLE.stretch}: done on ${when}, on Habits.`);
  await expect.poll(async () => (await stored<HabitData>(page, HABITS_KEY))!.habits.find(h => h.id === ID.stretch)!.entries.find(e => e.date === '2026-11-02')?.count ?? 0).toBe(1);
  await expect(day.locator('li', {hasText: TITLE.stretch})).toHaveAttribute('data-state', 'done');
  await toast(page).getByRole('button', {name: /^Undo/}).first().click();
  await expect.poll(async () => (await stored<HabitData>(page, HABITS_KEY))!.habits.find(h => h.id === ID.stretch)!.entries.find(e => e.date === '2026-11-02')?.count ?? 0).toBe(0);
  await expect(day.locator('li', {hasText: TITLE.stretch})).toHaveAttribute('data-state', 'open');
  // An own item adds one to that day's count, once.
  const before = (await stored<ChecklistDays>(page, CHECKLIST_DAYS_KEY))?.days?.['2026-11-02']?.done ?? 0;
  await day.getByRole('button', {name: `${TITLE.custom}: done on ${when}`}).click();
  await expect(toast(page)).toContainText(`${TITLE.custom}: done on ${when}, counted in that day’s orbits.`);
  await expect.poll(async () => (await stored<ChecklistDays>(page, CHECKLIST_DAYS_KEY))!.days['2026-11-02']?.done).toBe(before + 1);
  await expect(day.locator('li', {hasText: TITLE.custom})).toHaveAttribute('data-state', 'done');
  // The keyboard way: the day buttons under the legend.
  await history.getByRole('group', {name: 'Fill in a missed day'}).getByRole('button', {name: /^Fill in Tue,? 3 Nov 2026$/}).click();
  const tuesday = page.getByRole('region', {name: /^Tuesday,? 3 November 2026$/});
  await expect(tuesday).toBeVisible();
  await tuesday.getByRole('button', {name: 'Close'}).click();
  await expect(tuesday).toHaveCount(0);
});

test('LS-H23: a List row is dragged by its name with the mouse onto a row of another orbit; it lands before it, in that orbit', async ({page}) => {
  await open(page, {list: true});
  const stretch = page.locator('li.checklist-row', {hasText: TITLE.stretch}).locator('.checklist-row-tab');
  const push = page.locator('li.checklist-row', {hasText: TITLE.push});
  await expect(stretch).toBeVisible();
  await expect(push).toBeVisible();
  const from = (await stretch.boundingBox())!, to = (await push.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 20, {steps: 4});
  await page.mouse.move(to.x + to.width / 2, to.y + 4, {steps: 8});
  await page.mouse.up();
  await expect(toast(page)).toContainText(`${TITLE.stretch} moved to place 1 in Afternoon`);
  await expect.poll(async () => { const r = (await stored<Checklist>(page, CHECKLIST_KEY))!; const item = orderedItems(r).find(i => i.id === 'ck_fixture-1')!; return sectionOfItem(r, item); }).toBe('afternoon');
  await expect(page.getByRole('list', {name: /Afternoon/}).first().locator('.checklist-row-name').first()).toHaveText(TITLE.stretch);
  // A press without a move is no drag: nothing moves.
  const box = (await push.locator('.checklist-row-tab').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByRole('list', {name: /Afternoon/}).first().locator('.checklist-row-name')).toHaveText([TITLE.stretch, TITLE.push]);
});
