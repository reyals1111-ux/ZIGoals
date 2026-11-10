import {expect, test} from '@playwright/test';
import {emptyDevice, open} from '../l3-helpers';
import {loadShowcase} from '../../ah-helpers';

/**
 * Session AL sweep 3 (lane SW3): Health rows sent on by L4 and L2. Desktop 1280 × 800, Europe/Brussels, a fixed clock.
 * Written, not run here.
 */
test.use({timezoneId: 'Europe/Brussels', locale: 'en-GB', viewport: {width: 1280, height: 800}});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-05T09:00:00Z')}); });

test('DV-047c: "Increase Push-ups" writes an Activity row under Health, and the Health chip counts it', async ({page}) => {
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/health');
  await page.getByRole('button', {name: 'Increase Push-ups', exact: true}).click();
  await page.getByRole('button', {name: 'Increase Push-ups', exact: true}).click();
  await expect(page.locator('.exercise-count-live').first()).toContainText('Push-ups today: 2');
  await open(page, '/app/activity');
  const row = page.locator('.activity-event[data-category="HEALTH"]').filter({hasText: 'Push-ups'});
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('2 counted');
  const chip = await page.getByRole('navigation', {name: 'Activity categories'}).getByRole('button', {name: /^Health/}).innerText();
  expect(Number(/(\d+)\s*$/.exec(chip)![1])).toBeGreaterThanOrEqual(1);
});

test('D-009: every Health button has a name (text, aria-label, aria-labelledby or title) in the Showcase', async ({page}) => {
  await emptyDevice(page, {theme: 'dark'});
  await loadShowcase(page);
  await open(page, '/app/health');
  await page.waitForLoadState('networkidle');
  const unnamed = await page.locator('main button').evaluateAll(list => list.filter(b => {
    const el = b as HTMLElement;
    if (el.closest('[hidden],[aria-hidden="true"]') || !el.getClientRects().length) return false;
    const by = el.getAttribute('aria-labelledby')?.split(/\s+/).map(id => document.getElementById(id)?.textContent?.trim() ?? '').join('') ?? '';
    return !(el.textContent ?? '').trim() && !el.getAttribute('aria-label')?.trim() && !el.getAttribute('title')?.trim() && !by;
  }).map(b => b.outerHTML.slice(0, 200)));
  // The list says which ones, if any are left (the replay counted 7).
  expect(unnamed).toEqual([]);
});

test('N-MO-28: Focus sounds says what is off; never a bare "Off" read out after another message', async ({page}) => {
  await emptyDevice(page, {theme: 'nebula'});
  await open(page, '/app/health?view=meditation');
  const player = page.getByRole('region', {name: 'Focus sounds'});
  await expect(player).toBeVisible();
  await expect(player.getByRole('status')).toHaveText('Focus sounds: off');
});
