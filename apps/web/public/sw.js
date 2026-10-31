// ZIGoals' one service worker (Session AK Parts 2 and 3; ADR-036 Q4, A1–A4; ADR-010 addendum). Scope "/".
// 1. Push (D1): a push carries no payload. This worker reads the device's own snapshot (IndexedDB zigoals-notify-v1),
//    composes the text here (sw-compose.js) and ALWAYS shows one notification (A2). "Done" and "Snooze 1 h" go to the
//    action queue (zigoals-notify-actions-v1); the page applies them once, with Undo. Nothing about an item ever leaves
//    the device: a snooze only adds a wake minute to this device's registration.
// 2. Offline (QA-23, A4): navigations and the app's own page data are network-first with a short timeout, the cached
//    copy used only offline; only hashed /_next/static files are cache-first; icons, brand art, fonts and the manifest
//    are network-first in this build's own cache. Never cached: /api/*, any other origin, anything but GET, anything but
//    a 200 basic response, and (security review F3) any address with a query other than _rsc (a shared text, a name
//    typed into a link, a barcode, an OAuth code), the share target and the OAuth callbacks: those come from the network
//    and are never stored. Caches carry the build version and leave when a new version takes over (the hashed files'
//    cache excepted: a hashed name never changes content). The pages cached hold no personal data.
// 3. Updates: a new version waits until the page says "Reload" (or no window is open).
// The composer (sw-compose part): kept inline because this worker's own CSP ('strict-dynamic', Trusted Types) refuses
// importScripts — a worker that loads no other script is also one less thing to trust.
// ZIGoals notifications, composed on the device (Session AK Part 2, ADR-036 A1, A2): functions on `self`, reading and
// writing nothing.
// A push carries no payload: the service worker reads this device's snapshot (zigoals-notify-v1) and turns the items due
// around now into one notification. Names appear only when the snapshot holds them (the person opted in to names and the
// device lock is off); otherwise the text counts. A push that finds nothing due still shows a calm line (A2).
(function (scope) {
  'use strict';
  var BEFORE = 35 * 60000, AFTER = 3 * 60000;
  var plural = function (n, one, many) { return n + ' ' + (n === 1 ? one : many); };
  function dueItems(snapshot, now) {
    var items = snapshot && Array.isArray(snapshot.items) ? snapshot.items : [];
    return items.filter(function (i) { return i && typeof i.at === 'number' && i.at >= now - BEFORE && i.at <= now + AFTER && typeof i.kind === 'string'; });
  }
  function summaryLine(snapshot) {
    var s = snapshot && snapshot.summary;
    if (s && typeof s.total === 'number' && s.total > 0 && typeof s.done === 'number') return 'Today: ' + s.done + ' of ' + s.total + ' done.';
    return '';
  }
  function compose(snapshot, now) {
    var due = dueItems(snapshot, now), named = !!(snapshot && snapshot.labels), lines = [], kinds = {};
    due.forEach(function (i) { (kinds[i.kind] = kinds[i.kind] || []).push(i); });
    var habits = kinds.habit || [];
    if (habits.length) {
      var names = named ? habits.map(function (h) { return h.label; }).filter(Boolean) : [];
      lines.push(names.length === habits.length ? names.slice(0, 3).join(' · ') + (names.length > 3 ? ' and ' + (names.length - 3) + ' more' : '') : plural(habits.length, 'habit due', 'habits due'));
    }
    (kinds.water || []).slice(0, 1).forEach(function (w) { lines.push(w.detail ? 'Water: ' + w.detail : 'Time for some water'); });
    var money = kinds.contribution || [];
    if (money.length) lines.push(named && money.every(function (c) { return c.label; }) ? money.slice(0, 2).map(function (c) { return c.label + (c.detail ? ' · ' + c.detail : ''); }).join(' · ') : plural(money.length, 'contribution due', 'contributions due'));
    var bills = kinds.bill || [];
    if (bills.length) lines.push(named && bills.every(function (b) { return b.label; }) ? bills.slice(0, 2).map(function (b) { return b.label + (b.detail ? ' · ' + b.detail : ''); }).join(' · ') : plural(bills.length, 'bill due tomorrow', 'bills due tomorrow'));
    if (kinds.supplement) lines.push('A reminder you set in Health');
    if (kinds.vote) lines.push(plural(kinds.vote.length, 'vote you follow ends within a day', 'votes you follow end within a day'));
    if (kinds.windDown) lines.push('Time to wind down');
    if (kinds.review) lines.push('Your weekly Life review is ready');
    var summary = summaryLine(snapshot);
    if (kinds.morning) lines.unshift(summary ? 'Good morning. ' + summary : 'Good morning. Your orbit is ready.');
    if (kinds.evening) lines.unshift(summary ? 'Evening wrap-up. ' + summary : 'Evening wrap-up: how did today go?');
    var first = due[0], actionable = habits.filter(function (h) { return h.actionable; });
    var url = kinds.morning ? '/app/checklist' : (first && appPath(first.href)) || '/app';
    if (!lines.length) return {title: 'ZIGoals', body: summary ? summary + ' Nothing is due right now.' : 'Nothing is due right now.', tag: 'zigoals-summary', actions: [], data: {url: '/app', items: []}};
    var actions = actionable.length ? [{action: 'done', title: 'Done'}, {action: 'snooze', title: 'Snooze 1 h'}] : (kinds.morning || kinds.evening || kinds.review) ? [] : [{action: 'snooze', title: 'Snooze 1 h'}];
    return {title: 'ZIGoals', body: lines.join(' · ').slice(0, 240), tag: 'zigoals-reminder', actions: actions, data: {url: url, date: snapshot && snapshot.summary ? snapshot.summary.date : null, items: due.filter(function (i) { return i.kind !== 'morning' && i.kind !== 'evening'; }).map(function (i) { return {kind: i.kind, id: i.id, at: i.at}; })}};
  }
  // A price alert crossed (the same rule as lib/price-alerts/engine.ts): the quote's integer price over its decimals,
  // compared with the alert's decimal figure, both scaled to 12 decimals.
  function scaled(text, decimals) {
    var parts = String(text).split('.'), whole = parts[0] || '0', part = (parts[1] || '').slice(0, 12);
    if (!/^\d+$/.test(whole) || !/^\d*$/.test(part)) return null;
    if (decimals === undefined) return BigInt(whole) * 1000000000000n + BigInt((part + '000000000000').slice(0, 12));
    var digits = String(text); if (!/^\d+$/.test(digits) || decimals < 0 || decimals > 30) return null;
    var value = BigInt(digits); return decimals <= 12 ? value * 10n ** BigInt(12 - decimals) : value / 10n ** BigInt(decimals - 12);
  }
  function crossedAlerts(watches, quotes) {
    var out = [];
    (Array.isArray(watches) ? watches : []).forEach(function (w) {
      var q = (Array.isArray(quotes) ? quotes : []).find(function (x) { return x && x.currency === w.currency && x.providerAssetId === w.coin; });
      if (!q || typeof q.price !== 'string' || typeof q.priceDecimals !== 'number') return;
      var price = scaled(q.price, q.priceDecimals), limit = scaled(w.price);
      if (price === null || limit === null) return;
      if ((w.direction === 'above' && price >= limit) || (w.direction === 'below' && price <= limit)) out.push(w);
    });
    return out;
  }
  // Security review I1: a notification opens only an address of this app: same origin (so never //host or /\host) and
  // under /app. Anything else is null and the caller opens /app.
  function appPath(href) {
    if (typeof href !== 'string' || !href) return null;
    try {
      var origin = scope.location && scope.location.origin, url = new URL(href, origin);
      return url.origin === origin && (url.pathname === '/app' || url.pathname.indexOf('/app/') === 0) ? url.pathname + url.search + url.hash : null;
    } catch { return null; }
  }
  scope.zigoalsCompose = compose;
  scope.zigoalsAppPath = appPath;
  scope.zigoalsCrossedAlerts = crossedAlerts;
})(typeof self !== 'undefined' ? self : this);

