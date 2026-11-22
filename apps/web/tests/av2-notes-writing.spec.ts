import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #316, Bear's typewriter mode): Write in full screen shows the note alone in a modal
 * dialog; words written there go back to the editor; Typewriter (kept on this device) keeps the line being written in
 * the middle; Esc or Done closes it with focus back on its button. At 390 and 1440, Nebula, Light and Dark, axe-clean.
 */
test.use({timezoneId: 'UTC'});
const body = Array.from({length: 80}, (_, i) => `Fictional line ${i + 1}.`).join('\n');
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional long draft', body, createdAt: '2026-11-01T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: the writing view`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'});
  await note.getByRole('button', {name: 'Edit'}).click();
  await note.getByRole('button', {name: 'Write in full screen'}).click();
  const dialog = page.getByRole('dialog', {name: 'Fictional long draft'});
  await expect(dialog).toBeVisible();
  const field = dialog.getByLabel('The words of Fictional long draft');
  await expect(field).toBeFocused();
  const box = (await dialog.boundingBox())!, view = page.viewportSize()!;
  expect(box.width).toBeGreaterThanOrEqual(view.width - 1); expect(box.height).toBeGreaterThanOrEqual(view.height - 1);
  const findings = await axe(page, dialog);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // Typewriter: the caret's line sits near the middle of the field.
  await dialog.getByRole('button', {name: 'Typewriter'}).click();
  await expect(dialog.getByRole('button', {name: 'Typewriter'})).toHaveAttribute('aria-pressed', 'true');
  await field.press('End'); await field.pressSequentially(' More.');
  const centred = await field.evaluate((el: HTMLTextAreaElement) => {
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight), before = el.value.slice(0, el.selectionStart).split('\n').length - 1;
    const paddingTop = parseFloat(getComputedStyle(el).paddingTop), y = paddingTop + before * lineHeight - el.scrollTop;
    return Math.abs(y + lineHeight / 2 - el.clientHeight / 2) / el.clientHeight;
  });
  expect(centred).toBeLessThan(0.2);
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).typewriter, NOTES_KEY)).toBe(true);
  // Esc goes back; the words are in the editor, not saved yet.
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(note.getByRole('button', {name: 'Write in full screen'})).toBeFocused();
  await expect(note.getByLabel('Note', {exact: true})).toHaveValue(/Fictional line 80\. More\.$/);
  await note.getByRole('button', {name: 'Save'}).click();
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).notes[0].body.endsWith('More.'), NOTES_KEY)).toBe(true);
});
