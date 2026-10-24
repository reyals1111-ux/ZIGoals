import {expect, test, type Page} from '@playwright/test';
import {addCustom} from '../lib/checklist/store';
import {emptyChecklist, type Checklist} from '../lib/checklist/schema';
import {seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AG Polish 2 (ADR-031): the Checklist's final pass, on a computer and a phone.
 * - Part 2b: an orbit's planet lights when it is reached — the day's first with the first tick in its orbit, each next one
 *   once every node before it is done — with its one-time completion at that moment; Undo returns it to matte.
 * - Part 3: the progress bar is one segment per counted item in path order, in its node's colour; a segment lights with its
 *   node (out of order too) and dims on Undo.
 */
const NAMES: [string, string][] = [['Fictional one', 'morning'], ['Fictional two', 'morning'], ['Fictional three', 'afternoon'], ['Fictional four', 'evening']];
function smallDay(): Checklist {
  let r = emptyChecklist(), n = 0;
  for (const [label, section] of NAMES) r = addCustom(r, {label, colour: 'cyan', section}, {id: `ck_ag2-${++n}`, at: new Date(Date.UTC(2026, 0, 1, 0, 0, n))});
  return r;
}
async function open(page: Page, path: Checklist = smallDay()) {
  await seedChecklist(page, {path});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  await expect(page.locator('.path-stage[data-settled]')).toHaveCount(1, {timeout: 10_000});
}
const tick = (page: Page, name: string) => page.getByRole('button', {name: `${name}: not done yet`, exact: true}).click();
const undo = (page: Page) => page.locator('.aa-toast').getByRole('button', {name: 'Undo'}).click();
const planet = (page: Page, id: string) => page.locator(`.path-section[data-section=${id}] .orbit-planet`);

test('2a: a banner\'s tint fades out right after its count chip and is gone well before its planet', async ({page}, info) => {
  await open(page);
  const bands = await page.locator('.path-stage .orbit-banner').evaluateAll(els => els.map(b => {
    const words = b.querySelector('.habit-section-summary')!, chip = b.querySelector('.habit-section-count')!.getBoundingClientRect(), r = words.getBoundingClientRect();
    const end = r.right - parseFloat(getComputedStyle(words, '::after').right), sphere = b.querySelector('.orbit-planet-sphere')?.getBoundingClientRect() ?? null;
    return {after: end - Math.max(chip.right, b.querySelector('.habit-section-title')!.getBoundingClientRect().right), planet: sphere ? sphere.left - end : null};
  }));
  const most = info.project.name === 'mobile' ? 44 + 14 : 96 + 20;
  for (const b of bands) {
    expect(b.after, 'the tint ends right after the words').toBeLessThanOrEqual(most);
    if (b.planet !== null) expect(b.planet, 'gone before the planet').toBeGreaterThanOrEqual(0);
  }
});

test('2b: a planet lights when it is reached, plays its completion then, and goes matte again on Undo', async ({page}) => {
  await open(page);
  for (const id of ['morning', 'afternoon', 'evening']) await expect(planet(page, id), `${id}: matte at first`).not.toHaveAttribute('data-lit', '');
  // The day's first planet: lit as soon as any node of its own orbit is done — its completion plays at that moment.
  await tick(page, 'Fictional one');
  await expect(planet(page, 'morning')).toHaveAttribute('data-lit', '');
  await expect(planet(page, 'morning')).toHaveAttribute('data-just', '');
  await expect(planet(page, 'afternoon')).not.toHaveAttribute('data-lit', '');
  // Its orbit is not complete yet: the banner still counts.
  await expect(page.locator('.path-section[data-section=morning] .habit-section-count > [aria-hidden]:first-child')).toHaveText('1 of 2');
  // The next planet: lit once every node before it is done (the planet has been reached).
  await tick(page, 'Fictional two');
  await expect(planet(page, 'afternoon')).toHaveAttribute('data-lit', '');
  await expect(planet(page, 'afternoon')).toHaveAttribute('data-just', '');
  await expect(planet(page, 'evening')).not.toHaveAttribute('data-lit', '');
  await expect(page.locator('.path-section[data-section=morning] .habit-section-count > [aria-hidden]:first-child')).toHaveText('Complete ✓');
  // Undo un-reaches it: matte again.
  await undo(page);
  await expect(planet(page, 'afternoon')).not.toHaveAttribute('data-lit', '');
  await expect(planet(page, 'morning')).toHaveAttribute('data-lit', '');
  // The line into a reached planet is lit at the planet's end.
  await tick(page, 'Fictional two');
  await expect(page.locator('.orbit-flow-segment[data-segment$=">planet:afternoon"]')).toHaveAttribute('data-light', 'both');
});

test('3 (Session AG Polish 3, owner Part 3: the progress bar removed): reaching the orbits is the tracker — no bar, the words count the day, and the top bar\'s controls are 44 px or more', async ({page}, info) => {
  await open(page);
  // (The bar, its segments and its sparkle are gone; the words stay, and on a computer the date beside them.)
  await expect(page.locator('.checklist-topbar [role=progressbar], .checklist-progress-bar, .checklist-progress-seg, .checklist-progress-spark')).toHaveCount(0);
  await expect(page.locator('.checklist-progress-line strong')).toHaveText('0 of 4 planets today');
  if (info.project.name !== 'mobile') await expect(page.locator('.checklist-progress-line .eyebrow')).toBeVisible();
  await tick(page, 'Fictional three');
  await expect(page.locator('.checklist-progress-line strong')).toHaveText('1 of 4 planets today');
  await undo(page);
  await expect(page.locator('.checklist-progress-line strong')).toHaveText('0 of 4 planets today');
  // (Close, the view, the streak, quick add and the menu, where shown: 44 × 44 px or more.)
  const sizes = await page.evaluate(() => [...document.querySelectorAll('.checklist-topbar :is(.checklist-close, .checklist-streak, .checklist-plus-button, .checklist-menu-button, .checklist-view-switch button)')]
    .map(e => ({name: e.getAttribute('aria-label') ?? e.className.toString(), r: e.getBoundingClientRect()})).filter(x => x.r.width > 0).map(x => ({name: x.name, w: x.r.width, h: x.r.height})));
  expect(sizes.length).toBeGreaterThanOrEqual(4);
  for (const s of sizes) { expect(s.w, `${s.name}: wide enough`).toBeGreaterThanOrEqual(44); expect(s.h, `${s.name}: tall enough`).toBeGreaterThanOrEqual(44); }
});

test('4: the ambient sky twinkles behind everything, rests while the tab is hidden or the menu is open, and is off under reduced motion and Motion Off', async ({page}) => {
  await open(page);
  const sky = page.locator('.checklist-ambient');
  await expect(sky).toHaveAttribute('data-ambient', 'running');
  expect(await sky.evaluate(el => { const cs = getComputedStyle(el), shell = document.querySelector('.checklist-shell')!; return [cs.position, cs.pointerEvents, cs.zIndex, !!(el.compareDocumentPosition(shell) & Node.DOCUMENT_POSITION_FOLLOWING)]; }), 'fixed, behind the path and its words').toEqual(['fixed', 'none', '0', true]);
  // A twinkle within a few seconds: transform and opacity only.
  await expect.poll(() => sky.evaluate(el => el.getAnimations({subtree: true}).length), {timeout: 9000}).toBeGreaterThan(0);
  const props = await sky.evaluate(el => [...new Set(el.getAnimations({subtree: true}).flatMap(a => (a.effect as KeyframeEffect).getKeyframes().flatMap(k => Object.keys(k).filter(p => !['offset', 'easing', 'composite', 'computedOffset'].includes(p)))))].sort());
  expect(props).toEqual(['opacity', 'transform']);
  // The tab hidden: it rests, and nothing keeps running.
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {value: 'hidden', configurable: true}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(sky).toHaveAttribute('data-ambient', 'paused');
  expect(await sky.evaluate(el => el.getAnimations({subtree: true}).filter(a => a.playState === 'running').length)).toBe(0);
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {value: 'visible', configurable: true}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(sky).toHaveAttribute('data-ambient', 'running');
  // Something open over the path: it rests.
  await page.getByRole('button', {name: 'Checklist menu'}).click();
  await expect(sky).toHaveAttribute('data-ambient', 'paused');
  await page.keyboard.press('Escape');
  await expect(sky).toHaveAttribute('data-ambient', 'running');
  // Motion Off: off, nothing drawn.
  await page.evaluate(() => { document.documentElement.dataset.appMotion = 'off'; });
  await expect(sky).toHaveAttribute('data-ambient', 'off');
  await expect(sky.locator('i, b')).toHaveCount(0);
});

test('4: under reduced motion the sky is still — no twinkle, no shooting star', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await open(page);
  await expect(page.locator('.checklist-ambient')).toHaveAttribute('data-ambient', 'off');
  await expect(page.locator('.checklist-ambient i, .checklist-ambient b')).toHaveCount(0);
});