const VERSION = new URL(self.location.href).searchParams.get('v') || 'legacy';
const OFFLINE = VERSION !== 'legacy' && /^[0-9a-z-]{4,40}$/.test(VERSION);
// STATIC holds only hashed /_next/static files (content never changes under a name); ASSETS holds the unhashed public
// files for this build and leaves with it.
const PAGES = 'zigoals-pages-' + VERSION, STATIC = 'zigoals-static-v1', ASSETS = 'zigoals-assets-' + VERSION, KEEP = [PAGES, STATIC, ASSETS];
const MAX_PAGES = 80, MAX_STATIC = 400, NETWORK_MS = 3500;
const NOTIFY_DB = 'zigoals-notify-v1', ACTIONS_DB = 'zigoals-notify-actions-v1';
// The notification's art (Session AK Part 12, Studio-4 preparation): ONE slot that every notification below reads. Studio-4's
// push images replace these two paths (scripts/zigi/import-studio.mjs PUSH_ART; lib/zigi-studio4/push-art.test.ts keeps
// them equal); today the app icon and the monochrome badge.
const PUSH_ART = {icon: '/icons/zigoals-192.png', badge: '/icons/zigoals-badge-96.png'};
const ICON = PUSH_ART.icon, BADGE = PUSH_ART.badge;

