// Session AT (ADR-043 D14; NEXT_SESSION_BACKLOG #12 "Help: screenshots"): Help's example screenshots, made from the
// Showcase (fictional example data, always labelled as such where shown) in each theme, at a computer's and a phone's
// width. Run against a local production build; it writes WebP files to apps/web/public/help/ (or the folder given).
//
//   node scripts/help-screenshots.mjs http://127.0.0.1:3101 [out-dir]
//
// Each picture: a fresh browser context, the theme chosen as a person would (its saved preference), motion reduced, every
// /api answer refused (no live price, no outside service), the clock fixed, Settings → Load Showcase Demo, then the page.
// Playwright writes PNG; the page's own canvas encodes WebP (Chromium), so nothing is added to the project.
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';

// Session AT (UX review): each picture frames the page's key part, not its first screen (`focus`: what to bring to the top).
export const HELP_SHOTS = Object.freeze([
  {id: 'today', path: '/app', title: 'Today', focus: '#today-focus-title'},
  {id: 'habits', path: '/app/habits', title: 'Habits', focus: 'heading:Morning'},
  {id: 'health', path: '/app/health', title: 'Health', focus: '#health-view-panel'},
  {id: 'wealth', path: '/app/wealth', title: 'Wealth', focus: '#holdings'},
  {id: 'nova', path: '/app/nova', title: 'NOVA'},
]);
export const HELP_THEMES = Object.freeze(['nebula', 'light', 'dark']);
export const HELP_SIZES = Object.freeze({desktop: {width: 1440, height: 900}, phone: {width: 390, height: 844}});
export const helpShotFile = (id, theme, size) => `${id}-${theme}-${size}.webp`;
const DAY = new Date('2026-11-18T10:00:00.000Z');
// The app's own Playwright (apps/web), with the browser its specs use (the chrome channel).
const {chromium} = createRequire(new URL('../apps/web/package.json', import.meta.url))('@playwright/test');

async function main() {
  const base = process.argv[2], out = resolve(process.argv[3] ?? 'apps/web/public/help');
  if (!base) { console.error('Usage: node scripts/help-screenshots.mjs <base URL> [out-dir]'); process.exitCode = 2; return; }
  mkdirSync(out, {recursive: true});
  const browser = await chromium.launch({channel: 'chrome'});
  let bytes = 0;
  try {
    for (const theme of HELP_THEMES) for (const [size, viewport] of Object.entries(HELP_SIZES)) {
      const context = await browser.newContext({viewport, deviceScaleFactor: 1, reducedMotion: 'reduce', timezoneId: 'UTC', locale: 'en-US', ...(size === 'phone' ? {isMobile: true, hasTouch: true} : {})});
      await context.route(url => url.pathname.startsWith('/api/'), route => route.fulfill({status: 503, json: {error: 'HELP_SCREENSHOTS_OFFLINE'}}));
      const page = await context.newPage();
      await page.clock.setFixedTime(DAY);
      await page.goto(base + '/app/settings');
      await page.evaluate(t => { localStorage.clear(); sessionStorage.clear(); if (t !== 'nebula') localStorage.setItem('zigoals:ui-prefs:v1', JSON.stringify({version: 1, theme: t})); }, theme);
      await page.goto(base + '/app/settings');
      await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 30_000});
      await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
      await page.waitForURL('**/app', {timeout: 30_000});
      // The Alpha notice is closed once (as a person would after reading it); it stays closed on every page.
      await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 30_000});
      const notice = page.getByRole('complementary', {name: 'Alpha notice'});
      if (await notice.isVisible().catch(() => false)) await notice.getByRole('button').last().click().catch(() => undefined);
      for (const shot of HELP_SHOTS) {
        await page.goto(base + shot.path);
        await page.locator('html[data-app-hydrated]').waitFor({state: 'attached', timeout: 30_000});
        if (shot.id === 'nova') await page.waitForFunction(() => document.querySelector('.nova-frame')?.getAttribute('data-opening') === 'done', undefined, {timeout: 20_000}).catch(() => undefined);
        await page.waitForLoadState('networkidle').catch(() => undefined);
        if (shot.focus) {
          const target = shot.focus.startsWith('heading:') ? page.getByRole('heading', {name: shot.focus.slice(8), exact: true}).first() : page.locator(shot.focus).first();
          await target.waitFor({state: 'attached', timeout: 15_000}).catch(() => undefined);
          await target.evaluate(e => { const top = e.getBoundingClientRect().top + window.scrollY - 96; window.scrollTo(0, Math.max(0, top)); }).catch(() => undefined);
        }
        await page.waitForTimeout(800);
        const png = await page.screenshot({type: 'png'});
        const webp = await page.evaluate(async b64 => {
          const img = new Image(); img.src = `data:image/png;base64,${b64}`; await img.decode();
          const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          return canvas.toDataURL('image/webp', 0.72).split(',')[1];
        }, png.toString('base64'));
        const file = resolve(out, helpShotFile(shot.id, theme, size)), data = Buffer.from(webp, 'base64');
        writeFileSync(file, data); bytes += data.length;
        console.log(`${helpShotFile(shot.id, theme, size)} ${Math.round(data.length / 1024)} kB`);
      }
      await context.close();
    }
  } finally { await browser.close(); }
  console.log(`total ${Math.round(bytes / 1024)} kB in ${out}`);
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
