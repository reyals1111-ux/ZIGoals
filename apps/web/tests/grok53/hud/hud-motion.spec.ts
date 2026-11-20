import {expect, test} from '@playwright/test';
import {NOON, frame, freshNova, runningInNova, skyFrames} from './hud-helpers';

/**
 * Session AL Part 11 (lane L8), spec (b), owner decision O5: Motion Off and the device's reduced motion leave NOVA's HUD
 * fully still — no running animation inside NOVA, the sky canvas (which carries the HUD's motes) draws no frame, and the
 * HUD's pixels do not change over two seconds (at 1440 and on a 390 px phone). Full turns the ornament rings, each its own
 * compositor layer; Calm turns them slower.
 */
test.use({timezoneId: 'Europe/Brussels'});

// Session AL second pass: stillness is checked on a computer (1440) and on a phone's one column (390), in both projects.
for (const [label, viewport] of [['computer', {width: 1440, height: 900}], ['phone', {width: 390, height: 844}]] as const) for (const mode of ['Motion Off', 'reduced motion'] as const) {
  test(`${mode}: the HUD is fully still (${label})`, async ({page}) => {
    await page.setViewportSize(viewport);
    if (mode === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
    await page.clock.install({time: NOON});
    await freshNova(page, {preset: 'command', waterTarget: true, ...(mode === 'Motion Off' ? {motion: 'off' as const} : {})});
    await expect(frame(page)).toHaveAttribute('data-hud-motion', 'still');
    await expect(page.locator('.nova-widget[data-holo]').first()).toBeVisible();
    // Session AR (hud-motion on a phone under two workers, deliberate; the three stillness checks below are unchanged):
    // a still star is drawn again whenever its size changes, and on a phone its size follows what the first screen
    // holds (the one-tap keys, the strip of cards, the line under its state). On a busy machine those arrive later than
    // the 800 ms this spec used to wait, so the star's redraws for its new size fell inside the two seconds that must
    // be still (2 frames became 4). The spec now waits until the stage has stopped arriving — no panel is still
    // reading, and the page's height, the stage's, the foot's, the star's size and the frame count have not changed
    // for a second — and then demands the same two still seconds. A stage that kept drawing never settles and fails here.
    await expect(page.locator('.nova-stage-area .nova-reading')).toHaveCount(0, {timeout: 15_000});
    const arrived = () => page.evaluate(() => {
      const h = (sel: string) => Math.round(document.querySelector(sel)?.getBoundingClientRect().height ?? 0);
      return [document.documentElement.scrollHeight, document.querySelector('.nova-stage-area')!.scrollHeight, h('.nova-foot'), h('.nova-orb-button'), h('.nova-orb-button canvas, .nova-orb-button .nova-star-picture'), (window as Window & {__zgHudFrames?: number}).__zgHudFrames ?? 0].join('/');
    });
    await expect(async () => { const a = await arrived(); await page.waitForTimeout(1000); expect(await arrived()).toBe(a); }).toPass({timeout: 20_000});
    expect(await runningInNova(page)).toEqual([]);
    // Session AV (ADR-045 D34, deliberate; the three stillness checks are unchanged): the first picture is taken before the
    // frames are counted. A stage taller than the phone's window is captured by widening the window for a moment and
    // putting it back (two resize events), and a still star is rightly drawn again for each new size: those two frames
    // fell inside the two seconds that must be still (1 became 3, AR's and AU's D34 signature, measured here). The
    // capture's own redraws are waited out like the stage's arrival, then the same two still seconds are demanded.
    const stage = page.locator('.nova-stage-area'), before = await stage.screenshot({animations: 'allow'});
    await expect(async () => { const a = await arrived(); await page.waitForTimeout(1000); expect(await arrived()).toBe(a); }).toPass({timeout: 20_000});
    const frames = await skyFrames(page);
    await page.waitForTimeout(2000);
    expect(await skyFrames(page)).toBe(frames);
    expect(await runningInNova(page)).toEqual([]);
    const after = await stage.screenshot({animations: 'allow'});
    expect(after.equals(before), 'the HUD did not change a pixel in two seconds').toBe(true);
  });
}

test('Full turns the ornaments (never a data arc); Calm turns them three times slower; both pause in a hidden tab', async ({page, isMobile}) => {
  test.skip(isMobile, 'computer layout: runs in the desktop project (the phone keeps the same CSS; its stillness is checked above)');
  await page.setViewportSize({width: 1440, height: 900});
  await page.clock.install({time: NOON});
  await freshNova(page, {preset: 'command'});
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'full');
  const spins = () => page.evaluate(() => document.getAnimations().filter(a => (a as CSSAnimation).animationName === 'holo-spin' && a.playState === 'running').map(a => (a.effect as KeyframeEffect).getComputedTiming().duration));
  await expect.poll(async () => (await spins()).length).toBeGreaterThan(0);
  expect(new Set(await spins())).toEqual(new Set([90_000]));
  // Data arcs never animate: only ornaments carry the spin, and each is its own HTML layer (second pass: the compositor turns
  // it, so nothing under it is repainted), never an element inside a data drawing.
  expect(await page.evaluate(() => document.getAnimations().filter(a => { const t = (a.effect as KeyframeEffect | null)?.target; return t instanceof Element && !!t.closest('.holo-arc, .holo-track, .holo-segs, .holo-bar, .holo-wave-line'); }).length)).toBe(0);
  const spinning = await page.evaluate(() => document.getAnimations().filter(a => (a as CSSAnimation).animationName === 'holo-spin').map(a => { const t = (a.effect as KeyframeEffect).target as Element; return `${t.tagName.toLowerCase()}.${t.classList[0]}`; }));
  for (const t of spinning) expect(['span.holo-orn', 'span.holo-lens'], t).toContain(t);
  await page.evaluate(() => { localStorage.setItem('zigoals:motion:v1', 'calm'); document.documentElement.dataset.appMotion = 'calm'; });
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'calm');
  await expect.poll(async () => new Set(await spins())).toEqual(new Set([270_000]));
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'paused');
  await expect.poll(async () => (await spins()).length).toBe(0);
});
