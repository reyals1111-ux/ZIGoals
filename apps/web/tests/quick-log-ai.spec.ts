import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY, createHabit, emptyHabitData} from '../lib/habits';
import {HEALTH_STORAGE_KEY, type HealthData} from '../lib/health';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {isPhone} from './phone-nav';
import {speak, voiceFakes} from './zigi-af';

// Session AI (J10, ZI11): ONE line for several things: each understood item becomes its own card (ZIGi's cards, made on this
// device with no AI), each added on its own; nothing is written before Add. The same line works as /log in ZIGi with no AI.
const TODAY = '2026-09-15';
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const habits = createHabit(emptyHabitData(), {title: 'Meditate', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 10, measurement: {kind: 'count', unit: 'times'}}, new Date('2026-09-01T08:00:00.000Z'), '11111111-1111-4111-8111-111111111111');
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[HABITS_KEY]: JSON.stringify(habits), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true})}); // the balanced preset keeps the financial domain, whose Today hero carries Quick add on desktop
});
const health = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), HEALTH_STORAGE_KEY)) ?? 'null') as HealthData | null;
async function openQuickAdd(page: Page) {
  await page.goto('/app');
  // The Today hero's trigger (desktop) or the phone top bar's.
  await page.locator(await isPhone(page) ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  await expect(dialog).toBeVisible();
  // Session AB-Design: the line form arrives a beat after the dialog (Today loads more lazily now); the keyboard checks start once it is there.
  await expect(dialog.getByRole('textbox', {name: 'Type a line'})).toBeVisible();
  return {dialog, line: dialog.getByRole('form', {name: 'Type a line'}), field: dialog.getByRole('textbox', {name: 'Type a line'})};
}

const waterCount = async (page: Page) => (((await health(page))?.daily as {water?: unknown[]} | undefined)?.water ?? []).length;
const diaryCount = async (page: Page) => (await health(page))?.diary.length ?? 0;

test('Quick add: several items in one line become one card each, added one by one', async ({page}) => {
  const {dialog, field} = await openQuickAdd(page);
  const water = await waterCount(page), diary = await diaryCount(page);
  await field.fill('2 glasses of water, a banana, fixed the car');
  await field.press('Enter');
  const cards = dialog.locator('.ai-card');
  await expect(cards).toHaveCount(2);
  await expect(dialog).toContainText('Not a card: “fixed the car” (not understood)');
  expect(await waterCount(page)).toBe(water);
  await cards.nth(0).getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(() => waterCount(page)).toBe(water + 1);
  expect(await diaryCount(page)).toBe(diary);
  await cards.nth(1).getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(() => diaryCount(page)).toBe(diary + 1);
});

test('Dutch: "2 glazen water en een banaan" is two cards', async ({page}) => {
  const {dialog, field} = await openQuickAdd(page);
  await field.fill('2 glazen water en een banaan');
  await field.press('Enter');
  await expect(dialog.locator('.ai-card')).toHaveCount(2);
});

test('ZIGi with no AI: /log takes the same line and answers with the cards, made on this device', async ({page}) => {
  await page.goto('/app/health');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const box = panel.getByRole('textbox').last();
  await box.fill('/log 2 glasses of water and a banana');
  await panel.locator('.ai-composer button[type=submit]').click();
  await expect(panel.locator('.ai-turn-local .ai-card')).toHaveCount(2);
  await expect(panel).not.toContainText('This command needs your own AI connected');
});
// Session AI (feature 2, voice logging): the same line, spoken. The browser's speech recognition (faked here) hands the
// words over; they are read the spoken way (fillers out, number words as digits) and previewed as cards; nothing is saved
// before Add. English and Dutch.
test('Quick add: a spoken line becomes one card per item, nothing saved before Add', async ({page}) => {
  await voiceFakes(page);
  const {dialog, field} = await openQuickAdd(page);
  const water = await waterCount(page);
  await expect(dialog).toContainText('Nothing goes through ZIGoals');
  await dialog.getByRole('button', {name: 'Speak a line'}).click();
  await expect(dialog.getByRole('button', {name: 'Stop'})).toHaveAttribute('aria-pressed', 'true');
  await speak(page, 'um two glasses of water and a banana');
  await expect(field).toHaveValue('2 glasses of water and 1 banana'); // the spoken reading: fillers out, number words as digits
  const cards = dialog.locator('.ai-card');
  await expect(cards).toHaveCount(2);
  expect(await waterCount(page)).toBe(water);
  await cards.first().getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(() => waterCount(page)).toBe(water + 1);
});
test('Quick add: a Dutch spoken line', async ({page}) => {
  await voiceFakes(page);
  const {dialog} = await openQuickAdd(page);
  await dialog.getByRole('button', {name: 'Speak a line'}).click();
  await speak(page, 'euh twee glazen water en een banaan');
  await expect(dialog.locator('.ai-card')).toHaveCount(2);
});
