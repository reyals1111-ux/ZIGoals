import {expect, type Page} from '@playwright/test';

/**
 * Session AV lane 2 (fr-layout, FR-L-5, FR-MAX-2, FR-S-7, FR-TJ-8): on a phone (≤ 700 px) Tasks folds Plan and views,
 * Projects, Labels, Priority and Saved filters behind the "More views" chip; wider screens show every row and no chip.
 * Opens the fold where the chip shows, and then proves it open, so a spec that uses a folded view asks as much as before.
 */
export async function moreViews(page: Page) {
  const nav = page.getByRole('navigation', {name: 'Task views'});
  await expect(nav).toBeVisible();
  const chip = nav.locator('.tasks-nav-more-toggle');
  if (!(await chip.isVisible())) return;
  if ((await chip.getAttribute('aria-expanded')) !== 'true') await chip.click();
  await expect(chip).toHaveAttribute('aria-expanded', 'true');
  await expect(nav.getByRole('heading', {name: 'Plan and views'})).toBeVisible();
}
