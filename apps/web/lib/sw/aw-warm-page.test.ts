import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {describe, expect, it} from 'vitest';

/**
 * Session AW Part 6 ([TIER 3] (PWA), owner amendment 7; aw-offline.spec): public/sw.js warmPage. A page opened online asks
 * the worker to keep what its loaded scripts open on a tap: their later parts and those parts' own, the latest-loaded
 * scripts first, within WARM_BYTES, once per script and address; never under Data Saver; never a page that is never stored.
 */
const ORIGIN = 'https://app.test';
type Store = Map<string, {body: string; headers: Record<string, string>}>;
const keyOf = (r: string | Request) => new URL(typeof r === 'string' ? r : r.url, ORIGIN).toString();
function fakeCaches() {
  const stores = new Map<string, Store>();
  const open = async (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const s = stores.get(name)!;
    return {
      match: async (r: string | Request) => { const x = s.get(keyOf(r)); return x ? new Response(x.body, {headers: x.headers}) : undefined; },
      put: async (r: string | Request, res: Response) => { s.set(keyOf(r), {body: await res.text(), headers: Object.fromEntries(res.headers)}); },
      keys: async () => [...s.keys()].map(k => new Request(k)),
      delete: async (r: string | Request) => s.delete(keyOf(r)),
    };
  };
  return {stores, api: {open, keys: async () => [...stores.keys()], delete: async (n: string) => stores.delete(n)}};
}
/** A chunk graph: each file's text names its later parts the way this build's chunks do ("static/chunks/x.js"). */
const chunk = (...later: string[]) => `(()=>{${later.map(l => `e.l("static/chunks/${l}.js")`).join(';')}})();` + 'x'.repeat(100);
function sandbox({files, saveData = false, bytes}: {files: Record<string, string>; saveData?: boolean; bytes?: number}) {
  const handlers: Record<string, (e: unknown) => void> = {};
  const fetched: string[] = [];
  const self = {
    location: {href: `${ORIGIN}/sw.js?v=abc123`, origin: ORIGIN},
    addEventListener: (type: string, handler: (e: unknown) => void) => { handlers[type] = handler; },
    registration: {installing: null, waiting: null, active: null},
    navigator: {connection: {saveData, effectiveType: '4g'}},
    clients: {claim: async () => {}, matchAll: async () => []},
  };
  const {stores, api} = fakeCaches();
  const fetchImpl = async (r: string | Request) => {
    const path = new URL(keyOf(r)).pathname;
    fetched.push(path);
    const body = files[path];
    if (body === undefined) return new Response('', {status: 404});
    const response = new Response(body, {status: 200, headers: {'Content-Type': 'text/javascript'}});
    Object.defineProperty(response, 'type', {value: 'basic'});
    return response;
  };
  const context = vm.createContext({self, caches: api, fetch: fetchImpl, Request, Response, URL, TextDecoder, Promise, setTimeout, clearTimeout, Math, JSON, Number, String, Array, Set, Map, Object, Error, Boolean, encodeURIComponent});
  let source = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');
  if (bytes !== undefined) source = source.replace(/const WARM_BYTES = [\d_]+/, `const WARM_BYTES = ${bytes}`);
  vm.runInContext(source, context);
  const ask = async (data: unknown) => { const waits: Promise<unknown>[] = []; handlers.message!({data, waitUntil: (p: Promise<unknown>) => waits.push(p)}); await Promise.all(waits); };
  const lazy = () => [...(stores.get('zigoals-lazy-abc123') ?? new Map()).keys()].map(k => { const u = new URL(k); return u.pathname + u.search; });
  return {ask, lazy, fetched};
}
const P = (n: string) => `/_next/static/chunks/${n}.js`;
const GRAPH = {
  [P('shell')]: chunk('gate', 'wallet'),
  [P('gate')]: chunk('sheet'),
  [P('sheet')]: chunk(),
  [P('wallet')]: chunk(),
  [P('journal')]: chunk('daypages'),
  [P('daypages')]: chunk('photos'),
  [P('photos')]: chunk(),
};

describe('warmPage: what a page opens on a tap is kept once it was opened online', () => {
  it('keeps the later parts of the loaded scripts and their own (the timers sheet inside the gate), then marks the address', async () => {
    const sw = sandbox({files: GRAPH});
    await sw.ask({type: 'zigoals:sw-warm', path: '/app/journal', scripts: [P('shell'), P('gate'), P('journal'), 'https://evil.test/x.js', '/elsewhere.js']});
    const kept = sw.lazy();
    for (const part of ['wallet', 'sheet', 'daypages', 'photos']) expect(kept, part).toContain(P(part));
    // Loaded scripts are the page's own files: read, never stored again here; nothing outside the hashed chunks is fetched.
    expect(kept).not.toContain(P('shell'));
    expect(sw.fetched.every(f => f.startsWith('/_next/static/chunks/'))).toBe(true);
    expect(kept).toContain('/__zigoals-warm-done?page=%2Fapp%2Fjournal');
    // The latest-loaded script's parts first (the page's own before the shell's).
    const order = sw.fetched.filter(f => [P('daypages'), P('sheet'), P('wallet')].includes(f));
    expect(order[0]).toBe(P('daypages'));
  });
  it('once per script and address: asked again with nothing new fetches nothing; a newly loaded script is read', async () => {
    const sw = sandbox({files: GRAPH});
    await sw.ask({type: 'zigoals:sw-warm', path: '/app/journal', scripts: [P('journal')]});
    const first = sw.fetched.length;
    await sw.ask({type: 'zigoals:sw-warm', path: '/app/journal', scripts: [P('journal')]});
    expect(sw.fetched.length).toBe(first);
    await sw.ask({type: 'zigoals:sw-warm', path: '/app/journal', scripts: [P('journal'), P('gate')]});
    expect(sw.lazy()).toContain(P('sheet'));
    // Another address (a view chosen in place) is its own ask.
    await sw.ask({type: 'zigoals:sw-warm', path: '/app/health?view=sleep', scripts: [P('shell')]});
    expect(sw.lazy()).toContain('/__zigoals-warm-done?page=%2Fapp%2Fhealth%3Fview%3Dsleep');
  });
  it('stays within WARM_BYTES for an ask', async () => {
    const sw = sandbox({files: GRAPH, bytes: 100});
    await sw.ask({type: 'zigoals:sw-warm', path: '/app/journal', scripts: [P('journal')]});
    expect(sw.lazy().filter(k => k.startsWith('/_next/'))).toEqual([P('daypages')]);
  });
  it('never under Data Saver, never for a page that is never stored, never for an address outside /app', async () => {
    const saver = sandbox({files: GRAPH, saveData: true});
    await saver.ask({type: 'zigoals:sw-warm', path: '/app/journal', scripts: [P('journal')]});
    expect(saver.lazy()).toEqual([]);
    const sw = sandbox({files: GRAPH});
    for (const path of ['/app/share', '/app/music/spotify', '/landing', 'https://evil.test/app/x']) await sw.ask({type: 'zigoals:sw-warm', path, scripts: [P('journal')]});
    expect(sw.lazy()).toEqual([]);
  });
});
