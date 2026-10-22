import {expect, test, type Page} from '@playwright/test';
import {UI_PREFS_KEY} from '../lib/ab-design-keys';
import {NEBULA_GLYPH_STOPS} from '../components/orbit-path/nebula-glyph';
import {TITLE, seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish (ADR-030 J14; owner Part 7): the List view, Todoist-style in our design. One section per orbit under a
 * banner in the orbit's node colour (no planets), with its count and a fold; rows with the path's own node as the
 * checkbox (matte, then lit; the nebula glyph), a second line, "+" for items taking several check-ins and ⋯; done rows
 * move into "Done · n"; "+ Add to … Orbit" opens Edit path with that orbit chosen; the keyboard moves, ticks and opens ⋯.
 */
async function open(page: Page) {
  await seedChecklist(page, {extra: {[UI_PREFS_KEY]: JSON.stringify({version: 1, checklist: {view: 'list'}})}});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await expect(page.locator('.checklist-list-view')).toBeVisible();
}

test('sections per orbit in their node colour, rows with the node as checkbox, no planets; a tick lights it and moves it into "Done · n"', async ({page}) => {
  await open(page);
  const sections = page.locator('.checklist-list-section');
  await expect(sections).toHaveCount(3);
  await expect(page.locator('.checklist-list-banner h3')).toHaveText(['Morning Orbit', 'Afternoon Orbit', 'Evening Orbit']);
  await expect(page.locator('.checklist-list-view .orbit-planet')).toHaveCount(0);
  // The banner's colour is its first node's.
  const tones = await sections.evaluateAll(ss => ss.map(s => [getComputedStyle(s).getPropertyValue('--orbit').trim(), getComputedStyle(s.querySelector('.checklist-row-check')!).getPropertyValue('--node').trim()]));
  for (const [orbit, node] of tones) expect(orbit).toBe(node);
  const stretch = page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true});
  expect(await stretch.evaluate(b => [b.classList.contains('orbit-node'), b.hasAttribute('data-lit'), [...b.querySelectorAll('svg.nebula-glyph stop')].map(s => s.getAttribute('stop-color'))])).toEqual([true, false, NEBULA_GLYPH_STOPS.map(s => s.hex)]);
  const box = (await stretch.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(34); expect(box.width).toBeLessThanOrEqual(36);
  await stretch.click();
  const done = page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true});
  await expect(done).toHaveAttribute('data-lit', '');
  // A moment later it moves into the morning's "Done · 1" fold (closed), and the toast keeps Undo.
  const fold = sections.first().locator('details.checklist-list-done');
  await expect(fold.locator('summary')).toHaveText('Done · 1');
  await expect(done).toBeHidden();
  await fold.locator('summary').click();
  await expect(done).toBeVisible();
  await expect(page.locator('.aa-toast').getByRole('button', {name: 'Undo', exact: true})).toBeVisible();
  // A row's second line says what it is.
  await expect(sections.nth(1).locator('.checklist-row-sub').first()).toContainText('Habit');
});

test('keyboard: arrows move between rows, Space ticks, the context-menu key opens ⋯; "+" logs the usual amount; the fold folds', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.checklist-row-check:focus')).toHaveAttribute('data-step', /.+/);
  const second = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  expect(second).toMatch(/^Water/);
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true})).toBeFocused();
  await page.keyboard.press('ContextMenu');
  await expect(page.locator('.checklist-row-panel')).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(page.locator('.checklist-row-panel')).toHaveCount(0);
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).focus();
  await page.keyboard.press('Space');
  await expect(page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true})).toHaveAttribute('data-lit', '');
  // "+": the push-ups habit logs its usual amount in one tap (the real record, with Undo).
  const plus = page.getByRole('button', {name: new RegExp(`^Log \\d+ .* for ${TITLE.push}$`)});
  await expect(plus).toBeVisible();
  await plus.click();
  await expect(page.locator('.aa-toast')).toContainText(TITLE.push);
  // The fold: a section folds and opens.
  const morning = page.getByRole('button', {name: 'Fold Morning Orbit'});
  await morning.click();
  await expect(page.getByRole('button', {name: 'Open Morning Orbit'})).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('list', {name: 'Morning Orbit'})).toHaveCount(0);
});

test('"+ Add to Evening Orbit" opens Edit path with Evening chosen and its name field focused', async ({page}) => {
  await open(page);
  await page.getByRole('button', {name: 'Add to Evening Orbit'}).click();
  const edit = page.getByRole('region', {name: 'Edit path'});
  await expect(edit).toBeVisible();
  await expect(edit.getByRole('textbox', {name: 'What to do'})).toBeFocused();
  await expect(edit.getByRole('radiogroup', {name: 'Orbit'}).getByRole('radio', {checked: true})).toHaveText(/Evening/);
});
