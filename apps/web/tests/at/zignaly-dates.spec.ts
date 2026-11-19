import {expect, test} from '@playwright/test';
import {verifiedLink} from '../../../../packages/ecosystem-registry/src/verified-links';
import {earnRoutes, openEarnFolds} from '../earn-fixtures';
import {chooseChain} from '../chain-choice';

/**
 * Session AT (ADR-043 D1, owner change 1): Zignaly's closure is worded from its own closure notice by today's UTC day, so
 * nothing needs a deploy on 1 December: "is closing" until 30 November, the notice's last day on 1 December, "has closed"
 * from 2 December. Every place that says it links the notice. Playwright's clock stands in for the day.
 */
const NOTICE = verifiedLink('zignaly', 'closure-notice').url;
const DAYS = [
  {at: '2026-11-30T21:00:00Z', heading: 'Zignaly is closing: how to withdraw', nawa: 'Its USDC vault depends on Zignaly, which is closing.', tag: 'Closing', steps: 'How to withdraw', not: /has closed|last day to withdraw is today/},
  {at: '2026-12-01T12:00:00Z', heading: 'Zignaly: today is the last day to withdraw', nawa: 'Its USDC vault depends on Zignaly, which closes after today, 1 December 2026, by its notice.', tag: 'Last day to withdraw', steps: 'How to withdraw', not: /is closing|has closed/},
  {at: '2026-12-02T00:00:30Z', heading: 'Zignaly has closed: what its notice said', nawa: 'Its USDC vault depends on Zignaly, which has closed.', tag: 'Closed', steps: 'Its notice', not: /is closing|before the deadline/},
] as const;

test.beforeEach(async ({page}) => { await chooseChain(page); });

for (const day of DAYS) {
  test(`D1: Earn on ${day.at.slice(0, 10)} words Zignaly's closure from its notice, linked`, async ({page}) => {
    await earnRoutes(page);
    await page.clock.setFixedTime(new Date(day.at));
    await page.goto('/app/earn');
    await openEarnFolds(page);
    const section = page.locator('#zignaly');
    await expect(section.getByRole('heading', {name: day.heading, exact: true})).toBeVisible();
    await expect(section.locator('.earn-tag').first()).toHaveText(day.tag);
    await expect(section.getByRole('heading', {name: day.steps, exact: true})).toBeVisible();
    // Every Zignaly sentence on the page sits beside the notice's own link.
    await expect(section.locator(`a[href="${NOTICE}"]`).first()).toBeVisible();
    expect(await section.innerText()).not.toMatch(day.not);
    // Nawa's dependency, worded the same day, with the notice linked in the same notice block.
    const nawa = page.locator('[data-notice="nawa"]');
    await expect(nawa).toContainText(day.nawa);
    await expect(nawa.locator(`a[href="${NOTICE}"]`)).toHaveCount(1);
    // The compare table's tag says the same.
    await expect(page.locator('[data-compare="zignaly"] .earn-tag').first()).toHaveText(day.tag);
  });
}
