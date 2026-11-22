import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r4-mind; LEDGER #308, Journey's formatting and checklists): an entry's Markdown is drawn (a heading,
 * bold, a tick box), ticking a box writes "- [x]" into the entry and keeps the words it had as an earlier version (Undo
 * in the message); the format bar under Write makes chosen words bold and a line a tick box; a plain entry stays one plain
 * paragraph. At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; API offline.
 */
test.use({timezoneId: 'UTC'});
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as {entries: {id: string; text: string}[]; versions?: {entryId: string; text: string}[]} | null, JOURNAL_KEY);
for (const theme of THEMES) test(`${theme}: formatting and tick boxes in an entry`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'plain', date: '2026-11-20', text: 'A fictional plain day.', createdAt: '2026-11-20T20:00:00.000Z'},
    {id: 'md', date: '2026-11-21', text: '## Packing\nA **fictional** trip.\n\n- [ ] passport\n- [x] tickets', createdAt: '2026-11-21T20:00:00.000Z'}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const rows = page.locator('ol.journal-entries > li');
  const md = rows.filter({hasText: 'Packing'});
  await expect(md.getByRole('heading', {name: 'Packing'})).toBeVisible();
  await expect(md.locator('strong')).toHaveText('fictional');
  await expect(md.getByText('1 of 2 ticked')).toBeVisible();
  await expect(rows.filter({hasText: 'A fictional plain day.'}).locator('p.journal-entry-text')).toHaveText('A fictional plain day.');
  const passport = md.getByRole('checkbox', {name: 'passport'});
  await expect(passport).not.toBeChecked();
  let findings = await axe(page, page.locator('ol.journal-entries'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await passport.check();
  await expect(page.getByText(/^Ticked in the entry of .*\. Its earlier words are under Earlier versions\.$/)).toBeVisible();
  await expect(md.getByRole('checkbox', {name: 'passport'})).toBeChecked();
  await expect(md.getByRole('checkbox', {name: 'passport'})).toBeFocused();
  await expect.poll(async () => (await read(page))?.entries.find(e => e.id === 'md')?.text).toBe('## Packing\nA **fictional** trip.\n\n- [x] passport\n- [x] tickets');
  await expect.poll(async () => (await read(page))?.versions?.filter(v => v.entryId === 'md').length).toBe(1);
  // The format bar: choose words, press Bold; put the caret on a line, press Tick box.
  const form = page.getByRole('form', {name: 'Write in your journal'});
  const field = form.getByRole('textbox', {name: 'Today’s entry'});
  await field.fill('A fictional good day\nbuy bread');
  await field.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(2, 12));
  const bar = form.getByRole('group', {name: 'Format the entry'});
  await bar.getByRole('button', {name: 'Bold'}).click();
  await expect(field).toHaveValue('A **fictional** good day\nbuy bread');
  await expect(field).toBeFocused();
  await field.evaluate((el: HTMLTextAreaElement) => el.setSelectionRange(el.value.length, el.value.length));
  await bar.getByRole('button', {name: 'Tick box'}).click();
  await expect(field).toHaveValue('A **fictional** good day\n- [ ] buy bread');
  findings = await axe(page, form);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save entry'}).click();
  const fresh = rows.first();
  await expect(fresh.locator('strong')).toHaveText('fictional');
  await expect(fresh.getByRole('checkbox', {name: 'buy bread'})).not.toBeChecked();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