self.addEventListener('install', event => {
  // The first worker takes over at once; a later one waits for the page's "Reload" (or for every window to close).
  event.waitUntil((async () => {
    if (OFFLINE) { try { const cache = await caches.open(PAGES); await cache.add(new Request('/app', {credentials: 'same-origin'})); } catch { /* offline install: pages are cached as they are visited */ } }
    if (!self.registration.active) await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('zigoals-') && !KEEP.includes(key)) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  const type = event.data && event.data.type;
  if (type === 'zigoals:sw-reload') event.waitUntil(self.skipWaiting());
  if (type === 'zigoals:sw-forget') event.waitUntil((async () => { for (const key of await caches.keys()) if (key.startsWith('zigoals-')) await caches.delete(key); })());
});

// ---- Offline ---------------------------------------------------------------------------------------------------
const isHashed = url => url.pathname.startsWith('/_next/static/');
const isAsset = url => url.pathname.startsWith('/brand/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/fonts/') || url.pathname === '/theme-boot.js' || url.pathname === '/manifest.webmanifest';
const isPage = (request, url) => request.mode === 'navigate' || (request.headers.get('RSC') === '1' && url.pathname.startsWith('/app'));
// Never stored, with or without a query: the share target and the OAuth callbacks (Spotify's path; Lichess's and the
// Health links' carry a query, which is never stored either).
const NEVER_STORED = ['/app/share', '/app/music/spotify'];
const neverStored = url => NEVER_STORED.some(p => url.pathname === p || url.pathname.startsWith(p + '/'));
/** A page or page-data address that may be kept: no query but the router's own _rsc, and not one of the above. */
function storable(url) {
  if (neverStored(url)) return false;
  for (const key of url.searchParams.keys()) if (key !== '_rsc') return false;
  return true;
}
const race = request => Promise.race([fetch(request), new Promise((_, reject) => setTimeout(() => reject(Error('slow')), NETWORK_MS))]);
async function trim(name, max) { const cache = await caches.open(name), keys = await cache.keys(); for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]); }
function cacheable(response) { return response && response.status === 200 && response.type === 'basic' && !response.headers.get('content-disposition'); }
async function networkFirst(request, url) {
  const cache = await caches.open(PAGES), keep = storable(url);
  try {
    const response = await race(request);
    if (keep && cacheable(response)) { await cache.put(request, response.clone()); trim(PAGES, MAX_PAGES); }
    return response;
  } catch {
    // Only this page's own copy: another page's would open at the wrong address. An address with a query opens its page's
    // plain copy (the address, query and all, stays in the browser). A page never visited gets the plain line below.
    const cached = keep ? await cache.match(request, {ignoreVary: false}) : request.mode === 'navigate' && !neverStored(url) ? await cache.match(new Request(url.origin + url.pathname), {ignoreVary: false}) : null;
    if (cached) return cached;
    return new Response('<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Offline · ZIGoals</title><body style="font:16px system-ui;background:#020918;color:#eef;padding:24px"><h1>You are offline</h1><p>This page was not saved on this device yet. Open ZIGoals once while online and it will work offline next time.</p><p><a style="color:#9cf" href="/app">Open Today</a></p>', {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});
  }
}
async function cacheFirst(request) {
  const cache = await caches.open(STATIC), cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (cacheable(response)) { await cache.put(request, response.clone()); trim(STATIC, MAX_STATIC); }
  return response;
}
/** Security review F7: an unhashed file (an icon, a font, the manifest) can change under its name, so the network comes first. */
async function assetNetworkFirst(request) {
  const cache = await caches.open(ASSETS);
  try {
    const response = await race(request);
    if (cacheable(response)) { await cache.put(request, response.clone()); trim(ASSETS, MAX_STATIC); }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw Error('offline');
  }
}
self.addEventListener('fetch', event => {
  if (!OFFLINE) return;
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (isHashed(url)) { event.respondWith(cacheFirst(request)); return; }
  if (isAsset(url)) { event.respondWith(assetNetworkFirst(request)); return; }
  if (isPage(request, url) && url.pathname.startsWith('/app')) event.respondWith(networkFirst(request, url));
});

