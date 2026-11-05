import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, test} from '@playwright/test';
import {frame, freshNova, runningInNova, skyFrames} from './hud-helpers';

/**
 * Session AL Part 11 (lane L8), spec (c): a performance probe of NOVA's HUD in Full motion with the CPU throttled 4× (CDP
 * Emulation.setCPUThrottlingRate), recording requestAnimationFrame frame times, then idle CPU while the tab is hidden
 * (CDP Performance metrics). The numbers go to test-results/hud-perf.json for the integrator's record (and the test's own
 * output folder). The bounds below are guards, not the target: the target is 60 fps at 4× and near-zero idle when hidden.
 */
// A true capability skip: CPU throttling and the Performance metrics exist only over Chromium's DevTools protocol; and the
// target (AL_SCOPE B) is a mid laptop profile, so the phone-emulating project does not run it.
test.skip(({browserName, isMobile}) => browserName !== 'chromium' || isMobile, 'CDP CPU throttling needs Chromium; the target is a laptop profile');
// No trace for this probe (Session AL L8c): the suite's `trace: 'retain-on-failure'` records a screencast frame for every
// visual change, and at CPU 4× that recorder alone held the page to 20 fps (median 50 ms with it, 16.7 ms without, same
// build). The probe measures the HUD, not Playwright's recorder; the JSON below is the evidence a failure needs.
test.use({viewport: {width: 1440, height: 900}, timezoneId: 'Europe/Brussels', trace: 'off'});

const MEDIAN_FRAME_GUARD_MS = 20, HIDDEN_CPU_SHARE_GUARD = 0.2;
const pct = (sorted: number[], p: number) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0;

test('Full motion at CPU 4×: frame times; hidden tab: idle CPU and nothing drawn', async ({page}, info) => {
  // No page.clock here: a fake clock would also fake requestAnimationFrame, and the probe measures real frames.
  await freshNova(page, {preset: 'command', waterTarget: true});
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'full');
  await page.waitForTimeout(1500);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});
  const deltas = await page.evaluate(() => new Promise<number[]>(done => {
    const out: number[] = []; let last = performance.now(); const end = last + 4000;
    const step = (t: number) => { out.push(t - last); last = t; if (t < end) requestAnimationFrame(step); else done(out.slice(1)); };
    requestAnimationFrame(step);
  }));
  const sorted = [...deltas].sort((a, b) => a - b), median = pct(sorted, 0.5), p95 = pct(sorted, 0.95);
  const full = {frames: deltas.length, medianMs: Math.round(median * 10) / 10, p95Ms: Math.round(p95 * 10) / 10, fps: Math.round(1000 / Math.max(1, median)), longFrames: deltas.filter(d => d > 50).length};

  await cdp.send('Performance.enable');
  const metric = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'}); Object.defineProperty(document, 'hidden', {configurable: true, get: () => true}); document.dispatchEvent(new Event('visibilitychange')); });
  await expect(frame(page)).toHaveAttribute('data-hud-motion', 'paused');
  await page.waitForTimeout(300);
  const before = await metric(), skyBefore = await skyFrames(page), t0 = Date.now();
  await page.waitForTimeout(3000);
  const after = await metric(), seconds = (Date.now() - t0) / 1000;
  const hidden = {seconds: Math.round(seconds * 10) / 10, taskSeconds: Math.round(((after.TaskDuration ?? 0) - (before.TaskDuration ?? 0)) * 1000) / 1000, scriptSeconds: Math.round(((after.ScriptDuration ?? 0) - (before.ScriptDuration ?? 0)) * 1000) / 1000, skyFrames: (await skyFrames(page)) - skyBefore, runningHudAnimations: (await runningInNova(page)).filter(a => /holo/.test(a)).length};
  await cdp.send('Emulation.setCPUThrottlingRate', {rate: 1});

  const report = {when: new Date().toISOString(), viewport: '1440×900', cpuThrottle: 4, preset: 'command', full, hidden};
  const text = JSON.stringify(report, null, 2);
  writeFileSync(info.outputPath('hud-perf.json'), text);
  try { const dir = join(process.cwd(), 'test-results'); mkdirSync(dir, {recursive: true}); writeFileSync(join(dir, 'hud-perf.json'), text); } catch { /* the output folder holds it */ }
  await info.attach('hud-perf.json', {body: text, contentType: 'application/json'});

  expect(full.frames).toBeGreaterThan(20);
  expect(full.medianMs, `median frame at CPU 4× (target 16.7 ms): ${text}`).toBeLessThanOrEqual(MEDIAN_FRAME_GUARD_MS);
  expect(hidden.skyFrames, 'nothing drawn while hidden').toBe(0);
  expect(hidden.runningHudAnimations, 'every HUD animation paused while hidden').toBe(0);
  expect(hidden.taskSeconds / Math.max(1, hidden.seconds), `CPU share while hidden: ${text}`).toBeLessThanOrEqual(HIDDEN_CPU_SHARE_GUARD);
});
