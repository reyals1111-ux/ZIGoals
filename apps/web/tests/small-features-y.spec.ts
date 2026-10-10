import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY, type HabitData} from '../lib/habits';
import {PLATFORM_KEY, emptyPlatform, privateGoalSchema} from '../lib/positions';
import {manualSourcePosition} from '../lib/manual-source';
import {saveAsset} from '../lib/asset-management';
import {isPhone} from './phone-nav';

/**
 * Session Y Part 8 (owner-approved, ADR-018 Y26–Y28): vacation days cleared later, "−" beside "+" on every measured habit,
 * and a precious metal's weight unit changed in the safest subset. Both projects; the motion settings do not change any
 * of it (Motion Off and reduced motion each run the habit flows).
 */
test.use({timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date('2026-09-15T10:00:00.000Z')});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
});
const stored = async (page: Page) => JSON.parse((await page.evaluate(key => localStorage.getItem(key), HABITS_KEY))!) as HabitData;
async function addHabit(page: Page, title: string, measure?: {kind: string; target: string}) {
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  if (measure) { await page.getByRole('combobox', {name: 'Measurement', exact: true}).selectOption(measure.kind); await page.getByLabel('Unit', {exact: true}).fill('liters'); await page.getByLabel('Target value').fill(measure.target); }
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await expect(page.getByRole('article', {name: title, exact: true})).toBeVisible();
}
async function motion(page: Page, setting: 'default' | 'reduced' | 'off') {
  if (setting === 'reduced') await page.emulateMedia({reducedMotion: 'reduce'});
  if (setting === 'off') { await page.goto('/app/settings'); await page.evaluate(() => localStorage.setItem('zigoals:motion:v1', 'off')); }
}

