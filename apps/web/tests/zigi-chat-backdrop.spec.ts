import {expect, test, type Page} from '@playwright/test';

/**
 * Session AC (item 16, WebKit): on a phone ZIGi's chat is a modal sheet that a tap on its backdrop closes. WebKit sends
 * the click of a tap whose button re-rendered between press and release (a card's Add or Undo replaces the card) to the
 * nearest element still there: the dialog itself. Read as a backdrop tap, that closed the chat right after Add or Undo
 * (the rotating `zigi-accept-correct` / `webkit-zigi-freeze` / `zigi-part-boundary` set). A backdrop tap is a press and a
 * release outside the sheet; a click on the dialog element inside the sheet's box never closes it.
 */
test.use({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true});
test.beforeEach(async ({page}) => { await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}})); });
const panel = (page: Page) => page.locator('dialog.ai-chat[open]');
async function openChat(page: Page) {
  await page.goto('/app/habits');
  await expect(page.getByRole('heading', {level: 1})).toBeVisible();
  await page.getByRole('button', {name: /Open ZIGi/}).click();
  await expect(panel(page)).toBeVisible();
}

test('a click retargeted to the sheet itself (its button re-rendered under the finger) keeps the chat open', async ({page}) => {
  await openChat(page);
  // What WebKit delivers when the pressed button is gone at release: pointer events and the click on the dialog, at a
  // point inside the sheet.
  await panel(page).evaluate(dialog => {
    const r = dialog.getBoundingClientRect(), at = {bubbles: true, cancelable: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2};
    dialog.dispatchEvent(new PointerEvent('pointerdown', {...at, pointerType: 'touch', isPrimary: true}));
    dialog.dispatchEvent(new PointerEvent('pointerup', {...at, pointerType: 'touch', isPrimary: true}));
    dialog.dispatchEvent(new MouseEvent('click', at));
  });
  await page.waitForTimeout(300);
  await expect(panel(page)).toBeVisible();
});

test('a press and a click on the backdrop, outside the sheet, still close the chat', async ({page}) => {
  await openChat(page);
  // The phone sheet fills the screen at these sizes, so its backdrop lies outside the viewport; the backdrop's events are
  // the dialog's own, at a point outside its box, which is what a tap beside a smaller sheet delivers.
  await panel(page).evaluate(dialog => {
    const r = dialog.getBoundingClientRect(), at = {bubbles: true, cancelable: true, clientX: r.left - 4, clientY: r.top - 4};
    dialog.dispatchEvent(new PointerEvent('pointerdown', {...at, pointerType: 'touch', isPrimary: true}));
    dialog.dispatchEvent(new PointerEvent('pointerup', {...at, pointerType: 'touch', isPrimary: true}));
    dialog.dispatchEvent(new MouseEvent('click', at));
  });
  await expect(panel(page)).toHaveCount(0);
});

test('a press that scrolls the log does not put "Jump to the latest message" under the finger; it shows once the press ends', async ({page}) => {
  await openChat(page);
  // A conversation long enough to scroll: three on-device answers.
  for (const question of ['How many habits do I have?', 'Which habits are open today?', 'How much water today?']) {
    await panel(page).locator('textarea').fill(question);
    await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
    await page.waitForTimeout(600);
  }
  const log = panel(page).getByRole('log', {name: 'Conversation'});
  await log.evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(500);
  await expect(panel(page).locator('.ai-jump-latest')).toHaveCount(0);
  // WebKit scrolls the log when a pressed button is brought into view: a press, then the log away from its end.
  await log.evaluate(el => { el.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true, pointerType: 'touch', isPrimary: true})); el.scrollTop = 0; });
  await page.waitForTimeout(500);
  await expect(panel(page).locator('.ai-jump-latest'), 'no jump button while the press is down').toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointerup', {bubbles: true, pointerType: 'touch', isPrimary: true})));
  await expect(panel(page).locator('.ai-jump-latest')).toBeVisible();
});

test('a button brought into view in the log stops above "Jump to the latest message", so the jump button never covers it', async ({page}) => {
  await openChat(page);
  for (const question of ['How many habits do I have?', 'Which habits are open today?', 'How much water today?']) {
    await panel(page).locator('textarea').fill(question);
    await panel(page).getByRole('button', {name: 'Send', exact: true}).click();
    await page.waitForTimeout(600);
  }
  const log = panel(page).getByRole('log', {name: 'Conversation'});
  await log.evaluate(el => { el.scrollTop = 0; });
  // What WebKit and a focus move do before a press: bring a button below the log's first screen into view, which lands
  // it at the log's bottom edge, the jump button's place (CI run 38879358853: the auto-accept toast's Undo under it).
  const placed = await log.evaluate(el => {
    const box = el.getBoundingClientRect();
    const button = [...el.querySelectorAll<HTMLElement>('button')].find(b => b.getBoundingClientRect().top - box.top > el.clientHeight
      && b.getBoundingClientRect().bottom - box.top + el.scrollTop < el.scrollHeight - 220);
    if (!button) return null;
    button.dataset.probe = 'target';
    button.scrollIntoView({block: 'nearest'});
    return button.textContent;
  });
  expect(placed, 'a button below the first screen, far from the end').not.toBeNull();
  await page.waitForTimeout(400);
  await expect(panel(page).locator('.ai-jump-latest')).toBeVisible();
  const hit = await page.evaluate(() => {
    const button = document.querySelector<HTMLElement>('[data-probe="target"]')!, r = button.getBoundingClientRect();
    const jump = document.querySelector('.ai-jump-latest')!.getBoundingClientRect();
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {own: !!at && button.contains(at), overlap: r.bottom > jump.top && r.top < jump.bottom, button: [r.top, r.bottom], jump: [jump.top, jump.bottom]};
  });
  expect(hit.overlap, `button ${hit.button} vs jump ${hit.jump}`).toBe(false);
  expect(hit.own, 'a tap at the button\'s centre reaches the button').toBe(true);
});
