import {expect, test, type Page} from '@playwright/test';

/**
 * Session AM-2 (ADR-038 "AM-2"): NOVA, stunning. What this pass must never lose again:
 * - E1–E4: the centre star is drawn and proven drawn; software rendering, a low battery and a light device only slow it;
 *   it is one still frame only for Motion Off and reduced motion; where WebGL cannot draw it the still picture of the same
 *   galaxy stands in; and an honest line under the star says which rule is at work.
 * Fictional data only.
 */
const NOVA_KEY = 'zigoals:nova:v1';
async function fresh(page: Page, extra: Record<string, string> = {}) {
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.goto('/app/settings');
  await page.evaluate(values => { localStorage.clear(); for (const [k, v] of Object.entries(values)) localStorage.setItem(k, v); },
    {'zigoals:onboarding:v1': JSON.stringify({version: 1, seen: true}), [NOVA_KEY]: JSON.stringify({version: 1, openingSeen: true}), ...extra});
}
const frame = (page: Page) => page.locator('.nova-frame');
async function open(page: Page) { await page.goto('/app/nova'); await expect(frame(page)).toHaveAttribute('data-opening', 'done'); await expect(page.locator('.nova-command input')).toBeVisible(); }
const why = (page: Page) => page.locator('.nova-star-why');
const framesDrawn = (page: Page) => page.evaluate(() => (window as unknown as {__zgHudFrames?: number}).__zgHudFrames ?? 0);

test.describe('AM-2: the centre star is always there, and says how it is drawn', () => {
  test.skip(({isMobile}) => isMobile, 'computer layouts');
  test.use({viewport: {width: 1440, height: 900}});

  test('E1, E2: the star runs, is proven drawn, and software rendering only slows it (with its line)', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page);
    await open(page);
    const star = page.locator('canvas.nova-star');
    await expect(star).toBeVisible();
    await expect(star).toHaveAttribute('data-star', 'active');
    await expect(star).toHaveAttribute('data-star-proven', '');
    // The SVG orb gives way to it, and the canvas really holds light at its core (a screenshot would not tell an empty canvas from the sky).
    await expect(page.locator('.nova-orb-button')).toHaveAttribute('data-star', '');
    const core = await star.evaluate((el: HTMLCanvasElement) => { const gl = el.getContext('webgl')!, px = new Uint8Array(4); gl.readPixels(Math.floor(el.width / 2), Math.floor(el.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); return [...px]; });
    expect(core[3]).toBeGreaterThan(200);
    expect(core[0]! + core[1]! + core[2]!).toBeGreaterThan(500);
    const software = await star.evaluate(el => el.hasAttribute('data-star-software'));
    if (software) await expect(why(page)).toHaveText('Slow star: this browser draws it without graphics hardware');
    else await expect(why(page)).toHaveCount(0);
    // It is alive: frames keep coming while NOVA is in view.
    const before = await framesDrawn(page);
    await page.waitForTimeout(1500);
    expect(await framesDrawn(page)).toBeGreaterThan(before + 3);
  });

  test('E5: a spec can hold the star live and in a state (the capture switches)', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.addInitScript(() => { (window as unknown as {__zgStarLive?: boolean; __zgStarHold?: string}).__zgStarLive = true; (window as unknown as {__zgStarHold?: string}).__zgStarHold = 'thinking'; });
    await fresh(page);
    await open(page);
    const star = page.locator('canvas.nova-star');
    await expect(star).toHaveAttribute('data-star', 'active');
    await expect(star).toHaveAttribute('data-star-fps', '30');
    await expect(page.locator('.nova-orb-state')).toHaveAttribute('data-state', 'thinking');
    await expect(why(page)).toHaveCount(0);
  });

  test('E4: Motion Off and reduced motion are one still frame each, with their own lines', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page, {'zigoals:motion:v1': 'off'});
    await open(page);
    await expect(page.locator('canvas.nova-star')).toHaveAttribute('data-star', 'still');
    await expect(page.locator('canvas.nova-star')).toHaveAttribute('data-star-proven', '');
    await expect(why(page)).toHaveText('Still star: Motion is Off in ZIGoals');
    const before = await framesDrawn(page);
    await page.waitForTimeout(1200);
    expect(await framesDrawn(page)).toBe(before);
    await page.emulateMedia({reducedMotion: 'reduce'});
    await fresh(page);
    await open(page);
    await expect(page.locator('canvas.nova-star')).toHaveAttribute('data-star', 'still');
    await expect(why(page)).toHaveText('Still star: your device asks for reduced motion');
  });

  test('E3: without WebGL the still picture of the same galaxy stands in, and says why', async ({page}) => {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, kind: string, ...rest: unknown[]) { return /webgl/i.test(kind) ? null : (real as (...a: unknown[]) => unknown).call(this, kind, ...rest); } as typeof real;
    });
    await fresh(page);
    await open(page);
    const picture = page.locator('.nova-star-picture');
    await expect(picture).toBeVisible();
    await expect(page.locator('canvas.nova-star')).toHaveCount(0);
    expect(await picture.locator('img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth)).toBeGreaterThan(300);
    await expect(page.locator('.nova-orb-button')).toHaveAttribute('data-star', ''); // the SVG orb stays the last resort only
    await expect(why(page)).toHaveText('Still picture: this browser has no WebGL');
  });

  test('E1: a driver that draws an empty frame is a failure with its own words, not an empty canvas', async ({page}) => {
    // What the owner's computer showed in Session AM: the shader compiles, the frame holds nothing. Here the read-back is
    // made to see an empty frame; the star must give way to the picture and say so.
    await page.addInitScript(() => {
      const real = WebGLRenderingContext.prototype.readPixels as (...a: unknown[]) => void;
      WebGLRenderingContext.prototype.readPixels = function (this: WebGLRenderingContext, ...a: unknown[]) { real.apply(this, a); const out = a[6] as Uint8Array | null; out?.fill(0); } as typeof WebGLRenderingContext.prototype.readPixels;
    });
    await fresh(page);
    await open(page);
    await expect(page.locator('.nova-star-picture')).toBeVisible();
    await expect(page.locator('canvas.nova-star')).toHaveCount(0);
    await expect(why(page)).toHaveText('Still picture: the graphics driver drew an empty frame');
  });

  test('E3: a lost graphics context is waited for; the picture stands in, and the star returns with the context', async ({page}) => {
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await fresh(page);
    await open(page);
    const star = page.locator('canvas.nova-star');
    await expect(star).toHaveAttribute('data-star-proven', '');
    await star.evaluate((el: HTMLCanvasElement) => { (window as unknown as {__lose?: WEBGL_lose_context | null}).__lose = el.getContext('webgl')!.getExtension('WEBGL_lose_context'); (window as unknown as {__lose?: WEBGL_lose_context | null}).__lose?.loseContext(); });
    await expect(page.locator('.nova-star-picture')).toBeVisible({timeout: 6000});
    await expect(why(page)).toHaveText('Still picture: the graphics context was lost');
    await page.evaluate(() => (window as unknown as {__lose?: WEBGL_lose_context | null}).__lose?.restoreContext());
    await expect(page.locator('.nova-star-picture')).toHaveCount(0);
    await expect(star).toBeVisible();
    await expect(star).toHaveAttribute('data-star', 'active');
  });
});
