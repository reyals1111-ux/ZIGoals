import {expect, test, type Page} from '@playwright/test';
import {DAY_TIMELINE_KEY} from '../lib/af-extras-keys';
import {ID, TITLE, seedChecklist, stored} from './checklist-fixtures';

/**
 * Session AF (L5b; P9.2, ADR-028 H76): the Day Timeline on a phone in WebKit (the WebKit set, iPhone 15): the page fits
 * the width with no sideways scroll, every handle and button is a 44 px target, a touch drag on a handle moves a habit on
 * 15-minute steps (pointer events of the touch kind: WebKit's own touch gestures cannot be driven from Playwright), and
 * the time picker moves one without any drag. Evidence labelled WebKit, never "Safari on an iPhone". The seed waits for
 * its page's network to settle before the next navigation (Session AE's WebKit rule).
 */
test.use({timezoneId: 'UTC'});
test.skip(({viewport}) => (viewport?.width ?? 1280) > 767, 'A phone spec: the WebKit set’s iPhone 15 project.');
async function at(page: Page, clock: string) { const day = new Date().toISOString().slice(0, 10); await page.clock.install({time: new Date(`${day}T${clock}:00.000Z`)}); }
const habitRow = (page: Page, key: keyof typeof ID) => page.locator(`[data-block="habit:${ID[key]}"]`);
async function open(page: Page) {
  await page.goto('/app/timeline');
  await expect(page.locator('.timeline-page')).toHaveAttribute('data-timeline', 'ready');
  await page.waitForLoadState('networkidle', {timeout: 10_000}).catch(() => undefined);
}

test('a phone: no sideways scroll, 44 px targets, a touch drag moves a habit by 15-minute steps', async ({page}) => {
  await at(page, '10:30');
  await seedChecklist(page);
  await open(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  for (const target of await page.locator('.timeline-page button, .timeline-page .timeline-open').all()) {
    if (!(await target.isVisible())) continue;
    const box = (await target.boundingBox())!;
    expect(Math.min(box.width, box.height), await target.getAttribute('aria-label') ?? await target.innerText()).toBeGreaterThanOrEqual(44);
  }
  const handle = habitRow(page, 'stretch').getByRole('button', {name: /^Move Fictional stretch, now at 8:00 AM/});
  await handle.scrollIntoViewIfNeeded();
  const box = (await handle.boundingBox())!, x = box.x + box.width / 2, y = box.y + box.height / 2;
  const pointer = {pointerId: 7, pointerType: 'touch', isPrimary: true, bubbles: true, cancelable: true, clientX: x};
  await handle.dispatchEvent('pointerdown', {...pointer, clientY: y, button: 0, buttons: 1});
  await handle.dispatchEvent('pointermove', {...pointer, clientY: y + 12, buttons: 1});
  await handle.dispatchEvent('pointermove', {...pointer, clientY: y + 24, buttons: 1});
  await expect(habitRow(page, 'stretch').locator('.timeline-time')).toHaveText('8:30 AM');
  await handle.dispatchEvent('pointerup', {...pointer, clientY: y + 24, button: 0, buttons: 0});
  await expect.poll(() => stored(page, DAY_TIMELINE_KEY)).toEqual({version: 1, times: {[`habit:${ID.stretch}`]: {time: '08:30'}}});
  await expect(habitRow(page, 'stretch').locator('.timeline-time')).toHaveText('8:30 AM');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('a phone: the time picker moves a habit without any drag', async ({page}) => {
  await at(page, '10:30');
  await seedChecklist(page);
  await open(page);
  await habitRow(page, 'piano').getByRole('button', {name: `Change the time of ${TITLE.piano}`}).click();
  const picker = page.getByRole('form', {name: `Change the time of ${TITLE.piano}`});
  await picker.getByLabel('Time').fill('17:15');
  await picker.getByRole('button', {name: 'Save time', exact: true}).click();
  await expect(page.getByRole('region', {name: /^Evening/}).locator(`[data-block="habit:${ID.piano}"] .timeline-time`)).toHaveText('5:15 PM');
  await expect.poll(async () => (await stored<{times: Record<string, unknown>}>(page, DAY_TIMELINE_KEY))?.times[`habit:${ID.piano}`]).toEqual({time: '17:15', minutes: 15});
});
