import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV, owner follow-up 1 (F-OWN-TEMPLATES; Day One): Journal → "Start from a prompt" → "Make your own template"
 * keeps a template of the person's own in the journal record; picking it fills the entry with its headings; the
 * daily question reads in Dutch with "In het Nederlands" and stays so after a reload — at 390 and 1440, in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {templates?: {title: string; headings: string[]}[]} | null, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: a template of my own, and the daily question in Dutch`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-04T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/journal'); await hydrated(page);
  const form = page.getByRole('form', {name: 'Write in your journal'});
  const question = form.getByRole('group', {name: 'Today’s question'});
  const english = await question.locator('strong').textContent();
  await question.getByRole('button', {name: 'In het Nederlands'}).click();
  await expect(question.locator('strong')).toHaveAttribute('lang', 'nl');
  expect(await question.locator('strong').textContent()).not.toBe(english);
  await form.getByText('Start from a prompt').click();
  await form.getByRole('button', {name: 'Make your own template'}).click();
  const make = form.getByRole('group', {name: 'Make your own template'});
  await make.getByLabel('Name').fill('Fictional run diary');
  await make.getByLabel('Headings, one per line (up to six)').fill('How the legs felt:\nWhat I saw on the way:');
  const findings = await axe(page, make);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await make.getByRole('button', {name: 'Keep this template'}).click();
  await expect.poll(async () => (await read(page))?.templates).toEqual([{id: expect.stringMatching(/^own-[a-z0-9]{12}$/), title: 'Fictional run diary', headings: ['How the legs felt:', 'What I saw on the way:']}]);
  await form.getByRole('list', {name: 'Your own templates'}).getByRole('button', {name: /^Fictional run diary/}).click();
  await expect(form.getByLabel('Today’s entry')).toHaveValue('How the legs felt:\n\nWhat I saw on the way:\n');
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('group', {name: 'Today’s question'}).locator('strong')).toHaveAttribute('lang', 'nl');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
