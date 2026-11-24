import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r5-notes; LEDGER #358, Logseq's unlinked references): an open note lists, under its backlinks,
 * "Mentioned without a link": the notes naming its title without linking it, each with its line; Link it writes the
 * [[link]] (the earlier words kept under Earlier versions, Undo in the message). Nebula, Light and Dark, axe-clean.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-t', kind: 'topic', title: 'Garden plan', body: 'Beds and seeds.', createdAt: '2026-11-01T09:00:00.000Z'},
  {id: 'n-a', kind: 'topic', title: 'Fictional spring', body: 'Read the garden plan again before May.', createdAt: '2026-11-02T09:00:00.000Z'},
  {id: 'n-l', kind: 'topic', title: 'Fictional locked', body: 'The garden plan, privately.', locked: true, createdAt: '2026-11-03T09:00:00.000Z'}]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}'), NOTES_KEY);
for (const theme of THEMES) test(`${theme}: mentions without a link`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-t'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  const fold = note.locator('details.note-unlinked-fold');
  await expect(fold.locator('summary')).toHaveText(/Mentioned without a link\s*· 1 note/);
  await fold.locator('summary').click();
  await expect(fold.locator('.note-unlinked li')).toHaveCount(1);
  await expect(fold).toContainText('Read the garden plan again before May.');
  await expect(fold).not.toContainText('privately');
  const findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await fold.getByRole('button', {name: /^Link it/}).click();
  await expect(page.getByText('Linked: “Fictional spring” now links here.').first()).toBeVisible();
  await expect.poll(async () => (await stored(page)).notes.find((n: {id: string}) => n.id === 'n-a').body).toBe('Read the [[Garden plan|garden plan]] again before May.');
  await expect.poll(async () => (await stored(page)).versions?.length ?? 0).toBe(1);
  await expect(note.locator('.note-backlinks')).toContainText('Fictional spring');
  await expect(note.locator('details.note-unlinked-fold summary')).toHaveText(/· none/);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
