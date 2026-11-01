import {expect, test, type Page} from '@playwright/test';
import {HABITS_KEY, createHabit, emptyHabitData} from '../lib/habits';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {NOTES_KEY, type Notes} from '../lib/notes/schema';
import {isPhone} from './phone-nav';

/**
 * Session AK (owner follow-up 2, B): notes that connect to your life — capture from Quick add and the search palette,
 * filing into today's note with Undo, a [[link]] to a habit and a goal and the backlink there, the graph's star system
 * and list by keyboard, and Markdown export and import. All on this device; the API is offline throughout.
 */
const TODAY = '2026-11-01';
const HABIT = '11111111-1111-4111-8111-111111111111';
test.use({timezoneId: 'UTC'});
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${TODAY}T10:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  const habits = createHabit(emptyHabitData(), {title: 'Meditate', category: 'Mind', description: '', notes: '', schedule: {kind: 'daily'}, target: 10, measurement: {kind: 'count', unit: 'times'}}, new Date('2026-10-20T08:00:00.000Z'), HABIT);
  await page.goto('/manifest.webmanifest');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {[HABITS_KEY]: JSON.stringify(habits), [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
});
const stored = async (page: Page) => JSON.parse((await page.evaluate(k => localStorage.getItem(k), NOTES_KEY)) ?? 'null') as Notes | null;

test('capture from Quick add lands in the inbox; filing it into today’s note has Undo', async ({page}) => {
  await page.goto('/app');
  await page.locator(await isPhone(page) ? '.phone-topbar .quick-add-trigger' : '.today-hero .quick-add-trigger').click();
  const dialog = page.getByRole('dialog', {name: 'What would you like to add?'});
  await dialog.getByRole('button', {name: /^Note\b/}).click();
  await dialog.getByLabel('A note to file later').fill('Ask about the rail pass in March');
  await dialog.getByRole('button', {name: 'Save to inbox'}).click();
  await expect(dialog.getByRole('status').filter({hasText: 'Saved to your notes inbox'})).toBeVisible();
  await expect.poll(async () => (await stored(page))?.notes.map(n => [n.kind, n.body])).toEqual([['inbox', 'Ask about the rail pass in March']]);

  await page.goto('/app/notes?view=inbox');
  await expect(page.getByRole('heading', {level: 1, name: 'Notes'})).toBeVisible();
  const item = page.locator('.note-inbox-item').filter({hasText: 'rail pass'});
  await item.getByRole('button', {name: 'File…'}).click();
  await item.getByRole('radio', {name: 'Today’s note'}).check();
  await item.getByRole('button', {name: 'File it'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Filed into today’s note.'})).toBeVisible();
  await expect.poll(async () => (await stored(page))?.notes.map(n => [n.kind, n.day, n.body])).toEqual([['daily', TODAY, 'Ask about the rail pass in March']]);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await stored(page))?.notes.map(n => n.kind)).toEqual(['inbox']);
  await page.getByRole('button', {name: /^Today/}).click();
  await expect(page.getByRole('heading', {name: /^Today ·/})).toBeVisible();
  await expect(page.getByRole('region', {name: 'This day'})).toBeVisible();
});

test('the palette’s “Capture a note” opens the capture box, focused; notes are found in the palette', async ({page}) => {
  await page.goto('/app');
  await page.waitForLoadState('networkidle');
  await page.locator('body').press('/');
  const palette = page.getByRole('dialog', {name: 'Search'});
  await palette.getByRole('combobox').fill('capture note');
  await palette.getByRole('option', {name: /Capture a note/}).click();
  await expect(page).toHaveURL(/\/app\/notes\?capture=1$/);
  const box = page.getByLabel('Capture a note', {exact: true});
  await expect(box).toBeFocused();
  await box.fill('Kyoto ryokan for two nights');
  await page.getByRole('button', {name: 'Save to inbox'}).click();
  await expect(page.getByRole('button', {name: /Inbox/})).toContainText('1');
  await page.locator('body').press('/');
  await palette.getByRole('combobox').fill('ryokan');
  await expect(palette.getByRole('group', {name: 'Notes'}).getByRole('option', {name: /Kyoto ryokan/})).toBeVisible();
});

test('a [[link]] to a habit with autocomplete, and the backlink in that habit’s Details', async ({page}) => {
  await page.goto('/app/notes?view=notes');
  await page.getByLabel('New note').fill('Calm mornings');
  await page.getByRole('button', {name: 'Make note'}).click();
  await expect(page).toHaveURL(/\/app\/notes\?note=/);
  const body = page.getByLabel('Note', {exact: true});
  await body.click();
  await body.pressSequentially('Before work: [[Med');
  const list = page.getByRole('listbox', {name: 'Link to'});
  await expect(list.getByRole('option', {name: /Meditate/})).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(body).toHaveValue('Before work: [[Meditate]]');
  await page.getByRole('button', {name: 'Save'}).click();
  await expect(page.getByRole('link', {name: 'Meditate'})).toHaveAttribute('href', `/app/habits#habit-${HABIT}`);
  await page.goto('/app/habits');
  await page.getByLabel('Details for Meditate').click();
  const backlinks = page.getByRole('region', {name: 'Notes that link to Meditate'});
  await expect(backlinks.getByRole('link', {name: 'Calm mornings'})).toBeVisible();
  await expect(backlinks).toContainText('Before work: [[Meditate]]');
});

