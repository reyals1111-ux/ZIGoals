import {expect, test, type Page} from '@playwright/test';
import {defaultAiSettings} from '../../../lib/ai/settings';

/**
 * Session AL L8 round 2 (BN-044, N-BN-11): NOVA's header chips and Permissions read one source. With a local brain
 * connected, the Memory chip says what the "Use my memory" switch says, and changes with it without a reload; the scopes
 * chip says "Reads" (what NOVA reads), never "Sees". Fictional data only; the local model is mocked.
 */
const settings = {...defaultAiSettings(), enabled: true, mode: 'local', provider: 'local', model: 'llama3.2:3b', localServer: 'ollama', baseUrl: 'http://127.0.0.1:11434'};

async function open(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('http://127.0.0.1:11434/**', route => route.fulfill({json: {models: [{name: 'llama3.2:3b', model: 'llama3.2:3b', details: {family: 'llama'}}]}, headers: {'access-control-allow-origin': '*'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); }, {
    'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}),
    'zigoals:nova:v1': JSON.stringify({version: 1, openingSeen: true}),
    'zigoals:ai:v1': JSON.stringify(settings),
  });
  await page.goto('/app/nova');
}

test('BN-044 / N-BN-11: the Memory chip follows "Use my memory"; the scopes chip says Reads', async ({page, isMobile}) => {
  test.skip(isMobile, 'the header chips are the computer layout');
  await page.setViewportSize({width: 1440, height: 900});
  await open(page);
  const memoryChip = page.locator('.nova-chips a.nova-chip[href$="#memory"]').first();
  await expect(memoryChip).toContainText(/Memory\s*·\s*on/);
  await expect(page.locator('a.nova-chip[data-kind="scopes"]')).toContainText(/^Reads/);
  await expect(page.locator('.nova-chips')).not.toContainText('Sees');
  // Permissions opens from the scopes chip, as a person reaches it (tests/journeys/j12-nova.spec.ts).
  await page.locator('a.nova-chip[data-kind="scopes"]').click();
  const memorySwitch = page.getByRole('switch', {name: /^Use my memory/});
  await memorySwitch.scrollIntoViewIfNeeded();
  await expect(memorySwitch).toBeChecked();
  await memorySwitch.click();
  await expect(memorySwitch).not.toBeChecked();
  await expect(memoryChip).toContainText(/Memory\s*·\s*off/);
  await memorySwitch.click();
  await expect(memoryChip).toContainText(/Memory\s*·\s*on/);
});
