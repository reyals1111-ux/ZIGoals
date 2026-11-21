import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme, offline, settle} from './p6-helpers';
import {questionOfTheDay} from '../lib/journal-prompts/daily';

/**
 * Session AV Part 7 (ADR-045 F-PROMPT; Day One): one question a day above an empty Journal entry. "Use this question" puts
 * it in the text (nothing is stored until Save); "Another question" steps on. 320, 390 and 1440, three themes, keyboard, axe.
 */
const DAY = '2026-11-20';
test.use({timezoneId: 'Europe/Amsterdam'});
for (const theme of THEMES) test(`${theme}: today's question, used by keyboard and saved with the entry; nothing written before Save`, async ({page}) => {
  await applyTheme(page, theme);
  await offline(page);
  await page.clock.install({time: new Date(`${DAY}T09:00:00+01:00`)});
  await page.addInitScript(() => { if (!localStorage.getItem('zigoals:onboarding:v1')) localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); });
  for (const width of [320, 1440]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/app/journal'); await settle(page);
    const box = page.getByRole('group', {name: 'Today’s question'});
    await expect(box).toContainText(questionOfTheDay(DAY));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const b of await box.getByRole('button').all()) expect((await b.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await axe(page, box)).filter(v => v.impact === 'serious' || v.impact === 'critical')).toEqual([]);
  }
  const box = page.getByRole('group', {name: 'Today’s question'});
  await box.getByRole('button', {name: 'Another question'}).click();
  await expect(box).toContainText(questionOfTheDay(DAY, 1));
  expect(await page.evaluate(() => localStorage.getItem('zigoals:journal:v1'))).toBeNull();
  await box.getByRole('button', {name: 'Use this question'}).focus();
  await page.keyboard.press('Enter');
  const entry = page.getByRole('form', {name: 'Write in your journal'}).getByRole('textbox').first();
  await expect(entry).toHaveValue(`${questionOfTheDay(DAY, 1)}\n`);
  await expect(box).toHaveCount(0);
  await entry.press('End'); await entry.pressSequentially('A fictional walk in the rain.');
  await page.getByRole('button', {name: 'Save entry'}).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:journal:v1') ?? '{"entries":[]}').entries?.[0]?.text ?? '')).toContain(questionOfTheDay(DAY, 1));
});
