import {expect, test} from '@playwright/test';
import {loadShowcase} from './ah-helpers';

/**
 * Session AV lane 2 (review b1 #6): ZIGi never receives the notes (only NOVA does, with Notes on), so asked about the
 * repeating notes it says where to see them, in English and Dutch — never that the notes "can't be read on this device".
 * The Showcase; the API offline; at 1440 (ZIGi's floating button).
 */
test.use({viewport: {width: 1440, height: 900}});
test('ZIGi says where the repeating notes are', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await loadShowcase(page);
  await page.goto('/app/today');
  await page.getByRole('button', {name: /^Open ZIGi/}).first().click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const ask = async (q: string) => {
    const box = panel.getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/});
    await box.fill(q);
    await panel.locator('.ai-composer button[type=submit]').click();
  };
  await ask('which repeating notes do I have');
  await expect(panel.locator('.ai-turn-local').last()).toContainText('ZIGi doesn’t read your notes. Open Notes → Notes → Repeating notes to see them');
  await ask('welke terugkerende notities heb ik');
  await expect(panel.locator('.ai-turn-local').last()).toContainText('ZIGi leest je notities niet. Open Notes → Notes → Repeating notes om ze te zien');
  await expect(panel).not.toContainText('can’t be read on this device');
});
