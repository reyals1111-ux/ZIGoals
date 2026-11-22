import {expect, test} from '@playwright/test';
import {applyTheme, axe, THEMES} from './p6-helpers';
import {seedDevice} from './ap/ap-money-fixtures';
import {hydrated} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (bodymind-r2; LEDGER #233, Moodnotes' thinking traps and thought checker): Journal → Write → "Check a
 * thought": what happened, the thought ("They always ignore me. I should not care."), the checker pointing at "Always and
 * never" and "Shoulds and musts" (never ticking them), the person ticking one, another way to see it, saved as one ordinary
 * journal entry; worded as self-reflection, never a diagnosis; in Dutch with the daily question. At 390 and 1440, three
 * themes, axe-clean, no sideways scroll at 320.
 */
for (const theme of THEMES) test(`${theme}: a thought check with thinking traps, saved as an entry`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seedDevice(page, {[JOURNAL_KEY]: {version: 1, shareWithAi: false, followUps: true, entries: []}});
  await page.goto('/app/journal'); await hydrated(page);
  const write = page.getByRole('region', {name: 'Write'});
  await write.locator('.thought-check-fold > summary').click();
  const form = write.locator('form.thought-check');
  await expect(form).toContainText('not a diagnosis or a treatment');
  await form.getByLabel('1. What happened?').fill('Fictional: no reply to my message.');
  await form.getByLabel('2. What went through your mind?').fill('They always ignore me. I should not care.');
  await expect(form.locator('.thought-check-hints')).toHaveText('Some words in your thought often go with: Always and never, Shoulds and musts. You decide whether that fits.');
  await expect(form.getByRole('checkbox', {name: /Always and never/})).not.toBeChecked();
  await form.getByRole('checkbox', {name: /Always and never/}).check();
  await expect(form.locator('.thought-check-asks')).toHaveText('Can you think of a time it went differently?');
  await form.getByLabel('4. Another way to see it').fill('Last week they answered within an hour.');
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(await form.evaluate(el => [...el.querySelectorAll<HTMLElement>('p, label, li, legend, span, strong')].filter(e => e.offsetParent && (e.textContent ?? '').trim() && parseFloat(getComputedStyle(e).fontSize) < 14).length)).toBe(0);
  await form.getByRole('button', {name: 'Save as an entry'}).click();
  await expect(form.getByRole('status')).toHaveText('Saved as today’s journal entry. Well done for stopping to look at it.');
  await expect(form.getByLabel('1. What happened?')).toHaveValue('');
  await expect(form.getByLabel('1. What happened?')).toBeFocused();
  const entries = await page.evaluate(k => (JSON.parse(localStorage.getItem(k)!) as {entries: {text: string; template?: string}[]}).entries, JOURNAL_KEY);
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({template: 'thought-check', text: 'Thought check\nWhat happened: Fictional: no reply to my message.\nThe thought: They always ignore me. I should not care.\nThinking traps I noticed: Always and never\nAnother way to see it: Last week they answered within an hour.'});
  // An empty thought is asked for, focus on it.
  await form.getByRole('button', {name: 'Save as an entry'}).click();
  await expect(form.getByRole('alert')).toHaveText('Write the thought first.');
  await expect(form.getByLabel('2. What went through your mind?')).toBeFocused();
  // In Dutch with the daily question.
  await page.evaluate(() => localStorage.setItem('zigoals:journal-question-lang', 'nl'));
  await page.reload(); await hydrated(page);
  await page.getByRole('region', {name: 'Write'}).locator('.thought-check-fold > summary').click();
  await expect(page.locator('form.thought-check')).toContainText('Zelfreflectie in gewone woorden, geen diagnose of behandeling.');
  await expect(page.locator('form.thought-check').getByRole('checkbox', {name: /Alles of niets/})).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
