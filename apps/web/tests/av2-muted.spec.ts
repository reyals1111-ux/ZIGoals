import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {HABIT_EXTRAS_KEY} from '../lib/aa-device-keys';

/**
 * Session AV lane 2 (habits; LEDGER #56, Finch's muted tags and exercises): "Don't ask this again" hides today's journal
 * question (the next one shows, focus kept); Journal → Start from a prompt → "Hidden prompts and exercises" lists it to
 * bring back and hides a ready template; Health → Meditation → Breathe with a guide → "Hide a pattern" leaves 4-7-8 out —
 * at 390 and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const read = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null')?.muted ?? null, HABIT_EXTRAS_KEY);
for (const theme of THEMES) test(`${theme}: hide a question, a template and a breathing pattern`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-04T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/journal'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  const question = form.getByRole('group', {name: 'Today’s question'});
  const first = await question.locator('strong').textContent();
  const hide = question.getByRole('button', {name: 'Don’t ask this again'});
  await hide.click();
  await expect(question.getByRole('status')).toHaveText('Hidden: it will not be asked again. Journal → Start from a prompt → Hidden lists it.');
  await expect(question.locator('strong')).not.toHaveText(first!);
  await expect(hide).toBeFocused();
  expect((await read(page))?.questions).toHaveLength(1);

  // Session AV lane 2 (the fold's own summary: the "Hidden: …" status names "Start from a prompt" too; deliberate)
  const prompts = form.locator('details.prompt-fold > summary').getByText('Start from a prompt', {exact: true});
  await prompts.click();
  await expect(form.getByRole('list', {name: 'Prompts'}).getByRole('button', {name: /Gratitude/})).toBeVisible();
  await form.getByText('Hidden prompts and exercises').click();
  const hidden = form.getByRole('group', {name: 'Hidden daily questions (untick to ask again)'});
  const back = hidden.getByRole('checkbox', {name: first!});
  await expect(back).toBeChecked();
  const templates = form.getByRole('group', {name: 'Hide these ready templates'});
  await templates.getByRole('checkbox', {name: 'Gratitude', exact: true}).check();
  await expect(templates.getByRole('checkbox', {name: 'Gratitude', exact: true})).toBeFocused();
  expect((await read(page))?.templates).toEqual(['gratitude']);
  await back.press('Space');
  await expect(back).not.toBeChecked();
  await expect(back).toBeFocused();
  expect((await read(page))?.questions).toBeUndefined();
  const findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Closing and opening the prompts again: Gratitude is no longer offered.
  await prompts.click();
  await prompts.click();
  await expect(form.getByRole('list', {name: 'Prompts'}).getByRole('button', {name: /Gratitude/})).toHaveCount(0);

  // Health → Meditation: hide 4-7-8.
  await page.goto('/app/health?view=meditation'); await hydrated(page);
  const begin = page.getByRole('form', {name: 'Begin a session'});
  await begin.getByText('Breathe with a guide').click();
  const patterns = begin.getByRole('group', {name: 'Pattern'});
  await expect(patterns.getByRole('radio', {name: /4-7-8/})).toBeVisible();
  await patterns.getByText('Hide a pattern').click();
  await patterns.getByRole('group', {name: 'Hide these breathing patterns'}).getByRole('checkbox', {name: '4-7-8', exact: true}).check();
  await patterns.getByText('Hide a pattern').click(); // closing the list reads it again
  await expect(patterns.getByRole('radio', {name: /4-7-8/})).toHaveCount(0);
  expect((await read(page))?.breathing).toEqual(['478']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
