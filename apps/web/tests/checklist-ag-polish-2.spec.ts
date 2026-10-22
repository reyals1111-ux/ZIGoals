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
