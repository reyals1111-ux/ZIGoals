import {expect, test, type Route} from '@playwright/test';
import {seed} from './helpers';

/**
 * Session AL (lane L7; Berlin BN-035): NOVA's setup refuses a server on Ollama's port that is not Ollama ("0.0.0-mock",
 * "mock:latest"), and finds a real-shaped Ollama. Berlin's desktop width; a fresh profile.
 */
test.use({viewport: {width: 1440, height: 900}});
async function ollama(page: import('@playwright/test').Page, real: boolean) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  for (const base of ['http://127.0.0.1:1234', 'http://localhost:1234', 'http://127.0.0.1:9931', 'http://127.0.0.1:8080']) await page.route(`${base}/**`, route => route.abort('connectionrefused'));
  await page.route('http://127.0.0.1:11434/**', (route: Route) => {
    const url = route.request().url(), json = (body: unknown) => route.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*'}, body: JSON.stringify(body)});
    if (url.endsWith('/api/version')) return json({version: real ? '0.40.14' : '0.0.0-mock'});
    if (url.endsWith('/api/tags')) return json({models: [real ? {name: 'qwen2.5:0.5b', model: 'qwen2.5:0.5b', modified_at: '2026-11-03T22:00:00Z', size: 397821319, digest: 'a8b0c51577010a279d933d14c2a8ab4b268079d44c5c8830c0a93900f1827c67', details: {format: 'gguf', family: 'qwen2', parameter_size: '494.03M', quantization_level: 'Q4_K_M'}} : {name: 'mock:latest', model: 'mock:latest'}]});
    return route.fulfill({status: 404, body: ''});
  });
}
for (const real of [false, true]) test(`BN-035: the scan ${real ? 'finds a real Ollama' : 'says a mock on port 11434 is not Ollama'}`, async ({page}) => {
  await ollama(page, real);
  await seed(page);
  await page.goto('/app/nova/setup');
  // As tests/nova-setup.spec.ts opens planet 3.
  await page.getByRole('button', {name: /^Your brain, local first:/}).first().click();
  const brain = page.locator('[data-setup-panel="brain"]');
  await expect(brain).toBeVisible();
  await brain.getByRole('button', {name: /^A model on this computer/}).click();
  await brain.getByRole('button', {name: 'Find models on this computer'}).click();
  const scan = brain.locator('.nova-scan');
  if (real) await expect(scan).toContainText('Ollama: 1 model (qwen2.5:0.5b)');
  else { await expect(scan).toContainText('it is not Ollama'); await expect(scan).not.toContainText('mock:latest'); }
});
