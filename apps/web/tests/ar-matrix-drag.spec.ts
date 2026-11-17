import {expect, test, type Locator, type Page} from '@playwright/test';
import {TODAY, seeded, stored, tasksRecord, toast} from './ap/ap-fixtures';

/**
 * Session AR (6c; ADR-040 D16 (b), carried from AP): Tasks' priority matrix by mouse. A pointer drag (down, stepped moves,
 * up) carries a card to another box and makes the same move as the card's own button: only the priority level changes
 * (the day stays), the same announcement and Undo. A press that hardly moves is still a click. The keyboard button works
 * as before; touch keeps the button (not dragged here).
 */
test.use({timezoneId: 'Europe/Brussels', viewport: {width: 1280, height: 900}});
const TASKS = tasksRecord([
  {id: 'ar-tax', title: 'Fictional tax form', priority: 'high', level: 1, due: '2026-11-12'},
  {id: 'ar-plumber', title: 'Fictional plumber call', due: TODAY},
  {id: 'ar-trip', title: 'Fictional trip plan', priority: 'high', level: 2, due: '2026-11-20'},
  {id: 'ar-photos', title: 'Fictional photo sorting', priority: 'low'},
]);
type Stored = {tasks: {id: string; due?: string; level?: number; priority: string}[]};
const KEY = 'zigoals:tasks:v1';
const box = (page: Page, name: string) => page.locator('.tasks-matrix-box').filter({has: page.getByRole('heading', {name: new RegExp(`^${name}`)})});
const task = async (page: Page, id: string) => (await stored<Stored>(page, KEY))!.tasks.find(t => t.id === id)!;

/** The four boxes in view (the mouse acts on what is on screen), then the measured points. */
const matrixInView = (page: Page) => page.locator('.tasks-matrix').evaluate(e => e.scrollIntoView({block: 'start'}));
async function mouseDrag(page: Page, from: Locator, to: Locator, during?: () => Promise<void>, resting?: () => Promise<void>) {
  await matrixInView(page);
  const a = (await from.boundingBox())!, b = (await to.boundingBox())!;
  const start = {x: a.x + a.width / 2, y: a.y + a.height / 2}, end = {x: b.x + b.width / 2, y: b.y + b.height / 2};
  await page.mouse.move(start.x, start.y);
  await resting?.();
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(start.x + (end.x - start.x) * i / 12, start.y + (end.y - start.y) * i / 12);
  await during?.();
  await page.mouse.up();
}

test('a mouse drag moves a card to another box, changes only its priority, survives a reload and has Undo; the button still works', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'A mouse drag; touch keeps the card\'s button');
  await seeded(page, {[KEY]: TASKS}, '/app/tasks?view=matrix');
  const quick = box(page, 'Urgent, not important'), urgent = box(page, 'Urgent and important');
  await expect(quick).toContainText('Fictional plumber call');

  // A press that hardly moves is a click, not a drag: nothing moves and nothing is written.
  const plumberTitle = quick.locator('.task-title', {hasText: 'Fictional plumber call'});
  await matrixInView(page);
  const p = (await plumberTitle.boundingBox())!;
  await page.mouse.move(p.x + 10, p.y + p.height / 2); await page.mouse.down();
  await page.mouse.move(p.x + 13, p.y + p.height / 2); await page.mouse.up();
  await expect(quick).toContainText('Fictional plumber call');
  expect((await task(page, 'ar-plumber')).level).toBeUndefined();

  // The drag: the card lands in "Urgent and important" with P1, as the button would set it; its day stays.
  // While dragging: the box under the pointer is outlined, the card follows it, and no box moves (no layout shift).
  await matrixInView(page);
  const boxes = page.locator('.tasks-matrix-box');
  const places = () => boxes.evaluateAll(list => list.map(e => { const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map(v => Math.round(v) + 0); })); // + 0: a box a fraction of a pixel above the window rounds to -0, which is not 0 to toEqual (one run in seven failed on that alone)
  // Session AR (CI run 44020400083 on 356132e3, deliberate, stricter): the boxes are measured with the pointer resting
  // on the card, once the hover glass (liquid-glass.tsx, mounted a moment after the page) is there and the panel's own
  // hover lift has settled; from there to the drop, the press and the drag move nothing. Before, the measurement was
  // taken with the pointer elsewhere and sometimes before the glass had mounted, so it passed or failed by timing; the
  // fault it found (a press on a card held the whole panel at 99 % for the length of the drag) is fixed at its cause.
  await expect(page.locator('.glass-light')).toBeAttached();
  const atRest = async () => { for (let last = await places(); ;) { await page.waitForTimeout(150); const now = await places(); if (JSON.stringify(now) === JSON.stringify(last)) return now; last = now; } };
  let before: number[][] = [];
  await mouseDrag(page, plumberTitle, urgent.locator('h3'), async () => {
    await expect(urgent).toHaveAttribute('data-drop', 'true');
    await expect(quick.locator('.task[data-dragging]')).toHaveCount(1);
    await page.waitForTimeout(150); // longer than the press settle (90 ms), so a held press would show
    expect(await places()).toEqual(before);
  }, async () => { before = await atRest(); expect(before).toHaveLength(4); });
  await expect(urgent).toContainText('Fictional plumber call');
  await expect(quick).not.toContainText('Fictional plumber call');
  await expect(toast(page)).toContainText('“Fictional plumber call” moved to “Urgent and important”');
  await expect.poll(async () => { const t = await task(page, 'ar-plumber'); return [t.level, t.due]; }).toEqual([1, TODAY]);
  // No card is left drawn away from its place.
  await expect(page.locator('.tasks-matrix [data-dragging]')).toHaveCount(0);
  await expect(page.locator('.tasks-matrix .task[style*="translate"]')).toHaveCount(0);

  // Undo puts it back at P3 in its box.
  await toast(page).getByRole('button', {name: 'Undo'}).click();
  await expect(quick).toContainText('Fictional plumber call');
  await expect.poll(async () => (await task(page, 'ar-plumber')).level ?? 3).toBe(3);

  // Drag again; the move survives a reload.
  await mouseDrag(page, quick.locator('.task-title', {hasText: 'Fictional plumber call'}), urgent.locator('h3'));
  await expect(urgent).toContainText('Fictional plumber call');
  await page.reload();
  await expect(box(page, 'Urgent and important')).toContainText('Fictional plumber call', {timeout: 20_000});
  expect((await task(page, 'ar-plumber')).level).toBe(1);

  // A drag across the urgency line is refused with the reason, as the rule says; nothing is written.
  await mouseDrag(page, box(page, 'Neither urgent nor important').locator('.task-title', {hasText: 'Fictional photo sorting'}), box(page, 'Urgent and important').locator('h3'));
  await expect(page.getByText('A task becomes urgent by its day: give it a day within 2 days to move it there.').first()).toBeVisible();
  await expect(box(page, 'Neither urgent nor important')).toContainText('Fictional photo sorting');

  // The keyboard way is unchanged: the card's button, pressed with Enter.
  const button = page.getByRole('button', {name: 'Move “Fictional trip plan” to “Neither urgent nor important”'});
  await button.focus(); await page.keyboard.press('Enter');
  await expect(box(page, 'Neither urgent nor important')).toContainText('Fictional trip plan');
  await expect.poll(async () => (await task(page, 'ar-trip')).level).toBe(3);
});
