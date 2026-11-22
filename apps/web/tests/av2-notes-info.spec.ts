import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #311, Bear's info panel): an open note's "Note info" says its words, characters,
 * minutes to read (as an estimate) and when it was made and last changed. At 390 and 1440, Nebula, Light and Dark,
 * axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC', locale: 'en-US'});
const body = Array.from({length: 500}, (_, i) => `word${i}`).join(' ');
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional essay', body, createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-20T15:30:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: note info`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'}), info = note.locator('details.note-info-fold');
  await expect(info.locator('summary')).toHaveText(/Note info\s*· 500 words/);
  await info.locator('summary').click();
  await expect(info.locator('.note-info > div')).toHaveText([/Words\s*500/, /Characters\s*[\d,]+/, /Reading time\s*About 2 minutes\s*\(an estimate at 230 words a minute\)/, /Made\s*Nov 1, 2026/, /Last changed\s*Nov 20, 2026/]);
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
