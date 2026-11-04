import {expect, test} from '@playwright/test';
import {NOON, frame, freshNova, runningInNova, skyFrames} from './hud-helpers';

/**
 * Session AL Part 11 (lane L8), spec (b), owner decision O5: Motion Off and the device's reduced motion leave NOVA's HUD
 * fully still — no running animation inside NOVA, the sky canvas (which carries the HUD's motes) draws no frame, and the
 * HUD's pixels do not change over two seconds. Full turns the ornament rings; Calm turns them slower. Desktop 1440.
 */
test.skip(({isMobile}) => isMobile, 'computer layout');
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Brussels'});

for (const mode of ['Motion Off', 'reduced motion'] as const) {
  test(`${mode}: the HUD is fully still`, async ({page}) => {
    if (mode === 'reduced motion') await page.emulateMedia({reducedMotion: 'reduce'});
    await page.clock.install({time: NOON});
    await freshNova(page, {preset: 'command', waterTarget: true, ...(mode === 'Motion Off' ? {motion: 'off' as const} : {})});
    await expect(frame(page)).toHaveAttribute('data-hud-motion', 'still');
    await expect(page.locator('.nova-widget[data-holo]').first()).toBeVisible();
    await page.waitForTimeout(800);
    expect(await runningInNova(page)).toEqual([]);
    const stage = page.locator('.nova-stage-area'), frames = await skyFrames(page), before = await stage.screenshot({animations: 'allow'});
    await page.waitForTimeout(2000);
    expect(await skyFrames(page)).toBe(frames);
    expect(await runningInNova(page)).toEqual([]);
    const after = await stage.screenshot({animations: 'allow'});
    expect(after.equals(before), 'the HUD did not change a pixel in two seconds').toBe(true);
  });
}

test('Full turns the ornaments (never a data arc); Calm turns them three times slower; both pause in a hidden tab', async ({page}) => {
  await page.clock.install({time: NOON});
  await freshNova(page, {preset: 'command'});
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'full');
  const spins = () => page.evaluate(() => document.getAnimations().filter(a => (a as CSSAnimation).animationName === 'holo-spin' && a.playState === 'running').map(a => (a.effect as KeyframeEffect).getComputedTiming().duration));
  await expect.poll(async () => (await spins()).length).toBeGreaterThan(0);
  expect(new Set(await spins())).toEqual(new Set([90_000]));
  // Data arcs never animate: only ornaments carry the spin.
  expect(await page.evaluate(() => document.getAnimations().filter(a => { const t = (a.effect as KeyframeEffect | null)?.target; return t instanceof Element && !!t.closest('.holo-arc, .holo-track, .holo-segs'); }).length)).toBe(0);
  await page.evaluate(() => { localStorage.setItem('zigoals:motion:v1', 'calm'); document.documentElement.dataset.appMotion = 'calm'; });
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'calm');
  await expect.poll(async () => new Set(await spins())).toEqual(new Set([270_000]));
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'paused');
  await expect.poll(async () => (await spins()).length).toBe(0);
});