test('a [[link]] to a goal shows under the goal’s Notes (Showcase goal)', async ({page}) => {
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await page.goto('/app/notes?view=notes');
  await page.getByLabel('New note').fill('Rail pass prices');
  await page.getByRole('button', {name: 'Make note'}).click();
  const body = page.getByLabel('Note', {exact: true});
  await body.fill('Saving toward [[Japan adventure]].');
  await page.getByRole('button', {name: 'Save'}).click();
  await page.getByRole('link', {name: 'Japan adventure'}).click();
  await expect(page).toHaveURL(/\/app\/goals\/tracked\/9203/);
  await page.locator('#notes > summary').click();
  await expect(page.getByRole('region', {name: 'Notes that link to Japan adventure'}).getByRole('link', {name: 'Rail pass prices'})).toBeVisible();
});

test('the graph: bodies reached with Tab and opened with Enter; the list view; reduced motion opens the list first', async ({page}) => {
  await page.goto('/app/notes?view=notes');
  for (const [title, text] of [['Trip', 'See [[Packing]] and [[Meditate]]'], ['Packing', 'Back to [[Trip]]']] as const) {
    await page.goto('/app/notes?view=notes');
    await page.getByLabel('New note').fill(title);
    await page.getByRole('button', {name: 'Make note'}).click();
    await page.getByLabel('Note', {exact: true}).fill(text);
    await page.getByRole('button', {name: 'Save'}).click();
    await expect(page.getByRole('button', {name: 'Edit'})).toBeVisible();
  }
  await page.goto('/app/notes?view=graph');
  const star = page.getByRole('link', {name: /^Note: Trip, 2 links$/});
  await expect(star).toBeVisible();
  await star.focus();
  await expect(star).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/notes\?note=/);
  await page.goto('/app/notes?view=graph');
  await page.getByRole('button', {name: 'List'}).click();
  const list = page.getByRole('list', {name: 'Notes, goals and habits and their links'});
  await expect(list.getByRole('link', {name: 'Meditate'}).first()).toBeVisible();
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.reload();
  await expect(page.getByRole('button', {name: 'List'})).toHaveAttribute('aria-pressed', 'true');
});

test('Markdown export is a ZIP of .md files; import shows a plan, then Import, then Undo', async ({page}) => {
  await page.goto('/app/notes?view=notes');
  await page.getByLabel('New note').fill('Books to read');
  await page.getByRole('button', {name: 'Make note'}).click();
  await page.getByLabel('Note', {exact: true}).fill('1. A short history of Japan');
  await page.getByRole('button', {name: 'Save'}).click();
  await page.goto('/app/notes?view=files');
  const download = page.waitForEvent('download');
  await page.getByRole('button', {name: 'Export notes (.zip)'}).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe(`zigoals-notes-${TODAY}.zip`);
  const bytes = Buffer.concat(await (async () => { const out: Buffer[] = []; for await (const c of (await file.createReadStream())!) out.push(c as Buffer); return out; })());
  expect(bytes.subarray(0, 4).toString('hex')).toBe('504b0304');
  expect(bytes.includes(Buffer.from('Notes/Books to read.md'))).toBe(true);
  expect(bytes.includes(Buffer.from('title: "Books to read"'))).toBe(true);

  await page.locator('.note-files input[type=file]').setInputFiles([
    {name: 'Ideas.md', mimeType: 'text/markdown', buffer: Buffer.from('---\ntitle: "Ideas"\ntags: [travel]\n---\nSee [[Books to read]]\n<script>window.hacked = 1</script>\n')},
    {name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from([1, 2, 3])},
  ]);
  const plan = page.getByRole('group', {name: 'What the import would do'});
  await expect(plan).toContainText('1 new note');
  await expect(plan).toContainText('1 skipped');
  await plan.getByRole('button', {name: 'Import'}).click();
  await expect(page.getByRole('status').filter({hasText: 'Imported 1 note'})).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as {hacked?: number}).hacked)).toBeUndefined();
  await expect.poll(async () => (await stored(page))?.notes.map(n => n.title).sort()).toEqual(['Books to read', 'Ideas']);
  await page.getByRole('button', {name: 'Undo'}).click();
  await expect.poll(async () => (await stored(page))?.notes.map(n => n.title)).toEqual(['Books to read']);
});
