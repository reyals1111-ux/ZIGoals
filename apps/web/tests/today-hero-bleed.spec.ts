import {expect, test, type Page} from '@playwright/test';

/**
 * Session AD (the owner's brief Part 2, ADR-026 F9): Today's hero planets no longer stop at the card's edges. The artwork is
 * unchanged; on computers and tablets a soft continuation of it (hero-bleed.webp) lies behind everything on Today, reaching
 * below the hero into "What is due now" and right into the gap beside the right column; on phones the art's edges fade into
 * the page instead of a rounded box. Nothing covers the content, nothing takes a pointer, nothing moves; folded, none shows.
 */
const bleed = (page: Page) => page.evaluate(() => {
  const hero = document.querySelector('.today-hero'), pillars = hero?.querySelector(':scope > .hero-pillars'); if (!hero) return null;
  const style = pillars ? getComputedStyle(pillars, '::after') : null;
  if (!style || style.content === 'none' || style.display === 'none' || !style.backgroundImage.includes('hero-bleed')) return {shown: false} as const;
  const box = hero.getBoundingClientRect(), left = box.left + parseFloat(style.left), top = box.top + parseFloat(style.top);
  return {shown: true, left, top, right: left + parseFloat(style.width), bottom: top + parseFloat(style.height), image: style.backgroundImage, z: style.zIndex, pointer: style.pointerEvents} as const;
});
async function today(page: Page) {
  await page.goto('/app');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  await expect(page.locator('.today-hero').first()).toBeVisible();
}

test('the planets run past the card, behind every card and heading, and take no pointer', async ({page}) => {
  await today(page);
  const hero = (await page.locator('.today-hero').first().boundingBox())!;
  const phone = (page.viewportSize()?.width ?? 0) <= 540;
  const layer = await bleed(page);
  if (phone) {
    // Phones: the hero no longer clips its art to a box; the art's sides fade into the page.
    expect(layer?.shown).toBe(false);
    await expect(page.locator('.today-hero').first()).toHaveCSS('overflow', 'visible');
    const mask = await page.locator('.today-hero').first().evaluate(el => getComputedStyle(el, '::before').maskImage);
    expect(mask.match(/linear-gradient/g)?.length).toBe(2);
    return;
  }
  expect(layer && layer.shown).toBe(true);
  if (!layer?.shown) return;
  expect(layer.image).toContain('hero-bleed.webp');
  expect(layer.pointer).toBe('none');
  expect(layer.z).toBe('-3'); // under the art (.today-hero::before, −2), inside the hero's own stack
  // Down past the hero, into "What is due now", and right past the hero's own edge.
  expect(layer.bottom).toBeGreaterThan(hero.y + hero.height + 120);
  expect(layer.right).toBeGreaterThan(hero.x + hero.width + 30);
  // Behind everything: Today's later sections and the right column are lifted above the hero (painted after it), and the
  // content over the continuation is what a pointer reaches.
  for (const position of await page.locator('.today-primary > .today-hero ~ *, .today-rail').evaluateAll(els => els.map(e => getComputedStyle(e).position))) expect(position).toBe('relative');
  const focus = page.getByRole('heading', {name: /Today.s focus/}).first();
  if (await focus.count()) {
    const f = (await focus.boundingBox())!;
    if (f.y < layer.bottom) expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.closest('main') !== null, [f.x + 4, f.y + f.height / 2])).toBe(true);
  }
});

test('folded, neither the art nor its continuation shows; the fold is saved; unfolding brings both back', async ({page}) => {
  await today(page);
  await page.getByRole('button', {name: 'Hide the welcome header'}).click();
  await expect(page.locator('.today-hero-folded')).toBeVisible();
  expect((await bleed(page))?.shown).toBe(false);
  // The fold is saved as before.
  await page.reload();
  await expect(page.locator('.today-hero-folded')).toBeVisible();
  expect((await bleed(page))?.shown).toBe(false);
  await page.getByRole('button', {name: 'Show the welcome header'}).click();
  await expect(page.locator('.today-hero:not(.today-hero-folded)')).toBeVisible();
  const phone = (page.viewportSize()?.width ?? 0) <= 540;
  expect((await bleed(page))?.shown).toBe(!phone);
});

test('the continuation is a small, static asset: no animation, no script', async ({page}) => {
  await today(page);
  const response = await page.request.get('/art/v21/hero-bleed.webp');
  expect(response.ok()).toBe(true);
  expect((await response.body()).byteLength).toBeLessThan(40_000);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.today-hero > .hero-pillars')!, '::after').animationName)).toBe('none');
});
