import {expect, test} from '@playwright/test';
import {goal, openModule, seedGoals, stored} from '../goals/goal-fixtures';

/**
 * Session AQ (G-007, main run 1753): a milestone's box keeps the person's tick from the end of the click, while the save waits
 * for the cross-tab lock; unticking puts the box and the record back; a refused save puts the box back with its error.
 * `el.click()` then `el.checked` in one task reads the box exactly where React leaves it after the click event.
 */
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1920, height: 1113}});
test.skip(({isMobile}) => isMobile, 'computer width: runs in the desktop project');
async function setup(page: import('@playwright/test').Page) {
  await seedGoals(page, [goal('94', {name: 'Fictional milestone goal', target: '20000', milestones: [{id: 'm1', title: 'Good', done: false}]})], '/app/goals/tracked/94');
  const box = await openModule(page, 'milestones');
  const cb = box.getByRole('checkbox', {name: 'Good'});
  await expect(cb).toBeVisible();
  return cb;
}
const doneOf = async (page: import('@playwright/test').Page) => (await stored(page)).goals.find(g => g.id === '94')!.milestones.find(m => m.id === 'm1')!.done;
test('the box keeps the tick at the end of the click; unticking puts the box and the record back', async ({page}) => {
  const cb = await setup(page);
  const right = await cb.evaluate((el: HTMLInputElement) => { el.click(); return el.checked; });
  expect(right).toBe(true);
  await expect(cb).toBeChecked();
  await expect.poll(() => doneOf(page)).toBe(true);
  const back = await cb.evaluate((el: HTMLInputElement) => { el.click(); return el.checked; });
  expect(back).toBe(false);
  await expect(cb).not.toBeChecked();
  await expect.poll(() => doneOf(page)).toBe(false);
  await page.reload(); await openModule(page, 'milestones');
  await expect(cb).not.toBeChecked();
});
test('a refused save puts the box back and says why', async ({page}) => {
  const cb = await setup(page);
  await page.evaluate(() => { const orig = Storage.prototype.setItem; Storage.prototype.setItem = function (k: string, v: string) { if (k === 'zigoals:platform:v1') throw new DOMException('full', 'QuotaExceededError'); return orig.call(this, k, v); }; });
  const right = await cb.evaluate((el: HTMLInputElement) => { el.click(); return el.checked; });
  expect(right).toBe(true);
  await expect(cb).not.toBeChecked();
  const said = page.getByRole('alert').or(page.getByRole('status')).filter({hasText: /save|space|full|storage/i}).first();
  await expect(said).toBeVisible();
  expect(await doneOf(page)).toBe(false);
});
