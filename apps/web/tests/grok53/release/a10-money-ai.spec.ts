import {expect, test, type Locator, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../../ah-helpers';
import {openSettings} from '../../settings-open';

/**
 * Release review A10, cycle 1 (docs/review/session-al/A10_CYCLE_1.md), the money, AI and Undo findings A10-3, A10-5,
 * A10-6 and A10-7: one test per finding at the review's width, on the Showcase with the review's clock (Monday
 * 9 November 2026, 09:30 in Brussels). Every /api request answers 503, so market prices are offline as in the review.
 */
test.use({timezoneId: 'Europe/Brussels'});
const MONDAY = new Date('2026-11-09T08:30:00.000Z');
const desktopOnly = () => test.skip(({isMobile}) => isMobile, 'computer width: runs in the desktop project');
const phoneOnly = () => test.skip(({isMobile}) => !isMobile, 'phone width: runs in the mobile project');

async function showcase(page: Page) {
  await offlineApi(page);
  await page.clock.install({time: MONDAY});
  await openSettings(page);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await loadShowcase(page);
}
async function open(page: Page, path: string) {
  await page.goto(path);
  await hydrated(page);
}
/**
 * What the shown toast covers inside `sheet`: at a grid of points over the toast, the first element under it that is not
 * the toast's own. Only the sheet's own box (its reserved strip) may be there; any element inside the sheet is covered.
 */
function coveredBy(sheet: Locator) {
  return sheet.evaluate(dialog => {
    const region = document.querySelector('.aa-toast-region')!, t = document.querySelector('.aa-toast')!.getBoundingClientRect(), out: string[] = [];
    for (const fx of [0.05, 0.3, 0.5, 0.7, 0.95]) for (const fy of [0.05, 0.5, 0.95]) {
      const x = t.left + t.width * fx, y = t.top + t.height * fy;
      const under = document.elementsFromPoint(x, y).find(e => !region.contains(e));
      if (under && under !== dialog && dialog.contains(under)) out.push(`${under.tagName.toLowerCase()} "${(under.textContent ?? '').trim().slice(0, 40)}" at ${Math.round(x)},${Math.round(y)}`);
    }
    return out;
  });
}
/** The control is on screen, tappable at its centre (nothing over it) and clear of the toast. */
async function reachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  const state = await control.evaluate(el => {
    const r = el.getBoundingClientRect(), t = document.querySelector('.aa-toast')?.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {tappable: !!hit && el.contains(hit), underToast: !!t && t.top < r.bottom && t.bottom > r.top && t.left < r.right && t.right > r.left};
  });
  expect(state).toEqual({tappable: true, underToast: false});
}

test.describe('A10-3', () => {
  desktopOnly();
  test('A10-3: with prices offline, Wealth and Today never show a market time made from manual values', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await open(page, '/app/wealth');
    const total = page.locator('.wealth-hero-total');
    await expect(total).toBeVisible();
    // The review's screen: every linked holding is counted at its own manual value; no market price is current.
    await expect(total.locator('.wealth-total-prices')).toHaveText('No market price is current; the total counts your own values.');
    await expect(page.getByText(/Market prices as of/)).toHaveCount(0);
    await open(page, '/app');
    const life = page.locator('.life-orbit-wealth');
    await expect(life.locator('.wealth-total-prices')).toHaveText('No market price is current; your own values are counted');
    await expect(page.getByText(/Market prices as of/)).toHaveCount(0);
  });
});

