import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (notes; LEDGER #32, Notion's repeating database templates): Notes → "Repeating notes" makes a note
 * template that repeats every Monday; opening Notes makes this week's note from it (once); Days → "Daily note template"
 * gives a new daily note its starting words, shown in the day's editor and written only on Save. At 390 and 1440, in
 * Nebula, Light and Dark, axe-clean, focus kept, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
type Stored = {notes: {kind: string; title: string; body: string}[]; schedules?: {title: string; every: string; weekday?: number; lastMade?: string}[]; dailyTemplate?: string};
const read = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null') as Stored | null, NOTES_KEY);
for (const theme of THEMES) test(`${theme}: a repeating note and the daily note template`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-25T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const fold = page.locator('details.note-schedules-fold');
  await fold.locator('summary').click();
  await fold.getByRole('button', {name: 'Make a repeating note'}).click();
  const form = fold.getByRole('form', {name: 'A new repeating note'});
  await form.getByLabel('Title').fill('Fictional week plan');
  await expect(form.getByRole('radio', {name: 'Every week'})).toBeChecked();
  // Session AV lane 2 (the <select> inside its <label> adds its options' words to the label text; the combobox's own name
  // is "On", deliberate)
  await form.getByRole('combobox', {name: 'On', exact: true}).selectOption({label: 'Monday'});
  await form.getByLabel('Its words').fill('Week of {date}\nThree things:');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Keep this repeating note'}).click();
  await expect(fold.getByRole('button', {name: 'Make a repeating note'})).toBeFocused();
  await expect.poll(async () => (await read(page))?.schedules?.map(s => [s.title, s.every, s.weekday])).toEqual([['Fictional week plan', 'week', 1]]);
  // Opening Notes makes this week's note, once.
  await page.reload(); await hydrated(page);
  await expect(page.getByRole('status').filter({hasText: 'A repeating note was made for this period'})).toBeVisible();
  await expect.poll(async () => (await read(page))?.notes.filter(n => n.title === 'Fictional week plan · 2026-11-23').map(n => n.body)).toEqual(['Week of 2026-11-23\nThree things:']);
  await page.reload(); await hydrated(page);
  await expect.poll(async () => (await read(page))?.notes.filter(n => n.kind === 'topic').length).toBe(1);
  await expect(page.getByRole('link', {name: 'Fictional week plan · 2026-11-23'})).toBeVisible();
  // The daily note template.
  await page.goto('/app/notes?view=days'); await hydrated(page);
  const daily = page.locator('details.note-daily-template-fold');
  await daily.locator('summary').click();
  await daily.getByLabel('A new daily note starts with').fill('Day {date}\nToday I want to:');
  await daily.getByRole('button', {name: 'Save the template'}).click();
  await expect.poll(async () => (await read(page))?.dailyTemplate).toBe('Day {date}\nToday I want to:');
  await page.goto('/app/notes'); await hydrated(page);
  await expect(page.getByRole('textbox', {name: 'This day’s note'})).toHaveValue('Day 2026-11-25\nToday I want to:');
  expect((await read(page))?.notes.filter(n => n.kind === 'daily')).toEqual([]); // nothing written until Save
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
