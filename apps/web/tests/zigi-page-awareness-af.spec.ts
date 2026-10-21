import {expect, test} from '@playwright/test';
import {lastLocal, MORNING, openChat, panel, say, seed, server, box} from './zigi-af';

/**
 * Session AF (L4, P8.7): page awareness through the real panel on a production build. "What am I looking at?" and
 * "explain this card" are answered on the device from the page's card titles and ZIGi's plain-words notes; a question
 * about the page that the device cannot answer takes the page's titles to the person's AI as one removable "This page"
 * chip — titles and ids only, never a value, nothing from Settings, Health cards only with the gate.
 */
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });

test('on Today: what is in view, answered on the device from the titles; a card pointed at is explained; no request to the AI', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {time: MORNING});
  await page.goto('/app');
  const summary = page.locator('.placed-module[data-module="summary"]');
  await expect(summary).toBeVisible();
  await openChat(page);
  // The page under the panel scrolled to the Widget summary: what is in view is read at the moment of the question.
  await summary.evaluate(el => el.scrollIntoView({block: 'center'}));
  await say(page, 'What am I looking at?');
  await expect(lastLocal(page)).toContainText('You are on Today. In view:');
  await expect(lastLocal(page).locator('li', {hasText: /^Widget summary — The Widget summary collects the small widgets you pinned to Today\.$/})).toHaveCount(1);
  await expect(lastLocal(page)).toContainText('Titles only: ZIGi reads no values here.');
  // The person points at a card (focus or a tap inside it), then asks about "this card".
  await summary.evaluate(el => (el.querySelector('h2, h3, button, a') ?? el).dispatchEvent(new FocusEvent('focusin', {bubbles: true})));
  await say(page, 'Explain this card');
  await expect(lastLocal(page)).toContainText('The Widget summary collects the small widgets you pinned to Today.');
  await expect(lastLocal(page)).toContainText('About the card, not your figures');
  expect(bodies).toEqual([]);
});

test('"explain this page" goes to the person\'s AI with the "This page" chip: titles and ids, no values; removable; nothing on Settings', async ({page}) => {
  const bodies = await server(page);
  await seed(page, {time: MORNING});
  await page.goto('/app');
  await openChat(page);
  await box(page).fill('Explain this page');
  const chips = panel(page).getByRole('group', {name: 'Records ZIGi chose for this question'});
  await expect(chips).toContainText('This page');
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect.poll(() => bodies.length).toBe(1);
  const sent = JSON.stringify(bodies[0]!.messages);
  expect(sent).toContain('\\"tool\\":\\"page_view\\"');
  expect(sent).toContain('\\"route\\":\\"/app\\"');
  expect(sent).toContain('never included: read them with the area');
  // The page's own record, up to the next tool's: card titles and ids, no figure with a unit.
  const at = sent.indexOf('\\"tool\\":\\"page_view\\"'), next = sent.indexOf('\\"tool\\":\\"', at + 1);
  const onScreen = sent.slice(at, next > at ? next : undefined);
  expect(onScreen).toContain('\\"cards\\":[{');
  expect(onScreen).not.toMatch(/\d+(?:[.,]\d+)?\s?(?:L|kg|%|€|\$|steps|kcal)\b/);
  // Removed, it goes nowhere.
  await box(page).fill('Explain this page');
  await chips.getByRole('button', {name: 'Leave out This page'}).click();
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect.poll(() => bodies.length).toBe(2);
  expect(JSON.stringify(bodies[1]!.messages)).not.toContain('page_view');
  // On Settings (its sign-in form is a sensitive screen) ZIGi is away altogether: no button, no ⌘K, nothing of it read or
  // sent (the page view itself is null there: lib/ai/context/page-view.test.ts).
  await page.goto('/app/settings');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await expect(page.getByRole('button', {name: /Open ZIGi/})).toHaveCount(0);
  await page.keyboard.press('ControlOrMeta+k');
  await expect(panel(page)).toHaveCount(0);
  expect(bodies).toHaveLength(2);
});
