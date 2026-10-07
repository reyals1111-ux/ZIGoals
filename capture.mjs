// Session W Part 26: the review gallery. Production build on a loopback origin, the Showcase (fictional records),
// reduced motion, every /api answered 503 (no network), viewport screenshots at 1440, 1024 and 390 px.
// usage (from apps/web of the build being shown): node <this file> http://127.0.0.1:3104 <out dir>
import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
const [origin, out] = process.argv.slice(2);
mkdirSync(out, {recursive: true});
const SIZES = [['desktop-1440', 1440, 900], ['tablet-1024', 1024, 768], ['phone-390', 390, 844]];
const VIEWS = [
  ['today', '/app', null],
  ['today-links', '/app', null, 'section.today-links'],
  ['health-sleep', '/app/health?view=sleep', null],
  ['health-meditation', '/app/health?view=meditation', null],
  ['health-devices', '/app/health?view=devices', null],
  ['habits', '/app/habits', null],
  ['habit-ideas', '/app/habits', 'habit-ideas', '#habit-ideas-title'],
  ['goals', '/app/goals', null],
  ['goal-milestones', '/app/goals/tracked/9205', null, '#milestones'],
  ['wealth-accounts', '/app/wealth#accounts-title', null],
  ['chess', '/app/chess', null],
  ['portfolio', '/app/portfolio', null],
  ['portfolio-holdings', '/app/portfolio', null, '.portfolio-holdings-section'],
  ['markets', '/app/markets', null],
  ['settings', '/app/settings', null],
  ['settings-pages', '/app/settings#your-pages', null],
  ['settings-music', '/app/settings#music', null],
  ['help-whole-life', '/app/help#whole-life', null],
  ['music-panel', '/app', 'music'],
];
const browser = await chromium.launch({channel: 'chrome'});
const rows = [];
for (const [size, width, height] of SIZES) {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion: 'reduce', ...(width < 500 ? {isMobile: true, hasTouch: true} : {})});
  const page = await context.newPage();
  await page.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await page.addInitScript(() => { try { localStorage.setItem('zigoals:onboarding:v1', JSON.stringify({version: 1, seen: true})); } catch { /* storage denied */ } });
  await page.goto(`${origin}/app/settings`);
  await page.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await page.waitForURL('**/app');
  for (const [name, path, action, selector] of VIEWS) {
    await page.goto(`${origin}${path}`);
    await page.getByRole('heading', {level: 1}).first().waitFor({timeout: 15000}).catch(() => undefined);
    await page.waitForTimeout(900);
    // A section further down: wait for it, then bring it to the top (the browser's own jump can run before it renders).
    if (action === 'habit-ideas') await page.getByRole('button', {name: 'Habit ideas', exact: true}).click();
    const target = selector ?? (path.includes('#') ? `#${path.split('#')[1]}` : null);
    if (target) { const el = page.locator(target).first(); await el.waitFor({state: 'attached', timeout: 15000}); await el.evaluate(node => { if (node instanceof HTMLDetailsElement) node.open = true; node.scrollIntoView({block: 'start'}); }); await page.waitForTimeout(400); }
    if (action === 'music') { await page.getByRole('button', {name: 'Open the music player'}).click(); await page.getByRole('dialog', {name: 'Your soundtrack'}).waitFor(); await page.waitForTimeout(400); }
    const file = `${size}-${name}.jpg`;
    await page.screenshot({path: `${out}/${file}`, type: 'jpeg', quality: 72});
    if (action === 'music') { await page.keyboard.press('Escape'); await page.getByRole('dialog', {name: 'Your soundtrack'}).waitFor({state: 'hidden'}); }
    rows.push([size, name, path, file]);
    console.log(file);
  }
  await context.close();
}
await browser.close();
console.log(JSON.stringify(rows));
