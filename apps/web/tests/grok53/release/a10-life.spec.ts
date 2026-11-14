import {expect, test, type Page} from '@playwright/test';
import {emptyDevice, hydrated, open} from '../l3-helpers';
import {loadShowcase} from '../../ah-helpers';

/**
 * Session AL A10 cycle review (docs/review/session-al/A10_CYCLE_1.md), the Life findings this lane fixed: Health's
 * logging buttons and meal default, the Checklist's Showcase label, Health's skip link, the Notes "This day" chips,
 * Settings' index at 768 and Tasks at 768. One test per finding, at the width the review used; fictional data, every /api
 * request answered 503 (l3-helpers), so nothing leaves the browser.
 */
test.use({timezoneId: 'Europe/Brussels'});
const phone = {width: 390, height: 844}, desktop = {width: 1440, height: 900}, small = {width: 375, height: 812}, tablet = {width: 768, height: 1024};
const heroButton = (page: Page, name: string) => page.locator('.health-heading').getByRole('button', {name, exact: true});

test('A10-1: Log water and Log food move keyboard focus to the card they scroll to, as Log weight does (390 and 1440)', async ({page}) => {
  for (const size of [phone, desktop]) {
    await page.setViewportSize(size);
    await emptyDevice(page, {theme: 'nebula'});
    await open(page, '/app/health');
    for (const [name, card] of [['Log water', '#water'], ['Log food', '#health-entry-action'], ['Log weight', '#health-weight-entry']] as const) {
      await heroButton(page, name).focus();
      await page.keyboard.press('Enter');
      await expect.poll(() => page.evaluate(sel => !!document.activeElement?.closest(sel), card), {message: `${size.width}: ${name} focuses ${card}`}).toBe(true);
      const focused = page.locator(':focus');
      await expect(focused).toBeInViewport();
      if (name === 'Log water') await expect(focused).toHaveAttribute('id', 'health-water-amount');
      // The next Tab goes on from that card, not back to the hero's buttons at the top of the page.
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('.health-heading')), `${size.width}: ${name} then Tab`).toBe(false);
      await page.evaluate(() => scrollTo(0, 0));
    }
  }
});

test('A10-2: a food logged at 6:20 PM defaults to Dinner, not Breakfast (1440)', async ({page}) => {
  await page.setViewportSize(desktop);
  await page.clock.install({time: new Date('2026-11-09T17:20:00Z')}); // 18:20 in Brussels
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/health');
  await heroButton(page, 'Log food').click();
  await page.getByText('Quick add a food that is not in your library', {exact: true}).click();
  const form = page.getByRole('form', {name: 'Quick add a food'});
  await expect(form.getByLabel('Meal', {exact: true})).toHaveValue('Dinner');
  await form.getByLabel('Food name').fill('Fictional apple');
  await form.getByLabel('Calories (kcal)').fill('95');
  await form.getByLabel('Portion weight (g)').fill('180');
  await form.getByRole('button', {name: 'Log and save food'}).click();
  await expect(page.getByRole('region', {name: 'Dinner diary'})).toContainText('Fictional apple');
  await expect(page.getByRole('region', {name: 'Breakfast diary'})).not.toContainText('Fictional apple');
});

test('A10-4: the full-screen Checklist carries the "Showcase · fictional" label (375 and 1440)', async ({page}) => {
  await emptyDevice(page, {theme: 'nebula'});
  await loadShowcase(page);
  for (const size of [small, desktop]) {
    await page.setViewportSize(size);
    await open(page, '/app/checklist');
    const dialog = page.locator('dialog.checklist-overlay');
    const label = dialog.getByRole('note').filter({hasText: 'Showcase · fictional'});
    await expect(label).toBeVisible();
    await expect(label).toBeInViewport();
    // It sits under the bar and covers none of the bar's controls.
    const box = (await label.boundingBox())!, bar = (await dialog.locator('.checklist-topbar').boundingBox())!;
    expect(box.y, `${size.width}: under the bar`).toBeGreaterThanOrEqual(bar.y + bar.height - 1);
  }
});

