import {expect, test} from '@playwright/test';
import {ENERGY_KEY} from '../lib/energy/schema';
import {SYMPTOMS_KEY} from '../lib/symptoms/schema';
import {TODAY, health, healthRecord, openHealth, stored} from './ap/ap-health-fixtures';
import {isPhone} from './phone-nav';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits pillar; LEDGER #60, #61, #62, #63, #68 — Bearable's daily check-in): Health → Diary →
 * "Evening check-in (optional)": six skippable steps — the mood and energy, a feeling word of your own, a factor from the
 * ready list with its level and part of the day, last night, supplements, a note — and "Finish: day logged", which shows
 * "✓ Day logged" under the date bar and in the 14-day strip; focus moves to each step's heading — at 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
for (const theme of THEMES) test(`${theme}: an evening check-in, step by step, then day logged`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await openHealth(page, healthRecord(health()));
  if (await isPhone(page)) await page.getByRole('button', {name: /^How (does today|did .+) feel\?/}).click();
  await page.getByText('Evening check-in (optional)', {exact: true}).click();
  await expect(page.getByTestId('checkin-logged')).toHaveText(/^Not logged yet · today$/);
  await expect(page.getByRole('list', {name: 'The last 14 days: 0 logged, 14 not yet'})).toBeVisible();
  await page.getByRole('button', {name: 'Start the check-in'}).click();

  // 1 · the day
  const heading = page.locator('#checkin-step-title');
  await expect(heading).toHaveText('How was the day?');
  await expect(heading).toBeFocused();
  await page.getByRole('group', {name: 'Mood today'}).getByRole('button', {name: 'Good'}).click();
  await expect(page.getByRole('group', {name: 'Mood today'}).getByRole('button', {name: 'Good'})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('group', {name: 'Energy today'}).getByRole('button', {name: 'okay'}).click();
  const findings = await axe(page, page.locator('.checkin'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.getByRole('button', {name: 'Next', exact: true}).click();

  // 2 · a word of your own
  await expect(heading).toHaveText('A word for it');
  await page.getByRole('button', {name: 'Low energy, pleasant'}).click();
  await page.getByLabel('Your own word').fill('Fictional snug');
  await page.getByLabel('Your own word').press('Enter');
  // Session AV lane 2 (the word's own button, not its "Remove your word “Fictional snug”" ×, which also contains the name; deliberate)
  await expect(page.getByRole('button', {name: 'Fictional snug', exact: true})).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', {name: 'Next', exact: true}).click();

  // 3 · a factor from the ready list, its level and part of the day
  await expect(heading).toHaveText('Symptoms and factors');
  await page.getByLabel('Search the list').fill('caff');
  await page.getByRole('button', {name: /^\+ Caffeine/}).click();
  await page.getByRole('group', {name: 'Caffeine today'}).getByRole('button', {name: 'Moderate'}).click();
  await page.getByRole('group', {name: 'When Caffeine was there'}).getByRole('button', {name: 'Afternoon'}).click();
  await expect(page.getByText(/^Today: 1 noted · day total 2 of 3$/)).toBeVisible();
  await page.getByRole('button', {name: 'Skip', exact: true}).click(); // 4 · last night
  await expect(heading).toHaveText('Last night');
  await expect(page.getByRole('link', {name: 'Log last night in Sleep'})).toBeVisible();
  await page.getByRole('button', {name: 'Skip', exact: true}).click(); // 5 · supplements
  await page.getByRole('button', {name: 'Next', exact: true}).click(); // 6 · a note
  await expect(heading).toHaveText('A note');
  await page.getByLabel('A few words about the day (up to 280)').fill('A fictional calm evening.');
  await page.getByRole('button', {name: 'Save the note'}).click();
  await page.getByRole('button', {name: 'Finish: day logged'}).click();

  await expect(page.getByTestId('checkin-logged')).toHaveText('✓ Day logged · today');
  await expect(page.getByRole('button', {name: 'Go through it again'})).toBeFocused();
  await expect(page.getByTestId('health-day-logged')).toHaveText('✓ Day logged');
  const energy = await stored<{days: Record<string, {energy: number}>; words: Record<string, {word: string}>; checkin: {logged: Record<string, string>; times: Record<string, Record<string, string[]>>; ownWords: Record<string, string[]>}}>(page, ENERGY_KEY);
  expect(energy.days[TODAY]!.energy).toBe(3);
  expect(energy.words[TODAY]!.word).toBe('Fictional snug');
  expect(Object.keys(energy.checkin.logged)).toEqual([TODAY]);
  expect(energy.checkin.times[TODAY]).toEqual({caffeine: ['afternoon']});
  expect(energy.checkin.ownWords['low-pleasant']).toEqual(['Fictional snug']);
  const symptoms = await stored<{days: Record<string, Record<string, number>>}>(page, SYMPTOMS_KEY);
  expect(symptoms.days[TODAY]).toEqual({caffeine: 2});
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
