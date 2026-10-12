// The seeded Local Demo of today-screens at 390×844: screens and the height of Today's parts. Usage: node seeded-heights.mjs <base> [drop-key...]
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require = createRequire('/home/user/ZIGoals/apps/web/package.json');
const {chromium} = require('@playwright/test');
const [base, ...drop] = process.argv.slice(2);
const values = JSON.parse(readFileSync(new URL('../seeded.json', import.meta.url)));
for (const k of drop) delete values[k];
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium'});
const ctx = await b.newContext({viewport: {width: 390, height: 844}, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC'});
const p = await ctx.newPage();
await p.route('**/api/**', r => r.fulfill({status: 503, json: {error: 'x'}}));
await p.goto(base + '/app/settings');
await p.evaluate(v => { sessionStorage.clear(); localStorage.clear(); for (const [k, x] of Object.entries(v)) localStorage.setItem(k, x); }, values);
await p.goto(base + '/app'); await p.waitForTimeout(1500);
console.log(JSON.stringify(await p.evaluate(() => ({screens: (document.documentElement.scrollHeight / 844).toFixed(3), parts: [...document.querySelectorAll('.dashboard-widget-area, .today-device-cards, .for-you-slot, .today-focus, .today-hero, .phone-fold, section.for-you')].map(e => `${String(e.className).split(' ')[0]}${e.id ? '#' + e.id : ''}:${Math.round(e.getBoundingClientRect().height)}`)}))));
await b.close();
