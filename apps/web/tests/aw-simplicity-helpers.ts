import {expect, type Locator, type Page} from '@playwright/test';

/**
 * Session AW (simplicity-a; owner brief Part 3): on a Health journal that never used its counters, Quick counters wait
 * behind the page's one teaching line ("Show quick counters") instead of showing three example counters at 0. This opens
 * them as a person does and proves they show; once a counter has been used (or the Showcase is loaded) they are already
 * there and this only checks that.
 */
export async function showQuickCounters(page: Page) {
  const show = page.getByRole('button', {name: 'Show quick counters', exact: true}), counters = page.locator('.exercise-counters');
  await expect(show.or(counters).first()).toBeVisible({timeout: 15_000});
  if (await show.isVisible()) await show.click();
  await expect(counters).toBeVisible();
}

/**
 * Session AW (simplicity-a; owner brief Part 3, amendment 8): "visible without scrolling more than one screen". Read at
 * the top of the page: there is a scroll position of at most one viewport height at which the whole box sits between the
 * app's top bar (a phone's `.phone-topbar`; none on a computer) and the phone's tab bar (`.phone-tabbar`; the window's
 * bottom on a computer). Returns the measurement for the annotation; asserts it.
 */
export async function withinOneScreen(page: Page, target: Locator, what: string) {
  await page.evaluate(() => scrollTo({top: 0, behavior: 'instant'}));
  await expect(target).toBeVisible();
  const m = await target.evaluate(el => {
    const shown = (s: string) => { const r = document.querySelector(s)?.getBoundingClientRect(); return r && r.width > 0 && r.height > 0 ? r : undefined; };
    const box = el.getBoundingClientRect(), bar = shown('.phone-topbar'), tabs = shown('.phone-tabbar');
    return {top: Math.round(box.top + scrollY), bottom: Math.round(box.bottom + scrollY), header: bar ? Math.round(bar.bottom) : 0, floor: tabs ? Math.round(tabs.top) : innerHeight, height: innerHeight};
  });
  // The scroll that brings the box's bottom above the floor, and the most it may scroll before its top passes under the header.
  const need = Math.max(0, m.bottom - m.floor), room = Math.min(m.height, m.top - m.header);
  expect(need, `${what}: whole in view after scrolling at most one screen ${JSON.stringify(m)}`).toBeLessThanOrEqual(room);
  return m;
}
