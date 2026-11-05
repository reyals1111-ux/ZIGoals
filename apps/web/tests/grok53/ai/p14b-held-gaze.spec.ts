import {expect, test, type Page} from '@playwright/test';
import {ZIGI_KEY} from '../../../lib/ai/store/keys';
import {openZigi, sendToZigi, zigiBox, zigiPanel} from '../../zigi-open';
import {seed} from './helpers';

/**
 * Session AL Part 14 (lane P14-B; AL_SCOPE D13, STATUS AK "X020–X022 delivered, not played"): ZIGi holds Studio-4's gaze
 * while it waits on the person. On main nothing plays these clips (Meet ZIGi says "Not used yet."), so the head of the
 * panel never shows X020 or X022. Fresh profile, no model, Full animation, a computer's width.
 */
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'UTC'});
const head = (page: Page) => zigiPanel(page).locator('.ai-chat-head .zigi img');
const file = (page: Page) => head(page).evaluate(el => { const img = el as HTMLImageElement; return (img.currentSrc || img.src).split('/').pop() ?? ''; });
async function start(page: Page) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await seed(page, {extra: {[ZIGI_KEY]: JSON.stringify({version: 1, animation: 'full'})}});
  await page.goto('/app');
  await openZigi(page);
}
test('D13 X020: the chat box focused, ZIGi listening, holds its look at the box', async ({page}) => {
  await start(page);
  await zigiBox(page).focus();
  await zigiBox(page).pressSequentially('a');
  await expect.poll(() => file(page), {timeout: 10_000}).toMatch(/^X020-gaze-chat-input/);
});
test('D13 X022: cards waiting for a decision hold ZIGi’s look at them; Add ends it; Motion Off shows no gaze', async ({page}) => {
  await start(page);
  await sendToZigi(page, 'Create a habit called Yoga');
  const card = zigiPanel(page).locator('.ai-card').last();
  await expect(card).toBeVisible({timeout: 15_000});
  // The person looks at the card: the box loses the focus and ZIGi rests while the card waits.
  await zigiBox(page).blur();
  await expect.poll(() => file(page), {timeout: 15_000}).toMatch(/^X022-gaze-target/);
  await card.getByRole('button', {name: 'Add', exact: true}).click();
  await expect.poll(() => file(page), {timeout: 15_000}).not.toMatch(/^X022/);
  // Motion Off (the device's reduced motion here): a new waiting card shows the still frame of rest, never the gaze.
  await page.emulateMedia({reducedMotion: 'reduce'});
  await zigiBox(page).focus();
  await sendToZigi(page, 'Create a habit called Stretch');
  await expect(zigiPanel(page).locator('.ai-card').last()).toContainText('Stretch', {timeout: 15_000});
  await zigiBox(page).blur();
  await page.waitForTimeout(4000);
  expect(await file(page)).not.toMatch(/^X02[012]/);
});
