import {expect, test, type Page} from '@playwright/test';
import {openAllSettingsGroups} from './settings-open';
import {axe, THEMES, applyTheme} from './p6-helpers';

/**
 * Session AV lane 2 (N6 #193, Loop Habit Tracker's automatic backups): Settings → Your data → "A copy on a schedule". The
 * browser's folder picker is answered with a folder in the page's own private file system (navigator.storage, the same
 * File System Access handles a chosen folder gives), so the copy is really written and read back. Nothing leaves the
 * browser. Where the browser has no folder picker, the schedule reminds instead.
 */
const KEY = 'zigoals:backup-reminder:v1';
async function seed(page: Page, picker: boolean) {
  await page.addInitScript(({picker}) => {
    if (picker) Object.defineProperty(window, 'showDirectoryPicker', {configurable: true, value: async () => (await navigator.storage.getDirectory()).getDirectoryHandle('Backups', {create: true})});
    else Reflect.deleteProperty(window, 'showDirectoryPicker');
  }, {picker});
}
const section = (page: Page) => page.getByRole('region', {name: 'A copy on a schedule'});
const written = (page: Page) => page.evaluate(async () => { const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle('Backups', {create: true}); const out: {name: string; head: number[]}[] = []; for await (const [name, h] of (dir as unknown as {entries: () => AsyncIterable<[string, FileSystemFileHandle]>}).entries()) out.push({name, head: [...new Uint8Array(await (await h.getFile()).slice(0, 2).arrayBuffer())]}); return out; });

for (const theme of THEMES) test(`${theme}: choose how often and a folder; a copy is written there now and again when one is due on opening the app`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await seed(page, true);
  await page.goto('/app/settings/data');
  await openAllSettingsGroups(page);
  const box = section(page);
  await expect(box).toContainText('Choose how often, and ZIGoals keeps a copy of everything for you: in a folder you choose once');
  const often = box.getByRole('group', {name: 'How often'});
  await expect(often.getByRole('radio', {name: 'Off', exact: true})).toBeChecked();
  await often.getByRole('radio', {name: 'Every week', exact: true}).check();
  await expect(box.getByRole('status')).toHaveText('A copy every week. Choose a folder to have it written there by itself.');
  await box.getByRole('button', {name: 'Choose a folder…'}).click();
  await expect(box.getByRole('status')).toHaveText('Copies go into “Backups”.');
  await expect(box.getByRole('button', {name: 'Change the folder…'})).toBeFocused();
  await box.getByRole('button', {name: 'Make a copy now'}).click();
  await expect(box.getByRole('status')).toHaveText(/^Saved “zigoals-export-\d{4}-\d{2}-\d{2}\.zip” in “Backups”\.$/, {timeout: 30_000});
  const files = await written(page);
  expect(files).toHaveLength(1); expect(files[0]!.head).toEqual([80, 75]);
  const rec = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), KEY);
  expect(rec.schedule).toMatchObject({every: 'week', folder: 'Backups'}); expect(rec.schedule.lastOn).toBe(rec.savedOn);
  await expect(box).toContainText('Next copy');
  const findings = await axe(page, box);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  for (const target of await box.locator('label, button').evaluateAll(els => els.map(e => e.getBoundingClientRect().height))) expect(target).toBeGreaterThanOrEqual(44);
  // A week later: opening the app writes the next copy by itself and says so once.
  await page.evaluate(k => { const r = JSON.parse(localStorage.getItem(k)!); r.schedule.lastOn = r.savedOn = '2026-01-01'; localStorage.setItem(k, JSON.stringify(r)); }, KEY);
  await page.goto('/app');
  await expect(page.getByText(/^A copy of everything was saved in your backup folder \(zigoals-export-/)).toBeVisible({timeout: 30_000});
  await page.setViewportSize({width: 320, height: 720});
  await page.goto('/app/settings/data');
  await openAllSettingsGroups(page);
  await expect(section(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

test('a browser without a folder picker: the schedule reminds on opening the app, linking to Your data; Off turns it off', async ({page}) => {
  await seed(page, false);
  await page.goto('/app/settings/data');
  await openAllSettingsGroups(page);
  const box = section(page);
  await box.getByRole('group', {name: 'How often'}).getByRole('radio', {name: 'Every day', exact: true}).check();
  await expect(box.getByRole('group', {name: 'How often'})).toHaveAccessibleDescription(/This browser cannot write into a folder by itself, so when a copy is due ZIGoals reminds you/);
  await expect(box.getByRole('button', {name: 'Choose a folder…'})).toHaveCount(0);
  await page.goto('/app');
  const link = page.getByRole('link', {name: 'Make it'});
  await expect(page.getByText('Your scheduled copy is due.')).toBeVisible({timeout: 30_000});
  await expect(link).toHaveAttribute('href', '/app/settings/data#backup-schedule');
  await page.goto('/app/settings/data');
  await openAllSettingsGroups(page);
  await section(page).getByRole('group', {name: 'How often'}).getByRole('radio', {name: 'Off', exact: true}).check();
  await expect(section(page).getByRole('status')).toHaveText('No scheduled copy. The monthly reminder below still works.');
  expect((await page.evaluate(k => JSON.parse(localStorage.getItem(k)!), KEY)).schedule).toBeUndefined();
});
