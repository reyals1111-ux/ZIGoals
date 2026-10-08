// Session X Part 14: the screens gallery for review/session-x-screens. Every main page at D 1440×900, T 1024×768 and
// P 390×844 (iPhone 13), on a new device (E) and in the Showcase (S); full-page JPEGs plus an index. Every /api is
// answered by an offline fixture, so nothing leaves the machine. usage: node gallery.mjs <out-dir> [base-url]
import {createRequire} from 'node:module';
import {mkdirSync, writeFileSync} from 'node:fs';
const require = createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium, devices} = require('@playwright/test');
const out = process.argv[2], base = process.argv[3] ?? 'http://127.0.0.1:3100';
const PAGES = [['today', '/app'], ['goals', '/app/goals'], ['habits', '/app/habits'], ['health', '/app/health'], ['sleep', '/app/health?view=sleep'], ['meditation', '/app/health?view=meditation'], ['wealth', '/app/wealth'], ['markets', '/app/markets'], ['portfolio', '/app/portfolio'], ['staking', '/app/staking'], ['ecosystem', '/app/ecosystem'], ['activity', '/app/activity'], ['chess', '/app/chess'], ['settings', '/app/settings'], ['help', '/app/help'], ['not-found', '/app/no-such-page']];
const VIEWS = [['D', {viewport: {width: 1440, height: 900}}], ['T', {viewport: {width: 1024, height: 768}}], ['P', {...devices['iPhone 13']}]];
mkdirSync(out, {recursive: true});
const browser = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const rows = [];
for (const [view, opts] of VIEWS) for (const data of ['E', 'S']) {
  const ctx = await browser.newContext({...opts, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'Europe/Brussels'});
  const page = await ctx.newPage();
  await page.route('**/api/**', r => r.fulfill({status: 503, json: {error: 'offline fixture'}}));
  if (data === 'S') { await page.goto(base + '/app/settings'); await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click(); await page.waitForURL('**/app'); }
  for (const [name, path] of PAGES) {
    await page.goto(base + path); await page.waitForLoadState('networkidle').catch(() => {}); await page.waitForTimeout(800);
    const file = `${view}-${data}-${name}.jpg`;
    await page.screenshot({path: `${out}/${file}`, fullPage: true, type: 'jpeg', quality: 70});
    rows.push({view, data, name, file});
  }
  await ctx.close();
}
await browser.close();
const label = {D: 'Desktop 1440 × 900', T: 'Laptop/tablet 1024 × 768', P: 'Phone 390 × 844'}, state = {E: 'new device', S: 'Showcase'};
let md = '# Session X screens\n\nFull-page captures of every main page, local production build, every `/api` answered by an offline fixture, reduced motion. Fictional Showcase data only.\n';
for (const [view] of VIEWS) for (const data of ['E', 'S']) {
  md += `\n## ${label[view]}, ${state[data]}\n\n` + rows.filter(r => r.view === view && r.data === data).map(r => `- [${r.name}](${r.file})`).join('\n') + '\n';
}
writeFileSync(`${out}/README.md`, md);
console.log(`${rows.length} screens in ${out}`);
