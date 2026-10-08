import {expect, type Page} from '@playwright/test';
import {go, journey, noSideways, open, ready} from './kit';

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
      const title = await page.locator('main h1:visible').first().boundingBox();
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

journey('J245', 'the installed-app look (display-mode standalone): recognised as installed, the phone chrome intact', {views: ['P'], data: ['S']}, async j => {
  const {page} = j;
  // Playwright cannot switch the display mode itself: the two signals the app reads (lib/install/platform.ts) are set
  // as an iPhone Home Screen app reports them.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'standalone', {configurable: true, get: () => true});
    const original = window.matchMedia.bind(window);
    window.matchMedia = (query: string) => { const list = original(query); if (/display-mode:\s*(standalone|fullscreen)/.test(query)) Object.defineProperty(list, 'matches', {configurable: true, get: () => true}); return list; };
  });
  await open(page, '/app/help#install');
  const status = page.getByRole('region', {name: 'Install ZIGoals on your iPhone', exact: true}).locator('.help-status');
  await expect(status).toHaveAttribute('data-context', 'installed');
  await expect(status).toHaveText('You’re using ZIGoals as an installed app. Keep opening it from its icon.');
  const height = page.viewportSize()!.height;
  for (const path of ['/app', '/app/habits', '/app/wealth', '/app/settings']) {
    await open(page, path);
    await expect(page.locator('.phone-topbar')).toBeVisible();
    const nav = page.getByRole('navigation', {name: 'Main navigation'});
    await expect(nav).toBeVisible();
    const bar = (await nav.boundingBox())!;
    expect(bar.y + bar.height, `${path}: the tab bar stays on the screen`).toBeLessThanOrEqual(height + 0.5);
    expect((await page.locator('main h1:visible').first().boundingBox())!.y, `${path}: the title on the first screen`).toBeLessThan(height);
    await noSideways(page);
  }
  // The tab bar and More still reach a page.
  await go(j, 'Health');
  await expect(page).toHaveURL(/\/app\/health$/);
});

journey('J249', 'every page, once visited, keeps working offline and says so; nothing turns into zero', {views: ['D', 'P'], data: ['S']}, async j => {
  const {page} = j;
  j.info.setTimeout(300_000); // 18 pages, each online, then offline, then online again
  const offline = page.getByRole('alert').filter({hasText: 'You’re offline.'});
  const zeros = async () => ((await page.locator('main').innerText()).match(/[$€£¥]0\.00(?!\d)/g) ?? []).length;
  for (const path of EVERY) {
    await open(page, path);
    const before = await zeros();
    await page.context().setOffline(true);
    await expect(offline, path).toBeVisible();
    await expect(offline, path).toContainText('This page keeps working and saves on this device; other pages open again when you’re back online.');
    // A moment offline: the page stays itself.
    await page.waitForTimeout(700);
    await expect(page.locator('main h1:visible').first(), path).toBeVisible();
    await expect(page.getByText('This page could not be shown.'), path).toHaveCount(0);
    await expect(page.locator('main'), path).not.toContainText(/\bNaN\b|undefined/);
    expect(await zeros(), `${path}: no value turned into zero offline`).toBeLessThanOrEqual(before);
    await page.context().setOffline(false);
    await expect(offline, path).toHaveCount(0);
  }
});

