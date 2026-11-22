import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r3-notes; LEDGER #264 Obsidian's tick boxes, #267 its highlights): a note's "- [ ]" lines are tick
 * boxes in the reading view (ticking writes "- [x]" into the note, with Undo), "Open tick boxes" gathers the unticked
 * ones across notes, and ==words== are highlights in named colours. Edit offers Tick box and Highlight. At 390 and 1440,
 * in Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data; the API offline.
 */
test.use({timezoneId: 'UTC'});
const NOTES = {version: 1, voice: false, notes: [
  {id: 'n-a', kind: 'topic', title: 'Fictional trip', body: 'Pack ==\u{1F7E2}light== and ==early==.\n\n- [ ] passport\n- [x] tickets', createdAt: '2026-11-01T09:00:00.000Z', updatedAt: '2026-11-20T09:00:00.000Z'},
  {id: 'n-b', kind: 'topic', title: 'Fictional house', body: '- [ ] call the fictional plumber', createdAt: '2026-11-02T09:00:00.000Z', updatedAt: '2026-11-21T09:00:00.000Z'}]};
const stored = (page: import('@playwright/test').Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? '{}') as {notes: {id: string; body: string}[]}, NOTES_KEY);
for (const theme of THEMES) test(`${theme}: tick boxes, gathered, and highlights`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await expect(note.locator('mark.note-hl[data-hl="green"]')).toHaveText('Green highlight: light');
  await expect(note.locator('mark.note-hl[data-hl="yellow"]')).toHaveText('Yellow highlight: early');
  const passport = note.getByRole('checkbox', {name: 'passport'});
  await expect(passport).not.toBeChecked();
  await expect(note.getByRole('checkbox', {name: 'tickets'})).toBeChecked();
  await passport.check();
  await expect(passport).toBeChecked();
  await expect(passport).toBeFocused();
  await expect.poll(async () => (await stored(page)).notes.find(n => n.id === 'n-a')!.body).toContain('- [x] passport');
  await page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true}).click();
  await expect.poll(async () => (await stored(page)).notes.find(n => n.id === 'n-a')!.body).toContain('- [ ] passport');
  await expect(note.getByRole('checkbox', {name: 'passport'})).not.toBeChecked();
  let findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Edit: the two mark buttons.
  await note.getByRole('button', {name: 'Edit'}).click();
  const marks = note.getByRole('group', {name: 'Marks'});
  const field = note.getByRole('textbox', {name: 'Note'});
  await field.focus(); await field.press('Control+End');
  await field.press('Enter'); await field.pressSequentially('charger');
  await marks.getByRole('button', {name: 'Tick box'}).click();
  await expect(field).toBeFocused();
  await expect(field).toHaveValue(/\n- \[ \] charger$/);
  await marks.getByRole('combobox', {name: 'Highlight colour'}).selectOption('red');
  await marks.getByRole('button', {name: 'Highlight', exact: true}).click();
  await expect(field).toHaveValue(/==\u{1F534}highlighted words==/u);
  await note.getByRole('button', {name: 'Cancel changes'}).click();
  // Open tick boxes across notes.
  await page.goto('/app/notes?view=notes'); await hydrated(page);
  const fold = page.locator('details.note-ticks-fold');
  await expect(fold.locator('summary')).toContainText('2 across your notes');
  await fold.locator('summary').click();
  await expect(fold.getByRole('link', {name: 'Fictional house'})).toHaveAttribute('href', '/app/notes?note=n-b');
  // Session AV lane 2 (fixb3: a ticked box leaves this list at once, so check() waited for a box that was gone, deliberate):
  // a click; the next lines hold that it left the list, focus went to the heading and the note now reads "- [x]".
  await fold.getByRole('checkbox', {name: 'call the fictional plumber'}).click();
  await expect(fold.getByRole('checkbox', {name: 'call the fictional plumber'})).toHaveCount(0);
  await expect(page.locator('#notes-ticks-title')).toBeFocused();
  await expect.poll(async () => (await stored(page)).notes.find(n => n.id === 'n-b')!.body).toBe('- [x] call the fictional plumber');
  findings = await axe(page, fold);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
