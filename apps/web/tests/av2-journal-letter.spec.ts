import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #279, Stoic's letter to open later): Write → "Open it later, as a letter…" → In a
 * year; the saved entry is folded away in the list (its words hidden, "Read it now" shows them on this visit only); a
 * letter whose day is today shows on Today's journal card with a link to read it; on other days Today shows nothing.
 * At 390 and 1440, three themes, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
for (const theme of THEMES) test(`${theme}: a letter to open later`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await seedDevice(page, {[JOURNAL_KEY]: {version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'old', date: '2025-11-22', text: 'Dear future me, a fictional letter from last year.', createdAt: '2025-11-22T20:00:00.000Z', template: 'letter-future-you', opensOn: '2026-11-22'}]}});
  // Session AV lane 2 (fixb3: seedDevice installs its own clock at Nov 14, deliberate): the spec's day again, the letter's day.
  await page.clock.setSystemTime(new Date('2026-11-22T09:00:00.000Z'));
  await page.goto('/app#for-you-journal'); await hydrated(page);
  const letter = page.locator('.today-journal-card').getByRole('group', {name: 'A letter to you'});
  await expect(letter).toContainText('opens today: you wrote it on Nov 22, 2025.');
  await expect(letter.getByRole('link', {name: 'Read your letter'})).toHaveAttribute('href', '/app/journal?day=2025-11-22');
  let findings = await axe(page, page.locator('.today-journal-card'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Write a new letter for a year from now.
  await page.goto('/app/journal'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await form.getByRole('button', {name: 'Open it later, as a letter…'}).click();
  const opens = form.getByRole('combobox', {name: 'Open this entry'});
  await expect(opens).toBeFocused();
  await opens.selectOption('year');
  await form.getByRole('textbox', {name: 'Today’s entry'}).fill('Dear future me, a fictional letter for next year.');
  findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save entry'}).click();
  // Session AV lane 2 (fixb3: Three good things on this page has its own .journal-status, deliberate): the entry form's own.
  await expect(page.locator('.journal-status:not(#good-things .journal-status)')).toHaveText('Your letter is folded away until Nov 22, 2027. That day it opens on Today.');
  await expect.poll(() => page.evaluate(k => (JSON.parse(localStorage.getItem(k) ?? '{}') as {entries: {opensOn?: string}[]}).entries.at(-1)?.opensOn, JOURNAL_KEY)).toBe('2027-11-22');
  const row = page.locator('ol.journal-entries > li').first();
  await expect(row.locator('.journal-entry-sealed')).toContainText('A letter to open on');
  await expect(row).not.toContainText('a fictional letter for next year');
  await row.getByRole('button', {name: /^Read the letter of .* now$/}).click();
  await expect(row).toContainText('a fictional letter for next year');
  // The day after the week it opened, Today shows nothing.
  await page.clock.setFixedTime(new Date('2026-11-30T09:00:00.000Z'));
  await page.goto('/app#for-you-journal'); await hydrated(page);
  await expect(page.locator('.today-journal-card').getByRole('heading', {name: 'How was today?'})).toBeVisible();
  await expect(page.locator('.today-journal-card').getByRole('group', {name: 'A letter to you'})).toHaveCount(0);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
