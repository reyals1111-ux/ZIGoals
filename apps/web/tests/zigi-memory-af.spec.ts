import {expect, test} from '@playwright/test';
import {AI_MEMORY_KEY} from '../lib/ai/store/keys';
import {MEMORY_DECLINED, MEMORY_FIRST} from '../lib/ai/memory';
import {block, forYouCard, MORNING, openChat, panel, say, seed, server, stored} from './zigi-af';

/**
 * Session AF (L4, P8.3; ADR-028 H30): ZIGi Memory v2 on the existing `zigoals:ai-memory:v1`, through the real app on a
 * production build with MOCK replies. The first "Remember this?" card says once how notes are kept, and the person's
 * Remember is their agreement (kept as `consent`); "Notes from ZIGi's cards" in What ZIGi knows shows it and turns it off,
 * after which a Remember card is refused in plain words; a schedule note is quoted in the brief and marked "Used in
 * today's brief"; a plan may carry a Remember card. Device only, never synced; nothing written on view.
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('the first Remember card says how notes are kept; Remember records the agreement; turned off, the next card is refused', async ({page}) => {
  let reply = `Noted.\n\n${block({kind: 'remember', text: 'I train in the morning', category: 'schedule'})}`;
  await server(page, () => reply);
  await seed(page, {time: MORNING});
  await page.goto('/app');
  await openChat(page);
  await say(page, 'Remember that I train in the morning');
  const card = panel(page).locator('.ai-card').last();
  await expect(card).toContainText(MEMORY_FIRST);
  expect(await stored(page, AI_MEMORY_KEY)).toBeNull();
  await card.getByRole('button', {name: 'Remember'}).click();
  await expect(card).toContainText('Remembered: in What ZIGi knows about me');
  const kept = await stored(page, AI_MEMORY_KEY);
  expect(kept!.notes).toEqual([expect.objectContaining({text: 'I train in the morning', category: 'schedule', source: 'zigi'})]);
  expect(kept!.consent).toEqual({given: true, at: expect.stringMatching(/^2026-10-19T07:/)});
  // What ZIGi knows: the agreement shown and changeable; the note marked as used in today's brief.
  await page.goto('/app/help');
  await page.goto('/app/settings#zigi-notes');
  const notes = page.locator('details#zigi-notes');
  await expect(notes).toHaveAttribute('open', '');
  await expect(notes.getByTestId('notes-used-in-brief')).toHaveText('Used in today’s brief: “I train in the morning” (Schedule).');
  const consent = notes.getByRole('switch', {name: "Notes from ZIGi's cards"});
  await expect(consent).toHaveAttribute('aria-checked', 'true');
  await consent.click();
  await expect(consent).toHaveAttribute('aria-checked', 'false');
  expect((await stored(page, AI_MEMORY_KEY))!.consent).toEqual({given: false, at: expect.any(String)});
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toHaveLength(1); // the person's notes stay
  // A new Remember card is refused in plain words; nothing is kept.
  reply = `Noted.\n\n${block({kind: 'remember', text: 'Prefers short answers', category: 'preferences'})}`;
  await page.goto('/app');
  await openChat(page);
  await say(page, 'Remember that I prefer short answers');
  await expect(panel(page).locator('.ai-card').last()).toContainText(MEMORY_DECLINED);
  expect((await stored(page, AI_MEMORY_KEY))!.notes).toHaveLength(1);
});

test('the brief quotes a note the person keeps ("You said: …"); a plan may carry a Remember card', async ({page}) => {
  const note = {id: 'note_1', text: 'I train in the morning', category: 'schedule', source: 'person', createdAt: '2026-10-18T08:00:00.000Z', updatedAt: '2026-10-18T08:00:00.000Z'};
  await server(page, () => block({kind: 'plan-bundle', title: 'Your 10k plan', habits: [{title: 'Run', measurement: 'minutes', target: 30}], remember: [{text: 'Wants to run a 10k in March', category: 'goals'}]}));
  await seed(page, {time: MORNING, extra: {[AI_MEMORY_KEY]: JSON.stringify({version: 1, notes: [note]})}});
  await page.goto('/app');
  const brief = await forYouCard(page, "ZIGi's morning brief");
  await expect(brief.locator('[data-section="note"] dd')).toHaveText('You said: I train in the morning.');
  await openChat(page);
  await say(page, 'Set me up for a 10k');
  const remember = panel(page).locator('.ai-card').filter({hasText: 'Remember this?'});
  await expect(remember).toContainText('Wants to run a 10k in March');
  await expect(remember).not.toContainText(MEMORY_FIRST); // the person already has notes: they agreed before
});
