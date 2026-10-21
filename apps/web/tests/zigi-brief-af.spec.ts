import {expect, test} from '@playwright/test';
import {AI_MEMORY_KEY, ZIGI_KEY} from '../lib/ai/store/keys';
import {LOCAL_LABEL} from '../lib/ai/local-answers/words';
import {checklistRecords, EVENING, forYouCard, lastLocal, openChat, panel, say, seed, server, spoken, stored, voiceFakes, DAY} from './zigi-af';

/**
 * Session AF (L4, P8.2): Daily Briefing v2 and the Evening Recap through the real app on a production build. Made on
 * this device from the fictional Showcase records and a small Checklist path; Health stays closed (its gate's default);
 * "Read aloud" speaks once on a tap and never by itself; /brief and /recap answer in the chat with no request to the
 * person's AI; "Not today" and the Settings choices are the only writes.
 */
const note = {id: 'note_1', text: 'I train in the morning', category: 'schedule', source: 'person', createdAt: '2026-10-18T08:00:00.000Z', updatedAt: '2026-10-18T08:00:00.000Z'};
const LATE_MORNING = `${DAY}T09:00:00.000Z`;
const extra = {...checklistRecords(), [AI_MEMORY_KEY]: JSON.stringify({version: 1, notes: [note]})};
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the morning: the brief card on Today with its sections; Read aloud speaks once on a tap; nothing is written on view', async ({page}) => {
  await voiceFakes(page);
  const bodies = await server(page);
  // 09:00, after ZIGi's default quiet hours (22:00–08:00): inside them "Read aloud" rests and says so.
  await seed(page, {extra, time: LATE_MORNING});
  await page.goto('/app');
  const card = await forYouCard(page, "ZIGi's morning brief");
  const sections = card.locator('.ai-brief-sections');
  await expect(sections.locator('dt')).toContainText(['Checklist']);
  await expect(card.locator('[data-section="checklist"] dd')).toHaveText(/^\d of 3 dots done(; next: .+)?\.$/);
  await expect(card.locator('[data-section="note"] dd')).toHaveText('You said: I train in the morning.');
  await expect(card).toContainText('Made on this device from your records · no AI used');
  // No recap before its time (18:00 by default), and nothing read aloud by itself.
  await expect(page.getByRole('article', {name: "ZIGi's evening recap"})).toHaveCount(0);
  expect(await spoken(page)).toEqual([]);
  expect(await stored(page, ZIGI_KEY)).toBeNull();
  await card.getByRole('button', {name: 'Read aloud'}).click();
  await expect.poll(() => spoken(page)).toHaveLength(1);
  expect((await spoken(page))[0]).toMatch(/^Your morning brief\.\n/);
  expect((await spoken(page))[0]).toMatch(/Checklist: \d of 3 dots done/);
  expect(bodies).toEqual([]);
});

test('the evening: the recap from its time, above the morning brief; "Not today" hides only the recap; Settings turns it off', async ({page}) => {
  await seed(page, {extra, time: EVENING});
  await page.goto('/app');
  const recap = await forYouCard(page, "ZIGi's evening recap");
  await expect(recap.locator('.ai-brief-sections dt').first()).toBeVisible();
  await expect(recap.locator('[data-section="tomorrow"] dt')).toHaveText('One for tomorrow');
  await expect(recap.locator('[data-section="health"]')).toHaveCount(0); // Health is not shared: none of its counts
  await expect(page.getByRole('article', {name: "ZIGi's morning brief"})).toHaveCount(1);
  await recap.getByRole('button', {name: 'Not today'}).click();
  await expect(page.getByRole('article', {name: "ZIGi's evening recap"})).toHaveCount(0);
  await expect(page.getByRole('article', {name: "ZIGi's morning brief"})).toHaveCount(1);
  expect((await stored(page, ZIGI_KEY))!.dismissed).toEqual({day: DAY, ids: ['recap']});
  // Settings → Your day: the recap off is kept in ZIGi's record.
  await page.goto('/app/help');
  await page.goto('/app/settings#zigi-your-day');
  const day = page.locator('details#zigi-your-day');
  await expect(day).toHaveAttribute('open', '');
  await day.getByRole('switch', {name: 'Evening recap on Today'}).click();
  await expect.poll(async () => (await stored(page, ZIGI_KEY))!.brief).toEqual({evening: false});
  await expect(day.getByRole('status')).toHaveText('No evening recap on Today; /recap still shows it in the chat.');
});

test('/brief and /recap in the chat: made on the device, no request to the AI; "what\'s my plan today" too', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {extra, time: EVENING});
  await page.goto('/app');
  await openChat(page);
  await say(page, '/brief');
  await expect(lastLocal(page)).toContainText('Your morning brief:');
  // The chat shows "• " lines as list items, so the bullet is the list's, not the text's.
  await expect(lastLocal(page).locator('li', {hasText: /^Checklist: \d of 3 dots done/})).toHaveCount(1);
  await expect(lastLocal(page)).toContainText(LOCAL_LABEL);
  await say(page, '/recap');
  await expect(lastLocal(page)).toContainText('Your evening recap:');
  await expect(lastLocal(page).locator('li', {hasText: /^One for tomorrow: /})).toHaveCount(1);
  await say(page, 'what\'s my plan today');
  await expect(lastLocal(page)).toContainText('Your morning brief:');
  await say(page, 'hoe ging vandaag');
  await expect(lastLocal(page)).toContainText('Your evening recap:');
  expect(bodies).toEqual([]);
  // The Suggestions sheet's "Your day" shows the morning brief and, at this hour, the recap, each read aloud only on a tap.
  await panel(page).getByRole('button', {name: 'Suggestions', exact: true}).click();
  const sheet = panel(page).getByRole('region', {name: 'Suggestions for you'});
  await sheet.getByRole('tab', {name: 'Your day'}).click();
  await expect(sheet.getByRole('region', {name: 'Your morning brief'})).toBeVisible();
  await expect(sheet.getByRole('region', {name: 'Your evening recap'})).toBeVisible();
  for (const line of await sheet.getByRole('region', {name: 'Your morning brief'}).locator('li').allTextContents()) expect(line).toMatch(/^(Still open today: |From yesterday: |One to start with: |Coming up: )/);
});
