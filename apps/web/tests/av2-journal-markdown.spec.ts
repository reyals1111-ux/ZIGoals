import {readFile} from 'node:fs/promises';
import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {JOURNAL_KEY} from '../lib/journal/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #272, Grid Diary's Markdown export): Journal → Import and export → Export the
 * journal saves one ZIP holding journal.json and one .md file per entry in Markdown/ (front matter with its day and
 * journal). The ZIP is stored (not compressed), so its names and front matter read as bytes. At 390 and 1440, Nebula,
 * Light and Dark, axe-clean. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC', acceptDownloads: true});
for (const theme of THEMES) test(`${theme}: the journal exported as Markdown files too`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(k => { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({version: 1, shareWithAi: false, followUps: false, entries: [
    {id: 'e1', date: '2026-11-20', text: 'A fictional walk by the sea.', createdAt: '2026-11-20T20:00:00.000Z', tags: ['sea']},
    {id: 'e2', date: '2026-11-22', text: 'What went well this week:\nFictional runs.', createdAt: '2026-11-22T08:00:00.000Z', period: '2026-W47'}]})); }, JOURNAL_KEY);
  await page.goto('/app/journal'); await hydrated(page);
  const fold = page.locator('details.journal-files-fold');
  await fold.locator('summary').click();
  await expect(fold.getByText('each entry as its own Markdown file')).toBeVisible();
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  const [download] = await Promise.all([page.waitForEvent('download'), fold.getByRole('button', {name: 'Export the journal'}).click()]);
  expect(download.suggestedFilename()).toBe('zigoals-journal-2026-11-22.zip');
  const bytes = (await readFile((await download.path())!)).toString('utf8');
  expect(bytes).toContain('journal.json');
  expect(bytes).toContain('Markdown/2026-11-20 A fictional walk by the sea.md');
  expect(bytes).toContain('Markdown/2026-11-22 What went well this week.md');
  expect(bytes).toContain('---\ndate: 2026-11-20\n');
  expect(bytes).toContain('tags: ["sea"]');
  expect(bytes).toContain('period: "2026-W47"');
});
