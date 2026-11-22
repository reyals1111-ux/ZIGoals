import {readFile} from 'node:fs/promises';
import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #366, Craft): Notes → Files → "Daily notes from … to …" exports only the daily
 * notes of the chosen days as Markdown in a ZIP. Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'd1', kind: 'daily', title: '2026-11-01', day: '2026-11-01', body: 'Fictional first.', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'd2', kind: 'daily', title: '2026-11-10', day: '2026-11-10', body: 'Fictional tenth.', createdAt: '2026-11-10T09:00:00.000Z'},
  {id: 'd3', kind: 'daily', title: '2026-11-20', day: '2026-11-20', body: 'Fictional twentieth.', createdAt: '2026-11-20T09:00:00.000Z'},
  {id: 't', kind: 'topic', title: 'Fictional topic', body: 'Not a day.', createdAt: '2026-11-02T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: daily notes for a range of days`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?view=files'); await hydrated(page);
  const range = page.getByRole('group', {name: 'Daily notes from … to …'});
  await expect(range.getByLabel('From')).toHaveValue('2026-11-01');
  await expect(range).toContainText('3 daily notes in these days');
  await range.getByLabel('From').fill('2026-11-05');
  await range.getByLabel('To').fill('2026-11-20');
  await expect(range).toContainText('2 daily notes in these days, with their photos.');
  const findings = await axe(page, range);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const wait = page.waitForEvent('download');
  await range.getByRole('button', {name: 'Export these daily notes (.zip)'}).click();
  const file = await wait;
  expect(file.suggestedFilename()).toBe('zigoals-daily-notes-2026-11-05-to-2026-11-20.zip');
  const bytes = (await readFile((await file.path())!)).toString('latin1');
  expect(bytes).toContain('Fictional tenth.'); expect(bytes).toContain('Fictional twentieth.');
  expect(bytes).not.toContain('Fictional first.'); expect(bytes).not.toContain('Not a day.');
  await expect(page.getByText('2 daily notes saved as Markdown in a ZIP, made on this device.')).toBeVisible();
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
