import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY} from '../lib/habits';
import {CHECKLIST_KEY} from '../lib/af-checklist-keys';
import {seedChecklist, settled, stored} from './checklist-fixtures';

/**
 * Session AG Polish 2 (ADR-031 K11; owner Part 5, pointer D-path 11): the Checklist's own quick add. "+" sits where "⋯"
 * stood and "⋯" at the far right; the sheet creates a real habit through the Habits page's own create and data format
 * (it shows on Habits in its time-of-day section) and stars it into the chosen orbit; Undo takes both back while the habit
 * is untouched, and only the star once it has changed (owner amendment 3); the form validates inline and works by keyboard.
 */
type Habit = {id: string; title: string; category: string; timeOfDay: string; createdAt: string; updatedAt: string; rules: {measurement: {kind: string; unit?: string}; target: number; schedule: {kind: string; days?: number[]}}[]};
const overlay = (page: Page) => page.locator('dialog.checklist-overlay');
const plus = (page: Page) => page.getByRole('button', {name: 'Quick add to your Checklist'});
const sheet = (page: Page) => page.getByRole('region', {name: 'Quick add'});
async function open(page: Page) {
  await seedChecklist(page);
  await page.goto('/app/checklist'); await settled(page);
  await expect(overlay(page)).toHaveAttribute('data-loaded');
}
async function add(page: Page, o: {name: string; orbit: string; kind?: 'Once a day' | 'A number' | 'Minutes'; many?: string; unit?: string; minutes?: string; days?: string[]}) {
  await plus(page).click();
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByLabel('Name').fill(o.name);
  await sheet(page).getByRole('radio', {name: o.orbit}).check();
  if (o.kind) await sheet(page).getByRole('radio', {name: o.kind}).check();
  if (o.many) await sheet(page).getByLabel('How many').fill(o.many);
  if (o.unit) await sheet(page).getByLabel('Unit').fill(o.unit);
  if (o.minutes) await sheet(page).getByLabel('Minutes a day').fill(o.minutes);
  if (o.days) { await sheet(page).getByRole('radio', {name: 'Chosen days'}).check(); for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) await sheet(page).getByRole('checkbox', {name: d}).setChecked(o.days.includes(d)); }
  await sheet(page).getByRole('button', {name: 'Add to my orbit'}).click();
  await expect(sheet(page)).toHaveCount(0);
}
const habitNamed = async (page: Page, title: string) => (await stored<{habits: Habit[]}>(page, HABITS_KEY))?.habits.find(h => h.title === title) ?? null;

test('"+" stands where "⋯" was, "⋯" at the far right of the bar', async ({page}, info) => {
  await open(page);
  const [p, m] = [await plus(page).boundingBox(), await page.getByRole('button', {name: 'Checklist menu'}).boundingBox()];
  expect(p!.width).toBeGreaterThanOrEqual(44); expect(p!.height).toBeGreaterThanOrEqual(44);
  expect(p!.x + p!.width, '"+" just before "⋯"').toBeLessThanOrEqual(m!.x);
  expect(m!.x - (p!.x + p!.width)).toBeLessThanOrEqual(14);
  if (info.project.name === 'desktop') {
    // On a computer "⋯" ends where the timers' column ends.
    const side = await page.locator('.checklist-side').boundingBox();
    expect(Math.abs(m!.x + m!.width - (side!.x + side!.width)), '"⋯" over the timers\' right edge').toBeLessThanOrEqual(2);
  }
});

test('each kind becomes a real habit in its orbit and on the Habits page; the toast links to it', async ({page}) => {
  test.setTimeout(90_000);
  await open(page);
  await add(page, {name: 'Fictional evening walk', orbit: 'Evening'});
  // The toast: where it went, a link to edit it on Habits, Undo.
  const toast = page.locator('.aa-toast');
  await expect(toast).toContainText('Added to Evening Orbit · Edit on Habits');
  const tick = await habitNamed(page, 'Fictional evening walk');
  expect(tick).toMatchObject({category: 'Checklist', timeOfDay: 'evening'});
  expect(tick!.rules[0]).toMatchObject({measurement: {kind: 'boolean'}, target: 1, schedule: {kind: 'daily'}});
  await expect(toast.getByRole('link', {name: 'Edit on Habits'})).toHaveAttribute('href', `/app/habits#habit-${tick!.id}`);
  // On the path, in its orbit, brought into view.
  // (Owner amendment 10: the tab shows one word; the full name is its title.)
  const node = page.locator('.path-section[data-section=evening] .path-step', {has: page.locator('.path-label[title="Fictional evening walk"]')});
  await expect(node).toHaveCount(1);
  await expect(node.locator('.path-dot')).toBeInViewport();
  // A number with its unit; minutes on chosen days.
  await add(page, {name: 'Fictional glasses', orbit: 'Morning', kind: 'A number', many: '8', unit: 'glasses'});
  expect((await habitNamed(page, 'Fictional glasses'))!.rules[0]).toMatchObject({measurement: {kind: 'count', unit: 'glasses'}, target: 8});
  await add(page, {name: 'Fictional stretching', orbit: 'Anytime', kind: 'Minutes', minutes: '30', days: ['Monday', 'Wednesday', 'Friday']});
  const minutes = await habitNamed(page, 'Fictional stretching');
  expect(minutes).toMatchObject({timeOfDay: 'anytime'});
  expect(minutes!.rules[0]).toMatchObject({measurement: {kind: 'duration', unit: 'minutes'}, target: 30, schedule: {kind: 'weekdays', days: [1, 3, 5]}});
  // Starred into the chosen orbits through the Checklist's own favourites.
  const path = await stored<{items: {ref?: {habitId?: string}; section?: string}[]}>(page, CHECKLIST_KEY);
  expect(path!.items.find(i => i.ref?.habitId === tick!.id)?.section).toBe('evening');
  expect(path!.items.find(i => i.ref?.habitId === minutes!.id)?.section).toBe('anytime');
  // On the Habits page, in the matching time-of-day sections.
  await page.goto('/app/habits'); await settled(page);
  await expect(page.locator('.habit-section-evening').getByText('Fictional evening walk').first()).toBeAttached();
  await expect(page.locator('.habit-section-morning').getByText('Fictional glasses').first()).toBeAttached();
});

