import {expect, test} from '@playwright/test';
import {TITLE, seedChecklist, settled} from './checklist-fixtures';

/**
 * Session AF (L3; P7.4–P7.8): the shared path engine on a real page (the Checklist draws with it; the Earn lane's
 * Start-here path and Academy reuse it). Large dots (at least 44 px, 64–72 px), one neon line measured from dot centre
 * to dot centre, lit only between two done dots, orbit banners with real headings, the half-way and end chests, ZIGi
 * beside the next dot, and the keyboard: the dots are buttons in path order, Home/End and the arrows move between them.
 * The locked and link steps the Earn lane uses are covered on first paint by lib/path/render.test.ts.
 */
test('dots, the line from centre to centre, banners, chests, ZIGi by the next dot, and the keyboard', async ({page}) => {
  await seedChecklist(page);
  await page.goto('/app/checklist'); await settled(page);
  const stage = page.getByRole('group', {name: "Today's path"});
  await expect(stage).toBeVisible();
  const dots = stage.locator('button.path-dot');
  await expect(dots).toHaveCount(4);
  for (const dot of await dots.all()) { const b = (await dot.boundingBox())!; expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(44); expect(Math.min(b.width, b.height)).toBeGreaterThanOrEqual(56); }
  // The line: each segment starts at a dot's centre and ends at the next dot's (in the stage's own coordinates).
  const geometry = await stage.evaluate(el => {
    const base = el.getBoundingClientRect(), centre = (d: Element) => { const r = d.getBoundingClientRect(); return [r.left + r.width / 2 - base.left, r.top + r.height / 2 - base.top]; };
    return [...el.querySelectorAll('.path-segment')].map(g => { const [from, to] = g.getAttribute('data-segment')!.split('->'); const d = g.querySelector('.path-segment-base')!.getAttribute('d')!, nums = d.match(/-?\d+(\.\d+)?/g)!.map(Number);
      return {start: [nums[0], nums[1]], end: nums.slice(-2), from: centre(el.querySelector(`[data-path-point="${from}"]`)!), to: centre(el.querySelector(`[data-path-point="${to}"]`)!), bridge: g.hasAttribute('data-bridge'), lit: g.hasAttribute('data-lit')}; });
  });
  expect(geometry.length).toBe(3);
  for (const s of geometry) { expect(Math.hypot(s.start[0]! - s.from[0]!, s.start[1]! - s.from[1]!)).toBeLessThan(2); expect(Math.hypot(s.end[0]! - s.to[0]!, s.end[1]! - s.to[1]!)).toBeLessThan(2); }
  expect(geometry.filter(s => s.bridge)).toHaveLength(2); // morning → afternoon → evening
  expect(geometry.some(s => s.lit)).toBe(false);
  // Orbit banners are headings with their counts; ZIGi stands by the first waiting dot.
  await expect(stage.getByRole('heading', {level: 2})).toHaveText(['Morning orbit', 'Afternoon orbit', 'Evening orbit']);
  await expect(stage.locator('.path-banner-count').first()).toHaveText('0 of 2');
  await expect(stage.locator('[data-next] .path-zigi')).toHaveCount(1);
  await expect(stage.locator('[data-next] [data-path-point]')).toHaveAttribute('aria-label', `${TITLE.stretch}: not done yet`);
  // Ticking two neighbours lights the line between them; the chests: half way reached at 2 of 4.
  await stage.getByRole('button', {name: `${TITLE.stretch}: not done yet`, exact: true}).click();
  await stage.getByRole('button', {name: 'Water: not done yet', exact: true}).click();
  await page.getByRole('form', {name: 'Log Water'}).getByRole('button', {name: /^Log /}).click();
  await expect(stage.locator('.path-segment[data-lit]')).toHaveCount(1);
  await expect(stage.locator('.path-chest[data-milestone="half"]')).toHaveAttribute('data-reached', 'true');
  await expect(stage.locator('.path-chest[data-milestone="end"]')).not.toHaveAttribute('data-reached', /.*/);
  await expect(stage.locator('[data-next] [data-path-point]')).toHaveAttribute('aria-label', `${TITLE.push}: not done yet`);
  // The keyboard: Home, End and the arrows.
  await dots.nth(1).focus();
  await page.keyboard.press('Home'); await expect(dots.nth(0)).toBeFocused();
  await page.keyboard.press('End'); await expect(dots.nth(3)).toBeFocused();
  await page.keyboard.press('ArrowUp'); await expect(dots.nth(2)).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(dots.nth(3)).toBeFocused();
});

test('the layout holds from a phone to a wide screen: no sideways scroll, labels beside their dots', async ({page}) => {
  await seedChecklist(page);
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    await page.goto('/app/checklist'); await settled(page);
    await expect(page.locator('.path-dot').first()).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), `${width}px: nothing scrolls sideways`).toBeLessThanOrEqual(0);
    const overlap = await page.locator('.path-step').evaluateAll(steps => steps.some(s => { const dot = s.querySelector('.path-dot')!.getBoundingClientRect(), label = s.querySelector('.path-label')!.getBoundingClientRect(); return label.left < dot.right && label.right > dot.left && label.top < dot.bottom && label.bottom > dot.top; }));
    expect(overlap, `${width}px: no label covers its dot`).toBe(false);
  }
});
