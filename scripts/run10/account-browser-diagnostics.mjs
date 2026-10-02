// Test-only diagnostics for account-browser.test.mjs (Session K, Part 1). When the test fails it prints, for every
// page: what the encrypted sync panel shows now, a timeline of what it showed (status and alert lines and how many of
// its buttons were disabled), the sync journal's shape (revisions, flags, section names and lengths; never record
// contents), localStorage key names with value lengths, recent console errors; plus the account requests still in
// flight, a timeline of the account requests and vault operations, and how long each named step took. Identifiers
// are cut by redact().
import {redact} from '../run11/sync-diagnostics.mjs';

const PANEL_TIMELINE = () => {
 // Runs in every page before the app: one entry each time the sync panel's visible state changes.
 const w = window;
 w.__syncTimeline = [];
 let last = '';
 const record = () => {
  const region = document.querySelector('[aria-label="Encrypted account sync"]');
  const lines = selector => region ? [...region.querySelectorAll(selector)].map(e => (e.textContent ?? '').trim().slice(0, 160)).join(' | ') : '';
  const buttons = region ? [...region.querySelectorAll('button')] : [];
  const entry = region ? `status: ${lines('[role="status"]')} · alert: ${lines('[role="alert"]') || '-'} · disabled buttons: ${buttons.filter(b => b.disabled).length}/${buttons.length}` : 'no sync panel';
  if (entry === last) return;
  last = entry;
  w.__syncTimeline.push({ t: Math.round(performance.timeOrigin + performance.now()), path: location.pathname, entry });
  if (w.__syncTimeline.length > 120) w.__syncTimeline.shift();
 };
 new MutationObserver(record).observe(document, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled'] });
};

async function pageState(page, account) {
 return page.evaluate(async account => {
  const region = document.querySelector('[aria-label="Encrypted account sync"]');
  const texts = selector => region ? [...region.querySelectorAll(selector)].map(e => (e.textContent ?? '').trim().slice(0, 200)) : [];
  const syncNow = [...document.querySelectorAll('button')].find(b => b.textContent === 'Sync now');
  const journal = await (async () => {
   try {
    const names = (await indexedDB.databases?.()) ?? [];
    if (!names.some(d => d.name === 'zigoals-account-sync-v1')) return 'absent';
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('zigoals-account-sync-v1'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    try {
     if (!db.objectStoreNames.contains('state')) return 'no state store';
     const value = await new Promise((resolve, reject) => { const r = db.transaction('state', 'readonly').objectStore('state').get(account); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
     if (!value) return 'no journal for this account';
     const lengths = record => record && typeof record === 'object' ? Object.fromEntries(Object.entries(record).map(([k, v]) => [k, typeof v === 'string' ? v.length : typeof v])) : record;
     const pending = value.pending ? { keys: Object.keys(value.pending), protocol: value.pending.protocol, base: value.pending.base, changes: Array.isArray(value.pending.changes) ? value.pending.changes.length : typeof value.pending.changes } : null;
     return { keys: Object.keys(value), version: value.version, epoch: value.epoch, revision: value.revision, headRevision: value.headRevision, heldDomains: value.heldDomains, domainGenerations: value.domainGenerations, baseLengths: lengths(value.base), pending, pendingPolicy: value.pendingPolicy };
    } finally { db.close(); }
   } catch (error) { return `unreadable: ${error?.name ?? 'Error'}`; }
  })();
  const storage = [];
  try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); storage.push(`${key} (${(localStorage.getItem(key) ?? '').length})`); } } catch { storage.push('unreadable'); }
  return {
   path: location.pathname, online: navigator.onLine, visibility: document.visibilityState, focused: document.hasFocus(),
   completions: window.__zigoalsSyncCompletions ?? null, panel: !!region, status: texts('[role="status"]'), alerts: texts('[role="alert"]'),
   syncNow: syncNow ? (syncNow.disabled ? 'disabled' : 'enabled') : 'absent',
   disabledInPanel: region ? [...region.querySelectorAll('button')].filter(b => b.disabled).map(b => (b.textContent ?? '').trim().slice(0, 50)) : [],
   timeline: (window.__syncTimeline ?? []).slice(-40), storage, journal,
  };
 }, account);
}

const within = (promise, ms, label) => Promise.race([promise, new Promise(resolve => setTimeout(() => resolve(`${label}: no answer within ${ms} ms`), ms))]);

export function createDiagnostics(account) {
 const started = Date.now(), at = () => Date.now() - started;
 const steps = [], pages = [], requests = [], operations = [], inFlight = new Map();
 let current = null, request = 0;
 const rel = t => `+${t - started}ms`;
 return {
  /** Names the stretch of the test that starts now; on failure every stretch's duration and the last name are printed. */
  step(name) { const now = at(); if (current) current.ms = now - current.at; current = { name, at: now, ms: null }; steps.push(current); },
  /** Installs the panel timeline in every page this context opens. */
  async watchContext(context) { await context.addInitScript(PANEL_TIMELINE); },
  /** Keeps recent console errors and page errors of a page, and the page itself for the final snapshot. */
  watchPage(page, label) {
   const entry = { page, label, errors: [] }, keep = text => { entry.errors.push(`+${at()}ms ${redact(text).slice(0, 220)}`); if (entry.errors.length > 25) entry.errors.shift(); };
   page.on('console', message => { if (message.type() === 'error' || message.type() === 'warning') keep(`${message.type()}: ${message.text()}`); });
   page.on('pageerror', error => keep(`pageerror: ${error?.message ?? error}`));
   pages.push(entry);
  },
  /** An account request entering the harness's route; returns the function that records its answer. */
  request(label, method, url, postData) {
   const id = ++request, begun = at();
   let action = '-';
   try { const value = JSON.parse(postData ?? 'null')?.action; if (typeof value === 'string' && /^[a-z_-]{1,32}$/i.test(value)) action = value; } catch { /* not JSON */ }
   const path = (() => { try { const u = new URL(url); return redact(u.pathname + (u.searchParams.get('action') ? `?action=${u.searchParams.get('action')}` : '')); } catch { return '?'; } })();
   const what = `${label} ${method} ${path} action=${action}`;
   inFlight.set(id, { what, begun });
   return status => { inFlight.delete(id); requests.push(`+${begun}ms ${what} -> ${status} (${at() - begun} ms)`); if (requests.length > 80) requests.shift(); };
  },
  /** A vault operation the harness forwarded to the persistent Worker (identifier cut). */
  operation(label, operation) { operations.push(`+${at()}ms ${label} ${redact(operation ?? '-')}`); if (operations.length > 60) operations.shift(); },
  /** Prints everything; never throws and never waits more than a few seconds per page. */
  async print(order, error) {
   const out = [];
   const line = text => out.push(text);
   if (current && current.ms === null) current.ms = at() - current.at;
   line(`[account-browser ${order}] FAILED in step "${current?.name ?? 'before the first step'}" after ${at()} ms: ${redact(error?.message ?? error).split('\n')[0].slice(0, 240)}`);
   line('steps (start, duration):');
   for (const s of steps) line(`  +${s.at}ms ${s.ms ?? '?'} ms  ${s.name}`);
   line(`account requests still in flight: ${inFlight.size ? '' : 'none'}`);
   for (const { what, begun } of inFlight.values()) line(`  ${what} (started +${begun}ms, open ${at() - begun} ms)`);
   line(`last ${requests.length} account requests:`);
   for (const r of requests) line(`  ${r}`);
   line(`vault operations forwarded to the Worker (${operations.length}):`);
   for (const o of operations) line(`  ${o}`);
   for (const { page, label, errors } of pages) {
    if (page.isClosed()) { line(`page ${label}: closed`); continue; }
    let state;
    try { state = await within(pageState(page, account), 5000, `page ${label}`); } catch (e) { state = `page ${label}: snapshot failed: ${e?.message ?? e}`; }
    if (typeof state === 'string') { line(redact(state)); continue; }
    const { timeline, ...now } = state;
    line(`page ${label}: ${redact(JSON.stringify(now))}`);
    line(`page ${label} sync panel timeline (last ${timeline.length}):`);
    for (const t of timeline) line(`  ${rel(t.t)} ${redact(t.path)} ${redact(t.entry)}`);
    line(`page ${label} console errors (${errors.length}):`);
    for (const e of errors) line(`  ${e}`);
   }
   console.log(out.join('\n'));
  },
 };
}