test('Undo takes back both the star and the habit while the habit is untouched', async ({page}) => {
  await open(page);
  await add(page, {name: 'Fictional undo me', orbit: 'Afternoon'});
  const id = (await habitNamed(page, 'Fictional undo me'))!.id;
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect(page.locator('.aa-toast')).toContainText('off your orbit and off Habits');
  await expect.poll(() => habitNamed(page, 'Fictional undo me')).toBeNull();
  const path = await stored<{items: {ref?: {habitId?: string}}[]}>(page, CHECKLIST_KEY);
  expect(path!.items.some(i => i.ref?.habitId === id)).toBe(false);
  await expect(page.locator('.path-step', {hasText: 'Fictional undo me'})).toHaveCount(0);
});

test('Undo after the habit changed takes back only the star and says the habit stays (owner amendment 3)', async ({page}) => {
  await open(page);
  await add(page, {name: 'Fictional keep me', orbit: 'Morning'});
  // The habit is edited elsewhere (another tab, the Habits page) before Undo.
  await page.evaluate(({key, title}) => { const d = JSON.parse(localStorage.getItem(key)!); const h = d.habits.find((x: {title: string}) => x.title === title); h.updatedAt = new Date(Date.parse(h.updatedAt) + 60_000).toISOString(); localStorage.setItem(key, JSON.stringify(d)); }, {key: HABITS_KEY, title: 'Fictional keep me'});
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
  await expect(page.locator('.aa-toast')).toContainText('Removed from your orbit · the habit stays on Habits');
  expect(await habitNamed(page, 'Fictional keep me'), 'the habit stays').not.toBeNull();
  await expect(page.locator('.path-step', {hasText: 'Fictional keep me'})).toHaveCount(0);
});

test('the form validates inline and works by keyboard; focus returns to "+"', async ({page}) => {
  await open(page);
  await plus(page).focus();
  await page.keyboard.press('Enter');
  const name = sheet(page).getByLabel('Name');
  await expect(name).toBeFocused();
  // No name.
  await sheet(page).getByRole('button', {name: 'Add to my orbit'}).click();
  await expect(sheet(page).getByText('Give it a name.')).toBeVisible();
  await expect(name).toHaveAttribute('aria-invalid', 'true');
  await expect(name).toBeFocused();
  // 80 characters at most.
  await name.fill('x'.repeat(95));
  expect((await name.inputValue()).length).toBe(80);
  // A number out of the Habits page's limits.
  await name.fill('Fictional count');
  await sheet(page).getByRole('radio', {name: 'A number'}).check();
  await sheet(page).getByLabel('How many').fill('0');
  await sheet(page).getByRole('button', {name: 'Add to my orbit'}).click();
  await expect(sheet(page).getByText(/Enter a whole number from 1 to 1,000,000,000/)).toBeVisible();
  await sheet(page).getByLabel('How many').fill('2000000000');
  await sheet(page).getByRole('button', {name: 'Add to my orbit'}).click();
  await expect(sheet(page).getByText(/Enter a whole number from 1 to 1,000,000,000/)).toBeVisible();
  // Chosen days, none chosen.
  await sheet(page).getByLabel('How many').fill('3');
  await sheet(page).getByRole('radio', {name: 'Chosen days'}).check();
  for (const d of ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']) await sheet(page).getByRole('checkbox', {name: d}).uncheck();
  await sheet(page).getByRole('button', {name: 'Add to my orbit'}).click();
  await expect(sheet(page).getByText('Choose at least one day.')).toBeVisible();
  expect(await habitNamed(page, 'Fictional count'), 'nothing saved while invalid').toBeNull();
  // Escape closes it; focus returns to "+".
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toHaveCount(0);
  await expect(plus(page)).toBeFocused();
  // By keyboard: open, type, Enter adds; focus back on "+".
  await page.keyboard.press('Enter');
  await expect(name).toBeFocused();
  await page.keyboard.type('Fictional keyboard habit');
  await page.keyboard.press('Enter');
  await expect(sheet(page)).toHaveCount(0);
  await expect(plus(page)).toBeFocused();
  expect(await habitNamed(page, 'Fictional keyboard habit')).not.toBeNull();
});

test('the glyph follows the name live in the node preview', async ({page}) => {
  await open(page);
  await plus(page).click();
  const glyph = () => sheet(page).locator('.checklist-quick-preview svg').first().evaluate(s => s.innerHTML);
  await sheet(page).getByLabel('Name').fill('Read ten pages');
  const book = await glyph();
  await sheet(page).getByLabel('Name').fill('Drink water');
  expect(await glyph(), 'another glyph for another name').not.toBe(book);
  await expect(sheet(page).locator('.checklist-quick-tab')).toHaveText('Drink water');
});
