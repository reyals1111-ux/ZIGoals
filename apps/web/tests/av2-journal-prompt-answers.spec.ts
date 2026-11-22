import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #265, Grid Diary's answers to one prompt across days): Journal → Entries → "Every
 * answer to a prompt" lists what was written under each heading of the chosen template, oldest first; a day button shows
 * that day's entries; an entry's More → "Every answer to this prompt" opens it on that template. At 390 and 1440, Nebula,
 * Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const JOURNAL = {version: 1, shareWithAi: false, followUps: false, entries: [
  {id: 'a', date: '2026-11-10', createdAt: '2026-11-10T20:00:00.000Z', template: 'gratitude', text: 'I am grateful for:\nFictional rain.\n\nSomeone I appreciate, and why:\nA fictional neighbour.'},
  {id: 'b', date: '2026-11-12', createdAt: '2026-11-12T20:00:00.000Z', template: 'gratitude', text: 'I am grateful for:\nFictional tea.\n\nSomeone I appreciate, and why:\n'},
  {id: 'c', date: '2026-11-14', createdAt: '2026-11-14T20:00:00.000Z', template: 'week-look-back', text: 'What went well this week:\nFictional runs.'}]};
for (const theme of THEMES) test(`${theme}: every answer to one prompt`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [JOURNAL_KEY, JSON.stringify(JOURNAL)] as const);
  await page.goto('/app/journal'); await hydrated(page);
  const fold = page.locator('details.journal-prompt-answers-fold');
  await expect(fold.locator('summary')).toContainText('2 prompts written from');
  await fold.locator('summary').click();
  await expect(fold.getByLabel('Prompt')).toHaveValue('gratitude');
  const grateful = fold.getByRole('region', {name: 'I am grateful for:'});
  await expect(grateful.locator('.prompt-answers-words')).toHaveText(['Fictional rain.', 'Fictional tea.']);
  await expect(fold.getByRole('region', {name: 'Someone I appreciate, and why:'}).locator('.prompt-answers-words')).toHaveText(['A fictional neighbour.']);
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await grateful.getByRole('button', {name: /Nov 12, 2026: show that day/}).click();
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(1);
  // An entry's More opens the fold on its own prompt.
  await page.goto('/app/journal?day=2026-11-14'); await hydrated(page);
  await expect(page.locator('ol.journal-entries > li')).toHaveCount(1);
  const row = page.locator('ol.journal-entries > li').first();
  await row.locator('details.journal-entry-more > summary').click();
  await row.getByRole('button', {name: 'Every answer to this prompt'}).click();
  await expect(fold).toHaveAttribute('open', '');
  await expect(fold.getByLabel('Prompt')).toHaveValue('week-look-back');
  await expect(fold.locator('.prompt-answers-title')).toBeFocused();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
