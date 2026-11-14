import {expect, test, type Page} from '@playwright/test';
import {openNovaConversation} from '../../nova-am';
import {defaultAiSettings} from '../../../lib/ai/settings';
import {NOVA_HERMES_KEY} from '../../../lib/nova/hermes-record';
import {NOVA_SETUP_KEY} from '../../../lib/nova/setup';
import {openZigi, sendToZigi, zigiPanel} from '../../zigi-open';
import {MORNING, nova, seed, sendInNova} from './helpers';

/**
 * Session AL Part 14 (lane P14-B): earlier-scope rows in NOVA and ZIGi, at a computer's width on a fresh profile.
 * - Z1A-4 (second fix line): before "Ask my Hermes", exactly what would go to the person's Hermes shows (on main: nothing).
 * - Z1A-I1: no privacy mode chosen with a cloud key: NOVA's composer says the chat and the briefs disagree (main: silent).
 * - BN-069: a Quick add preview that understood the words replaces ZIGi's examples list above it (main: both show).
 * - DV-070: words typed fast in NOVA's command field reach the chat whole. Needs L8's half (the field notes its words with
 *   lib/nova/bridge.ts `noteNovaDraft`); until that lands this one fails on the branch too.
 */
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'UTC'});
const composer = (page: Page) => nova(page).getByRole('textbox', {name: /^Message /});
test('Z1A-4: "Ask my Hermes" shows what goes to Hermes first, redacted in Strict while Hermes is not confirmed local', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.route('http://127.0.0.1:8642/**', route => route.abort('connectionrefused'));
  await seed(page, {extra: {[NOVA_HERMES_KEY]: JSON.stringify({version: 1, baseUrl: 'http://127.0.0.1:8642', model: 'hermes-agent', lastCheck: {at: MORNING, reachable: true}}), [NOVA_SETUP_KEY]: JSON.stringify({version: 1, privacyMode: 'strict'})}});
  await page.goto('/app/nova');
  await sendInNova(page, 'What is due today?');
  await composer(page).fill('Plan dinner with my sister Anna at 12 Abbey Road');
  await nova(page).getByRole('button', {name: 'Ask ZIGi or your Hermes'}).click();
  const preview = nova(page).locator('.nova-hermes-preview');
  await expect(preview).toContainText('Ask my Hermes sends this to your Hermes Agent');
  await expect(preview).toContainText('private details taken out');
  await expect(preview.getByLabel('Exactly what would go to your Hermes')).not.toContainText('Abbey Road');
  await expect(nova(page).getByRole('button', {name: 'Ask my Hermes'})).toBeVisible();
});
test('Z1A-I1: a cloud key with no privacy mode chosen: NOVA’s composer says what the chat sends and links to the choice', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {settings: {...defaultAiSettings(), enabled: true, mode: 'api', provider: 'openai', model: 'gpt-4o-mini'}});
  await page.goto('/app/nova');
  await sendInNova(page, 'What is due today?').catch(() => undefined);
  await expect(nova(page)).toBeVisible();
  await composer(page).fill('How far am I on my goals?');
  const note = nova(page).locator('.nova-no-mode');
  await expect(note).toContainText('You have not chosen a privacy mode yet, so this chat sends to OpenAI');
  await expect(note.getByRole('link', {name: 'Choose a mode'})).toHaveAttribute('href', '/app/nova/setup');
});
test('BN-069: no examples list above a Quick add preview that understood the words', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page);
  await page.goto('/app');
  await openZigi(page);
  await sendToZigi(page, 'drank 2 glasses of water');
  const preview = zigiPanel(page).locator('.ai-quick-add');
  await expect(preview).toBeVisible({timeout: 15_000});
  await expect(preview).toContainText(/water/i);
  await expect(zigiPanel(page).locator('.ai-turn-local').last()).not.toContainText('Until you give me a brain');
});
test('DV-070: a fast-typed question in NOVA’s field arrives whole (needs L8: the field calls noteNovaDraft)', async ({page}) => {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page);
  await page.goto('/app/nova');
  const field = page.getByPlaceholder(/What’s on your mind/).first();
  await field.click();
  await page.keyboard.type('How far am I on my goals?', {delay: 15});
  await page.keyboard.press('Enter');
  // Session AM (D7, deliberate): Enter in the dashboard field no longer always opens the conversation (words the stage
  // has a widget for are answered under the star); it is opened as a person would, from the answer's button when it did
  // not open by itself, and is then read exactly as before.
  await openNovaConversation(page);
  await expect(nova(page)).toBeVisible({timeout: 15_000});
  await expect(nova(page)).toContainText('How far am I on my goals?', {timeout: 15_000});
  await expect(nova(page).locator('.nova-turn').filter({hasText: /^far am I/})).toHaveCount(0);
});
