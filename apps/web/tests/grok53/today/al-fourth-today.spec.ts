import {expect, test} from '@playwright/test';
import {createHabit, emptyDevice, open} from '../l3-helpers';

/**
 * Session AL fourth pass (lane L3, GROK53_REPLAY_L3_1 "exact steps" 3 and 11): Today's Arrange mode and "How it works",
 * desktop 1280×800, Nebula, a fresh profile with one habit, Brussels before 07:00.
 */
test.use({viewport: {width: 1280, height: 800}, locale: 'en-GB', timezoneId: 'Europe/Brussels'});
test.beforeEach(async ({page}) => { await page.clock.install({time: new Date('2026-11-04T03:00:00Z')}); await emptyDevice(page); });

test('NB-092/DV-024b/NB-220/DV-155: Arrange names each card as it reads, says why Daily Habits stands down, and lists no card of a page never switched on', async ({page}) => {
  await createHabit(page, 'Read');
  await open(page, '/app');
  await page.getByRole('button', {name: 'Customize Today', exact: true}).click();
  // A hidden built-in whose widget twin shows says so, instead of "hidden" above the same live list.
  const placeholder = page.locator('.dashboard-hidden-placeholder', {hasText: 'Daily Habits is hidden from Today.'});
  // (A new device's Today has the habits widget, so Daily Habits stands down for it: lib/dashboard-settings.ts emptyDashboardSettings.)
  await expect(placeholder).toBeVisible();
  await expect(placeholder).toContainText('Your Daily Habits widget shows the same list, so this card stands down; Show card brings it back as well.');
  // Markets was never switched on: its Watchlist is not one of this person's cards.
  await expect(page.getByText('Watchlist is hidden with its page')).toHaveCount(0);
  // The arrow buttons name the cards as their headings read; no two alike, no catalog words.
  const names = await page.locator('.layout-controls[aria-label^="Arrange "]').evaluateAll(list => list.map(e => e.getAttribute('aria-label')!));
  expect(names.length).toBeGreaterThan(2);
  expect(new Set(names).size).toBe(names.length);
  expect(names).not.toContain('Arrange Widget summary');
  expect(names).not.toContain('Arrange Health metric');
  expect(names).toContain('Arrange Your snapshot');
  expect(names).toContain('Arrange Daily Habits (hidden)');
  expect(names).toContain('Arrange Meals today');
});

test('D-184: "See how it works" tells what to tap in sentences, and the film says its length in words', async ({page}) => {
  await open(page, '/app');
  await page.getByRole('button', {name: 'See how it works'}).click();
  const howTo = page.getByRole('dialog', {name: 'Goals, Habits & Health = Wealth'});
  await expect(howTo).toBeVisible();
  await expect(howTo.locator('.how-it-works-how').first()).toHaveText('On Goals, tap “+ Create a goal”. Pick a life area, write why it matters, and link the wealth that funds it.');
  await expect(howTo).not.toContainText('Goals →');
  await expect(howTo).not.toContainText('Habits →');
  await expect(howTo.getByRole('button', {name: 'Watch the 16-second film', exact: true})).toBeVisible();
});
