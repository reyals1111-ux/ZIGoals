import {expect, type Locator, type Page} from '@playwright/test';
import {isPhone} from './phone-nav';

/**
 * Session AV lane 2 (phone-length, deliberate): on a phone, the parts that made Health and Wealth longer than their pinned
 * screens (tests/pillar-phone-length.spec.ts) are rows that open in place (components/phone/phone-fold.tsx): Water's
 * "Your drinks, reminders and tips", the Diary's "Planned for this day", Spending's "Between you and others" and "Store
 * and club cards". A spec that works inside one opens it as a person would, and checks as strictly as before: on a phone
 * the row is there, closed, at least 44 px tall, and open once tapped; anywhere else the part is not folded (no such row).
 */
export async function openPhoneRow(page: Page, label: string, scope?: Locator) {
  const row = (scope ?? page).locator('.phone-fold-toggle').filter({hasText: label});
  if (!await isPhone(page)) { await expect(row, `${label}: no phone row off a phone`).toHaveCount(0); return; }
  await expect(row, `${label}: one phone row`).toHaveCount(1);
  if (await row.getAttribute('aria-expanded') !== 'true') {
    expect((await row.boundingBox())!.height, `${label}: a 44 px row`).toBeGreaterThanOrEqual(44);
    await row.click();
  }
  await expect(row).toHaveAttribute('aria-expanded', 'true');
}

/** Session AV lane 2 (phone-length, deliberate): on a phone the Water entry's drink, caffeine, energy and sugar sit in a
 *  fold under the amount (`details.health-water-drink`); it is opened as a person would. Off a phone there is no fold. */
export async function openDrinkDetails(page: Page) {
  const fold = page.locator('#water details.health-water-drink');
  if (!await isPhone(page)) { await expect(fold).toHaveCount(0); return; }
  await expect(fold).toHaveCount(1);
  if (await fold.getAttribute('open') === null) await fold.locator('> summary').click();
  await expect(fold).toHaveAttribute('open', '');
}
