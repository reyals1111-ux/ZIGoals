import {expect, type Locator, type Page} from '@playwright/test';

/**
 * Session AJ (item 13, the WebKit "ZIGi box empty" class: webkit-zigi-freeze:119, zigi-safety:89, zigi-chat-polish:79,
 * zigi-aa:69). The panel puts the focus in its box as it opens, and on a cold WebKit runner a fill that lands while that
 * focus is still moving never reaches the box: Send stays disabled and the click times out. A person types once the cursor
 * is in the box and sees the text; the specs do the same, in one place:
 * - openZigi: open the panel and wait until its box holds the focus (15 s: a cold page loads two lazy chunks first);
 * - typeInZigi: type, then confirm the box holds the text (and, by default, that Send is enabled), typing again if not;
 * - sendToZigi: typeInZigi, then press the composer's own Send.
 */
const COLD = {timeout: 15_000};
export const zigiPanel = (page: Page) => page.locator('dialog.ai-chat[open]');
export const zigiBox = (page: Page) => zigiPanel(page).getByRole('textbox', {name: /^(Message to your AI|Ask ZIGi about your records)$/});
/**
 * Session AL (owner decision O3): below 901 px ZIGi has no floating button; it opens from the "Apps & extras" sheet (the
 * phone's top bar, the tablet rail). On a computer this is the launcher's own button, as before.
 */
export async function pressZigi(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) >= 901) { await page.getByRole('button', {name: /Open ZIGi/}).click(); return; }
  // Session AL (CI12, CI 1561: zigi-face-z:124 and zigi-personality:10 on the phone project): a press that lands before the top
  // bar has hydrated only focuses the button and opens nothing; the press is repeated until the sheet shows (never while it is
  // open). The sheet's own ZIGi button is then pressed once, as before.
  const sheet = page.getByRole('dialog', {name: 'Apps & extras'});
  await expect(async () => {
    if (!await sheet.isVisible()) await page.getByTestId('apps-extras-button').click();
    await expect(sheet).toBeVisible({timeout: 2_000});
  }).toPass(COLD);
  await sheet.getByRole('button', {name: /^ZIGi\b/}).click();
}
/**
 * Session AL (O3): for the specs that pressed the first button named "Open ZIGi…" (on a computer a page's own "Open ZIGi",
 * such as the brief's, can come before the launcher): that same press at ≥ 901 px; the "Apps & extras" sheet below.
 */
export async function pressZigiFirst(page: Page) {
  if ((page.viewportSize()?.width ?? 1440) >= 901) { await page.getByRole('button', {name: /Open ZIGi/}).first().click(); return; }
  await pressZigi(page);
}
export async function openZigi(page: Page) {
  await pressZigi(page);
  await expect(zigiPanel(page)).toBeVisible(COLD);
  // The panel's own box takes the focus (the subscription bridge shows a second box, "Your question", which may take it).
  await expect(zigiPanel(page).locator('textarea:focus, input:focus')).toHaveCount(1, COLD);
}
export async function typeInZigi(page: Page, text: string, {field = zigiBox(page), submitEnabled = true}: {field?: Locator; submitEnabled?: boolean} = {}) {
  const submit = zigiPanel(page).locator('.ai-composer button[type=submit]');
  await expect(async () => {
    await field.fill(text);
    await expect(field).toHaveValue(text, {timeout: 1_000});
    if (submitEnabled) await expect(submit).toBeEnabled({timeout: 1_000});
  }).toPass(COLD);
  return submit;
}
export async function sendToZigi(page: Page, text: string, options?: {field?: Locator}) {
  await (await typeInZigi(page, text, options)).click();
}
