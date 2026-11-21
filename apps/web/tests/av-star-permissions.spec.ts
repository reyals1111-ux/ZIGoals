import {expect, test} from '@playwright/test';
import {at, DAY1, freshWeek, openAt, setup, ZONE} from './au/au-helpers';

/**
 * Session AV (ADR-045 D-STAR-BUTTON; AU carried "the answer under NOVA's star at 1440 has no page button"): at 1440 a
 * Health-closed answer under the star carries the same one tap to NOVA → Permissions as the conversation's reply, so the
 * path is one tap on a computer too. The star, its rings and the stage do not move (p3-nova-polish's layout audit).
 */
test.use({timezoneId: ZONE, viewport: {width: 1440, height: 900}, actionTimeout: 15_000});
test.skip(({isMobile}) => isMobile, 'the answer under the star is the computer layout');

test('at 1440 a Health-closed answer under the star opens Permissions in one tap, in English and Dutch', async ({page}) => {
  test.setTimeout(120_000);
  await freshWeek(page, 'nebula', at(DAY1, '08:00'));
  await setup(page, [/^Habits/, /^Health/]);
  for (const [question, closedWords, link] of [['How much water did I drink today?', /Health is (off|closed|not shared)/i, 'Open NOVA → Permissions'], ['Hoeveel water heb ik vandaag gedronken?', 'Health staat uit voor NOVA', 'Open NOVA → Permissions']] as const) {
    await openAt(page, at(DAY1, '21:30'), '/app/nova');
    await page.keyboard.press('Shift');
    await expect(page.locator('.nova-frame')).toHaveAttribute('data-opening', 'done', {timeout: 20_000});
    await expect(page.locator('section.nova-chat')).toBeHidden();
    const field = page.locator('.nova-command input').first();
    await field.fill(question); await field.press('Enter');
    const answer = page.locator('.ns-answer').filter({visible: true}).last();
    await expect(answer).toContainText(closedWords);
    const open = answer.getByRole('button', {name: link, exact: true});
    expect((await open.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await open.click();
    await expect(page.getByRole('button', {name: 'Allow Health', exact: true})).toBeVisible({timeout: 15_000});
  }
});