test('8: orbit consistency — one neon colour per state, each legend swatch exactly its cells, ≥ 3:1 on the panel', async ({page}) => {
  // Twelve weeks with every state: a Perfect orbit, all planets, some planets and nothing.
  const day = (back: number) => { const d = new Date(); d.setDate(d.getDate() - back); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const days = {version: 1, days: {[day(3)]: {total: 4, done: 4, perfect: true}, [day(4)]: {total: 4, done: 4}, [day(5)]: {total: 4, done: 2}, [day(6)]: {total: 4, done: 0}}};
  await seedChecklist(page, {path: smallDay(), extra: {'zigoals:checklist-days:v1': JSON.stringify(days)}});
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('dialog.checklist-overlay')).toHaveAttribute('data-loaded');
  const fold = page.locator('details.checklist-history-fold');
  if (await fold.count() && await fold.isVisible()) await fold.locator('summary').click();
  await expect(page.locator('.checklist-heat-legend .checklist-heat-swatch')).toHaveCount(4);
  const facts = await page.locator('.checklist-history').evaluate(h => {
    const look = (el: Element) => { const s = getComputedStyle(el); return {bg: s.backgroundColor, img: s.backgroundImage, shadow: s.boxShadow}; };
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = ([r, g, b]: number[]) => [r, g, b].map(v => { v! /= 255; return v! <= .03928 ? v! / 12.92 : ((v! + .055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i]!, 0);
    const plate = rgb(getComputedStyle(h).backgroundColor);
    const out: Record<string, {swatch: unknown; cell: unknown; contrast: number}> = {};
    for (const level of ['none', 'some', 'all', 'perfect']) {
      const sw = h.querySelector(`.checklist-heat-swatch[data-level=${level}]`)!, cell = h.querySelector(`.checklist-heat-grid .checklist-heat-cell[data-level=${level}]`);
      // (What shows of each state on the panel: its fill, or for Nothing its teal outline, over the panel.)
      const shown = level === 'none' ? rgb(getComputedStyle(sw).boxShadow) : rgb(getComputedStyle(sw).backgroundColor);
      const a = shown[3] ?? 1, mix = [0, 1, 2].map(i => shown[i]! * a + plate[i]! * (1 - a)), l1 = lum(mix), l2 = lum(plate);
      out[level] = {swatch: look(sw), cell: cell ? look(cell) : null, contrast: (Math.max(l1, l2) + .05) / (Math.min(l1, l2) + .05)};
    }
    return out;
  });
  for (const [level, f] of Object.entries(facts)) {
    expect(f.cell, `${level}: a cell of that state on the grid`).not.toBeNull();
    expect(f.swatch, `${level}: the legend swatch is exactly its cells`).toEqual(f.cell);
    expect(f.contrast, `${level}: ≥ 3:1 on the panel`).toBeGreaterThanOrEqual(3);
  }
  expect(facts.none!.swatch, 'Nothing and Some clearly different').not.toEqual(facts.some!.swatch);
  expect(new Set(Object.values(facts).map(f => JSON.stringify(f.swatch))).size, 'four distinct states').toBe(4);
});
