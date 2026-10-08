#!/usr/bin/env node
// Session X Part 4: how many market-logo requests reach the server when a person views a page with logos twice. Loads
// ten public CoinGecko logos through the app's own /api/market-logo route on /app/markets, twice (a reload, then a second
// navigation), in one browser profile with its HTTP cache on, and counts the logo requests the browser sent to the
// server versus served from its cache (Chrome DevTools Protocol, Network domain). Local only: a loopback origin of a
// production server (`next start`); the server fetches the ten images from CoinGecko's public image host.
//   node scripts/perf/logo-cache-requests.mjs http://127.0.0.1:3100
import {createRequire} from 'node:module';
const require = createRequire(new URL('../../apps/web/package.json', import.meta.url));
const {chromium} = require('@playwright/test');
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:3100').origin;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin)) throw Error('Give the loopback origin of a local production server.');
const LOGOS = ['1/large/bitcoin.png', '279/large/ethereum.png', '325/large/Tether.png', '4128/large/solana.png', '975/large/cardano.png', '5/large/dogecoin.png', '825/large/bnb-icon2_2x.png', '44/large/xrp-symbol-white-128.png', '6319/large/usdc.png', '12171/large/polkadot.png']
  .map(path => `/api/market-logo?url=${encodeURIComponent(`https://coin-images.coingecko.com/coins/images/${path}`)}`);
const browser = await chromium.launch({channel: 'chrome', headless: true});
const context = await browser.newContext();
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
const seen = new Map();
cdp.on('Network.requestWillBeSent', ({requestId, request}) => { if (request.url.includes('/api/market-logo')) seen.set(requestId, {fromCache: false, status: null, cacheControl: null}); });
cdp.on('Network.requestServedFromCache', ({requestId}) => { if (seen.has(requestId)) seen.get(requestId).fromCache = true; });
cdp.on('Network.responseReceived', ({requestId, response}) => { if (seen.has(requestId)) Object.assign(seen.get(requestId), {status: response.status, fromCache: seen.get(requestId).fromCache || response.fromDiskCache || response.fromMemoryCache, cacheControl: response.headers['cache-control'] ?? response.headers['Cache-Control'] ?? null, csp: response.headers['content-security-policy'] ?? null}); });
async function view(label, how) {
  seen.clear();
  await how();
  await page.evaluate(logos => Promise.all(logos.map(src => new Promise(resolve => { const img = document.createElement('img'); img.onload = img.onerror = () => resolve(); img.src = src; img.alt = ''; document.body.append(img); }))), LOGOS);
  await page.waitForTimeout(500);
  const rows = [...seen.values()];
  return {view: label, logoRequests: rows.length, servedFromCache: rows.filter(r => r.fromCache).length, reachedServer: rows.filter(r => !r.fromCache).length, statuses: [...new Set(rows.map(r => r.status))], cacheControl: [...new Set(rows.map(r => r.cacheControl))], csp: [...new Set(rows.map(r => (r.csp ?? '').replace(/'nonce-[^']+'/g, "'nonce-…'").slice(0, 60)))]};
}
const results = [];
results.push(await view('first view', () => page.goto(`${origin}/app/markets`)));
results.push(await view('second view (navigation)', () => page.goto(`${origin}/app/markets`)));
results.push(await view('third view (another page)', () => page.goto(`${origin}/app/portfolio`)));
await browser.close();
console.log(JSON.stringify({origin, measuredAt: new Date().toISOString(), logos: LOGOS.length, results}, null, 2));
