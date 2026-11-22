import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #314, Bear's callouts): `> [!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]` and
 * `[!CAUTION]` are drawn in Notes as five calm boxes, each named by its word (role note), a plain quote stays a quote,
 * and the words are kept as written. At 390 and 1440, Nebula, Light and Dark, axe-clean (contrast included), no
 * sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'UTC'});
const body = ['> [!NOTE]', '> The office opens at nine.', '', '> [!TIP] Pack light', '> One bag is enough.', '', '> [!IMPORTANT]', '> Bring the passport.', '', '> [!WARNING]', '> The pan is hot.', '', '> [!CAUTION]', '> Do not feed the fictional geese.', '', '> Just a quote.'].join('\n');
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional callouts', body, createdAt: '2026-11-01T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: callouts`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  const boxes = note.locator('.note-render [role="note"]');
  await expect(boxes).toHaveCount(5);
  await expect(boxes.locator('.note-callout-head strong')).toHaveText(['Note', 'Tip', 'Important', 'Warning', 'Caution']);
  await expect(note.getByRole('note', {name: 'Tip'})).toContainText('Tip: Pack light');
  await expect(note.getByRole('note', {name: 'Tip'})).toContainText('One bag is enough.');
  await expect(note.locator('.note-render blockquote')).toHaveText('Just a quote.');
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await note.getByRole('button', {name: 'Edit'}).click();
  await expect(note.getByLabel('Note', {exact: true})).toHaveValue(body);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
