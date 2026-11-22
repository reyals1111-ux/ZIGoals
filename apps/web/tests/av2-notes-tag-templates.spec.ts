import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #362, Logseq's templates for a tag): Notes → Notes → Templates for tags sets words
 * on #meeting; a new, still empty note given that tag starts from them once (unsaved until Save); "New #meeting note"
 * makes one at once. Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional sync', body: '', createdAt: '2026-11-01T09:00:00.000Z'}]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), NOTES_KEY);
for (const theme of THEMES) test(`${theme}: a template for a tag`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const fold = page.locator('details.note-tag-templates-fold');
  await expect(fold.locator('summary')).toHaveText(/Templates for tags\s*· a new note with a tag starts from its words/);
  await fold.locator('summary').click();
  const form = fold.getByRole('form', {name: 'A template for a tag'});
  await form.getByLabel('Tag', {exact: true}).fill('meeting');
  await form.getByLabel('A new note with this tag starts with').fill('## Who\n\n## Decided on {date}');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await form.getByRole('button', {name: 'Save the template'}).click();
  await expect.poll(async () => (await stored(page)).tagTemplates).toEqual([{tag: 'meeting', body: '## Who\n\n## Decided on {date}'}]);
  await expect(fold.locator('summary')).toHaveText(/· #meeting/);
  // An empty note given the tag starts from it, unsaved until Save.
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.getByLabel('Tags', {exact: true}).fill('meeting');
  // Review b5i B5I-6: the template is chosen once the tag is final (the field is left, or Save).
  await note.getByLabel('Tags', {exact: true}).blur();
  await expect(note.getByRole('textbox', {name: 'Note'})).toHaveValue('## Who\n\n## Decided on 2026-11-22');
  await expect(note.getByRole('status').filter({hasText: 'Started from the #meeting template'})).toBeVisible();
  expect((await stored(page)).notes[0].body).toBe('');
  await note.getByRole('button', {name: 'Save', exact: true}).click();
  await expect.poll(async () => (await stored(page)).notes[0].body).toBe('## Who\n\n## Decided on 2026-11-22');
  // New #meeting note.
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  await page.locator('details.note-tag-templates-fold summary').click();
  await page.getByRole('button', {name: 'New #meeting note'}).click();
  await expect(page.getByRole('region', {name: 'Open note'}).getByRole('heading', {name: /Meeting · Nov 22, 2026/})).toBeVisible();
  await expect.poll(async () => (await stored(page)).notes.find((n: {title: string}) => n.title.startsWith('Meeting'))?.tags).toEqual(['meeting']);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
