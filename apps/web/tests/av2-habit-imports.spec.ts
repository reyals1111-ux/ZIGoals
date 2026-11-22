import {mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {expect, test, type Page} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (habits; LEDGER #194, Loop's imports from other habit apps): Settings → Switch to ZIGoals → "From
 * Daylio, Habitica or YNAB" also reads HabitBull's CSV and Tickmate's database backup: a preview first (each habit with its
 * days), nothing written until Import, and "Undo this import" removes exactly what it added. 390 and 1440 in Nebula, Light
 * and Dark, axe-clean, no sideways scroll at 320. Fictional files; the Tickmate one is made here with Node's own SQLite.
 */
const HABITBULL = ['HabitName,HabitDescription,HabitCategory,CalendarDate,Value,CommentText',
  'Fictional reading,Ten pages,Mind,2026-10-01,1,a good chapter', 'Fictional reading,Ten pages,Mind,2026-10-02,1,', 'Fictional push-ups,,Body,2026-10-02,25,'].join('\n');
function tickmate(): Buffer {
  const dir = mkdtempSync(join(tmpdir(), 'zigoals-spec-tickmate-')), path = join(dir, 'tickmate.db');
  try {
    const db = new DatabaseSync(path);
    db.exec('CREATE TABLE tracks (_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, enabled INTEGER DEFAULT 1, description TEXT, icon TEXT, "order" INTEGER)');
    db.exec('CREATE TABLE ticks (_id INTEGER PRIMARY KEY AUTOINCREMENT, _track_id INTEGER, year INTEGER, month INTEGER, day INTEGER, hour INTEGER, minute INTEGER, second INTEGER, has_time_info INTEGER DEFAULT 0)');
    db.exec('CREATE TABLE track2groups (_id INTEGER PRIMARY KEY AUTOINCREMENT, _track_id INTEGER, _group_id INTEGER)');
    db.prepare('INSERT INTO tracks (name, description) VALUES (?, ?)').run('Fictional stretch', 'Morning');
    for (const day of [1, 2, 3]) db.prepare('INSERT INTO ticks (_track_id, year, month, day) VALUES (1, 2026, 9, ?)').run(day);
    db.close();
    return readFileSync(path);
  } finally { rmSync(dir, {recursive: true, force: true}); }
}
const habitTitles = (page: Page) => page.evaluate(() => { const raw = Object.entries(localStorage).find(([k]) => k.endsWith('zigoals:habits:v1'))?.[1]; return raw ? (JSON.parse(raw).habits as {title: string}[]).map(h => h.title) : []; });
async function openMore(page: Page) {
  await page.goto('/app/settings#switch-import');
  const section = page.locator('#switch-import');
  await section.locator('summary', {hasText: 'From Daylio, Habitica or YNAB'}).click();
  return section;
}

test('HabitBull: preview, import, undo', async ({page}) => {
  const section = await openMore(page);
  await section.getByRole('radio', {name: 'HabitBull (habits and amounts)'}).check();
  await section.getByLabel('Choose the HabitBull CSV').setInputFiles({name: 'habitbull.csv', mimeType: 'text/csv', buffer: Buffer.from(HABITBULL)});
  await expect(section.getByText('HabitBull: 2 habits (Fictional reading, Fictional push-ups).')).toBeVisible();
  const list = section.getByRole('list', {name: 'Habits from HabitBull'});
  await expect(list.getByRole('listitem')).toHaveText(['Fictional reading · 2 days from 2026-10-01', 'Fictional push-ups · 1 day from 2026-10-02 · with amounts']);
  await expect(section.getByText(/HabitBull keeps no schedule in this file/)).toBeVisible();
  const before = await habitTitles(page);
  expect(before).not.toContain('Fictional reading');
  await section.getByRole('button', {name: 'Import 2 habits'}).click();
  await expect(section.getByRole('status').filter({hasText: 'Imported from HabitBull: 2 habits.'})).toBeVisible();
  expect(await habitTitles(page)).toEqual([...before, 'Fictional reading', 'Fictional push-ups']);
  await section.getByRole('button', {name: 'Undo this import'}).click();
  await expect(section.getByRole('status').filter({hasText: 'The HabitBull import was undone.'})).toBeVisible();
  expect(await habitTitles(page)).toEqual(before);
});

test('Tickmate: a database backup, previewed; Cancel writes nothing; a CSV chosen instead is refused in plain words', async ({page}) => {
  const section = await openMore(page);
  await section.getByRole('radio', {name: 'Tickmate (tracks and ticks)'}).check();
  await section.getByLabel('Choose the Tickmate database backup').setInputFiles({name: 'tickmate.db', mimeType: 'application/octet-stream', buffer: tickmate()});
  await expect(section.getByText('Tickmate: 1 habit (Fictional stretch).')).toBeVisible();
  await expect(section.getByRole('list', {name: 'Habits from Tickmate'}).getByRole('listitem')).toHaveText(['Fictional stretch · 3 days from 2026-10-01']);
  const before = await habitTitles(page);
  await section.getByRole('button', {name: 'Cancel'}).click();
  expect(await habitTitles(page)).toEqual(before);
  await section.getByLabel('Choose the Tickmate database backup').setInputFiles({name: 'not.db', mimeType: 'text/csv', buffer: Buffer.from(HABITBULL)});
  await expect(section.getByRole('alert')).toHaveText(/^This file is not an SQLite database\. .*Nothing was changed\.$/);
});

for (const theme of THEMES) test(`${theme}: the HabitBull preview`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  const section = await openMore(page);
  await section.getByRole('radio', {name: 'HabitBull (habits and amounts)'}).check();
  await section.getByLabel('Choose the HabitBull CSV').setInputFiles({name: 'habitbull.csv', mimeType: 'text/csv', buffer: Buffer.from(HABITBULL)});
  await expect(section.getByRole('list', {name: 'Habits from HabitBull'})).toBeVisible();
  const findings = await axe(page, section.locator('.switch-more'));
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
