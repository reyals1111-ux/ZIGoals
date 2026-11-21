import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {TODAY, seeded, stored} from './ap/ap-fixtures';
import {COUNTDOWN_EXTRAS_KEY} from '../lib/countdowns/extras';

/**
 * Session AV, owner follow-up 1 (F-COUNTDOWN-YEARLY; TickTick's yearly countdowns with a reminder): on 14 November the
 * "Days until" card moves last March's birthday, set to come back every year, to next March; a countdown added for the
 * 20th with a week's reminder shows "in 6 days" under Reminders; the yearly switch is kept in its own record — at 390
 * and 1440, in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'Europe/Brussels'});
const KEY = 'zigoals:countdowns:v1', at = '2026-01-01T09:00:00.000Z';
const records = {[KEY]: {version: 1, items: [{id: 'av-birthday', title: 'Fictional birthday', date: '2026-03-14', createdAt: at}]}, 'zigoals:today-cards:v1': {version: 1, cards: ['countdowns']}};
for (const theme of THEMES) test(`${theme}: a birthday every year, and a reminder a week before`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seeded(page, records, '/app');
  const card = page.locator('.today-device-card[data-card="countdowns"]');
  if (isMobile) await card.locator('.phone-fold-toggle').click();
  await card.getByText('Passed (1)').click();
  await card.getByRole('button', {name: 'Every year: “Fictional birthday”'}).click();
  const coming = card.getByRole('list', {name: 'Coming up'}).locator('li');
  await expect(coming.filter({hasText: 'Fictional birthday'})).toContainText('In 120 days');
  await expect(coming.filter({hasText: 'Fictional birthday'})).toContainText('every year');
  expect(await stored(page, COUNTDOWN_EXTRAS_KEY)).toEqual({version: 1, items: {'av-birthday': {yearly: true}}});
  await card.getByText('Add a countdown').click();
  const form = card.getByRole('form', {name: 'Add a countdown'});
  await form.getByLabel('Name').fill('Fictional race');
  await form.getByLabel('Date').fill('2026-11-20');
  await form.getByLabel('Remind me').selectOption('7');
  await form.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(card.getByRole('list', {name: 'Reminders'})).toHaveText('◷ Fictional race in 6 days');
  await expect(coming.filter({hasText: 'Fictional race'})).toContainText('reminder 7 days before');
  const findings = await axe(page, card);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  expect(TODAY).toBe('2026-11-14');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
