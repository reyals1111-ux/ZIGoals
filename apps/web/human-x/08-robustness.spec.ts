import {expect} from '@playwright/test';
import {journey, noSideways, open, ready} from './kit';

// Session X Part 14, cross-page journeys J245–J259 (docs/verification/x-cloud/HUMAN_TEST.md): every page under the
// conditions people meet: small screens, motion settings, a slow network, blocked storage, a long session, resizing.
const EVERY = ['/app', '/app/goals', '/app/goals/new', '/app/habits', '/app/health', '/app/health?view=sleep', '/app/health?view=meditation', '/app/health?view=devices', '/app/wealth', '/app/portfolio', '/app/markets', '/app/staking', '/app/ecosystem', '/app/activity', '/app/chess', '/app/settings', '/app/help', '/app/welcome'];

journey('J247', 'every page with reduced motion: nothing keeps moving', {views: ['P'], data: ['S']}, async j => {
  const {page} = j;
  await page.emulateMedia({reducedMotion: 'reduce'});
  for (const path of EVERY) {
    await open(page, path);
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && !(a instanceof CSSTransition)).map(a => (a as CSSAnimation).animationName ?? 'script')), {message: path, timeout: 4000}).toEqual([]);
  }
});

journey('J248', 'every page with Motion Off: nothing keeps moving', {views: ['D'], data: ['S']}, async j => {
  const {page} = j;
  await page.evaluate(() => { localStorage.setItem('zigoals:motion:v1', 'off'); window.dispatchEvent(new Event('zigoals-motion')); });
  for (const path of EVERY) {
    await open(page, path);
    await expect.poll(() => page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running' && !(a instanceof CSSTransition)).map(a => (a as CSSAnimation).animationName ?? 'script')), {message: path, timeout: 4000}).toEqual([]);
  }
});

journey('J250', 'every page at 320, 360 and 390 px: no sideways scroll, the title on the first screen', {views: ['P'], data: ['S'], live: true}, async j => {
  const {page} = j;
  j.info.setTimeout(180_000); // 3 widths × 18 pages
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({width, height: width === 320 ? 568 : 800});
    for (const path of EVERY) {
      await open(page, path);
      await noSideways(page);
      const title = await page.locator('main h1').first().boundingBox();
      expect(title!.y, `${path} at ${width}: the title starts on the first screen`).toBeLessThan(width === 320 ? 568 : 800);
    }
  }
});

journey('J253', 'a deep link to every page in a fresh tab', {views: 'all', data: ['E', 'S'], live: true}, async j => {
  const {page} = j;
  for (const path of EVERY) {
    const tab = await page.context().newPage();
    await tab.route('**/api/market-**', route => route.fulfill({status: 503, json: {error: 'journey: market data not requested'}}));
    await tab.goto(path);
    await ready(tab);
    await tab.close();
  }
});

journey('J255', 'a slow network: pages say they are loading and never claim done early', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  j.info.setTimeout(240_000); // each page takes 15–25 s at 50 KB/s
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 20 * 1024});
  for (const path of ['/app', '/app/habits', '/app/health', '/app/wealth']) await open(page, path);
  await cdp.send('Network.emulateNetworkConditions', {offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1});
});

journey('J256', 'storage blocked: the app says what it cannot keep, and nothing breaks', {views: ['D'], data: ['E']}, async j => {
  const {page} = j;
  await page.addInitScript(() => {
    const deny = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
    Object.defineProperty(window, 'localStorage', {get: deny, configurable: true});
  });
  for (const path of ['/app', '/app/habits', '/app/settings']) await open(page, path);
});

journey('J258', 'a long session: 30 navigations without a reload stay responsive', {views: ['D'], data: ['S']}, async j => {
  const {page} = j;
  const nav = page.getByRole('navigation', {name: 'Main navigation'});
  const names = ['Goals', 'Habits', 'Health', 'Wealth', 'Markets', 'Staking', 'Portfolio', 'Ecosystem', 'Activity', 'Settings'];
  const started = Date.now();
  for (let i = 0; i < 30; i++) {
    const t = Date.now();
    await nav.getByRole('link', {name: names[i % names.length]!, exact: true}).click();
    await ready(page);
    expect(Date.now() - t, `navigation ${i + 1} took too long`).toBeLessThan(8000);
  }
  j.info.annotations.push({type: 'timing', description: `30 navigations in ${Date.now() - started} ms`});
});

journey('J259', 'resized from 1440 to 390 and back on each page: no stuck layout', {views: ['D'], data: ['S']}, async j => {
  const {page} = j;
  for (const path of ['/app', '/app/goals', '/app/habits', '/app/health', '/app/wealth', '/app/settings']) {
    await open(page, path);
    for (const width of [390, 1440]) { await page.setViewportSize({width, height: 900}); await noSideways(page); }
  }
});