test('A10-8: Health\'s "Skip to Health views" stays out of sight until focused (375)', async ({page}) => {
  await page.setViewportSize(small);
  await emptyDevice(page, {theme: 'light'});
  await open(page, '/app/health');
  const skip = page.getByRole('link', {name: 'Skip to Health views'});
  await expect(skip).toBeAttached();
  const hidden = (await skip.boundingBox())!;
  expect(hidden.x + hidden.width <= 0 || hidden.y + hidden.height <= 0, `off screen while unfocused (${JSON.stringify(hidden)})`).toBe(true);
  await skip.focus();
  await expect(skip).toBeInViewport({ratio: 1});
  expect((await skip.boundingBox())!.height).toBeGreaterThanOrEqual(44);
});

test('A10-9: Notes "This day" at 375 keeps each status whole, says mL, and the → stays on the date\'s line', async ({page}) => {
  await page.setViewportSize(small);
  await emptyDevice(page, {theme: 'nebula'});
  await loadShowcase(page);
  await open(page, '/app/notes');
  const strip = page.locator('.note-this-day');
  await expect(strip.locator('.note-day-chip').first()).toBeVisible();
  // No word in a chip's status breaks across lines ("Don / e").
  const broken = await strip.locator('.note-day-chip-detail').evaluateAll(els => els.flatMap(el => {
    const text = el.firstChild as Text | null; if (!text) return [];
    const out: string[] = []; let at = 0;
    for (const word of (text.data).split(' ')) { const r = document.createRange(); r.setStart(text, at); r.setEnd(text, at + word.length); const tops = new Set([...r.getClientRects()].map(c => Math.round(c.top))); if (tops.size > 1) out.push(word); at += word.length + 1; }
    return out;
  }));
  expect(broken).toEqual([]);
  await expect(strip.locator('.note-day-chip').filter({hasText: /^Water/})).toContainText(/\d mL logged/);
  const head = page.locator('.note-day-head');
  const back = (await head.getByRole('button', {name: 'The day before'}).boundingBox())!, next = (await head.getByRole('button', {name: 'The day after'}).boundingBox())!;
  expect(Math.abs(next.y - back.y)).toBeLessThanOrEqual(2);
});

test('A10-10: at 768 Settings\' "Fold all" stands beside the section links, over none of them (light)', async ({page}) => {
  await page.setViewportSize(tablet);
  await emptyDevice(page, {theme: 'light'});
  await open(page, '/app/settings');
  const index = page.getByRole('navigation', {name: 'Settings sections'});
  // Session AP (D-088, deliberate): the button says what it does: "Open all" while a group is folded (a new device opens
  // with most folded), "Fold all" once all are open; its place beside the links is checked as before.
  const fold = index.getByRole('button', {name: /^(Open|Fold) all$/});
  await expect(fold).toBeVisible();
  const f = (await fold.boundingBox())!, bar = (await index.boundingBox())!;
  // Every point of the bar from Fold all's left edge to the bar's end is Fold all or the bar itself: no link (or a cut-off
  // piece of one) shows under it or beside it.
  const hits = await page.evaluate(({f, bar}) => { const out: string[] = []; for (let x = f.x + 2; x < bar.x + bar.width - 1; x += 3) { const el = document.elementFromPoint(x, f.y + f.height / 2); const link = el?.closest('a'); if (link) out.push(`${Math.round(x)}: ${link.textContent}`); } return out; }, {f, bar});
  expect(hits).toEqual([]);
  const linksRight = await index.locator('.settings-sections-links').evaluate(el => el.getBoundingClientRect().right);
  expect(linksRight).toBeLessThanOrEqual(f.x);
});

test('A10-11: at 768 the first task starts within the first screen (Showcase)', async ({page}) => {
  await page.setViewportSize(tablet);
  await emptyDevice(page, {theme: 'light'});
  await loadShowcase(page);
  await open(page, '/app/tasks');
  const first = page.locator('.tasks-main .task').first();
  await expect(first).toBeVisible();
  // It began at about y 1,300–1,500 of 1,024 (the views stood above the list); now its row starts on the first screen and
  // its title reads there in full.
  expect((await first.boundingBox())!.y).toBeLessThan(tablet.height);
  await expect(first.locator('.task-title').first()).toBeInViewport({ratio: 1});
  // Nothing is removed: every view is still offered.
  const views = page.getByRole('navigation', {name: 'Task views'});
  for (const name of [/^Inbox/, /^Today/, /^Upcoming/, /^All open/, /^Completed/]) await expect(views.getByRole('button', {name})).toBeVisible();
  await hydrated(page);
});