for (const setting of ['default', 'reduced', 'off'] as const) test(`vacation days marked earlier are listed and cleared later, stretch by stretch (motion ${setting})`, async ({page}) => {
  await motion(page, setting);
  await page.goto('/app/habits');
  await addHabit(page, 'Stretch');
  const open = async () => { await page.getByRole('button', {name: 'Vacation', exact: true}).click(); const panel = page.getByRole('region', {name: 'Vacation days', exact: true}); await expect(panel).toBeVisible(); return panel; };
  let panel = await open();
  for (const [from, to] of [['2026-09-17', '2026-09-18'], ['2026-09-25', '2026-09-26']] as const) {
    await panel.getByLabel('From', {exact: true}).fill(from); await panel.getByLabel('To', {exact: true}).fill(to);
    await panel.getByRole('button', {name: 'Mark vacation', exact: true}).click();
    await expect(panel.getByRole('status')).toContainText('Vacation marked for 1 habit, 2 days.');
  }
  await panel.getByRole('button', {name: 'Done', exact: true}).click();
  // Later (another visit), the stretches still ahead are listed; one is cleared, the other stays.
  await page.reload();
  panel = await open();
  const ahead = panel.locator('.habit-vacation-ahead');
  await expect(ahead.getByRole('listitem')).toHaveText(['17 Sept – 18 Sept · 1 habitClear', '25 Sept – 26 Sept · 1 habitClear']);
  const clear = ahead.getByRole('button', {name: 'Clear vacation days 17 Sept – 18 Sept', exact: true});
  if (await isPhone(page)) expect((await clear.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await clear.click();
  await expect(panel.getByRole('status')).toHaveText('Vacation days cleared: 17 Sept – 18 Sept. Your own check-ins and skips were kept.');
  await expect(ahead.getByRole('listitem')).toHaveText(['25 Sept – 26 Sept · 1 habitClear']);
  expect((await stored(page)).habits[0]!.entries.filter(e => e.note === 'Vacation').map(e => e.date)).toEqual(['2026-09-25', '2026-09-26']);
});

for (const setting of ['default', 'reduced', 'off'] as const) test(`"−" beside "+" on a measured habit, never below 0, decimal-safe (motion ${setting})`, async ({page}) => {
  await motion(page, setting);
  await page.goto('/app/habits');
  await addHabit(page, 'Water plants', {kind: 'quantity', target: '2.5'});
  const card = page.getByRole('article', {name: 'Water plants', exact: true});
  const minus = card.getByRole('button', {name: 'Remove one from Water plants', exact: true}), plus = card.getByRole('button', {name: 'Add one to Water plants', exact: true});
  await expect(minus).toBeDisabled();
  if (await isPhone(page)) for (const button of [minus, plus]) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await card.getByText('Set or add a value', {exact: true}).click();
  await card.getByLabel('Value for Water plants').fill('2,2');
  await card.getByRole('button', {name: 'Set value', exact: true}).click();
  await expect(card.locator('.habit-count strong')).toHaveText('2.2');
  await minus.click();
  await expect(card.locator('.habit-count strong')).toHaveText('1.2');
  await minus.click(); await minus.click();
  await expect(card.locator('.habit-count strong')).toHaveText('0');
  await expect(minus).toBeDisabled();
  await plus.click();
  await expect(card.locator('.habit-count strong')).toHaveText('1');
  const entry = (await stored(page)).habits[0]!.entries.find(e => e.date === '2026-09-15')!;
  expect(entry.count).toBe(1);
});

// A metal entered without a value has no valuation history (Wealth records a daily valuation only for a valued asset),
// so its unit can change; a valued one keeps its unit once Wealth has recorded it (ADR-018 Y26).
async function seedGold(page: Page, allocated = false, valued = false) {
  const gold = manualSourcePosition({category: 'Precious metals', name: 'Grandma’s coins', quantity: '100', currency: 'EUR', metal: 'Gold', unit: 'grams', ...(valued ? {value: '7000'} : {})}, '91000000-0000-4000-8000-000000000001', '2026-09-14T10:00:00.000Z');
  let platform = saveAsset(emptyPlatform(), gold);
  if (allocated) platform = {...platform, goals: [privateGoalSchema.parse({id: '1', name: 'Gold reserve', type: 'QUANTITY', status: 'active', asset: 'Gold grams', denom: 'manual:Gold grams', decimals: 18, target: (500n * 10n ** 18n).toString(), notes: '', createdAt: '2026-09-14T10:00:00.000Z', milestones: []})]};
  await page.goto('/app/settings');
  await page.evaluate(([key, value]) => localStorage.setItem(key!, value!), [PLATFORM_KEY, JSON.stringify(platform)]);
  return gold.id;
}
test('a new gold holding changes grams to troy ounces with its quantity in the new unit', async ({page}) => {
  const id = await seedGold(page);
  await page.goto(`/app/wealth/asset/${id}`);
  await page.getByRole('button', {name: 'Edit asset', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: /^Edit Grandma/});
  await expect(sheet.getByRole('combobox', {name: 'Weight unit', exact: true})).toHaveValue('grams');
  await sheet.getByRole('combobox', {name: 'Weight unit', exact: true}).selectOption('troy ounces');
  await sheet.getByLabel('Asset quantity', {exact: true}).fill('3.215');
  await sheet.getByRole('button', {name: 'Save changes', exact: true}).click();
  await expect(sheet).toHaveCount(0);
  const saved = JSON.parse((await page.evaluate(key => localStorage.getItem(key), PLATFORM_KEY))!).positions[0];
  expect(saved).toMatchObject({asset: 'Gold troy ounces', denom: 'manual:Gold troy ounces', quantity: (3215n * 10n ** 15n).toString()});
  await expect(page.locator('main')).toContainText('Gold troy ounces');
});
test('a gold holding a Goal counts in keeps its unit and says why', async ({page}) => {
  const id = await seedGold(page, true);
  await page.goto(`/app/wealth/asset/${id}`);
  await page.getByRole('button', {name: 'Edit asset', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: /^Edit Grandma/});
  await expect(sheet).toContainText('Weight unit: grams. A Goal counts in this asset’s unit, so its unit stays as it is.');
  await expect(sheet.getByRole('combobox', {name: 'Weight unit', exact: true})).toHaveCount(0);
});
test('a valued gold holding keeps its unit once Wealth has recorded its value, and says why', async ({page}) => {
  const id = await seedGold(page, false, true);
  await page.goto(`/app/wealth/asset/${id}`);
  await expect.poll(async () => JSON.parse((await page.evaluate(key => localStorage.getItem(key), PLATFORM_KEY))!).valuationSnapshots.length).toBeGreaterThan(0);
  await page.getByRole('button', {name: 'Edit asset', exact: true}).click();
  const sheet = page.getByRole('dialog', {name: /^Edit Grandma/});
  await expect(sheet).toContainText('Weight unit: grams. This asset has funding or valuation records in its unit, so its unit stays as it is.');
  await expect(sheet.getByRole('combobox', {name: 'Weight unit', exact: true})).toHaveCount(0);
});
