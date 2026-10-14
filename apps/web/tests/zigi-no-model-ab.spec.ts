import {expect, test, type Page} from '@playwright/test';
import {buildShowcase} from '../lib/showcase-data';
import {DASHBOARD_SETTINGS_KEY, presetSettings} from '../lib/dashboard-settings';
import {WHATS_NEW_KEY, WHATS_NEW_RELEASE} from '../lib/whats-new';

/**
 * Session AB-Cloud Part 9 (ADR-023 C30): ZIGi with no AI at all. A Dutch question gets the introduction in Dutch and
 * examples that are answered when tapped; "create a food" gets the steps and a card that opens Health. Nothing is sent
 * anywhere (every non-app request is refused and counted).
 */
const DAY = '2026-09-20', EVENING = '2026-09-20T19:00:00.000Z';
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function ask(page: Page, text: string) {
  await panel(page).getByLabel('Ask ZIGi about your records').fill(text);
  await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
  return panel(page).locator('.ai-turn-local').last();
}
test('no AI: a Dutch question is introduced in Dutch with working examples; "create a food" gets the steps and a card to Health', async ({page}) => {
  const external: string[] = [];
  await page.route(/^https?:\/\/(?!127\.0\.0\.1:3\d{3})/, route => { external.push(route.request().url()); return route.abort(); });
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.clock.install({time: EVENING});
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); sessionStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {...buildShowcase(DAY).records, [DASHBOARD_SETTINGS_KEY]: JSON.stringify({...presetSettings('habits-health'), onboarded: true}), [WHATS_NEW_KEY]: JSON.stringify({version: 1, dismissed: [WHATS_NEW_RELEASE]})});
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(panel(page)).toBeVisible();
  const dutch = await ask(page, 'Hoeveel minuten heb ik deze maand gemediteerd?');
  await expect(dutch).toContainText('Zonder AI beantwoord ik vragen over je eigen gegevens hier, op dit apparaat, voorlopig in het Engels. Tik op een voorbeeld:');
  await dutch.getByRole('button').filter({hasText: /\?$/}).first().click();
  await expect(panel(page).locator('.ai-turn-local').last()).not.toContainText('Tik op een voorbeeld');
  await expect(panel(page).locator('.ai-turn-local').last().locator('.ai-turn-label')).toHaveText('Answered on your device · no AI used');
  const food = await ask(page, 'Create a food called protein shake');
  await expect(food).toContainText('Without an AI I can\'t fill in a food for you, but by hand it takes a minute:');
  await expect(food.getByRole('listitem').first()).toHaveText('Health → Foods & recipes → New food.');
  await expect(food.locator('.ai-card')).toHaveCount(1);
  await expect(food.locator('.ai-card')).toContainText('Open Health');
  await food.locator('.ai-card').getByRole('button', {name: 'Open the form'}).click();
  await expect(page).toHaveURL(/\/app\/health/);
  expect(external).toEqual([]);
});
