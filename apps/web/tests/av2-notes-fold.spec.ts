import {expect, test} from '@playwright/test';
import {axe, THEMES, applyTheme} from './p6-helpers';
import {freshDevice, hydrated, offlineApi} from './ah-helpers';
import {NOTES_KEY} from '../lib/notes/schema';

/**
 * Session AV lane 2 (r4-notes; LEDGER #313, Bear's folding): in the reading view each heading with words under it folds
 * them up to the next heading of its level; Fold all and Open all; the outline opens the folds hiding a heading. Nothing
 * is stored. At 390 and 1440, Nebula, Light and Dark, axe-clean, no sideways scroll at 320. Fictional data.
 */
test.use({timezoneId: 'UTC'});
const body = ['# Fictional trip', 'Start here.', '## Money', 'A budget.', '## Packing', 'Bags.', '### Shoes', 'Two pairs.'].join('\n\n');
const NOTES = {version: 1, voice: false, notes: [{id: 'n-a', kind: 'topic', title: 'Fictional long note', body, createdAt: '2026-11-01T09:00:00.000Z'}]};
for (const theme of THEMES) test(`${theme}: fold a section`, async ({page, isMobile}) => {
  await applyTheme(page, theme);
  if (!isMobile) await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: new Date('2026-11-22T09:00:00.000Z')});
  await offlineApi(page);
  await freshDevice(page);
  await page.addInitScript(([k, v]) => { if (!localStorage.getItem(k)) localStorage.setItem(k, v); }, [NOTES_KEY, JSON.stringify(NOTES)] as const);
  await page.goto('/app/notes?note=n-a'); await hydrated(page);
  const note = page.getByRole('region', {name: 'Open note'}), render = note.locator('.note-render');
  await note.getByRole('button', {name: 'Fold “Packing”'}).click();
  await expect(render).not.toContainText('Bags.'); await expect(render).not.toContainText('Shoes');
  await expect(render).toContainText('A budget.');
  await expect(note.getByRole('button', {name: 'Open “Packing” (3 parts folded)'})).toHaveAttribute('aria-expanded', 'false');
  await expect(note.getByRole('button', {name: 'Open “Packing” (3 parts folded)'})).toBeFocused();
  const findings = await axe(page, note);
  expect(findings.filter(v => v.impact === 'serious' || v.impact === 'critical'), JSON.stringify(findings)).toEqual([]);
  // The outline opens the folds hiding a heading.
  const outline = note.getByRole('navigation', {name: 'Outline of this note'});
  await outline.locator('summary').click();
  await outline.getByRole('button', {name: 'Shoes'}).click();
  await expect(render.locator('h5', {hasText: 'Shoes'})).toBeFocused();
  await expect(render).toContainText('Bags.');
  // Fold all and Open all.
  const all = note.getByRole('group', {name: 'Fold the sections of this note'});
  await all.getByRole('button', {name: 'Fold all'}).click();
  await expect(render.locator('h3, h4, h5')).toHaveText(['Fictional trip']);
  await expect(all.getByRole('button', {name: 'Fold all'})).toBeDisabled();
  await all.getByRole('button', {name: 'Open all'}).click();
  await expect(render).toContainText('Two pairs.');
  expect(await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).notes[0].body, NOTES_KEY)).toBe(body);
  await page.setViewportSize({width: 320, height: 720});
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});
