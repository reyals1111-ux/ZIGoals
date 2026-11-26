import {expect, test, type Page} from '@playwright/test';
import {at, DAY1, freshWeek, hydrated, openAt, setup, ZONE} from './au-helpers';
import {openZigi, sendToZigi, zigiPanel} from '../zigi-open';

/**
 * Session AU (ADR-044, the friends dress rehearsal): Sanne at 1440 in Nebula. She set up for Habits and Health and asks in
 * Dutch. In the rehearsal 4 of her 7 NOVA questions and 2 of 4 ZIGi questions met "Health is off" with three switches to
 * find, and ZIGi answered her Dutch in English. Now (F-2, D-ALLOW-HEALTH):
 * - NOVA's reply carries one button to NOVA → Permissions, where one "Allow Health" opens exactly the three switches on
 *   her own tap; after it NOVA answers the water question from her Health records;
 * - ZIGi's Health-closed reply is in Dutch for a Dutch question, with one button to where its switches are.
 * Nothing is opened by itself: before her tap NOVA reads nothing from Health.
 */
test.skip(({isMobile}) => isMobile, 'the desktop part of Sanne\'s week (her phone part is tests/au/webkit-au-sanne.spec.ts)');
test.use({timezoneId: ZONE, viewport: {width: 1440, height: 900}, actionTimeout: 15_000});

const said = (page: Page) => page.locator('section.nova-chat .nova-turn-assistant, .ns-answer').filter({visible: true});
async function askNova(page: Page, words: string) {
  const before = await said(page).count();
  const box = page.locator('section.nova-chat').isVisible().then(open => open ? page.locator('section.nova-chat').getByRole('textbox', {name: /^Message /}) : page.locator('.nova-command input').first());
  const field = await box;
  await field.fill(words); await field.press('Enter');
  await expect.poll(() => said(page).count(), {timeout: 20_000}).toBeGreaterThan(before - 1);
  return said(page).last();
}

test('Sanne, day 1 at 1440: NOVA\'s Dutch Health reply leads to one "Allow Health", and then NOVA answers from Health', async ({page}) => {
  test.setTimeout(150_000);
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await setup(page, [/^Habits/, /^Health/]);
  await openAt(page, at(DAY1, '12:00'), '/app/health');
  for (let i = 0; i < 2; i++) { await page.getByRole('button', {name: 'Add 250 mL', exact: true}).first().click(); await page.waitForTimeout(400); }
  await expect.poll(() => page.evaluate(() => (JSON.parse(localStorage.getItem('zigoals:health:v1') ?? '{}').daily?.water ?? []).reduce((s: number, w: {amountMilli: number}) => s + w.amountMilli, 0))).toBe(500_000);

  await openAt(page, at(DAY1, '21:30'), '/app/nova');
  await page.keyboard.press('Shift');
  await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 20_000});
  const closed = await askNova(page, 'Hoeveel water heb ik vandaag gedronken?');
  await expect(closed).toContainText('Health staat uit voor NOVA');
  await expect(closed).not.toContainText('500');
  // At 1440 the answer sits under the star (AR's composition, protected); its conversation holds the reply's button.
  const conversation = page.locator('section.nova-chat');
  if (!await conversation.isVisible()) await closed.getByRole('button', {name: 'Open the conversation'}).click();
  await conversation.locator('.nova-turn-assistant').last().getByRole('button', {name: /Permissions/}).first().click();

  const allow = page.getByRole('button', {name: 'Allow Health', exact: true});
  await expect(allow).toBeVisible({timeout: 15_000});
  await expect(page.getByText(/Let NOVA and ZIGi read your Health records/)).toBeVisible();
  await allow.click();
  await expect(page.getByText('Health is open to NOVA and ZIGi now. Close it with the switches below.')).toBeVisible();
  await expect(allow).toHaveCount(0);
  const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:ai:v1') ?? '{}'));
  expect(settings).toMatchObject({includeHealth: true, pageShare: expect.objectContaining({health: true})});
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zigoals:nova-setup:v1') ?? '{}').scopes?.health)).toBe(true);

  await page.goto('/app/nova'); await hydrated(page);
  await page.keyboard.press('Shift');
  await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 20_000});
  const open = await askNova(page, 'Hoeveel water heb ik vandaag gedronken?');
  await expect(open).not.toContainText('Health staat uit');
  await expect(open).toContainText(/500\s?mL|0[.,]5\s?L/);
});

test('Sanne at 1440: ZIGi answers a Dutch Health question in Dutch, with one button to its switches', async ({page}) => {
  test.setTimeout(120_000);
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await setup(page, [/^Habits/, /^Health/]);
  await openAt(page, at(DAY1, '20:00'), '/app/habits');
  await openZigi(page);
  await sendToZigi(page, 'Hoeveel water heb ik vandaag gedronken?');
  const reply = zigiPanel(page).locator('.ai-turn-local').last();
  // Session AW (FR-S-16, p5-answers, deliberate): the Dutch closed-Health line names its one switch, Allow Health in NOVA → Permissions,
  // with one card to it.
  await expect(reply).toContainText('Health wordt hier niet met ZIGi gedeeld, dus er wordt niets uit Health gelezen. Tik op Allow Health in NOVA → Permissions', {timeout: 20_000});
  await expect(reply).not.toContainText('Health isn’t shared with ZIGi');
  await expect(reply.getByRole('link').or(reply.getByRole('button')).filter({hasText: /Permissions|Machtigingen/})).toHaveCount(1);
});