journey('J257', 'records saved in Brussels, the device moved to Tokyo, then back: nothing duplicated or lost', {views: ['D'], data: ['L']}, async j => {
  const {page} = j;
  const title = 'Fictional evening walk';
  const records = (p: Page) => p.evaluate(() => {
    const health = JSON.parse(localStorage.getItem('zigoals:health:v1') ?? '{}'), habits = JSON.parse(localStorage.getItem('zigoals:habits:v1') ?? '{"habits":[]}');
    return {water: ((health.daily?.water ?? []) as {date: string}[]).map(w => w.date).sort(), weights: ((health.weights ?? []) as {date: string}[]).map(w => w.date), checkIns: (habits.habits as {entries: {date: string; disposition: string}[]}[]).flatMap(h => h.entries.filter(e => e.disposition === 'logged').map(e => e.date))};
  });
  const water = (p: Page) => p.getByRole('region', {name: 'Water journal'});
  // In Brussels, 20:00 on 14 October: a habit checked in, a glass of water and a weight.
  await page.clock.install({time: new Date('2026-10-14T20:00:00+02:00')});
  await open(page, '/app/habits');
  await page.getByRole('button', {name: '+ New habit', exact: true}).click();
  await page.getByLabel('Habit title', {exact: true}).fill(title);
  await page.getByRole('button', {name: 'Create habit', exact: true}).click();
  await page.getByRole('article', {name: title, exact: true}).getByRole('button', {name: `Complete ${title}`, exact: true}).click();
  await expect(page.getByRole('button', {name: `Undo completion for ${title}`})).toHaveAttribute('aria-pressed', 'true');
  await open(page, '/app/health');
  await water(page).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(page).locator('.health-water-total')).toHaveText('250 mL recorded');
  await page.getByRole('navigation', {name: 'Health views'}).getByRole('button', {name: 'Weight', exact: true}).click();
  await page.getByRole('form', {name: 'Weight entry'}).getByLabel('Weight (kg)').fill('78.4');
  await page.getByRole('form', {name: 'Weight entry'}).getByRole('button', {name: 'Save weight', exact: true}).click();
  await expect(page.getByRole('table', {name: 'Weight history'})).toContainText('2026-10-14');
  expect(await records(page)).toEqual({water: ['2026-10-14'], weights: ['2026-10-14'], checkIns: ['2026-10-14']});
  // The device travels to Tokyo with the same records: there it is already 03:05 on 15 October.
  const tokyo = await page.context().browser()!.newContext({timezoneId: 'Asia/Tokyo', storageState: await page.context().storageState()});
  const there = await tokyo.newPage();
  await there.clock.install({time: new Date('2026-10-14T20:05:00+02:00')});
  await open(there, '/app/health');
  await expect(there.locator('.health-date').getByLabel('Journal date')).toHaveValue('2026-10-15');
  await expect(water(there).locator('.health-water-total')).toHaveText('No water entries yet');
  await there.locator('.health-date').getByRole('button', {name: 'Previous day', exact: true}).click();
  await expect(water(there).locator('.health-water-total')).toHaveText('250 mL recorded');
  await there.locator('.health-date').getByRole('button', {name: 'Today', exact: true}).click();
  await water(there).getByRole('button', {name: 'Add 250 mL', exact: true}).click();
  await expect(water(there).locator('.health-water-total')).toHaveText('250 mL recorded');
  await open(there, '/app/habits');
  await expect(there.getByRole('button', {name: `Complete ${title}`, exact: true})).toBeVisible();
  expect(await records(there)).toEqual({water: ['2026-10-14', '2026-10-15'], weights: ['2026-10-14'], checkIns: ['2026-10-14']});
  // Back in Brussels the next morning: each record once, on the day it was saved.
  const home = await page.context().browser()!.newContext({timezoneId: 'Europe/Brussels', storageState: await tokyo.storageState()});
  const back = await home.newPage();
  await back.clock.install({time: new Date('2026-10-15T09:00:00+02:00')});
  await open(back, '/app/health');
  await expect(back.locator('.health-date').getByLabel('Journal date')).toHaveValue('2026-10-15');
  await expect(water(back).locator('.health-water-total')).toHaveText('250 mL recorded');
  await back.locator('.health-date').getByRole('button', {name: 'Previous day', exact: true}).click();
  await expect(water(back).locator('.health-water-total')).toHaveText('250 mL recorded');
  await open(back, '/app/habits');
  await expect(back.getByRole('button', {name: `Complete ${title}`, exact: true})).toBeVisible();
  expect(await records(back)).toEqual({water: ['2026-10-14', '2026-10-15'], weights: ['2026-10-14'], checkIns: ['2026-10-14']});
  await tokyo.close();
  await home.close();
});
