import {expect, test, type Page} from '@playwright/test';
import {UI_PREFS_KEY} from '../lib/ab-design-keys';
import {NEBULA_GLYPH_STOPS} from '../components/orbit-path/nebula-glyph';
import {TITLE, seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish (ADR-030 J14; owner Part 7): the List view, Todoist-style in our design. One section per orbit under a
 * banner in the orbit's node colour (no planets), with its count and a fold; rows with the path's own node as the
 * checkbox (matte, then lit; the nebula glyph), a second line, "+" for items taking several check-ins and ⋯; done rows
 * stay in place (Session AG Polish 3, owner Part 4: no "Done · n" fold); banners and rows share one column; "+ Add to …
 * Orbit" opens Edit path with that orbit chosen; the keyboard moves, ticks and opens ⋯.
 */
async function open(page: Page) {
  await seedChecklist(page, {extra: {[UI_PREFS_KEY]: JSON.stringify({version: 1, checklist: {view: 'list'}})}});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await expect(page.locator('.checklist-list-view')).toBeVisible();
}

test('sections per orbit in their node colour, rows with the node as checkbox, no planets; a tick lights it where it stands', async ({page}) => {
  await open(page);
  const sections = page.locator('.checklist-list-section');
  await expect(sections).toHaveCount(3);
  await expect(page.locator('.checklist-list-banner h3')).toHaveText(['Morning Orbit', 'Afternoon Orbit', 'Evening Orbit']);
  await expect(page.locator('.checklist-list-view .orbit-planet')).toHaveCount(0);
  // The banner's colour is its first node's.
  const tones = await sections.evaluateAll(ss => ss.map(s => [getComputedStyle(s).getPropertyValue('--orbit').trim(), getComputedStyle(s.querySelector('.checklist-row-check')!).getPropertyValue('--node').trim()]));
  for (const [orbit, node] of tones) expect(orbit).toBe(node);
  const stretch = page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true});
  expect(await stretch.evaluate(b => [!!b.querySelector(':scope > .orbit-node'), b.hasAttribute('data-lit'), [...b.querySelectorAll('svg.nebula-glyph stop')].map(s => s.getAttribute('stop-color'))])).toEqual([true, false, NEBULA_GLYPH_STOPS.map(s => s.hex)]);
  // Session AG Polish 2 (owner Part 6b), moved at greater strength: the path's own node at the path's own size (was 34 px
  // inside a 44 px target) — the node is the target, at least 44 px.
  const node = (await stretch.locator(':scope > .orbit-node').boundingBox())!, box = (await stretch.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
  await page.evaluate(() => { (document.querySelector('.checklist-view-switch button[aria-label=Path]') as HTMLButtonElement | null)?.click(); });
  if (!(await page.locator('.path-stage').count())) { await page.getByRole('button', {name: 'Checklist menu'}).click(); await page.locator('.checklist-menu-view').getByRole('button', {name: 'Path'}).click(); }
  const pathNode = await page.locator('.path-step:not([data-next]) .path-dot').first().evaluate(d => (d as HTMLElement).offsetWidth);
  expect(Math.abs(node.width - pathNode), `the List's node ${node.width} px = the path's ${pathNode} px`).toBeLessThanOrEqual(.5);
  if (await page.locator('.checklist-view-switch').isVisible()) await page.getByRole('button', {name: 'List', exact: true}).click();
  else { await page.getByRole('button', {name: 'Checklist menu'}).click(); await page.locator('.checklist-menu-view').getByRole('button', {name: 'List'}).click(); }
  await expect(page.locator('.checklist-list-view')).toBeVisible();
  // The path's name tab from the node's right-centre to the right: dark with white words and a coloured edge until done.
  const tab = (name: string) => page.locator('.checklist-row', {hasText: name}).locator('.checklist-row-tab');
  const looks = (name: string) => tab(name).evaluate(t => { const cs = getComputedStyle(t), n = t.parentElement!.querySelector('.checklist-row-check')!.getBoundingClientRect(), r = t.getBoundingClientRect(); return {bg: cs.backgroundImage, ink: getComputedStyle(t.querySelector('.checklist-row-name')!).color, edge: cs.borderTopColor, from: r.left - (n.left + n.width / 2), mid: Math.abs((r.top + r.bottom) / 2 - (n.top + n.bottom) / 2), lit: t.hasAttribute('data-lit')}; });
  const before = await looks(TITLE.stretch);
  expect(before.lit).toBe(false);
  expect(before.ink, 'white words').toBe('rgb(240, 245, 255)');
  expect(before.from, 'starts at the node\'s right-centre').toBeLessThanOrEqual(node.width / 2); expect(before.from).toBeGreaterThan(0);
  expect(before.mid, 'level with the node').toBeLessThanOrEqual(6);
  // The banner is the path's Habits banner: symbol, nebula title, count.
  expect(await sections.first().evaluate(s => [!!s.querySelector('.orbit-banner .habit-section-mark'), !!s.querySelector('.orbit-banner .habit-section-title .nebula-flow'), s.querySelector('.orbit-banner .habit-section-count [aria-hidden]')?.textContent])).toEqual([true, true, '0 of 2']);
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  const done = page.getByRole('button', {name: `${TITLE.stretch}: done`, exact: true});
  await expect(done).toHaveAttribute('data-lit', '');
  // Done: the tab fills with the node's colour and its words turn dark.
  const after = await looks(TITLE.stretch);
  expect(after.lit).toBe(true);
  expect(after.ink, 'dark words').toBe('rgb(6, 16, 42)');
  expect(after.bg).not.toBe(before.bg);
  // Session AG Polish 3 (owner Part 4, reference 03 pointers 1–3), moved: the ticked row stays where it is, in its orbit, in
  // the done look — no "Done · n" fold, nothing hidden, the order unchanged, also a while later — and the toast keeps Undo.
  const order = () => sections.first().locator('.checklist-row .checklist-row-name').allTextContents();
  const before3 = await order();
  await page.waitForTimeout(1500);
  await expect(done).toBeVisible();
  expect(await order()).toEqual(before3);
  await expect(page.locator('details.checklist-list-done, .checklist-list-done')).toHaveCount(0);
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
  expect((await plus.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await plus.click();
  await expect(page.locator('.aa-toast')).toContainText(TITLE.push);
  // The fold: a section folds and opens.
  const morning = page.getByRole('button', {name: 'Fold Morning Orbit'});
  // (Session AG Polish 2, Part 9: the layout audit found it squeezed to 37 px beside a phone's banner; at least 44 × 44.)
  const fb = (await morning.boundingBox())!;
  expect(Math.min(fb.width, fb.height), 'the fold a 44 px target').toBeGreaterThanOrEqual(44);
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

test('banners and rows share one column: the banner starts at the rows\' node circle and its fold stands in the rows\' ⋯ column (Session AG Polish 3, owner Part 4)', async ({page}) => {
  await open(page);
  const facts = await page.locator('.checklist-list-section').evaluateAll(ss => ss.map(s => {
    const r = (sel: string) => s.querySelector(sel)!.getBoundingClientRect();
    const tint = r('.orbit-banner > .habit-section-summary'), fold = r('.checklist-list-fold'), node = r('.checklist-row-check');
    // (Every row's ⋯, wherever it has a "+" or not.)
    const mores = [...s.querySelectorAll('.checklist-row-more')].map(m => m.getBoundingClientRect());
    return {tint: tint.left, node: node.left, foldL: fold.left, foldR: fold.right, mores: mores.map(m => [m.left, m.right])};
  }));
  expect(facts.length).toBe(3);
  for (const f of facts) {
    expect(Math.abs(f.tint - f.node), 'the banner starts at the node circle').toBeLessThanOrEqual(1);
    for (const [l, r] of f.mores) { expect(Math.abs(l - f.foldL), 'the fold in the ⋯ column').toBeLessThanOrEqual(1); expect(Math.abs(r - f.foldR)).toBeLessThanOrEqual(1); }
  }
});

