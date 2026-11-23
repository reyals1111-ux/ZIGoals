import {expect, test, type Locator} from '@playwright/test';
import {go, start} from './av2-polish-helpers';
import {THEMES} from './p6-helpers';

/**
 * Session AV lane 2 (polish4, owner follow-up 6 step 4): lane-2 targets are at least 44 × 44 px on a phone (390 px), in
 * Nebula, Light and Dark, on the Showcase: a journal's colour choices, a journal template's Edit, Tasks' Files, and the
 * apps to switch from in Settings (each was narrower or shorter: 41, 28 and 36 px wide; 25 px tall).
 */
test.use({timezoneId: 'Europe/Amsterdam'});
async function atLeast44(targets: Locator, what: string) {
  const boxes = await targets.evaluateAll(els => els.map(el => { const r = el.getBoundingClientRect(); return {w: r.width, h: r.height, text: el.textContent?.trim().slice(0, 30)}; }));
  expect(boxes.length, what).toBeGreaterThan(0);
  for (const b of boxes) { expect(b.w, `${what}: ${JSON.stringify(b)}`).toBeGreaterThanOrEqual(44); expect(b.h, `${what}: ${JSON.stringify(b)}`).toBeGreaterThanOrEqual(44); }
}

for (const theme of THEMES) test(`${theme}: Journal's colour choices and a template's Edit are 44 × 44`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/journal');
  const entries = page.getByRole('region', {name: 'Entries'});
  await entries.locator('details.journal-books-fold > summary').click();
  const make = entries.getByRole('form', {name: 'Make a journal'});
  await expect(make).toBeVisible({timeout: 15_000});
  await atLeast44(make.locator('label.journal-theme-choice'), 'colour choice');
  const form = page.getByRole('form', {name: 'Write in your journal'});
  await form.getByText('Start from a prompt').click();
  const edit = form.getByRole('button', {name: /^Edit your template “/}).first();
  await expect(edit).toBeVisible({timeout: 15_000});
  await atLeast44(edit, 'template Edit');
});

for (const theme of THEMES) test(`${theme}: Tasks' Files is 44 × 44`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/tasks');
  const files = page.locator('.tasks-links button.text-link');
  await expect(files.first()).toBeVisible({timeout: 15_000});
  await atLeast44(files, 'Tasks links');
});

for (const theme of THEMES) test(`${theme}: each app to switch from is a 44 px row`, async ({page}) => {
  await start(page, {theme, width: 390});
  await go(page, '/app/settings#switch-import');
  const section = page.locator('#switch-import');
  await section.locator('summary', {hasText: 'From Daylio, Habitica or YNAB'}).click();
  const rows = section.locator('.switch-more label.check');
  await expect(rows.first()).toBeVisible({timeout: 15_000});
  await atLeast44(rows, 'switch-from app');
});
