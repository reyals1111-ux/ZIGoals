import {expect, test} from '@playwright/test';
import {AI_SETTINGS_KEY, defaultAiSettings} from '../lib/ai/settings';

/**
 * X-Cloud's H10 (ADR-017 S71): after a mouse click on Send the focus stays in the message box, so Escape still closes the
 * panel. The model is MOCK: the spec answers the local provider's two routes itself (Part 9, S84 — the first version relied
 * on a mock server that only ran on the owner's Mac, so it failed in CI).
 */
const chunk = (delta: Record<string, unknown>, finish: string | null = null) => `data: ${JSON.stringify({id: 'mock', object: 'chat.completion.chunk', choices: [{index: 0, delta, finish_reason: finish}]})}\n\n`;
test('a mouse click on Send keeps the focus in the message box; Escape then closes the panel', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('http://127.0.0.1:1234/**', route => {
    const url = route.request().url();
    if (url.endsWith('/v1/models')) return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({object: 'list', data: [{id: 'mock-chat'}]})});
    if (url.endsWith('/v1/chat/completions')) return route.fulfill({status: 200, contentType: 'text/event-stream', body: chunk({role: 'assistant', content: 'You have no habits yet. '}) + chunk({content: 'Tell me one and I will draft it as a card.'}, 'stop') + 'data: [DONE]\n\n'});
    return route.fulfill({status: 404, body: ''});
  });
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
