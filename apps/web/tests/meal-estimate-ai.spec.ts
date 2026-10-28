import {expect, test} from '@playwright/test';
import {block, openChat, panel, say, seed, server, stored} from './zigi-af';
import {MEAL_ESTIMATES_KEY} from '../lib/meal-estimates/schema';

/**
 * Session AI (feature 1, HE17): a meal estimate as ranges. The card shows each nutrient as a range and the middle it saves;
 * after Add, the food carries the middle and Health's library shows the range beside it, kept on this device. MOCK model
 * (the real-model photo runs are Track A's); fictional data.
 */
test.use({timezoneId: 'UTC'});
const PLATE = block({kind: 'log-food', name: 'Pasta plate', meal: 'Dinner', estimate: {range: {kcal: [450, 650], protein_g: [20, 30]}, serving_g: 350, from: 'photo'}});
test('a ranged estimate: the card shows the ranges, Add saves the middle, the library shows the range', async ({page}) => {
  await server(page, () => `A pasta plate, judged from the photo.\n\n${PLATE}`);
  await seed(page);
  await page.goto('/app/health');
  await openChat(page);
  await say(page, 'Log this pasta plate for dinner');
  const card = panel(page).locator('.ai-card').last();
  await expect(card).toContainText('kcal 450–650 (saved as 550)');
  await expect(card).toContainText('protein 20–30 g (saved as 25 g)');
  await expect(card).toContainText('From your photo: a range');
  await card.getByRole('button', {name: 'Add', exact: true}).click();
  await expect(card).toHaveClass(/ai-card-added/);
  await expect.poll(async () => Object.values(((await stored(page, MEAL_ESTIMATES_KEY)) as {foods?: Record<string, unknown>} | null)?.foods ?? {})).toEqual([expect.objectContaining({ranges: {kcal: [450, 650], protein_g: [20, 30]}, source: 'photo'})]);
  await page.keyboard.press('Escape');
  await page.goto('/app/health#foods');
  const row = page.locator('.health-library-row').filter({hasText: 'Pasta plate'});
  await expect(row).toContainText('AI estimate from a photo: kcal 450–650 · protein 20–30 g per serving');
});
