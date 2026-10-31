// Session AK Part 3 (A18): the manifest's screenshots for the richer install sheet (Chrome on Android and computers),
// taken from the Showcase — fictional example data, labelled as such in the app — on a running production build.
// Product assets, committed; not self-check captures. Run against a local server:
//   ZIGOALS_BASE=http://127.0.0.1:3101 node apps/web/art-src/pwa-screenshots.mjs
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {createRequire} from 'node:module';

const here = dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url), {chromium} = require('playwright');
const base = process.env.ZIGOALS_BASE;
if (!base || !/^http:\/\/127\.0\.0\.1:\d+$/.test(base)) throw Error('Set ZIGOALS_BASE to a local server, e.g. http://127.0.0.1:3101');
/** [file, css width, css height, path] — narrow (phones) and wide (computers). */
export const SHOTS = [['today-narrow.jpg', 390, 844, '/app'], ['habits-narrow.jpg', 390, 844, '/app/habits'], ['today-wide.jpg', 1280, 800, '/app'], ['wealth-wide.jpg', 1280, 800, '/app/wealth']];
const browser = await chromium.launch({args: ['--disable-gpu']});
for (const [file, w, h, path] of SHOTS) {
  const context = await browser.newContext({viewport: {width: w, height: h}, deviceScaleFactor: 2, reducedMotion: 'reduce', serviceWorkers: 'block'}), page = await context.newPage();
  await page.goto(`${base}/app/settings`);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  if (path !== '/app') await page.goto(`${base}${path}`);
  await page.locator('main h1').first().waitFor();
  await page.waitForTimeout(1500);
  writeFileSync(join(here, '..', 'public', 'screenshots', file), await page.screenshot({type: 'jpeg', quality: 78, animations: 'disabled'}));
  console.log(file);
  await context.close();
}
await browser.close();
