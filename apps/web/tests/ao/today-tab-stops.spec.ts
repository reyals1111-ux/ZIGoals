import {expect, test, type Page} from '@playwright/test';
import {hydrated, loadShowcase, offlineApi} from '../ah-helpers';

/**
 * Session AO (D-028, AL-A11Y-016; replay: 176 Tab stops on Showcase Today, the bot ~173). Today's repeated controls are
 * one Tab stop per list or grid (a roving tabindex: the week's day cells, What's new's links, the goal cards' titles, My
 * links; components/ui/use-roving-focus.ts), and Today's own skip links go straight to its big regions. Counted here by
 * pressing Tab from the top of the page until the focus comes round again, at 1440 px, as the replay did. Every control
 * stays reachable: each roving group's every item is reached with the arrow keys, and the skip links land on their region.
 */
test.use({viewport: {width: 1440, height: 900}});
test.setTimeout(180_000);

const active = (page: Page) => page.evaluate(() => {
  const e = document.activeElement as HTMLElement | null;
  if (!e || e === document.body) return null;
  if (!e.dataset.tabStopKey) e.dataset.tabStopKey = String(Math.random());
  return {key: e.dataset.tabStopKey, name: (e.getAttribute('aria-label') ?? e.textContent ?? '').trim().slice(0, 60)};
});

// Session AO (D-028, partly fixed; ADR-039): 176 stops in AL; skip links and roving lists brought it to 143 on the Showcase.
// Session AP (D-028 completed, ADR-040; tightened): the sidebar's pages and apps, the theme radios, Today's check-in buttons,
// favourites, pillars, money steps, preset choices and events are one stop each, so the goal of ≤ 90 is pinned.
test('D-028: Showcase Today takes at most 90 Tab stops (was 176), and every control is still reachable by keyboard', async ({page}) => {
  await offlineApi(page);
  await loadShowcase(page);
  await page.goto('/app'); await hydrated(page);
  await expect(page.locator('[data-roving]').first()).toBeAttached({timeout: 20_000});
  // Today's lazy parts (For you, the week, What's new) are on the page before counting.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await page.waitForTimeout(1_500);
  await page.evaluate(() => { window.scrollTo(0, 0); (document.activeElement as HTMLElement | null)?.blur(); });

  const stops: string[] = [];
  let first: string | null = null;
  for (let i = 0; i < 400; i++) {
    await page.keyboard.press('Tab');
    const now = await active(page);
    if (!now) continue;
    if (now.key === first) break;
    first ??= now.key;
    stops.push(now.name);
  }
  test.info().annotations.push({type: 'Tab stops on Showcase Today at 1440', description: `${stops.length}: ${stops.join(' | ')}`});
  expect(stops.length, stops.join(' | ')).toBeLessThanOrEqual(90);
  expect(stops.length).toBeGreaterThan(10);
  // The Today skip links are one stop.
  expect(stops).toContain('Skip to Your goals');

  // Every roving group: Tab reaches one item; Home and End and the arrows reach every other one.
  const groups = page.locator('[data-roving]');
  const count = await groups.count();
  expect(count).toBeGreaterThanOrEqual(3);
  for (let g = 0; g < count; g++) {
    const group = groups.nth(g), selector = (await group.getAttribute('data-roving'))!;
    // Session AP (D-028, deliberate): a disabled button is in no Tab order and no arrow reaches it (it never was); every
    // enabled, visible item is still reached.
    const items = group.locator(`:is(${selector}):not([disabled])`).filter({visible: true});
    const n = await items.count();
    if (n === 0) continue;
    // exactly one item of the group is in the Tab order
    expect(await group.evaluate((root, sel) => [...root.querySelectorAll<HTMLElement>(sel)].filter(e => e.getClientRects().length && e.tabIndex >= 0).length, selector)).toBe(1);
    await items.first().focus();
    await page.keyboard.press('Home');
    await expect(items.first()).toBeFocused();
    const seen = new Set<string>();
    for (let i = 0; i < n; i++) {
      seen.add((await active(page))!.key);
      if (i < n - 1) await page.keyboard.press('ArrowRight');
    }
    expect(seen.size, `group ${selector}`).toBe(n);
    await page.keyboard.press('End');
    await expect(items.last()).toBeFocused();
  }

  // A skip link lands in its region: the next Tab is inside it.
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  const skips = page.getByRole('navigation', {name: 'Skip to a part of Today'});
  await skips.getByRole('link', {name: 'Skip to Your goals', exact: true}).focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.activeElement?.closest('#dashboard-item-builtin-goals'))).toBe(true);
});
