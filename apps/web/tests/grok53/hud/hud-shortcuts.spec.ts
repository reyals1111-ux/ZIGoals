import {expect, test} from '@playwright/test';
import {NOON, NOVA_KEY, freshNova, storedJson} from './hud-helpers';

/**
 * Session AL Part 11, second pass (lane L8): NOVA's single-key shortcuts (ledger P-TK-41: TK-074, N-TK-29; L10a's request).
 * Words typed while no field has the focus land in "What's on your mind?" and never open a page (TK-074 opened Music); a
 * letter alone still opens its entry; never with Shift, Alt, Ctrl or ⌘; never inside a field; the list is discoverable
 * ("?" and the field's "?" button) and says when letters are off. DV-070: a letter typed into the field while the opening
 * plays stays in the field. Desktop 1440, Brussels, a fresh profile.
 */
test.skip(({isMobile}) => isMobile, 'a hardware keyboard on a computer: runs in the desktop project');
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Brussels'});

const field = (page: import('@playwright/test').Page) => page.locator('.nova-command').getByRole('textbox', {name: 'Message NOVA'});
const blur = (page: import('@playwright/test').Page) => page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

test('TK-074: words typed with no field focused go to the command field, never to a page', async ({page}) => {
  await page.clock.install({time: NOON});
  await freshNova(page);
  await blur(page);
  // "h" is Habits' key and "e" Health's: typed as a word, neither opens anything.
  await page.keyboard.type('hello there', {delay: 40});
  await expect(field(page)).toBeFocused();
  await expect(field(page)).toHaveValue('hello there');
  await page.waitForTimeout(600);
  await expect(page).toHaveURL(/\/app\/nova$/);
});

test('a letter alone still opens its entry; Shift, Alt, Ctrl or ⌘ with it, or a field, never do', async ({page}) => {
  await page.clock.install({time: NOON});
  await freshNova(page);
  for (const combo of ['Shift+C', 'Alt+c', 'Control+c', 'Meta+c']) {
    await blur(page);
    await page.keyboard.press(combo);
    await page.waitForTimeout(500);
    await expect(page, combo).toHaveURL(/\/app\/nova$/);
  }
  await field(page).focus();
  await page.keyboard.press('c');
  await page.waitForTimeout(500);
  await expect(field(page)).toHaveValue('c');
  await expect(page).toHaveURL(/\/app\/nova$/);
  await field(page).fill('');
  await blur(page);
  await page.keyboard.press('c');
  await expect(page).toHaveURL(/\/app\/checklist/);
});

test('discoverable: "?" and the field\'s "?" button open the list; with shortcuts off it says letters are off', async ({page}) => {
  await page.clock.install({time: NOON});
  await freshNova(page);
  await blur(page);
  await page.keyboard.press('?');
  const list = page.getByRole('dialog', {name: 'Keyboard shortcuts'});
  await expect(list).toBeVisible();
  await expect(list.getByRole('table', {name: 'Keyboard shortcuts on NOVA'})).toContainText('Open Checklist');
  await expect(list).toContainText('Single-key shortcuts are on.');
  await list.getByRole('button', {name: 'Close Keyboard shortcuts'}).click();
  // Off: the field's button still lists them, each letter marked off; "?" itself is a single key and stays quiet.
  await page.evaluate(k => { const r = JSON.parse(localStorage.getItem(k) ?? '{"version":1}'); localStorage.setItem(k, JSON.stringify({...r, shortcuts: false})); }, NOVA_KEY);
  await page.reload();
  await expect.poll(async () => (await storedJson(page, NOVA_KEY))?.shortcuts).toBe(false);
  await page.getByRole('button', {name: 'Keyboard shortcuts'}).click();
  await expect(list).toContainText('Single-key shortcuts are off');
  await expect(list).toContainText('off now');
  await list.getByRole('button', {name: 'Close Keyboard shortcuts'}).click();
  await blur(page);
  await page.keyboard.press('?');
  await page.waitForTimeout(400);
  await expect(list).toHaveCount(0);
});

test('DV-070: letters typed into the field while the opening plays stay there', async ({page}) => {
  await page.clock.install({time: NOON});
  await freshNova(page);
  // A first visit again: the opening plays (Full motion).
  await page.evaluate(k => { const r = JSON.parse(localStorage.getItem(k) ?? '{"version":1}'); delete r.openingSeen; localStorage.setItem(k, JSON.stringify(r)); }, NOVA_KEY);
  await page.reload();
  await expect(page.locator('.nova-frame[data-opening=play]')).toBeVisible();
  await field(page).focus();
  await page.keyboard.type('How far am I on my goals?');
  await expect(field(page)).toHaveValue('How far am I on my goals?');
});
