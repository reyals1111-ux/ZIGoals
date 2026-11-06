import {expect, test} from '@playwright/test';
import {openZigi, sendToZigi, zigiPanel} from '../../zigi-open';
import {seed} from './helpers';

/**
 * Session AL (lane L7; Professor PR-025, PR-041, PR-011; P-PR-07): the ZIGi panel found closed after ~10 minutes idle,
 * with its chat gone on reopen. Reproduced with a fake clock in the Showcase (the Professor's profile): every interval and
 * timeout of the page runs for 15 minutes. The panel must stay open with its conversation; after a full reload (the
 * other way a panel can close) opening ZIGi again shows the same conversation (the tab keeps its id for 30 minutes).
 */
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Brussels'});
test('PR-041: 15 minutes idle with ZIGi open — the panel and its chat stay', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {showcase: true});
  await page.goto('/app');
  await openZigi(page);
  await sendToZigi(page, 'How many habits are left today?');
  const reply = zigiPanel(page).locator('.ai-turn-assistant, [data-role="assistant"]').last();
  await expect(reply).toBeVisible({timeout: 15_000});
  // Fix-up FX-G53b: the reply's own textContent, not innerText — innerText puts line breaks between the answer's lines
  // ("today:\n\nExercise"), which the panel's textContent that toContainText reads never has, so the same words never matched.
  const said = ((await reply.textContent()) ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  expect(said.length).toBeGreaterThan(10);
  for (let minute = 1; minute <= 15; minute++) await page.clock.runFor(60_000);
  await expect(zigiPanel(page)).toBeVisible();
  await expect(zigiPanel(page)).toContainText(said);
});
test('PR-041: after a full reload, opening ZIGi again reopens the same conversation', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page);
  await page.goto('/app');
  await openZigi(page);
  await sendToZigi(page, 'Which habits are open today?');
  await expect(zigiPanel(page)).toContainText('Which habits are open today?');
  await page.clock.runFor(10 * 60_000);
  await page.reload();
  await openZigi(page);
  await expect(zigiPanel(page)).toContainText('Which habits are open today?', {timeout: 15_000});
});
