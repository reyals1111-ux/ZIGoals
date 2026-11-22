import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #361, Logseq's embeds in Obsidian's form): a line `![[Note#Heading]]` draws that
 * section of the other note as a quiet quote with a link to it, and follows its source; a locked note shows nothing of
 * itself there. Nebula, Light and Dark, axe-clean, no sideways scroll at 320.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-src', kind: 'topic', title: 'Fictional trip', body: '# Trip\nIntro.\n## Packing\n- socks\n- warm hat\n## Money\nCash only.', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-lock', kind: 'topic', title: 'Fictional diary', body: 'Private fictional words.', locked: true, createdAt: '2026-11-02T09:00:00.000Z'},
  {id: 'n-host', kind: 'topic', title: 'Fictional weekend', body: 'What to bring:\n\n![[Fictional trip#Packing]]\n\n![[Fictional diary]]', createdAt: '2026-11-03T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: a section of another note inside this one`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-host'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  const quote = note.getByRole('figure', {name: 'From “Fictional trip › Packing”'});
  await expect(quote).toContainText('Packing');
  await expect(quote).toContainText('warm hat');
  await expect(quote).not.toContainText('Cash only');
  await expect(quote.getByRole('link', {name: 'From “Fictional trip › Packing”'})).toHaveAttribute('href', '/app/notes?note=n-src');
  const locked = note.getByRole('figure', {name: 'From “Fictional diary”'});
  await expect(locked).toContainText('“Fictional diary” is locked: nothing of it shows here.');
  await expect(note).not.toContainText('Private fictional words');
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // It follows its source.
  await page.goto('/app/notes?note=n-src'); await hydrated(page);
  await note.getByRole('button', {name: 'Edit', exact: true}).click();
  await note.getByRole('textbox', {name: 'Note'}).fill('# Trip\nIntro.\n## Packing\n- socks\n- rain coat\n## Money\nCash only.');
  await note.getByRole('button', {name: 'Save', exact: true}).click();
  await page.goto('/app/notes?note=n-host'); await hydrated(page);
  await expect(quote).toContainText('rain coat');
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
