import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {POINT_TELL_KEY} from '../lib/ab-cloud-device-keys';

/**
 * Session AB-Cloud Part 6 (ADR-023 C23): Point & tell. Switched on in Settings; a pick by pointer and by keyboard never
 * reaches the page; a numbered note, its marker, edit, remove with Undo, the plain-text export and the email; off again
 * removes the button. Fictional data; the clock is fixed; no request leaves the page.
 */
test.use({timezoneId: 'Europe/Brussels'});
const DAY = '2026-10-14';
test.beforeEach(async ({page}) => {
  await page.clock.install({time: new Date(`${DAY}T08:00:00.000Z`)});
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY, 'Europe/Brussels').records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('balanced'), onboarded: true}), 'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true})});
});
const stored = (page: Page) => page.evaluate(k => JSON.parse(localStorage.getItem(k) ?? 'null'), POINT_TELL_KEY);
const launcher = (page: Page) => page.getByRole('button', {name: 'Point & tell: pick a part of this page to comment on'});

test('pick a part by pointer and by keyboard, note it, see its marker, edit, remove and undo, export; the page never receives the pick', async ({page}) => {
  await page.goto('/app/settings');
  await expect(launcher(page)).toHaveCount(0);
  await page.getByLabel('Show the Point & tell button').check();
  await expect(launcher(page)).toBeVisible();
  expect(await stored(page)).toEqual({version: 1, enabled: true});

  await page.goto('/app/goals');
  const create = page.locator('.page-heading').getByRole('link', {name: '+ Create a goal', exact: true});
  await expect(create).toBeVisible();
  await launcher(page).click();
  await expect(page.getByRole('button', {name: 'Stop picking'})).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({hasText: 'Tap or click the part you want to comment on'})).toBeVisible();
  // The link is not followed: the tap opens a note on it instead.
  await create.click();
  await expect(page).toHaveURL(/\/app\/goals$/);
  const sheet = page.getByRole('dialog', {name: /^Note on .*Create a goal/});
  await expect(sheet).toBeVisible();
  await expect(sheet.getByLabel('Your note')).toBeFocused();
  await sheet.getByLabel('Your note').fill('Make this button easier to find');
  await sheet.getByRole('button', {name: 'Save note'}).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByText(/^Note saved on .*Create a goal/)).toBeVisible();
  await expect(page.getByRole('button', {name: /^Note 1: .*Create a goal/})).toBeVisible();
  const saved = (await stored(page)).pins;
  expect(saved).toHaveLength(1);
  expect(saved[0]).toMatchObject({n: 1, path: '/app/goals', note: 'Make this button easier to find'});

  // Keyboard: focus a part, Enter picks it (not followed); Esc closes the note without saving.
  await launcher(page).click();
  await create.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/app\/goals$/);
  await expect(page.getByRole('dialog', {name: /^Note on .*Create a goal/})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', {name: /^Note on/})).toHaveCount(0);
  await expect(launcher(page)).toBeFocused();
  expect((await stored(page)).pins).toHaveLength(1);

  // The list: edit, remove, Undo.
  await page.getByRole('button', {name: 'Your Point & tell notes (1)'}).click();
  const list = page.getByRole('dialog', {name: 'Your Point & tell notes'});
  await expect(list).toContainText('Make this button easier to find');
  await list.getByRole('button', {name: 'Edit note 1'}).click();
  await list.getByLabel('Note 1').fill('Bigger and higher on the page');
  await list.getByRole('button', {name: 'Save note 1'}).click();
  await expect(list).toContainText('Bigger and higher on the page');
  await list.getByRole('button', {name: 'Remove note 1'}).click();
  await expect(page.getByText('Note 1 removed.')).toBeVisible();
  expect((await stored(page)).pins).toEqual([]);
  await page.locator('[data-point-tell]').getByRole('button', {name: 'Undo'}).click();
  await expect(page.getByText('Note 1 is back.')).toBeVisible();
  expect((await stored(page)).pins).toMatchObject([{n: 1, note: 'Bigger and higher on the page'}]);

  // Export: the email carries the notes; the download is the same plain text.
  const href = await list.getByRole('link', {name: 'Email them'}).getAttribute('href');
  expect(href).toMatch(/^mailto:contact@zigoals\.app\?subject=ZIGoals%20Point%20%26%20tell%20notes&body=/);
  expect(decodeURIComponent(href!.split('body=')[1]!)).toContain('1. /app/goals — ');
  const waiting = page.waitForEvent('download');
  await list.getByRole('button', {name: 'Download'}).click();
  const file = await waiting, chunks: Buffer[] = [];
  for await (const chunk of await file.createReadStream()) chunks.push(Buffer.from(chunk));
  const text = Buffer.concat(chunks).toString('utf8');
  expect(file.suggestedFilename()).toBe(`zigoals-point-tell-${DAY}.txt`);
  expect(text).toMatch(/^ZIGoals Point & tell notes \(1\) · app .+ · 2026-10-14\n\n1\. \/app\/goals — [^\n]*Create a goal[^\n]*\n {3}Bigger and higher on the page\n$/);
  await list.getByRole('button', {name: 'Close'}).click();
  await expect(list).toHaveCount(0);

  // Off again: the button and the markers go; the notes stay on this device.
  await page.goto('/app/settings');
  const toggle = page.getByLabel('Show the Point & tell button');
  await expect(toggle).toBeChecked();
  await expect(launcher(page)).toBeVisible();
  await toggle.uncheck();
  await expect(launcher(page)).toHaveCount(0);
  expect(await stored(page)).toMatchObject({enabled: false, pins: [{n: 1}]});
});

test('nothing in Point & tell moves (reduced motion and Motion Off alike); every control is at least 44 px', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.evaluate(k => localStorage.setItem(k, JSON.stringify({version: 1, enabled: true, pins: [{id: 'pin-aaaaaaaa', n: 1, path: '/app/goals', target: 'Your goals', note: 'x', at: '2026-10-14T08:00:00.000Z'}]})), POINT_TELL_KEY);
  await page.goto('/app/goals');
  for (const name of ['Point & tell: pick a part of this page to comment on', 'Your Point & tell notes (1)']) {
    const button = page.getByRole('button', {name});
    await expect(button).toBeVisible();
    const box = (await button.boundingBox())!;
    expect(box.width).toBeGreaterThanOrEqual(44); expect(box.height).toBeGreaterThanOrEqual(44);
    expect(await button.evaluate(el => [getComputedStyle(el).transitionDuration, getComputedStyle(el).animationName])).toEqual(['0s', 'none']);
  }
});
