// Who writes the Showcase's settings or Health record while Today loads? Logs each setItem on those keys with a stack.
import {createRequire} from 'node:module';
const require = createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium} = require('@playwright/test');
const [base, width = '1440', rounds = '3'] = process.argv.slice(2);
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium'});
for (let r = 0; r < Number(rounds); r++) {
  const ctx = await b.newContext({viewport: {width: Number(width), height: 900}, locale: 'en-US', timezoneId: 'UTC'});
  const p = await ctx.newPage();
  await p.clock.setSystemTime(new Date('2026-09-13T10:00:00.000Z'));
  await p.route('**/api/**', route => route.fulfill({status: 503, json: {error: 'offline fixture'}}));
  await p.addInitScript(() => {
    const log = (op, store, k, v) => (window.__writes ??= []).push({t: Math.round(performance.now()), op, store: store === window.sessionStorage ? 's' : 'l', k: String(k).split(':').slice(-3).join(':'), same: v === undefined ? undefined : store.getItem(k) === v, path: location.pathname, stack: (new Error().stack || '').split('\n').slice(3, 7).map(x => x.trim().slice(0, 90)).join(' | ')});
    const set = Storage.prototype.setItem, rem = Storage.prototype.removeItem, clr = Storage.prototype.clear;
    Storage.prototype.setItem = function (k, v) { log('set', this, k, v); return set.call(this, k, v); };
    Storage.prototype.removeItem = function (k) { log('remove', this, k); return rem.call(this, k); };
    Storage.prototype.clear = function () { log('clear', this, '*'); return clr.call(this); };
  });
  await p.goto(base + '/app/settings');
  await p.getByRole('button', {name: 'Load Showcase Demo', exact: true}).click();
  await p.waitForURL('**/app');
  await p.waitForTimeout(4000);
  const w = await p.evaluate(() => window.__writes ?? []);
  console.log(`round ${r}:`, w.filter(x => x.path === '/app').map(x => `${x.t} ${x.op} ${x.store} ${x.k} same=${x.same} :: ${x.stack}`).join('\n'));
  await ctx.close();
}
await b.close();