test.describe('A10-5', () => {
  phoneOnly();
  test('A10-5: on Monday 09:30 NOVA\'s "What is due today?" names the overdue garden-bed task once, under "from earlier"', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await showcase(page);
    await open(page, '/app/nova');
    await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 15_000});
    await page.getByRole('button', {name: /Talk to NOVA/}).first().click();
    const box = page.getByRole('textbox', {name: 'Message NOVA'});
    await expect(box).toBeFocused();
    await box.fill('What is due today?');
    await box.press('Enter');
    const chat = page.locator('section.nova-chat');
    await expect(chat).toContainText('Today (Mon, Nov 9), from your own records:', {timeout: 10_000});
    const text = (await chat.innerText()).split('What is due today?').at(-1)!;
    expect(text).toContain('Still open from earlier: Example · Sketch the garden bed (since Sun, Nov 8)');
    expect(text.match(/Sketch the garden bed/g), text).toHaveLength(1);
    const also = /Also planned today: [^\n]*/.exec(text)?.[0] ?? '';
    expect(also).not.toContain('Sketch the garden bed');
  });
});

test.describe('A10-6', () => {
  desktopOnly();
  test('A10-6: Buffer days speaks of the EUR the spending is in, never asks for USD spending', async ({page}) => {
    await page.setViewportSize({width: 1440, height: 900});
    await showcase(page);
    await open(page, '/app/wealth');
    await expect(page.getByText('This month in EUR: spent')).toBeVisible({timeout: 15_000});
    const buffer = page.getByRole('group', {name: 'Buffer days'});
    await buffer.scrollIntoViewIfNeeded();
    await expect(buffer).toContainText('This cannot be worked out yet: your spending is logged in EUR, and your cash and savings accounts are in USD. Currencies are never converted, so add a cash or savings account in EUR with its balance.');
    await expect(buffer).not.toContainText('USD spending');
  });
});

test.describe('A10-7', () => {
  phoneOnly();
  test('A10-7: at 390 the Undo toast covers nothing in Quick add or in NOVA\'s Health quick actions', async ({page}) => {
    await page.setViewportSize({width: 390, height: 844});
    await showcase(page);
    // 1. Quick add: "weight 78.4" saved, then the next line's meal card.
    await open(page, '/app');
    await page.locator('.phone-topbar .quick-add-trigger').first().click();
    const quick = page.getByRole('dialog', {name: /What would you like to add/});
    const field = quick.getByRole('textbox', {name: 'Type a line'});
    await field.fill('weight 78.4'); await field.press('Enter');
    await quick.getByRole('button', {name: /^(Save|Log|Add)( |$)/}).first().click();
    const toast = page.locator('.aa-toast');
    await expect(toast).toContainText('Saved: Weight');
    await field.fill('oatmeal with blueberries for breakfast'); await field.press('Enter');
    const card = quick.locator('article.ai-card').filter({hasText: 'Log a food'});
    await expect(card).toBeVisible();
    await expect(toast).toContainText('Saved: Weight');
    expect(await coveredBy(quick), 'nothing in Quick add is under the toast').toEqual([]);
    for (const name of ['Add', 'Edit', 'Dismiss']) await reachable(card.getByRole('button', {name, exact: true}));
    await expect(toast).toContainText('Saved: Weight');
    expect(await coveredBy(quick), 'scrolled, still nothing under the toast').toEqual([]);
    await page.keyboard.press('Escape');

    // 2. NOVA → Health HUD quick actions → Log 250 mL of water.
    await open(page, '/app/nova');
    await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 15_000});
    await page.getByRole('button', {name: /^Quick actions: Health/}).first().click();
    const sheet = page.getByRole('dialog', {name: 'Quick actions · Health HUD'});
    await sheet.getByRole('button', {name: /250 mL/}).first().click();
    await expect(toast).toContainText('Water logged');
    expect(await coveredBy(sheet), 'nothing in the Health sheet is under the toast').toEqual([]);
    // The Drink water row the review saw covered: its −, + and Complete.
    const row = sheet.locator('.holo-habit-list li').filter({has: page.locator('.holo-habit-title', {hasText: /^Drink water$/})});
    await expect(row.getByRole('button')).toHaveCount(3);
    for (const button of await row.getByRole('button').all()) await reachable(button);
    await expect(toast).toContainText('Water logged');
    expect(await coveredBy(sheet), 'scrolled, still nothing under the toast').toEqual([]);
  });
});
