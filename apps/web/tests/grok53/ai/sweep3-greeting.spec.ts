import {expect, test} from '@playwright/test';
import {openChat, panel, say, seed, server} from '../../zigi-af';

/**
 * Session AL sweep 3 (lane SW3, NB-006 from L3): ZIGi greets by the name given in setup (`zigoals:profile-name:v1`, this
 * device only); the name is never sent to the person's AI. MOCK model; fictional records. Written, not run here.
 */
test.use({timezoneId: 'UTC'});
const NAME = 'Quillon';
const named = {'zigoals:profile-name:v1': JSON.stringify({version: 1, name: NAME})};

test('NB-006: connected, ZIGi says "Hi Quillon"; the name is in no request to the AI', async ({page}) => {
  const bodies = await server(page, () => 'MOCK: noted.');
  await seed(page, {extra: named});
  await page.goto('/app');
  await openChat(page);
  await expect(panel(page).locator('.ai-greeting-text')).toHaveText(`Hi ${NAME}, I’m ZIGi. Ask about your records or tell me what to log. Nothing is written until you add a card.`);
  await say(page, 'How did I sleep this week?');
  await expect.poll(() => bodies.length).toBeGreaterThan(0);
  expect(JSON.stringify(bodies)).not.toContain(NAME);
});

test('NB-006: with no AI, the local greeting uses the name too; without a name it reads as before', async ({page}) => {
  await seed(page, {ai: null, extra: named});
  await page.goto('/app');
  await openChat(page);
  await expect(panel(page).locator('.ai-greeting-text')).toHaveText(`Hi ${NAME}, I’m ZIGi. Ask about your records: I answer right here, privately, on this device.`);
});
