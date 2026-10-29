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
export async function openZigi(page: Page) {
  await page.getByRole('button', {name: /Open ZIGi/}).click();
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
