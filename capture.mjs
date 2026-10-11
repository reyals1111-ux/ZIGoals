// Session AA-Cloud capture tool: full-page JPEG captures of every page at 390/1024/1440, empty and Showcase.
// usage: node capture.mjs <baseUrl> <outDir> [pagesCsv] [statesCsv] [widthsCsv]
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
const require = createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium} = require('@playwright/test');
const [base, out, pagesArg, statesArg, widthsArg] = process.argv.slice(2);
const PAGES = (pagesArg || 'today:/app,goals:/app/goals,habits:/app/habits,health:/app/health,wealth:/app/wealth,markets:/app/markets,portfolio:/app/portfolio,staking:/app/staking,activity:/app/activity,settings:/app/settings,help:/app/help,ecosystem:/app/ecosystem,chess:/app/chess').split(',').map(p => p.split(':'));
const STATES = (statesArg || 'empty,showcase').split(',');
const WIDTHS = (widthsArg || '390,1024,1440').split(',').map(Number);
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({executablePath: '/opt/pw-browsers/chromium'});
const report = [];
for (const state of STATES) for (const width of WIDTHS) {
  const phone = width < 600;
  const context = await browser.newContext({viewport: {width, height: phone ? 844 : 900}, deviceScaleFactor: 1, isMobile: phone, hasTouch: phone, reducedMotion: 'reduce', timezoneId: 'Europe/Brussels', locale: 'en-GB'});
  await context.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch {} });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  if (state === 'showcase') {
    await page.goto(base + '/app/settings');
    await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
    await page.waitForURL('**/app', {timeout: 30000});
    await page.waitForTimeout(1500);
  }
  for (const [name, path] of PAGES) {
    try {
      await page.goto(base + path, {waitUntil: 'networkidle', timeout: 45000});
    } catch { await page.waitForTimeout(2000); }
    await page.waitForTimeout(1200);
    const file = `${out}/${name}-${state}-${width}.jpg`;
    await page.screenshot({path: file, fullPage: true, type: 'jpeg', quality: 55});
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    report.push({name, state, width, height, overflow, errors: errors.splice(0)});
  }
  await context.close();
}
await browser.close();
writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(report.map(r => `${r.name}-${r.state}-${r.width} h=${r.height}${r.overflow ? ' OVERFLOW' : ''}${r.errors.length ? ' ERR ' + r.errors.join('|') : ''}`).join('\n'));
