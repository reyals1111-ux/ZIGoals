import {afterEach, describe, expect, it, vi} from 'vitest';
import {UI_PREFS_KEY} from '../ab-design-keys';
import {applyTheme, readTheme, showTheme, themeMotionAllowed, themeOf, writeTheme} from './theme';
import {THEME_SHEETS} from './theme-sheets';
import {themeModeOf, uiPrefsSchema} from './schema';

const memory = (initial: Record<string, string> = {}) => { const m = new Map(Object.entries(initial)); return {m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }}; };

describe('Session AD Part 3: the theme field (ADR-026 F4)', () => {
  it('reads nebula by default, for a missing, unreadable or unknown value, and for the old themeMode alone', () => {
    expect(readTheme(memory())).toBe('nebula');
    expect(readTheme(memory({[UI_PREFS_KEY]: '{not json'}))).toBe('nebula');
    expect(readTheme(memory({[UI_PREFS_KEY]: JSON.stringify({version: 1, theme: 'aurora'})}))).toBe('nebula');
    // A device that pressed the old Dark button stored themeMode "dark": that meant today's look, so it stays Nebula.
    expect(readTheme(memory({[UI_PREFS_KEY]: JSON.stringify({version: 1, themeMode: 'dark'})}))).toBe('nebula');
    expect(themeOf({theme: 'light'})).toBe('light');
    expect(themeOf({theme: 'dark'})).toBe('dark');
  });
  it('writes only its own field: every other field, a later build’s too, is kept; Nebula removes the field', () => {
    const stored = {version: 1, heroCollapsed: true, themeMode: 'dark', baseCurrency: 'EUR', dismissed: {alphaNotice: true}, later: {x: 1}};
    const s = memory({[UI_PREFS_KEY]: JSON.stringify(stored)});
    writeTheme('light', s);
    expect(JSON.parse(s.m.get(UI_PREFS_KEY)!)).toEqual({...stored, theme: 'light'});
    expect(readTheme(s)).toBe('light');
    writeTheme('nebula', s);
    expect(JSON.parse(s.m.get(UI_PREFS_KEY)!)).toEqual(stored);
  });
  it('an older build reads the record with the new field as before (loose schema, themeMode unchanged)', () => {
    const parsed = uiPrefsSchema.parse({version: 1, themeMode: 'dark', theme: 'light'});
    expect(themeModeOf(parsed)).toBe('dark');
    expect(parsed.theme).toBe('light');
  });
});

/** A small stand-in for the page: <html> with its dataset, <head> with the theme link, and the window's motion settings. */
type FakeLink = {id: string; rel: string; isConnected: boolean; href: string; getAttribute(k: string): string | null; addEventListener(k: string, f: () => void): void; removeEventListener(k: string, f: () => void): void; remove(): void; fire(k: string): void};
function fakeDoc({motion = 'on' as string | null, reduced = false, appMotion = undefined as string | undefined, storageThrows = false, transitions = true} = {}) {
  const head: FakeLink[] = [];
  const makeLink = (): FakeLink => {
    const attrs = new Map<string, string>(), listeners = new Map<string, Set<() => void>>();
    const link: FakeLink = {id: '', rel: '', isConnected: false,
      get href() { return attrs.get('href') ?? ''; }, set href(v: string) { attrs.set('href', v); },
      getAttribute: k => attrs.get(k) ?? null,
      addEventListener: (k, f) => { if (!listeners.has(k)) listeners.set(k, new Set()); listeners.get(k)!.add(f); },
      removeEventListener: (k, f) => { listeners.get(k)?.delete(f); },
      remove() { const i = head.indexOf(link); if (i >= 0) head.splice(i, 1); link.isConnected = false; },
      fire: k => { for (const f of [...listeners.get(k) ?? []]) f(); }};
    return link;
  };
  const dataset: Record<string, string | undefined> = appMotion ? {appMotion} : {};
  const view = {
    get localStorage() { if (storageThrows) throw Error('denied'); return {getItem: (k: string) => k === 'zigoals:motion:v1' ? motion : null}; },
    matchMedia: (q: string) => ({matches: reduced && q.includes('reduce')}),
  };
  const calls: (() => Promise<void>)[] = [];
  // Like a browser that skips the transition (another switch, a hidden tab): its promises reject.
  const start = vi.fn((cb: () => Promise<void>) => { calls.push(cb); const skipped = () => Promise.reject(new Error('Transition was skipped')); return {ready: skipped(), finished: skipped(), updateCallbackDone: skipped()}; });
  const doc = {
    documentElement: {dataset}, defaultView: view,
    head: {appendChild: (l: FakeLink) => { head.push(l); l.isConnected = true; return l; }},
    getElementById: (id: string) => head.find(l => l.id === id) ?? null,
    createElement: () => makeLink(),
    ...(transitions ? {startViewTransition: start} : {}),
  };
  return {doc: doc as unknown as Document, dataset, head, calls, start};
}

