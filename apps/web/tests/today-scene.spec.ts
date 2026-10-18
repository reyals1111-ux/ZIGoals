import {expect, test, type Page} from '@playwright/test';

/**
 * Session AE (Part 1, the owner's brief, ADR-027): Today's hero is one seamless cosmic scene. The artwork (today's
 * picture, with an alpha channel: public/art/v27/hero-scene) is painted onto the starfield with no box, seam or hard edge:
 * it rises behind the status row, runs under the right column and through the gap beside it, and continues behind "What is
 * due now / Today's focus". It lies under every card, heading and button and takes no pointer; folded, it is gone.
 * Replaces Session AD's today-hero-bleed spec: the blurred continuation (hero-bleed.webp) was removed by the owner's brief.
 */
async function today(page: Page) {
  await page.goto('/app');
  await expect(page.locator('html[data-app-hydrated]')).toBeAttached();
  await expect(page.locator('.today-hero').first()).toBeVisible();
}
/** The hero box, the scene layer's box and the picture's own box (the scene's ::before), in page coordinates. */
const geometry = (page: Page) => page.evaluate(() => {
  const hero = document.querySelector<HTMLElement>('.today-hero'), scene = hero?.querySelector<HTMLElement>(':scope > .today-scene');
  if (!hero || !scene) return null;
  const h = hero.getBoundingClientRect(), s = scene.getBoundingClientRect(), st = getComputedStyle(scene, '::before');
  const left = s.left + parseFloat(st.left), top = s.top + scrollY + parseFloat(st.top);
  return {hero: {left: h.left, top: h.top + scrollY, right: h.right, bottom: h.bottom + scrollY},
    picture: {left, top, right: left + parseFloat(st.width), bottom: top + parseFloat(st.height)},
    image: st.backgroundImage, pointer: getComputedStyle(scene).pointerEvents, hidden: scene.getAttribute('aria-hidden'), z: getComputedStyle(scene).zIndex, animation: st.animationName};
});
/** Everything but the scene hidden, so a screenshot shows the art alone on the page's own background. */
const ART_ONLY = `.app-sidebar,.phone-topbar,.phone-tabbar,.status-row,.alpha-notice,.first-visit-notice,.today-hero-copy,.hero-pillars>*,.hero-fold,.layout-lock,.today-rail,.today-primary>*:not(.today-hero),.today-page>*:not(.today-layout),.music-launcher-stack,.ai-launcher,.ai-edge-tab,.site-footer{visibility:hidden!important}.hero-pillars::before,.today-hero::after,.cosmic-glow{display:none!important}`;
/** The largest step between neighbouring rows (or columns) of a band's median luminance — a hard edge shows as a step; stars
 *  (single bright pixels) do not move a median. Decoded in a blank page's canvas: no dependency. */
async function largestStep(page: Page, png: Buffer, along: 'rows' | 'cols') {
  const blank = await page.context().newPage();
  try {
    return await blank.evaluate(async ({data, along}) => {
      const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d')!; g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, c.width, c.height).data, lum = (x: number, y: number) => { const i = (y * c.width + x) * 4; return (px[i]! + px[i + 1]! + px[i + 2]!) / 3; };
      const outer = along === 'rows' ? c.height : c.width, inner = along === 'rows' ? c.width : c.height, line: number[] = [];
      for (let a = 0; a < outer; a++) { const v: number[] = []; for (let b = 0; b < inner; b++) v.push(along === 'rows' ? lum(b, a) : lum(a, b)); v.sort((p, q) => p - q); line.push(v[v.length >> 1]!); }
      const smooth = line.map((_, i) => (line[Math.max(0, i - 1)]! + line[i]! + line[Math.min(line.length - 1, i + 1)]!) / 3);
      let worst = 0; for (let i = 1; i < smooth.length; i++) worst = Math.max(worst, Math.abs(smooth[i]! - smooth[i - 1]!));
      return worst;
    }, {data: png.toString('base64'), along});
  } finally { await blank.close(); }
}

