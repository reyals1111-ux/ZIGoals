#!/usr/bin/env node
// Session X Part 5a: what Next's link prefetching costs and buys in this app. On a production server (`next start`,
// loopback only) it opens Today in Local Demo, counts the prefetch requests the page makes while it rests (each is a
// Worker invocation on the Alpha), then times navigations through the main navigation: from the click to the new
// page's heading in the main region, for each destination, on a desktop (1440 px) and a phone (390 px, iPhone 13).
//   node scripts/perf/prefetch-navigation.mjs http://127.0.0.1:3100 [--rounds 10] [--throttle 4]
// --throttle slows the page's CPU (Chrome DevTools Protocol) to stand in for a slower phone. No data leaves the
// machine: every /api request is answered 503 by a local fixture.
import {createRequire} from 'node:module';
import {parseArgs} from 'node:util';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const {chromium, devices} = require('@playwright/test');
const {values, positionals} = parseArgs({allowPositionals: true, options: {rounds: {type: 'string', default: '10'}, throttle: {type: 'string', default: '1'}}});
const origin = new URL(positionals[0] ?? 'http://127.0.0.1:3100').origin;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) throw Error('Give the loopback origin of a local production server.');
const rounds = Number(values.rounds), throttle = Number(values.throttle);
// Every main destination shown by default (Chess and the music player are hidden until shown). On a phone the first four
// are tabs and the rest are rows of the More sheet, which is opened first, as a person would.
const DESTINATIONS = [['Goals', '/app/goals'], ['Habits', '/app/habits'], ['Health', '/app/health'], ['Wealth', '/app/wealth'], ['Markets', '/app/markets'], ['Staking', '/app/staking'], ['Portfolio', '/app/portfolio'], ['Ecosystem', '/app/ecosystem'], ['Activity', '/app/activity'], ['Settings', '/app/settings'], ['Today', '/app']];
const median = list => { const s = [...list].sort((a, b) => a - b); return s.length ? Math.round((s[(s.length - 1) >> 1] + s[s.length >> 1]) / 2) : null; };
const browser = await chromium.launch({channel: 'chrome', headless: true});
const result = {origin, measuredAt: new Date().toISOString(), rounds, cpuThrottle: throttle, layouts: {}};
for (const [layout, options] of [['desktop', {viewport: {width: 1440, height: 900}}], ['phone', devices['iPhone 13']]]) {
  const context = await browser.newContext({...options, locale: 'en-US', reducedMotion: 'reduce'});
  await context.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage refused */ } });
  await context.route('**/api/**', route => route.fulfill({status: 503, contentType: 'application/json', body: '{"error":"fixture offline"}'}));
  const prefetches = [];
  context.on('request', request => { const h = request.headers(); if (h['next-router-prefetch'] === '1' || h['next-router-segment-prefetch']) prefetches.push(new URL(request.url()).pathname); });
  const page = await context.newPage();
  if (throttle > 1) { const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setCPUThrottlingRate', {rate: throttle}); }
  const nav = page.getByRole('navigation', {name: 'Main navigation'});
  const times = Object.fromEntries(DESTINATIONS.map(([name]) => [name, []]));
  const idle = [];
  for (let round = 0; round < rounds; round++) {
    prefetches.length = 0;
    await page.goto(`${origin}/app`, {waitUntil: 'load'});
    await page.locator('main h1').first().waitFor();
    await page.waitForTimeout(3000);
    idle.push(prefetches.length);
    for (const [name, path] of DESTINATIONS) {
      if (new URL(page.url()).pathname === path) continue;
      const link = nav.getByRole('link', {name, exact: true});
      if (layout === 'phone' && !await link.isVisible()) {
        const more = nav.getByRole('button', {name: 'More', exact: true}), sheet = nav.getByRole('dialog', {name: 'More'});
        for (let tries = 0; tries < 20 && !await sheet.isVisible(); tries++) { await more.click(); await page.waitForTimeout(150); }
      }
      await link.waitFor();
      // Let any prefetch of the destination settle first, as a person's eye travels to the link.
      await page.waitForTimeout(400);
      // Timed in this process: Health is a full document load (its camera rule), which resets the page's own clock.
      const started = performance.now();
      await link.click();
      await page.waitForURL(url => new URL(url).pathname === path);
      await page.waitForFunction(target => document.querySelector('main[aria-busy="true"]') === null && location.pathname === target && !!document.querySelector('main h1'), path);
      times[name].push(Math.round(performance.now() - started));
    }
  }
  result.layouts[layout] = {
    prefetchRequestsWhileTodayRests: {median: median(idle), samples: idle},
    navigationMs: Object.fromEntries(Object.entries(times).map(([name, list]) => [name, {median: median(list), samples: list}])),
    navigationMedianAllMs: median(Object.values(times).flat()),
  };
  await context.close();
}
await browser.close();
console.log(JSON.stringify(result, null, 2));