describe('Session AE Part 3.5: switching themes (ADR-027)', () => {
  afterEach(() => { vi.useRealTimers(); });
  it('applies a theme: the attribute and one sheet link, settled once the sheet has loaded; Nebula removes both at once', async () => {
    const {doc, dataset, head} = fakeDoc();
    let settled = false;
    const light = applyTheme('light', doc).then(() => { settled = true; });
    expect(dataset.theme).toBe('light');
    expect(head).toHaveLength(1);
    expect(head[0]!.getAttribute('href')).toBe(THEME_SHEETS.light);
    await Promise.resolve();
    expect(settled).toBe(false);
    head[0]!.fire('load');
    await light;
    expect(settled).toBe(true);
    // Dark re-points the same link (never a second one); the same sheet again settles at once.
    const dark = applyTheme('dark', doc);
    expect(head).toHaveLength(1);
    expect(head[0]!.getAttribute('href')).toBe(THEME_SHEETS.dark);
    head[0]!.fire('load'); await dark;
    await applyTheme('dark', doc);
    await applyTheme('nebula', doc);
    expect(dataset.theme).toBeUndefined();
    expect(head).toHaveLength(0);
  });
  it('a sheet that fails leaves the page whole in Nebula (no attribute, no link), unless another theme was chosen meanwhile', async () => {
    const a = fakeDoc();
    const failing = applyTheme('light', a.doc);
    a.head[0]!.fire('error'); await failing;
    expect(a.dataset.theme).toBeUndefined();
    expect(a.head).toHaveLength(0);
    // Nebula was chosen before the Light sheet failed: nothing to undo.
    const b = fakeDoc();
    const first = applyTheme('light', b.doc), link = b.head[0]!;
    await applyTheme('nebula', b.doc);
    link.fire('error'); await first;
    expect(b.dataset.theme).toBeUndefined();
    expect(b.head).toHaveLength(0);
    // Dark was chosen while Light loaded: the link now carries Dark and Dark stays.
    const c = fakeDoc();
    const pending = applyTheme('light', c.doc), linkC = c.head[0]!;
    const dark = applyTheme('dark', c.doc);
    linkC.fire('load'); await Promise.all([pending, dark]);
    expect(c.dataset.theme).toBe('dark');
    expect(c.head).toHaveLength(1);
    expect(c.head[0]!.getAttribute('href')).toBe(THEME_SHEETS.dark);
  });
  it('waits at most 1.5 s for a sheet that never answers, then shows the theme', async () => {
    vi.useFakeTimers();
    const {doc, dataset} = fakeDoc();
    let settled = false;
    void applyTheme('dark', doc).then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(1499);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe(true);
    expect(dataset.theme).toBe('dark');
  });
  it('with motion welcome, the change runs inside one view transition that ends once the new sheet is in; a skipped transition is harmless', async () => {
    const {doc, dataset, head, calls, start} = fakeDoc();
    showTheme('light', doc);
    expect(start).toHaveBeenCalledTimes(1);
    // The old look stays until the browser has its picture of it: nothing changes before the callback runs.
    expect(dataset.theme).toBeUndefined();
    expect(head).toHaveLength(0);
    let done = false;
    const update = calls[0]!().then(() => { done = true; });
    expect(dataset.theme).toBe('light');
    await Promise.resolve();
    expect(done).toBe(false);
    head[0]!.fire('load'); await update;
    expect(done).toBe(true);
    // Back to Nebula: the sheet goes inside the transition too.
    showTheme('nebula', doc);
    expect(start).toHaveBeenCalledTimes(2);
    expect(head).toHaveLength(1);
    await calls[1]!();
    expect(dataset.theme).toBeUndefined();
    expect(head).toHaveLength(0);
  });
  it('reduced motion, Motion Off (setting or attribute), unreadable storage or no view transitions: applied at once, no transition', () => {
    expect(themeMotionAllowed(fakeDoc().doc)).toBe(true);
    for (const options of [{reduced: true}, {motion: 'off'}, {appMotion: 'off'}, {storageThrows: true}, {transitions: false}]) {
      const {doc, dataset, head, start} = fakeDoc(options);
      expect(themeMotionAllowed(doc), JSON.stringify(options)).toBe(options.transitions === false);
      showTheme('dark', doc);
      expect(start, JSON.stringify(options)).not.toHaveBeenCalled();
      expect(dataset.theme, JSON.stringify(options)).toBe('dark');
      expect(head).toHaveLength(1);
    }
  });
  it('a browser that refuses to start the transition still gets the theme', () => {
    const {doc, dataset, head} = fakeDoc();
    (doc as unknown as {startViewTransition: () => never}).startViewTransition = () => { throw Error('InvalidStateError'); };
    showTheme('light', doc);
    expect(dataset.theme).toBe('light');
    expect(head).toHaveLength(1);
  });
});