test('one scene: rising behind the status row, under the right column, down behind Today\'s focus; under every card and button', async ({page}) => {
  await today(page);
  const g = (await geometry(page))!;
  expect(g).not.toBeNull();
  expect(g.image).toContain('hero-scene');
  expect(g.pointer).toBe('none');
  expect(g.hidden).toBe('true');
  expect(g.z).toBe('-2');
  const phone = (page.viewportSize()?.width ?? 0) <= 540;
  // The picture starts above the hero, behind the status row (no hard line under the top bar).
  expect(g.picture.top).toBeLessThan(g.hero.top - (phone ? 15 : 50));
  if (!phone) {
    // On past the hero's right edge (into the gap and under the right column) and down behind "What is due now".
    expect(g.picture.right).toBeGreaterThan(g.hero.right + 60);
    expect(g.picture.bottom).toBeGreaterThan(g.hero.bottom + 40);
    for (const position of await page.locator('.today-primary > .today-hero ~ *, .today-rail').evaluateAll(els => els.map(e => getComputedStyle(e).position))) expect(position).toBe('relative');
  }
  // Under the content: with the layer made hit-testable for a moment, each sampled piece of content is above it.
  const samples = await page.evaluate(() => {
    const scene = document.querySelector<HTMLElement>('.today-hero > .today-scene')!; scene.style.pointerEvents = 'auto';
    const targets = ['.today-hero h1', '.today-hero .hero-actions :is(a, button)', '.hero-pillars strong', '.today-focus h2', '.today-rail .panel, .today-rail section'];
    const out: {target: string; above: boolean}[] = [];
    for (const sel of targets) {
      const el = document.querySelector<HTMLElement>(sel); if (!el) continue;
      const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
      const stack = document.elementsFromPoint(r.left + Math.min(12, r.width / 2), r.top + r.height / 2);
      const content = stack.findIndex(e => e === el || el.contains(e)), art = stack.indexOf(scene);
      out.push({target: sel, above: content >= 0 && (art < 0 || content < art)});
    }
    scene.style.pointerEvents = '';
    return out;
  });
  expect(samples.length).toBeGreaterThan(2);
  for (const s of samples) expect(s.above, s.target).toBe(true);
});

test('no hard edge: across every former boundary of the art and of the old continuation, and at the picture\'s own edges', async ({page}) => {
  await today(page);
  await page.addStyleTag({content: ART_ONLY});
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
  const g = (await geometry(page))!, vw = page.viewportSize()!.width, phone = vw <= 540;
  // The old art box (inset −60/−26/−12 on computers, −20/−10/−10 on phones), the old continuation's box (1.3 × / 1.7 ×),
  // and the picture's own box today.
  const [it, ix, ib] = phone ? [20, 10, 10] : [60, 26, 12];
  const old = {top: g.hero.top - it, right: g.hero.right + ix, bottom: g.hero.bottom + ib, left: g.hero.left - ix};
  const span = {x: Math.max(0, Math.round(g.hero.left + (g.hero.right - g.hero.left) * .2)), w: Math.round((g.hero.right - g.hero.left) * .6)};
  const band = 28;
  const rows = (y: number) => ({x: span.x, y: Math.max(0, Math.round(y - band)), width: span.w, height: band * 2});
  const cols = (x: number) => ({x: Math.max(0, Math.min(vw - band * 2, Math.round(x - band))), y: Math.round(g.hero.top + 40), width: band * 2, height: Math.max(40, Math.round(g.hero.bottom - g.hero.top - 80))});
  const checks: [string, ReturnType<typeof rows>, 'rows' | 'cols'][] = [
    ['old top, under the top bar', rows(old.top), 'rows'],
    ['old foot', rows(old.bottom), 'rows'],
    ['picture top', rows(g.picture.top), 'rows'],
    ['picture foot', rows(Math.min(g.picture.bottom, g.hero.bottom + 200)), 'rows'],
  ];
  if (!phone) {
    checks.push(['old right edge, by the right column', cols(old.right), 'cols']);
    checks.push(['old continuation\'s right edge', cols(old.left + (old.right - old.left) * 1.3), 'cols']);
    checks.push(['old continuation\'s foot', rows(old.top + (old.bottom - old.top) * 1.7), 'rows']);
    checks.push(['picture right edge', cols(Math.min(g.picture.right, vw - band)), 'cols']);
  }
  for (const [name, clip, along] of checks) {
    if (clip.width <= 0 || clip.height <= 0 || clip.x + clip.width > vw) continue;
    const step = await largestStep(page, await page.screenshot({clip, fullPage: true}), along);
    expect(step, name).toBeLessThanOrEqual(4.5);
  }
});

test('by day (Light): the scene keeps its own night, a pool with no edge, and the status row above stays in the day', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'computers: the pool fades in over the gutter beside the sidebar');
  await page.goto('/app/settings');
  await page.evaluate(() => localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: 'light'})));
  await today(page);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('html')).not.toHaveAttribute('data-theme-loading', /.*/);
  await page.addStyleTag({content: ART_ONLY});
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(400);
  const g = (await geometry(page))!;
  const median = async (clip: {x: number; y: number; width: number; height: number}) => {
    const blank = await page.context().newPage();
    try {
      return await blank.evaluate(async data => {
        const img = new Image(); img.src = `data:image/png;base64,${data}`; await img.decode();
        const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d')!; x.drawImage(img, 0, 0);
        const px = x.getImageData(0, 0, c.width, c.height).data, v: number[] = [];
        for (let i = 0; i < px.length; i += 4) v.push((px[i]! + px[i + 1]! + px[i + 2]!) / 3);
        v.sort((a, b) => a - b); return v[v.length >> 1]!;
      }, (await page.screenshot({clip})).toString('base64'));
    } finally { await blank.close(); }
  };
  const w = g.hero.right - g.hero.left;
  // Above the pool, behind the status row: still the day. Behind the copy: night.
  expect(await median({x: Math.round(g.hero.left + w * .3), y: Math.round(g.hero.top - 40), width: Math.round(w * .4), height: 16})).toBeGreaterThan(200);
  expect(await median({x: Math.round(g.hero.left + 20), y: Math.round(g.hero.top + 70), width: 240, height: 60})).toBeLessThan(60);
  // The pool's edges are fades, never cuts: day to night over its gutter side and its top (a cut is a step of ~200).
  const left = {x: Math.round(g.hero.left - 34), y: Math.round(g.hero.top + 60), width: 56, height: Math.round(g.hero.bottom - g.hero.top - 140)};
  expect(await largestStep(page, await page.screenshot({clip: left}), 'cols'), 'the gutter side').toBeLessThanOrEqual(14);
  const top = {x: Math.round(g.hero.left + w * .2), y: Math.round(g.hero.top - 28), width: Math.round(w * .6), height: 56};
  expect(await largestStep(page, await page.screenshot({clip: top}), 'rows'), 'the top').toBeLessThanOrEqual(14);
});

