import {readFile} from 'node:fs/promises';
import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {entry, moneyLog, noSideScroll, readRecord, seedDevice, spending} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {MONEY_LOG_KEY, type MoneyLog} from '../lib/money-log/schema';
import {MONEY_RULES_KEY, type MoneyRules} from '../lib/money-rules/schema';

/**
 * Session AV lane 2, round 5 (money; PocketSmith's category backup and restore, LEDGER #390): Log spending → Your own
 * categories → "Categories and rules in a file": save one (own categories, subcategories, rules; never an entry), read a
 * friend's — the plan says what is new and what is already there, only the new is added, Undo takes it out — at 390 and
 * 1440 in Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
const FRIEND = JSON.stringify({kind: 'zigoals-categories-and-rules', version: 1, categories: {expense: ['Pets', 'Hobbies'], income: []}, subs: {Hobbies: ['Paint']},
  rules: [{field: 'payee', op: 'contains', text: 'Brush shop', direction: 'out', category: 'Hobbies', enabled: true}]});
for (const theme of THEMES) test(`${theme}: categories and rules saved to and read from a file`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {
    [MONEY_LOG_KEY]: {...moneyLog([entry('2026-11-02', '30.00', 'Pets', 'expense', 'Vet')]), own: {expense: ['Pets']}},
    [MONEY_RULES_KEY]: {version: 1, rules: [{id: 'r1', field: 'payee', op: 'contains', text: 'Albert Heijn', direction: 'out', category: 'Groceries', enabled: true}]},
  });
  await page.goto('/app/wealth'); await hydrated(page);
  const box = spending(page);
  await box.getByRole('button', {name: 'Log spending'}).click();
  const form = box.getByRole('form', {name: 'Log spending or income'});
  await form.locator('summary', {hasText: 'Your own categories'}).click();
  const part = form.locator('.category-file');
  await expect(part.getByRole('heading', {name: 'Categories and rules in a file'})).toBeVisible();
  const [saved] = await Promise.all([page.waitForEvent('download'), part.getByRole('button', {name: 'Save categories and rules'}).click()]);
  expect(saved.suggestedFilename()).toBe('zigoals-categories-and-rules-2026-11-14.json');
  const json = JSON.parse(await readFile((await saved.path())!, 'utf8'));
  expect(json.categories).toEqual({expense: ['Pets'], income: []});
  expect(json.rules).toEqual([{field: 'payee', op: 'contains', text: 'Albert Heijn', direction: 'out', category: 'Groceries', enabled: true}]);
  expect(JSON.stringify(json)).not.toContain('Vet');
  await part.getByLabel('Read categories and rules from a file').setInputFiles({name: 'friend.json', mimeType: 'application/json', buffer: Buffer.from(FRIEND)});
  const plan = part.getByRole('list', {name: 'What friend.json adds'});
  await expect(plan.getByRole('listitem')).toHaveCount(4);
  await expect(plan.getByRole('listitem').nth(0)).toContainText('already there');
  await expect(plan.getByRole('listitem').nth(1)).toContainText('new');
  const findings = await axe(page, part);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await part.getByRole('button', {name: 'Add 3 new items'}).click();
  await expect(part.getByRole('status')).toHaveText('Added from friend.json: 1 category, 1 subcategory and 1 rule. Nothing you had was changed.');
  await expect(part.getByRole('heading', {name: 'Categories and rules in a file'})).toBeFocused();
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).own).toEqual({expense: ['Pets', 'Hobbies']});
  expect((await readRecord<MoneyRules>(page, MONEY_RULES_KEY)).rules.map(r => r.text)).toEqual(['Albert Heijn', 'Brush shop']);
  await page.getByRole('button', {name: 'Undo reading categories and rules'}).click();
  await expect.poll(async () => (await readRecord<MoneyRules>(page, MONEY_RULES_KEY)).rules.length).toBe(1);
  expect((await readRecord<MoneyLog>(page, MONEY_LOG_KEY)).own).toEqual({expense: ['Pets']});
  await page.setViewportSize({width: 320, height: 720});
  expect(await noSideScroll(page)).toBe(true);
});
