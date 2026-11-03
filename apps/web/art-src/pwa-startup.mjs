// Session AK Part 3 (A18): iOS startup images (public/startup/*.jpg), the screen an installed ZIGoals shows while it opens
// on iPhone and iPad: the app's night background with its icon in the middle, one image per device size Apple's Home Screen
// apps request (apple-touch-startup-image, with the media queries in app/layout.tsx). Rendered with the preinstalled
// Playwright Chromium from the committed icon, so nothing is downloaded. Run: node apps/web/art-src/pwa-startup.mjs
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';

const here = dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const {chromium} = require('playwright');
/** [css width, css height, pixel ratio] in portrait, from Apple's Human Interface Guidelines device list. */
export const STARTUP_DEVICES = [[440, 956, 3], [402, 874, 3], [430, 932, 3], [393, 852, 3], [390, 844, 3], [414, 896, 2], [375, 667, 2], [1024, 1366, 2], [820, 1180, 2]];
const icon = readFileSync(join(here, '..', 'public', 'icons', 'zigoals-512.png')).toString('base64');
const browser = await chromium.launch({args: ['--disable-gpu']});
for (const [w, h, dpr] of STARTUP_DEVICES) {
  const context = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: dpr}), page = await context.newPage();
  await page.setContent(`<html><body style="margin:0;height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 42%,#14234f 0,#020918 62%)"><img alt="" src="data:image/png;base64,${icon}" style="width:${Math.round(Math.min(w, h) * 0.32)}px;height:auto;border-radius:22%;box-shadow:0 18px 60px rgba(99,231,255,.18)"></body></html>`);
  // JPEG keeps each image small (a dark gradient compresses poorly as PNG); iOS accepts both.
  const out = join(here, '..', 'public', 'startup', `startup-${w * dpr}x${h * dpr}.jpg`);
  writeFileSync(out, await page.screenshot({type: 'jpeg', quality: 82, animations: 'disabled'}));
  console.log(out);
  await context.close();
}
await browser.close();
