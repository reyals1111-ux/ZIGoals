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