/** The gap between the hero and the first piece of content after it that takes up room. */
const gapAfterHero = (page: Page) => page.evaluate(() => {
  const hero = document.querySelector<HTMLElement>('.today-primary > .today-hero')!;
  let next = hero.nextElementSibling;
  while (next && next.getBoundingClientRect().height < 1) next = next.nextElementSibling;
  return next ? next.getBoundingClientRect().top - hero.getBoundingClientRect().bottom : null;
});

test('folded, the scene is gone and Today\'s focus moves up; the fold is saved; unfolding brings it back', async ({page}) => {
  // A used device (the Showcase): Today's focus follows the hero and moves up when it folds.
  await page.goto('/app/settings');
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  await expect(page.locator('.today-hero').first()).toBeVisible();
  const focus = page.locator('.today-primary > .today-hero ~ .today-focus').first();
  const focusUnfolded = (await focus.boundingBox())!;
  await page.getByRole('button', {name: 'Hide the welcome header'}).click();
  await expect(page.locator('.today-hero-folded')).toBeVisible();
  await expect(page.locator('.today-scene')).toHaveCount(0);
  expect((await focus.boundingBox())!.y).toBeLessThan(focusUnfolded.y - 150);
  // Folded, no room is kept for the scene: what follows sits at the page's usual gap (the 24 px for the scene is gone).
  expect(await gapAfterHero(page)).toBeLessThanOrEqual(30);
  await page.getByRole('button', {name: 'Show the welcome header'}).click();
  await expect(page.locator('.today-hero:not(.today-hero-folded) > .today-scene')).toHaveCount(1);
  // A new device: folding shows the welcome panels in the hero's place (the app's own behaviour); still no room for the
  // scene is kept, and the fold is saved.
  await page.context().clearCookies();
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await today(page);
  await page.getByRole('button', {name: 'Hide the welcome header'}).click();
  await expect(page.locator('.today-hero-folded')).toBeVisible();
  await expect(page.locator('.today-scene')).toHaveCount(0);
  expect(await gapAfterHero(page)).toBeLessThanOrEqual(30);
  await page.reload();
  await expect(page.locator('.today-hero-folded')).toBeVisible();
  await expect(page.locator('.today-scene')).toHaveCount(0);
  await page.getByRole('button', {name: 'Show the welcome header'}).click();
  await expect(page.locator('.today-hero:not(.today-hero-folded) > .today-scene')).toHaveCount(1);
});

test('the page never scrolls sideways at any width, and the scene scrolls with the page (no fixed layer, no motion)', async ({page}, info) => {
  test.skip(info.project.name !== 'desktop', 'widths are set here; the phone project covers 390 itself');
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({width, height: 900});
    await today(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), `${width}px`).toBeLessThanOrEqual(0);
    const g = (await geometry(page))!;
    expect(g.animation).toBe('none');
    expect(await page.locator('.today-scene').evaluate(el => getComputedStyle(el).position)).toBe('absolute');
    await page.evaluate(() => scrollTo(0, 300));
    const after = (await geometry(page))!;
    expect(Math.abs(after.picture.top - g.picture.top)).toBeLessThan(1); // page coordinates: it moved with the page
  }
});

test('the scene is the original picture with an alpha channel, at sizes that stay light', async ({page}) => {
  for (const [path, limit] of [['/art/v27/hero-scene.avif', 240_000], ['/art/v27/hero-scene-mobile.avif', 90_000], ['/art/v27/hero-scene.webp', 560_000]] as const) {
    const response = await page.request.get(path);
    expect(response.ok(), path).toBe(true);
    expect((await response.body()).byteLength, path).toBeLessThan(limit);
  }
  expect((await page.request.get('/art/v21/hero-bleed.webp')).status()).toBe(404);
});