// ---- IndexedDB (read the snapshot; queue actions) ----------------------------------------------------------------
// Security review F8: this worker never creates a database. The page makes both (lib/notify/db.ts, when notifications go
// on); after "Turn off" or Erase everything they are gone, and a late push or tap must not bring them back. Opened with
// no version, a missing database asks for an upgrade, which is aborted (so nothing is created) and read as null; a
// database without the store is null too. Null means: skip the work.
function openDb(name, store) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    let missing = false;
    request.onupgradeneeded = () => { missing = true; try { request.transaction.abort(); } catch { /* the open fails below */ } };
    request.onsuccess = () => {
      const db = request.result;
      if (missing || !db.objectStoreNames.contains(store)) { db.close(); resolve(null); return; }
      resolve(db);
    };
    request.onerror = () => { if (missing) resolve(null); else reject(request.error); };
    request.onblocked = () => reject(Error('blocked'));
  });
}
async function dbRun(name, store, mode, work) {
  const db = await openDb(name, store);
  if (!db) return undefined;
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode), request = work(tx.objectStore(store));
      tx.oncomplete = () => resolve(request ? request.result : undefined);
      tx.onerror = tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}
const kvGet = key => dbRun(NOTIFY_DB, 'kv', 'readonly', s => s.get(key));
const kvPut = (key, value) => dbRun(NOTIFY_DB, 'kv', 'readwrite', s => { s.put(value, key); });
const queue = action => dbRun(ACTIONS_DB, 'actions', 'readwrite', s => { s.put(action); });
const withTimeout = (promise, ms, fallback) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(fallback), ms))]);
async function tell(message) { for (const client of await self.clients.matchAll({type: 'window', includeUncontrolled: true})) client.postMessage(message); }

