import {expect, test} from '@playwright/test';
import {ENERGY_KEY} from '../lib/energy/schema';
import {MOOD_TAGS_KEY} from '../lib/mood-tags/schema';
import {health, healthRecord, openHealth, stored, TODAY} from './ap/ap-health-fixtures';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #178 Daylio custom moods, #179 activities with icons and groups, #188 tag
 * statistics): Health → Diary → "How does today feel?": your own word and symbol for a mood, shown on the mood buttons;
 * an activity saved in a group with a symbol and tapped onto the day as its tag; Health → Insights → "Each tag, month by
 * month" — at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
const moodDay = {[TODAY]: {mood: 4, at: '2026-11-14T09:00:00.000Z'}};
for (const theme of THEMES) test(`${theme}: own mood words and an activity on the day`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health({moods: {version: 1, days: moodDay}} as never)));
  const card = page.locator('.health-mood').first();
  if (isMobile && !(await card.isVisible())) await page.locator('.phone-fold-toggle').filter({hasText: 'How does today feel?'}).first().click();
  await page.locator('summary', {hasText: 'Your own words for the moods'}).click();
  const best = page.getByRole('group', {name: /^Mood 5 of 5/});
  await best.getByRole('textbox', {name: 'Your word'}).fill('Sunny');
  await best.getByRole('combobox', {name: 'Symbol'}).selectOption('☀');
  await page.getByRole('button', {name: 'Save my words'}).click();
  await expect(page.getByText('Your mood words are saved.')).toBeVisible();
  // Session AV lane 2 (the symbol is shown but hidden from screen readers, so the button is named by its word: the name
  // exactly, and the symbol in its shown text, deliberate)
  await expect(card.getByRole('group', {name: 'Mood'}).getByRole('button', {name: 'Sunny', exact: true})).toHaveText('☀ Sunny');
  expect((await stored<{checkin?: {moodLook?: unknown}}>(page, ENERGY_KEY)).checkin?.moodLook).toEqual({'5': {word: 'Sunny', symbol: '☀'}});
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // An activity in a group, with a symbol, then one tap puts it on the day as its tag.
  await page.locator('summary', {hasText: 'Edit your activities'}).click();
  const form = page.getByRole('form', {name: 'Add an activity'});
  await form.getByRole('textbox', {name: /^Activity/}).fill('Fictional walk');
  // Session AV lane 2 (the group field offers your groups as you type, so it is a combobox: its role and exact name, deliberate)
  await form.getByRole('combobox', {name: 'Group (optional)', exact: true}).fill('Outside');
  await form.getByRole('radio', {name: 'Symbol ☕'}).check();
  await form.getByRole('button', {name: 'Add activity'}).click();
  // Session AV lane 2 (as above: the chip is named by its word, its symbol in its shown text, deliberate)
  const chip = page.getByRole('group', {name: 'Outside'}).getByRole('button', {name: 'Fictional walk', exact: true});
  await expect(chip).toHaveText('☕ Fictional walk');
  await expect(chip).toHaveAttribute('aria-pressed', 'false');
  await chip.click();
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(chip).toBeFocused();
  expect((await stored<{entries: Record<string, string[]>}>(page, MOOD_TAGS_KEY)).entries[TODAY]).toEqual(['Fictional walk']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('each tag, month by month, in Insights', async ({page}) => {
  await openHealth(page, {...healthRecord(health({moods: {version: 1, days: moodDay}} as never)), [MOOD_TAGS_KEY]: {version: 1, entries: {[TODAY]: ['Fictional walk']}}}, '/app/health?view=insights');
  const fold = page.locator('summary', {hasText: 'Each tag, month by month'});
  await fold.click();
  const row = page.getByRole('table', {name: /Each tag/}).getByRole('row', {name: /Fictional walk/});
  await expect(row).toContainText('Good 1');
  await expect(row).toContainText('mostly good');
  const findings = await axe(page, page.locator('.tag-stats'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
});
