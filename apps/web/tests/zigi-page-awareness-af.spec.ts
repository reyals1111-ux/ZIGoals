import {expect, test} from '@playwright/test';
import {lastLocal, MORNING, openChat, panel, say, seed, server, box} from './zigi-af';
import {openSettings} from './settings-open';

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
  // Session AL (ADR-037 Q6, deliberate): ZIGi opens on Settings too (was: away altogether, no button and no key); nothing of
  // Settings is read: "Explain this page" there brings no "This page" chip and no page view goes anywhere (the page view
  // itself is null there: lib/ai/context/page-view.test.ts). Q11: ⌘/Ctrl+K opens the command menu, not ZIGi's panel;
  // ZIGi's own key is ⌘/Ctrl+Shift+Z.
  await openSettings(page);
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.keyboard.press('ControlOrMeta+k');
  // Session AL (CI12, CI 1561): the command menu loads at its first open; an Escape sent before it showed reached nothing, the
  // menu then opened and kept the focus in its field, where ⌘/Ctrl+Shift+Z stays Redo. As a person does, the menu is seen,
  // then closed, before ZIGi's key.
  const menu = page.getByRole('dialog', {name: 'Command menu'});
  await expect(menu).toBeVisible();
  await expect(panel(page)).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await page.locator('body').press('ControlOrMeta+Shift+z');
  await expect(panel(page)).toBeVisible();
  // The chat open on Today comes back (PR-025); this question starts its own.
  await panel(page).getByRole('button', {name: 'New chat', exact: true}).click();
  await expect(panel(page).locator('.ai-turn-user')).toHaveCount(0);
  const answers = 0;
  await box(page).fill('Explain this page');
  await expect(box(page)).toHaveValue('Explain this page');
  await expect(panel(page).getByRole('button', {name: 'Leave out This page'})).toHaveCount(0);
  await panel(page).locator('.ai-composer button[type=submit]').click();
  await expect(panel(page).locator('.ai-turn-assistant')).toHaveCount(answers + 1, {timeout: 15_000});
  expect(bodies.slice(2).some(b => JSON.stringify(b.messages).includes('page_view')), 'nothing of Settings is read').toBe(false);
});
