import {expect, test} from '@playwright/test';
import {openChat, panel, seed, server, stored} from './zigi-af';
import {ZIGI_KEY} from '../lib/ai/store/keys';

/**
 * Session AI (mascot): ZIGi's personality — calm (the default, the words as before), cheerful or direct — chosen in
 * Settings → ZIGi's look; the greeting follows it and the person's AI is told the tone. MOCK model; fictional records.
 */
test.use({timezoneId: 'UTC'});
test('choosing Direct changes the greeting and tells the AI the tone; calm is the default', async ({page}) => {
  const bodies = await server(page, () => 'MOCK: noted.');
  await seed(page);
  await page.goto('/app');
  await openChat(page);
  await expect(panel(page).locator('.ai-greeting-text')).toHaveText('Hi, I’m ZIGi. Ask about your records or tell me what to log. Nothing is written until you add a card.');
  await page.keyboard.press('Escape');
  await page.goto('/app/settings#zigi-look');
  const look = page.locator('#zigi-look');
  await look.getByRole('radio', {name: /^Direct/}).check();
  await expect.poll(async () => ((await stored(page, ZIGI_KEY)) as {personality?: string} | null)?.personality).toBe('direct');
  await page.goto('/app');
  await openChat(page);
  await expect(panel(page).locator('.ai-greeting-text')).toHaveText(/^ZIGi here\./);
  await panel(page).getByRole('textbox').first().fill('How is my day?');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect.poll(() => bodies.length).toBeGreaterThan(0);
  expect(JSON.stringify(bodies[0]!.messages[0])).toContain('The person chose a direct ZIGi');
});
test('G14: what ZIGi did for you is counted only once switched on, on the device, as counts only', async ({page}) => {
  await seed(page, {ai: null});
  await page.goto('/app/settings#zigi-your-day');
  const value = page.getByRole('region', {name: 'What ZIGi did for you'});
  await value.getByRole('switch', {name: 'Count what ZIGi does'}).click();
  await expect(value.getByRole('status')).toContainText('from now on');
  await page.goto('/app');
  await openChat(page);
  await panel(page).getByRole('textbox').first().fill('How much water did I drink today?');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect.poll(async () => JSON.stringify(await stored(page, 'zigoals:zigi-metrics:v1'))).toMatch(/"device-answer":1/);
  const record = JSON.stringify(await stored(page, 'zigoals:zigi-metrics:v1'));
  expect(record).not.toMatch(/water|drink/i);
});
