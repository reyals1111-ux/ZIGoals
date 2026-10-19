import {expect, test} from '@playwright/test';
import {HABITS_KEY} from '../lib/habits';
import {ID, TITLE, browserToday, seedChecklist, settled, stored} from './checklist-fixtures';

/**
 * Session AF (L3): the Checklist in WebKit at 390 × 844 (evidence label: WebKit, never "Safari on an iPhone"). It opens
 * with its heading and no page error, nothing scrolls sideways, the dots and the timer chips are at least 44 px, and a
 * tick writes the habit's record. The seed waits for the page's network to settle before the next navigation (ADR-027 G23).
 */
test.use({viewport: {width: 390, height: 844}});
test('the Checklist on a phone in WebKit: a heading, 44 px dots and chips, no sideways scroll, a tick that lands', async ({page, browserName}, info) => {
  test.skip(browserName !== 'webkit', 'The WebKit job; Chrome covers the Checklist in its own specs.');
  test.skip(info.project.name !== 'mobile', 'A phone: the iPhone project only.');
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await seedChecklist(page);
  await page.goto('/app/checklist'); await settled(page);
  await expect(page.locator('main h1').first()).toHaveText('Your orbit');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
  // Session AF (L3b): on a phone the timers fold into one corner button (itself 58 px); open them to measure each one.
  const fab = page.getByRole('button', {name: /^Timers:/});
  expect(Math.round(Math.min(...Object.values((await fab.boundingBox())!).slice(2)))).toBeGreaterThanOrEqual(44);
  await fab.click();
  await expect(page.getByRole('group', {name: 'Quick timers'})).toBeVisible();
  for (const el of [...await page.locator('button.path-dot').all(), ...await page.locator('.checklist-timer').all()]) {
    const box = (await el.boundingBox())!; expect(Math.round(Math.min(box.width, box.height))).toBeGreaterThanOrEqual(44);
  }
  await fab.click();
  await page.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  await expect(page.locator('.checklist-progress-line')).toContainText('1 of 4 planets today');
  const today = await browserToday(page);
  await expect.poll(async () => (await stored<{habits: {id: string; entries: {date: string; count: number}[]}[]}>(page, HABITS_KEY))?.habits.find(h => h.id === ID.stretch)?.entries.find(e => e.date === today)?.count).toBe(1);
  const prefetchCancel = (m: string) => /\?_rsc=[\w-]+ due to access control checks\.?$/.test(m);
  expect(errors.filter(m => !prefetchCancel(m))).toEqual([]);
});
