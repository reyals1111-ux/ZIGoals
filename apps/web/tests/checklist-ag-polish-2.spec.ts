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
  await expect(page.locator('.path-section[data-section=morning] .habit-section-count [aria-hidden]')).toHaveText('1 of 2');
  // The next planet: lit once every node before it is done (the planet has been reached).
  await tick(page, 'Fictional two');
  await expect(planet(page, 'afternoon')).toHaveAttribute('data-lit', '');
  await expect(planet(page, 'afternoon')).toHaveAttribute('data-just', '');
  await expect(planet(page, 'evening')).not.toHaveAttribute('data-lit', '');
  await expect(page.locator('.path-section[data-section=morning] .habit-section-count [aria-hidden]')).toHaveText('Complete ✓');
  // Undo un-reaches it: matte again.
  await undo(page);
  await expect(planet(page, 'afternoon')).not.toHaveAttribute('data-lit', '');
  await expect(planet(page, 'morning')).toHaveAttribute('data-lit', '');
  // The line into a reached planet is lit at the planet's end.
  await tick(page, 'Fictional two');
  await expect(page.locator('.orbit-flow-segment[data-segment$=">planet:afternoon"]')).toHaveAttribute('data-light', 'both');
});

test('3: the progress bar is the day\'s nodes — one segment each in its colour, lit with its node (out of order too), dimmed on Undo', async ({page}) => {
  await open(page);
  const bar = page.locator('.checklist-progress-bar');
  await expect(bar).toHaveAttribute('role', 'progressbar');
  await expect(bar).toHaveAttribute('aria-valuenow', '0');
  await expect(bar).toHaveAttribute('aria-valuemax', '4');
  const segs = bar.locator('.checklist-progress-seg');
  await expect(segs).toHaveCount(4);
  // In path order, each in its node's own colour.
  const pairs = await page.evaluate(() => {
    const dots = [...document.querySelectorAll<HTMLElement>('.path-stage .path-dot')].map(d => getComputedStyle(d).getPropertyValue('--node').trim());
    const seg = [...document.querySelectorAll<HTMLElement>('.checklist-progress-seg')].map(s => getComputedStyle(s).getPropertyValue('--seg').trim());
    return {dots, seg};
  });
  expect(pairs.seg).toEqual(pairs.dots);
  // Neighbours flow into each other: each segment's right end is the mix its neighbour's left end starts from.
  const joins = await segs.evaluateAll(els => els.map(e => [getComputedStyle(e).getPropertyValue('--seg-prev').trim(), getComputedStyle(e).getPropertyValue('--seg-next').trim()]));
  for (let i = 1; i < joins.length; i++) expect(joins[i]![0], `segment ${i} starts from its neighbour`).toBe(pairs.seg[i - 1]);
  await expect(bar.locator('.checklist-progress-spark')).toHaveCount(0);
  // Out of order: the third item lights its own segment, at once with its node, and the sparkle rests at its end.
  await tick(page, 'Fictional three');
  await expect(segs.nth(2)).toHaveAttribute('data-lit', '');
  await expect(page.locator('.path-step[data-state=done] .path-dot')).toHaveCount(1);
  for (const i of [0, 1, 3]) await expect(segs.nth(i)).not.toHaveAttribute('data-lit', '');
  await expect(bar).toHaveAttribute('aria-valuenow', '1');
  await expect(bar.locator('.checklist-progress-shine')).toHaveCount(1);
  const spark = await page.evaluate(() => { const b = document.querySelector('.checklist-progress-bar')!.getBoundingClientRect(), s = document.querySelector('.checklist-progress-spark')!.getBoundingClientRect(); return (s.left + s.width / 2 - b.left) / b.width; });
  expect(Math.abs(spark - .75), 'the sparkle at the end of the lit segment').toBeLessThan(.04);
  await expect.poll(() => segs.nth(2).evaluate(e => Number(getComputedStyle(e, '::after').opacity)), {message: 'lit in neon'}).toBe(1);
  expect(await segs.nth(0).evaluate(e => Number(getComputedStyle(e, '::after').opacity)), 'matte until done').toBe(0);
  // Undo dims it again.
  await undo(page);
  await expect(segs.nth(2)).not.toHaveAttribute('data-lit', '');
  await expect(bar).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.checklist-progress-line strong')).toHaveText('0 of 4 planets today');
});

test('3: under reduced motion a segment lights at once', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await open(page);
  await tick(page, 'Fictional one');
  const seg = page.locator('.checklist-progress-seg').first();
  await expect(seg).toHaveAttribute('data-lit', '');
  expect(await seg.evaluate(e => [getComputedStyle(e, '::after').transitionDuration, Number(getComputedStyle(e, '::after').opacity)])).toEqual(['0s', 1]);
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
