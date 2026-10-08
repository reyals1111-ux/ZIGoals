import {expect, test} from '@playwright/test';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';

/** X-Cloud's H10 (ADR-017 S71): after a mouse click on Send the focus stays in the message box, so Escape still closes the panel. MOCK on 127.0.0.1:1234. */
test('a mouse click on Send keeps the focus in the message box; Escape then closes the panel', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(v => { localStorage.clear(); sessionStorage.clear(); localStorage.setItem(v.key, v.value); }, {key: AI_SETTINGS_KEY, value: JSON.stringify({...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'mock-chat', localServer: 'openai-compatible', baseUrl: 'http://127.0.0.1:1234'})});
  await page.goto('/app/habits');
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  const panel = page.locator('dialog.ai-chat[open]');
  await expect(panel).toBeVisible();
  const box = panel.getByLabel('Message to your AI');
  await box.fill('Tell me about my habits');
  await panel.getByRole('button', {name: 'Send', exact: true}).click();
  await expect(panel.locator('.ai-turn-assistant').last()).toContainText(/\S/, {timeout: 20_000});
  await expect(panel.getByRole('button', {name: 'Send', exact: true})).toBeVisible({timeout: 20_000});
  await expect(box).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toHaveCount(0);
});