// ---- Push ---------------------------------------------------------------------------------------------------------
async function priceLines(snapshot) {
  const watches = snapshot && Array.isArray(snapshot.prices) ? snapshot.prices : [];
  if (!watches.length) return [];
  const requests = watches.map(w => w.request).filter(Boolean).slice(0, 20);
  const response = await withTimeout(fetch('/api/market-quotes', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({requests})}), 6000, null);
  if (!response || !response.ok) return [];
  const body = await response.json().catch(() => null);
  const crossed = self.zigoalsCrossedAlerts(watches, body && body.quotes);
  for (const w of crossed) await queue({actionId: 'price:' + w.alertId + ':' + new Date().toISOString().slice(0, 10), type: 'price-fired', at: Date.now(), alertId: w.alertId}).catch(() => {});
  return crossed.map(w => w.label ? w.label : 'A price alert of yours was reached');
}
async function showFor(now) {
  let snapshot = null;
  try { snapshot = await withTimeout(kvGet('snapshot'), 2000, null); } catch { snapshot = null; }
  const note = self.zigoalsCompose(snapshot, now), kinds = (snapshot && Array.isArray(snapshot.items) ? snapshot.items : []).filter(i => Math.abs(i.at - now) < 35 * 60000).map(i => i.kind);
  if (kinds.includes('morning') || kinds.includes('evening')) {
    try { const lines = await priceLines(snapshot); if (lines.length) note.body = (note.body + ' · ' + lines.slice(0, 2).join(' · ')).slice(0, 240); } catch { /* prices are a bonus line */ }
  }
  await self.registration.showNotification(note.title, {body: note.body, tag: note.tag, renotify: note.tag === 'zigoals-reminder', icon: ICON, badge: BADGE, actions: note.actions, data: note.data});
  await tell({type: 'zigoals:push-reminder'});
}
self.addEventListener('push', event => {
  // Every push shows exactly one notification (A2): the composed one, or this calm line if anything above failed.
  event.waitUntil(showFor(Date.now()).catch(() => self.registration.showNotification('ZIGoals', {body: 'Open ZIGoals to see what is due today.', tag: 'zigoals-summary', icon: ICON, badge: BADGE, data: {url: '/app', items: []}})));
});
async function snooze(data, now) {
  const until = now + 3_600_000, minute = Math.floor(until / 60000);
  const [snapshot, device, registration] = await Promise.all([kvGet('snapshot'), kvGet('device'), kvGet('registration')]);
  // The snoozed items come back in an hour: the snapshot holds them at the new time, and the wake list gains that minute.
  if (snapshot && Array.isArray(snapshot.items)) {
    const ids = new Set((data.items || []).map(i => i.kind + ':' + i.id));
    const back = snapshot.items.filter(i => ids.has(i.kind + ':' + i.id) && Math.abs(i.at - now) < 40 * 60000).map(i => ({...i, at: until}));
    await kvPut('snapshot', {...snapshot, items: [...snapshot.items, ...back].sort((a, b) => a.at - b.at)});
  }
  if (device && registration && registration.body) {
    const body = {...registration.body, once: [...new Set([...(registration.body.once || []).filter(m => m * 60000 > now), minute])].sort((a, b) => a - b).slice(-48)};
    const response = await withTimeout(fetch('/api/push-device', {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({...body, id: device.id, secret: device.secret})}), 8000, null);
    if (response && response.ok) await kvPut('registration', {...registration, body});
  }
}
self.addEventListener('notificationclick', event => {
  const note = event.notification, data = note.data || {}, now = Date.now();
  note.close();
  if (event.action === 'done' || event.action === 'snooze') {
    const action = {actionId: (self.crypto && self.crypto.randomUUID ? self.crypto.randomUUID() : String(now) + Math.random()), type: event.action, at: now, date: data.date || null, items: (data.items || []).filter(i => event.action === 'snooze' || i.kind === 'habit')};
    event.waitUntil((async () => {
      await queue(action);
      if (event.action === 'snooze') await snooze(data, now).catch(() => {});
      if (event.action === 'done') {
        // The done items leave the snapshot at once, so the next push cannot ask for them again.
        const snapshot = await kvGet('snapshot').catch(() => null), ids = new Set(action.items.map(i => i.kind + ':' + i.id));
        if (snapshot && Array.isArray(snapshot.items)) await kvPut('snapshot', {...snapshot, items: snapshot.items.filter(i => !(ids.has(i.kind + ':' + i.id) && i.at <= now + 3_600_000))});
      }
      await tell({type: 'zigoals:notify-action', actionId: action.actionId});
    })());
    return;
  }
  const url = self.zigoalsAppPath(data.url) || '/app';
  event.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(clients => {
    const open = clients.find(client => typeof client.focus === 'function');
    if (open) { open.postMessage({type: 'zigoals:push-open', url}); return open.focus(); }
    return self.clients.openWindow(url + (url.includes('?') ? '&' : '?') + 'zigi=hello');
  }));
});
